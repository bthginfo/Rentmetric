"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, portalItemEntries, portalItems, tenancies } from "@/db/schema";
import { canTransitionPortalTask, portalItemInputSchema, portalReplySchema, portalTaskStatusSchema } from "@/domain/portal-communication";

const tenancyItemSchema = z.object({ tenancyId: z.string().uuid(), itemId: z.string().uuid() });
const dossierPath = (tenancyId: string) => `/app/tenancies/${tenancyId}`;
const redirectToThread = (tenancyId: string, state: string) => redirect(`${dossierPath(tenancyId)}?portal=${state}#portal-communication`);

async function getWritableTenancy(organizationId: string, tenancyId: string) {
  const [tenancy] = await getDb().select({ id: tenancies.id, endsAt: tenancies.endsAt }).from(tenancies).where(and(eq(tenancies.id, tenancyId), eq(tenancies.organizationId, organizationId))).limit(1);
  return tenancy && (!tenancy.endsAt || tenancy.endsAt > new Date()) ? tenancy : null;
}

async function getScopedItem(organizationId: string, tenancyId: string, itemId: string, archived?: boolean) {
  const conditions = [eq(portalItems.id, itemId), eq(portalItems.organizationId, organizationId), eq(portalItems.tenancyId, tenancyId)];
  if (archived === false) conditions.push(isNull(portalItems.archivedAt));
  if (archived === true) conditions.push(lte(portalItems.archivedAt, new Date()));
  const [item] = await getDb().select().from(portalItems).where(and(...conditions)).limit(1);
  return item ?? null;
}

function revalidateCommunication(tenancyId: string) {
  revalidatePath(dossierPath(tenancyId));
}

export async function createPortalItem(formData: FormData) {
  const tenancyId = z.string().uuid().safeParse(formData.get("tenancyId"));
  const parsed = portalItemInputSchema.safeParse(Object.fromEntries(formData));
  if (!tenancyId.success || !parsed.success) return;
  const session = await requireSession();
  if (!await getWritableTenancy(session.organizationId, tenancyId.data)) redirectToThread(tenancyId.data, "readonly");
  const id = randomUUID();
  await getDb().batch([
    getDb().insert(portalItems).values({
      id,
      organizationId: session.organizationId,
      tenancyId: tenancyId.data,
      createdByUserId: session.userId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
      severity: parsed.data.severity,
      dueAt: parsed.data.kind === "task" ? parsed.data.dueAt ?? null : null,
    }),
    getDb().insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "portal_item.created", entityType: "portal_item", entityId: id, changes: { tenancyId: tenancyId.data, kind: parsed.data.kind } }),
  ]);
  revalidateCommunication(tenancyId.data);
  redirectToThread(tenancyId.data, "created");
}

export async function updatePortalItem(formData: FormData) {
  const ids = tenancyItemSchema.safeParse(Object.fromEntries(formData));
  const parsed = portalItemInputSchema.safeParse(Object.fromEntries(formData));
  if (!ids.success || !parsed.success) return;
  const session = await requireSession();
  if (!await getWritableTenancy(session.organizationId, ids.data.tenancyId)) redirectToThread(ids.data.tenancyId, "readonly");
  const item = await getScopedItem(session.organizationId, ids.data.tenancyId, ids.data.itemId, false);
  if (!item) return;
  await getDb().batch([
    getDb().update(portalItems).set({ kind: parsed.data.kind, title: parsed.data.title, body: parsed.data.body, severity: parsed.data.severity, dueAt: parsed.data.kind === "task" ? parsed.data.dueAt ?? null : null, taskStatus: parsed.data.kind === "message" ? "open" : item.taskStatus, taskCompletedAt: parsed.data.kind === "message" ? null : item.taskCompletedAt, taskCompletedBy: parsed.data.kind === "message" ? null : item.taskCompletedBy, updatedAt: new Date() }).where(and(eq(portalItems.id, item.id), eq(portalItems.organizationId, session.organizationId), eq(portalItems.tenancyId, ids.data.tenancyId))),
    getDb().insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "portal_item.updated", entityType: "portal_item", entityId: item.id, changes: { kind: parsed.data.kind } }),
  ]);
  revalidateCommunication(ids.data.tenancyId);
  redirectToThread(ids.data.tenancyId, "updated");
}

