"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { addDays } from "date-fns";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, documents, payments, portalItems, properties, rentChanges, renters, shareLinks, tenancies, units } from "@/db/schema";
import { createShareToken } from "@/domain/share-links";

const schema = z.object({
  unitId: z.string().uuid(),
  renterId: z.string().uuid(),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
  coldRent: z.coerce.number().positive().max(100000),
  utilityAdvance: z.coerce.number().min(0).max(100000),
  deposit: z.coerce.number().min(0).max(100000),
});
export type TenancyFormState =
  { error?: string; fieldErrors?: Record<string, string[]> } | undefined;
const cents = (value: number) => Math.round(value * 100);

export async function createTenancy(
  _: TenancyFormState,
  formData: FormData,
): Promise<TenancyFormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await requireSession();
  const db = getDb();
  const startsAt = new Date(`${parsed.data.startsAt}T12:00:00`);
  const endsAt = parsed.data.endsAt
    ? new Date(`${parsed.data.endsAt}T12:00:00`)
    : null;
  if (endsAt && endsAt <= startsAt)
    return { error: "Das Vertragsende muss nach dem Beginn liegen." };
  const [[unit], [renter], overlapping] = await Promise.all([
    db
      .select({ id: units.id })
      .from(units)
      .where(
        and(
          eq(units.id, parsed.data.unitId),
          eq(units.organizationId, session.organizationId),
        ),
      )
      .limit(1),
    db
      .select({ id: renters.id })
      .from(renters)
      .where(
        and(
          eq(renters.id, parsed.data.renterId),
          eq(renters.organizationId, session.organizationId),
        ),
      )
      .limit(1),
    db
      .select({ id: tenancies.id })
      .from(tenancies)
      .where(
        and(
          eq(tenancies.organizationId, session.organizationId),
          eq(tenancies.unitId, parsed.data.unitId),
          endsAt ? lte(tenancies.startsAt, endsAt) : undefined,
          or(isNull(tenancies.endsAt), gte(tenancies.endsAt, startsAt)),
        ),
      )
      .limit(1),
  ]);
  if (!unit || !renter)
    return { error: "Einheit oder Mieter:in wurde nicht gefunden." };
  if (overlapping.length)
    return {
      error:
        "Für diese Einheit besteht im gewählten Zeitraum bereits ein Mietverhältnis.",
    };
  const id = randomUUID();
  await db.insert(tenancies).values({
    id,
    organizationId: session.organizationId,
    unitId: unit.id,
    renterId: renter.id,
    startsAt,
    endsAt,
    coldRentCents: cents(parsed.data.coldRent),
    utilityAdvanceCents: cents(parsed.data.utilityAdvance),
    depositCents: cents(parsed.data.deposit),
  });
  if (!endsAt || endsAt >= new Date())
    await db
      .update(units)
      .set({ status: "occupied", updatedAt: new Date() })
      .where(
        and(
          eq(units.id, unit.id),
          eq(units.organizationId, session.organizationId),
        ),
      );
  await db.insert(auditLogs).values({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "tenancy.created",
    entityType: "tenancy",
    entityId: id,
  });
  redirect("/app/tenancies?created=1");
}

export async function endTenancy(formData: FormData) {
  const data = z.object({ id: z.string().uuid(), endsAt: z.string().min(1), confirmation: z.literal("BEENDEN") }).safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession();
  const db = getDb();
  const [tenancy] = await db
    .select({ unitId: tenancies.unitId, startsAt: tenancies.startsAt })
    .from(tenancies)
    .where(
      and(
        eq(tenancies.id, data.data.id),
        eq(tenancies.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!tenancy) return;
  const endsAt = new Date(`${data.data.endsAt}T12:00:00`);
  if (!Number.isFinite(endsAt.getTime()) || endsAt <= tenancy.startsAt) return;
  const now = new Date();
  await db.batch([
    db.update(tenancies).set({ endsAt, updatedAt: now }).where(and(eq(tenancies.id, data.data.id), eq(tenancies.organizationId, session.organizationId))),
    db.update(units).set({ status: endsAt <= now ? "vacant" : "occupied", updatedAt: now }).where(and(eq(units.id, tenancy.unitId), eq(units.organizationId, session.organizationId))),
    db.update(shareLinks).set({ revokedAt: now, updatedAt: now }).where(and(eq(shareLinks.tenancyId, data.data.id), eq(shareLinks.organizationId, session.organizationId), isNull(shareLinks.revokedAt))),
    db.insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "tenancy.ended", entityType: "tenancy", entityId: data.data.id, changes: { endsAt: endsAt.toISOString(), shareLinksRevoked: true } }),
  ]);
  revalidatePath("/app/tenancies");
  revalidatePath(`/app/units/${tenancy.unitId}`);
  revalidatePath("/app/dashboard");
  redirect(`/app/tenancies/${data.data.id}?ended=1`);
}

