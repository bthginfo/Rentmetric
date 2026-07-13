"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, gte, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { addDays } from "date-fns";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, rentChanges, renters, shareLinks, tenancies, units } from "@/db/schema";
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
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const session = await requireSession();
  const db = getDb();
  const [tenancy] = await db
    .select({ unitId: tenancies.unitId })
    .from(tenancies)
    .where(
      and(
        eq(tenancies.id, id.data),
        eq(tenancies.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!tenancy) return;
  await db
    .update(tenancies)
    .set({ endsAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(tenancies.id, id.data),
        eq(tenancies.organizationId, session.organizationId),
      ),
    );
  await db
    .update(units)
    .set({ status: "vacant", updatedAt: new Date() })
    .where(
      and(
        eq(units.id, tenancy.unitId),
        eq(units.organizationId, session.organizationId),
      ),
    );
  await db.insert(auditLogs).values({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "tenancy.ended",
    entityType: "tenancy",
    entityId: id.data,
  });
  revalidatePath("/app/tenancies");
  revalidatePath(`/app/units/${tenancy.unitId}`);
  revalidatePath("/app/dashboard");
}

export async function createShareLink(formData: FormData) {
  const tenancyId = z.string().uuid().safeParse(formData.get("id"));
  if (!tenancyId.success) return;
  const session = await requireSession();
  const db = getDb();
  const [tenancy] = await db
    .select({ id: tenancies.id })
    .from(tenancies)
    .where(
      and(
        eq(tenancies.id, tenancyId.data),
        eq(tenancies.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!tenancy) return;
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
  const session = await requireSession(); const db = getDb(); const [tenancy] = await db.select().from(tenancies).where(and(eq(tenancies.id, data.data.tenancyId), eq(tenancies.organizationId, session.organizationId))).limit(1); if (!tenancy) return;
  const id = randomUUID(); const effectiveFrom = new Date(`${data.data.effectiveFrom}T12:00:00`); const newCents = cents(data.data.newColdRent);
  await db.insert(rentChanges).values({ id, organizationId: session.organizationId, tenancyId: tenancy.id, effectiveFrom, oldColdRentCents: tenancy.coldRentCents, newColdRentCents: newCents, changeType: data.data.changeType, reason: data.data.reason || null, status: data.data.status });
  if (data.data.status === "active" && effectiveFrom <= new Date()) await db.update(tenancies).set({ coldRentCents: newCents, lastRentIncreaseAt: effectiveFrom, updatedAt: new Date() }).where(and(eq(tenancies.id, tenancy.id), eq(tenancies.organizationId, session.organizationId)));
  await db.insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "rent_change.created", entityType: "rent_change", entityId: id, changes: { status: data.data.status, effectiveFrom: data.data.effectiveFrom } }); revalidatePath(`/app/tenancies/${tenancy.id}`); revalidatePath("/app/tenancies");
}

export async function revokeShareLink(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id")); if (!id.success) return; const session = await requireSession();
  await getDb().update(shareLinks).set({ revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(shareLinks.id, id.data), eq(shareLinks.organizationId, session.organizationId))); revalidatePath("/app/tenancies");
}