export async function replyAsLandlord(formData: FormData) {
  const tenancyId = z.string().uuid().safeParse(formData.get("tenancyId"));
  const parsed = portalReplySchema.safeParse(Object.fromEntries(formData));
  if (!tenancyId.success || !parsed.success) return;
  const session = await requireSession();
  if (!await getWritableTenancy(session.organizationId, tenancyId.data)) redirectToThread(tenancyId.data, "readonly");
  const item = await getScopedItem(session.organizationId, tenancyId.data, parsed.data.itemId, false);
  if (!item) return;
  const entryId = randomUUID();
  await getDb().batch([
    getDb().insert(portalItemEntries).values({ id: entryId, organizationId: session.organizationId, portalItemId: item.id, author: "landlord", type: "reply", userId: session.userId, body: parsed.data.body }),
    getDb().insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "portal_item.replied", entityType: "portal_item", entityId: item.id }),
  ]);
  revalidateCommunication(tenancyId.data);
  redirectToThread(tenancyId.data, "replied");
}

export async function setPortalTaskStatusAsLandlord(formData: FormData) {
  const parsed = tenancyItemSchema.extend({ status: portalTaskStatusSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const session = await requireSession();
  if (!await getWritableTenancy(session.organizationId, parsed.data.tenancyId)) redirectToThread(parsed.data.tenancyId, "readonly");
  const item = await getScopedItem(session.organizationId, parsed.data.tenancyId, parsed.data.itemId, false);
  if (!item || !canTransitionPortalTask(item.kind, item.taskStatus, parsed.data.status)) return;
  const now = new Date();
  await getDb().batch([
    getDb().update(portalItems).set({ taskStatus: parsed.data.status, taskCompletedAt: parsed.data.status === "done" ? now : null, taskCompletedBy: parsed.data.status === "done" ? "landlord" : null, updatedAt: now }).where(and(eq(portalItems.id, item.id), eq(portalItems.organizationId, session.organizationId), eq(portalItems.tenancyId, parsed.data.tenancyId), eq(portalItems.taskStatus, item.taskStatus))),
    getDb().insert(portalItemEntries).values({ organizationId: session.organizationId, portalItemId: item.id, author: "landlord", type: "status", userId: session.userId, metadata: { from: item.taskStatus, to: parsed.data.status } }),
    getDb().insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "portal_item.status_changed", entityType: "portal_item", entityId: item.id, changes: { from: item.taskStatus, to: parsed.data.status } }),
  ]);
  revalidateCommunication(parsed.data.tenancyId);
  redirectToThread(parsed.data.tenancyId, "status");
}

export async function archivePortalItem(formData: FormData) {
  const parsed = tenancyItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const session = await requireSession();
  if (!await getWritableTenancy(session.organizationId, parsed.data.tenancyId)) redirectToThread(parsed.data.tenancyId, "readonly");
  const item = await getScopedItem(session.organizationId, parsed.data.tenancyId, parsed.data.itemId, false);
  if (!item) return;
  await getDb().batch([
    getDb().update(portalItems).set({ archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(portalItems.id, item.id), eq(portalItems.organizationId, session.organizationId))),
    getDb().insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "portal_item.archived", entityType: "portal_item", entityId: item.id }),
  ]);
  revalidateCommunication(parsed.data.tenancyId);
  redirectToThread(parsed.data.tenancyId, "archived");
}

export async function restorePortalItem(formData: FormData) {
  const parsed = tenancyItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const session = await requireSession();
  if (!await getWritableTenancy(session.organizationId, parsed.data.tenancyId)) redirectToThread(parsed.data.tenancyId, "readonly");
  const item = await getScopedItem(session.organizationId, parsed.data.tenancyId, parsed.data.itemId, true);
  if (!item) return;
  await getDb().batch([
    getDb().update(portalItems).set({ archivedAt: null, updatedAt: new Date() }).where(and(eq(portalItems.id, item.id), eq(portalItems.organizationId, session.organizationId))),
    getDb().insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "portal_item.restored", entityType: "portal_item", entityId: item.id }),
  ]);
  revalidateCommunication(parsed.data.tenancyId);
  redirectToThread(parsed.data.tenancyId, "restored");
}

export async function deleteArchivedPortalItem(formData: FormData) {
  const parsed = tenancyItemSchema.extend({ confirmation: z.literal("KOMMUNIKATION LÖSCHEN"), irreversible: z.literal("yes") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const session = await requireSession();
  if (!await getWritableTenancy(session.organizationId, parsed.data.tenancyId)) redirectToThread(parsed.data.tenancyId, "readonly");
  const item = await getScopedItem(session.organizationId, parsed.data.tenancyId, parsed.data.itemId, true);
  if (!item) return;
  await getDb().batch([
    getDb().delete(portalItems).where(and(eq(portalItems.id, item.id), eq(portalItems.organizationId, session.organizationId), eq(portalItems.tenancyId, parsed.data.tenancyId))),
    getDb().insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "portal_item.deleted", entityType: "portal_item", entityId: item.id }),
  ]);
  revalidateCommunication(parsed.data.tenancyId);
  redirectToThread(parsed.data.tenancyId, "deleted");
}
