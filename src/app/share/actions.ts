"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, gt, gte, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { maintenanceCases, maintenanceEvents, notifications, portalItemEntries, portalItems, properties, shareLinks, tenancies, units } from "@/db/schema";
import { hashShareToken, type SharePermissions } from "@/domain/share-links";
import { canTransitionPortalTask, canUsePortalCommunication, portalReplySchema, portalTaskStatusSchema } from "@/domain/portal-communication";

async function getCommunicationContext(token: string) {
  if (token.length < 20 || token.length > 200) return null;
  const [context] = await getDb().select({ shareLinkId: shareLinks.id, organizationId: shareLinks.organizationId, tenancyId: tenancies.id, renterId: tenancies.renterId, endsAt: tenancies.endsAt, permissions: shareLinks.permissions }).from(shareLinks).innerJoin(tenancies, and(eq(tenancies.id, shareLinks.tenancyId), eq(tenancies.organizationId, shareLinks.organizationId))).where(and(eq(shareLinks.tokenHash, hashShareToken(token)), isNull(shareLinks.revokedAt), gt(shareLinks.expiresAt, new Date()))).limit(1);
  if (!context || !canUsePortalCommunication(context.permissions as SharePermissions)) return null;
  return context;
}

function revalidatePortalCommunication(token: string, tenancyId: string) {
  revalidatePath(`/share/${token}`);
  revalidatePath(`/app/tenancies/${tenancyId}`);
}

const portalRequestSchema = z.object({ itemId: z.string().uuid(), requestKey: z.string().uuid() });

export async function replyToPortalItem(token: string, formData: FormData) {
  const parsed = portalReplySchema.extend({ requestKey: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const context = await getCommunicationContext(token);
  if (!context || (context.endsAt && context.endsAt <= new Date())) return;
  const db = getDb();
  const [item] = await db.select({ id: portalItems.id, title: portalItems.title }).from(portalItems).where(and(eq(portalItems.id, parsed.data.itemId), eq(portalItems.organizationId, context.organizationId), eq(portalItems.tenancyId, context.tenancyId), isNull(portalItems.archivedAt))).limit(1);
  if (!item) return;
  const recent = await db.select({ id: portalItemEntries.id }).from(portalItemEntries).where(and(eq(portalItemEntries.organizationId, context.organizationId), eq(portalItemEntries.shareLinkId, context.shareLinkId), eq(portalItemEntries.author, "renter"), eq(portalItemEntries.type, "reply"), gte(portalItemEntries.createdAt, new Date(Date.now() - 10 * 60 * 1000)))).limit(10);
  if (recent.length >= 10) return;
  const entryId = parsed.data.requestKey;
  await db.batch([
    db.insert(portalItemEntries).values({ id: entryId, organizationId: context.organizationId, portalItemId: item.id, author: "renter", type: "reply", shareLinkId: context.shareLinkId, body: parsed.data.body, requestKey: parsed.data.requestKey }).onConflictDoNothing(),
    db.insert(notifications).values({ organizationId: context.organizationId, title: "Neue Antwort im Mieterportal", body: item.title, href: `/app/tenancies/${context.tenancyId}#portal-communication`, type: "portal_communication", deduplicationKey: `portal-entry:${entryId}` }).onConflictDoNothing(),
  ]);
  revalidatePortalCommunication(token, context.tenancyId);
}

export async function acknowledgePortalMessage(token: string, formData: FormData) {
  const parsed = portalRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const context = await getCommunicationContext(token);
  if (!context || (context.endsAt && context.endsAt <= new Date())) return;
  const db = getDb();
  const [item] = await db.select({ id: portalItems.id, title: portalItems.title, kind: portalItems.kind, tenantAcknowledgedAt: portalItems.tenantAcknowledgedAt }).from(portalItems).where(and(eq(portalItems.id, parsed.data.itemId), eq(portalItems.organizationId, context.organizationId), eq(portalItems.tenancyId, context.tenancyId), isNull(portalItems.archivedAt))).limit(1);
  if (!item || item.kind !== "message" || item.tenantAcknowledgedAt) return;
  const now = new Date();
  const entryId = parsed.data.requestKey;
  await db.batch([
    db.update(portalItems).set({ tenantAcknowledgedAt: now, updatedAt: now }).where(and(eq(portalItems.id, item.id), eq(portalItems.organizationId, context.organizationId), isNull(portalItems.tenantAcknowledgedAt))),
    db.insert(portalItemEntries).values({ id: entryId, organizationId: context.organizationId, portalItemId: item.id, author: "renter", type: "status", shareLinkId: context.shareLinkId, metadata: { action: "acknowledged" }, requestKey: parsed.data.requestKey }).onConflictDoNothing(),
    db.insert(notifications).values({ organizationId: context.organizationId, title: "Nachricht bestätigt", body: item.title, href: `/app/tenancies/${context.tenancyId}#portal-communication`, type: "portal_communication", deduplicationKey: `portal-entry:${entryId}` }).onConflictDoNothing(),
  ]);
  revalidatePortalCommunication(token, context.tenancyId);
}

export async function setPortalTaskStatusFromPortal(token: string, formData: FormData) {
  const parsed = portalRequestSchema.extend({ status: portalTaskStatusSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const context = await getCommunicationContext(token);
  if (!context || (context.endsAt && context.endsAt <= new Date())) return;
  const db = getDb();
  const [item] = await db.select({ id: portalItems.id, title: portalItems.title, kind: portalItems.kind, taskStatus: portalItems.taskStatus }).from(portalItems).where(and(eq(portalItems.id, parsed.data.itemId), eq(portalItems.organizationId, context.organizationId), eq(portalItems.tenancyId, context.tenancyId), isNull(portalItems.archivedAt))).limit(1);
  if (!item || !canTransitionPortalTask(item.kind, item.taskStatus, parsed.data.status)) return;
  const now = new Date();
  const entryId = parsed.data.requestKey;
  await db.batch([
    db.update(portalItems).set({ taskStatus: parsed.data.status, taskCompletedAt: parsed.data.status === "done" ? now : null, taskCompletedBy: parsed.data.status === "done" ? "renter" : null, updatedAt: now }).where(and(eq(portalItems.id, item.id), eq(portalItems.organizationId, context.organizationId), eq(portalItems.taskStatus, item.taskStatus))),
    db.insert(portalItemEntries).values({ id: entryId, organizationId: context.organizationId, portalItemId: item.id, author: "renter", type: "status", shareLinkId: context.shareLinkId, metadata: { from: item.taskStatus, to: parsed.data.status }, requestKey: parsed.data.requestKey }).onConflictDoNothing(),
    db.insert(notifications).values({ organizationId: context.organizationId, title: parsed.data.status === "done" ? "Portal-Aufgabe erledigt" : "Portal-Aufgabe wieder geöffnet", body: item.title, href: `/app/tenancies/${context.tenancyId}#portal-communication`, type: "portal_communication", deduplicationKey: `portal-entry:${entryId}` }).onConflictDoNothing(),
  ]);
  revalidatePortalCommunication(token, context.tenancyId);
}

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
