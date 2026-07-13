"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, gt, gte, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { maintenanceCases, maintenanceEvents, notifications, properties, shareLinks, tenancies, units } from "@/db/schema";
import { hashShareToken, type SharePermissions } from "@/domain/share-links";

export async function createRenterMaintenanceReport(token: string, formData: FormData) {
  const parsed = z.object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(5).max(1500),
    category: z.enum(["damage", "repair", "payment", "document", "general"]),
    requestKey: z.string().uuid(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || token.length < 20 || token.length > 200) return;
  const db = getDb();
  const [context] = await db.select({ shareLinkId: shareLinks.id, organizationId: shareLinks.organizationId, tenancyId: tenancies.id, renterId: tenancies.renterId, unitId: units.id, propertyId: properties.id, permissions: shareLinks.permissions }).from(shareLinks).innerJoin(tenancies, and(eq(tenancies.id, shareLinks.tenancyId), eq(tenancies.organizationId, shareLinks.organizationId))).innerJoin(units, and(eq(units.id, tenancies.unitId), eq(units.organizationId, shareLinks.organizationId))).innerJoin(properties, and(eq(properties.id, units.propertyId), eq(properties.organizationId, shareLinks.organizationId))).where(and(eq(shareLinks.tokenHash, hashShareToken(token)), isNull(shareLinks.revokedAt), gt(shareLinks.expiresAt, new Date()))).limit(1);
  const permissions = context?.permissions as SharePermissions | undefined;
  if (!context || !(permissions?.reports ?? permissions?.maintenanceReports ?? false)) return;
  const recentReports = await db.select({ id: maintenanceCases.id }).from(maintenanceCases).where(and(
    eq(maintenanceCases.organizationId, context.organizationId),
    eq(maintenanceCases.portalShareLinkId, context.shareLinkId),
    gte(maintenanceCases.createdAt, new Date(Date.now() - 10 * 60 * 1000)),
  )).limit(5);
  if (recentReports.length >= 5) return;
  const [existing] = await db.select({ id: maintenanceCases.id }).from(maintenanceCases).where(and(
    eq(maintenanceCases.organizationId, context.organizationId),
    eq(maintenanceCases.portalReportKey, parsed.data.requestKey),
  )).limit(1);
  if (existing) return;
  const id = randomUUID();
  await db.batch([
    db.insert(maintenanceCases).values({ id, organizationId: context.organizationId, propertyId: context.propertyId, unitId: context.unitId, title: parsed.data.title, description: parsed.data.description, category: parsed.data.category, priority: "normal", reportedByRenter: true, portalVisible: true, portalTenancyId: context.tenancyId, portalRenterId: context.renterId, portalShareLinkId: context.shareLinkId, portalReportKey: parsed.data.requestKey }),
    db.insert(maintenanceEvents).values({ organizationId: context.organizationId, caseId: id, type: "renter.reported", note: "Meldung sicher übermittelt.", portalVisible: true }),
    db.insert(notifications).values({ organizationId: context.organizationId, title: "Neue Meldung aus dem Mieterportal", body: parsed.data.title, href: `/app/maintenance/${id}`, type: "maintenance", deduplicationKey: `renter-maintenance:${id}` }).onConflictDoNothing(),
  ]);
  revalidatePath(`/share/${token}`);
}