export async function deleteArchivedTenancy(formData: FormData) {
  const data = z.object({ id: z.string().uuid(), confirmation: z.literal("ARCHIV LÖSCHEN"), irreversible: z.literal("yes") }).safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession(); const db = getDb(); const now = new Date();
  const [tenancy] = await db.select({ id: tenancies.id }).from(tenancies).where(and(eq(tenancies.id, data.data.id), eq(tenancies.organizationId, session.organizationId), lte(tenancies.endsAt, now))).limit(1);
  if (!tenancy) return;
  const [paymentRefs, documentRefs, changeRefs, communicationRefs] = await Promise.all([
    db.select({ id: payments.id }).from(payments).where(and(eq(payments.organizationId, session.organizationId), eq(payments.tenancyId, tenancy.id))).limit(1),
    db.select({ id: documents.id }).from(documents).where(and(eq(documents.organizationId, session.organizationId), eq(documents.tenancyId, tenancy.id))).limit(1),
    db.select({ id: rentChanges.id }).from(rentChanges).where(and(eq(rentChanges.organizationId, session.organizationId), eq(rentChanges.tenancyId, tenancy.id))).limit(1),
    db.select({ id: portalItems.id }).from(portalItems).where(and(eq(portalItems.organizationId, session.organizationId), eq(portalItems.tenancyId, tenancy.id))).limit(1),
  ]);
  if (paymentRefs.length || documentRefs.length || changeRefs.length || communicationRefs.length) redirect(`/app/tenancies/${tenancy.id}?deleteBlocked=1`);
  await db.delete(tenancies).where(and(eq(tenancies.id, tenancy.id), eq(tenancies.organizationId, session.organizationId)));
  await db.insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "tenancy.deleted", entityType: "tenancy", entityId: tenancy.id });
  redirect("/app/tenancies?status=archived");
}

export async function restoreArchivedTenancy(formData: FormData) {
  const parsed = z.object({ id: z.string().uuid(), confirmation: z.literal("WIEDERHERSTELLEN") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const session = await requireSession();
  const db = getDb();
  const [tenancy] = await db.select({ id: tenancies.id, unitId: tenancies.unitId }).from(tenancies).innerJoin(units, and(eq(units.id, tenancies.unitId), eq(units.organizationId, session.organizationId), isNull(units.archivedAt))).innerJoin(properties, and(eq(properties.id, units.propertyId), eq(properties.organizationId, session.organizationId), isNull(properties.archivedAt))).where(and(eq(tenancies.id, parsed.data.id), eq(tenancies.organizationId, session.organizationId), lte(tenancies.endsAt, new Date()))).limit(1);
  if (!tenancy) redirect(`/app/tenancies/${parsed.data.id}?restoreBlocked=inactive-context`);
  const [conflict] = await db.select({ id: tenancies.id }).from(tenancies).where(and(eq(tenancies.organizationId, session.organizationId), eq(tenancies.unitId, tenancy.unitId), or(isNull(tenancies.endsAt), gte(tenancies.endsAt, new Date())))).limit(1);
  if (conflict) redirect(`/app/tenancies/${tenancy.id}?restoreBlocked=conflict`);
  await db.batch([
    db.update(tenancies).set({ endsAt: null, updatedAt: new Date() }).where(and(eq(tenancies.id, tenancy.id), eq(tenancies.organizationId, session.organizationId))),
    db.update(units).set({ status: "occupied", updatedAt: new Date() }).where(and(eq(units.id, tenancy.unitId), eq(units.organizationId, session.organizationId))),
    db.insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "tenancy.restored", entityType: "tenancy", entityId: tenancy.id }),
  ]);
  revalidatePath("/app/tenancies");
  revalidatePath(`/app/units/${tenancy.unitId}`);
  redirect(`/app/tenancies/${tenancy.id}?restored=1`);
}

export async function updateTenancyPaymentDetails(formData: FormData) {
  const values = Object.fromEntries(formData);
  for (const key of ["rentDueDay", "depositPaid"]) if (values[key] === "") delete values[key];
  const data = z.object({ id: z.string().uuid(), rentDueDay: z.coerce.number().int().min(1).max(28).optional(), paymentReference: z.string().trim().max(180).optional(), depositPaid: z.coerce.number().nonnegative().max(1_000_000).optional(), depositPaidAt: z.string().optional(), depositReturnedAt: z.string().optional() }).safeParse(values);
  if (!data.success) return;
  const session = await requireSession();
  const db = getDb();
  const [tenancy] = await db.select({ endsAt: tenancies.endsAt }).from(tenancies).where(and(eq(tenancies.id, data.data.id), eq(tenancies.organizationId, session.organizationId))).limit(1);
  if (!tenancy || (tenancy.endsAt && tenancy.endsAt < new Date())) redirect(`/app/tenancies/${data.data.id}?archivedWriteBlocked=1`);
  await db.update(tenancies).set({ rentDueDay: data.data.rentDueDay ?? null, paymentReference: data.data.paymentReference || null, depositPaidCents: data.data.depositPaid == null ? 0 : Math.round(data.data.depositPaid * 100), depositPaidAt: data.data.depositPaidAt ? new Date(`${data.data.depositPaidAt}T12:00:00`) : null, depositReturnedAt: data.data.depositReturnedAt ? new Date(`${data.data.depositReturnedAt}T12:00:00`) : null, updatedAt: new Date() }).where(and(eq(tenancies.id, data.data.id), eq(tenancies.organizationId, session.organizationId)));
  revalidatePath(`/app/tenancies/${data.data.id}`);
  redirect(`/app/tenancies/${data.data.id}?paymentDetailsUpdated=1`);
}

export async function createShareLink(formData: FormData) {
  const tenancyId = z.string().uuid().safeParse(formData.get("id"));
  if (!tenancyId.success) return;
  const session = await requireSession();
  const db = getDb();
  const [tenancy] = await db
    .select({ id: tenancies.id, endsAt: tenancies.endsAt })
    .from(tenancies)
    .where(
      and(
        eq(tenancies.id, tenancyId.data),
        eq(tenancies.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!tenancy || (tenancy.endsAt && tenancy.endsAt < new Date())) redirect(`/app/tenancies/${tenancyId.data}?archivedWriteBlocked=1`);
  const { token, tokenHash } = createShareToken();
  const id = randomUUID();
  await db.insert(shareLinks).values({
    id,
    organizationId: session.organizationId,
    tenancyId: tenancy.id,
    tokenHash,
    permissions: {
      masterData: true,
      documents: true,
      deadlines: true,
      uploads: true,
      maintenanceReports: true,
      reports: true,
      paymentDetails: true,
      communication: true,
    },
    expiresAt: addDays(new Date(), 30),
  });
  await db.insert(auditLogs).values({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "share_link.created",
    entityType: "share_link",
    entityId: id,
  });
  redirect(`/share/${token}`);
}

export async function createRentChange(formData: FormData) {
  const data = z.object({ tenancyId: z.string().uuid(), effectiveFrom: z.string().min(1), newColdRent: z.coerce.number().positive(), changeType: z.enum(["comparison_rent", "index", "stepped", "modernization", "agreement"]), reason: z.string().trim().max(2000).optional(), status: z.enum(["draft", "announced", "accepted", "active", "discarded"]) }).safeParse(Object.fromEntries(formData)); if (!data.success) return;
  const session = await requireSession(); const db = getDb(); const [tenancy] = await db.select().from(tenancies).where(and(eq(tenancies.id, data.data.tenancyId), eq(tenancies.organizationId, session.organizationId))).limit(1); if (!tenancy || (tenancy.endsAt && tenancy.endsAt < new Date())) redirect(`/app/tenancies/${data.data.tenancyId}?archivedWriteBlocked=1`);
  const id = randomUUID(); const effectiveFrom = new Date(`${data.data.effectiveFrom}T12:00:00`); const newCents = cents(data.data.newColdRent);
  await db.insert(rentChanges).values({ id, organizationId: session.organizationId, tenancyId: tenancy.id, effectiveFrom, oldColdRentCents: tenancy.coldRentCents, newColdRentCents: newCents, changeType: data.data.changeType, reason: data.data.reason || null, status: data.data.status });
  if (data.data.status === "active" && effectiveFrom <= new Date()) await db.update(tenancies).set({ coldRentCents: newCents, lastRentIncreaseAt: effectiveFrom, updatedAt: new Date() }).where(and(eq(tenancies.id, tenancy.id), eq(tenancies.organizationId, session.organizationId)));
  await db.insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "rent_change.created", entityType: "rent_change", entityId: id, changes: { status: data.data.status, effectiveFrom: data.data.effectiveFrom } }); revalidatePath(`/app/tenancies/${tenancy.id}`); revalidatePath("/app/tenancies"); redirect(`/app/tenancies/${tenancy.id}?rentChangeCreated=1`);
}

export async function revokeShareLink(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id")); if (!id.success) return; const session = await requireSession();
  await getDb().update(shareLinks).set({ revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(shareLinks.id, id.data), eq(shareLinks.organizationId, session.organizationId))); revalidatePath("/app/tenancies");
}
