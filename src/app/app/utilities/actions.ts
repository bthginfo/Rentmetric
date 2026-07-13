"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { properties, units, utilityCostAllocations, utilityCostItems, utilityPeriods } from "@/db/schema";
export async function createUtilityPeriod(formData: FormData) {
  const data = z
    .object({
      propertyId: z.string().uuid(),
      title: z.string().trim().min(2).max(160),
      startsAt: z.string().min(1),
      endsAt: z.string().min(1),
    })
    .safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession();
  const db = getDb();
  const [property] = await db
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        eq(properties.id, data.data.propertyId),
        eq(properties.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!property) return;
  const [created] = await db
    .insert(utilityPeriods)
    .values({
      organizationId: session.organizationId,
      propertyId: property.id,
      title: data.data.title,
      startsAt: new Date(`${data.data.startsAt}T12:00:00`),
      endsAt: new Date(`${data.data.endsAt}T12:00:00`),
    }).returning({ id: utilityPeriods.id });
  revalidatePath("/app/utilities");
  redirect(`/app/utilities/${created.id}`);
}
export async function addUtilityCost(formData: FormData) {
  const data = z
    .object({
      periodId: z.string().uuid(),
      label: z.string().trim().min(2).max(160),
      amount: z.coerce.number().positive(),
      allocationKey: z.enum(["area", "units", "consumption", "manual"]),
      vendor: z.string().trim().max(160).optional(),
      invoiceDate: z.string().optional(),
      notes: z.string().trim().max(1000).optional(),
      isRecoverable: z.coerce.boolean().default(false),
    })
    .safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession();
  const db = getDb();
  const [period] = await db
    .select({ id: utilityPeriods.id })
    .from(utilityPeriods)
    .where(
      and(
        eq(utilityPeriods.id, data.data.periodId),
        eq(utilityPeriods.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!period) return;
  await db
    .insert(utilityCostItems)
    .values({
      organizationId: session.organizationId,
      periodId: period.id,
      label: data.data.label,
      amountCents: Math.round(data.data.amount * 100),
      allocationKey: data.data.allocationKey,
      vendor: data.data.vendor || null,
      invoiceDate: data.data.invoiceDate ? new Date(`${data.data.invoiceDate}T12:00:00`) : null,
      notes: data.data.notes || null,
      isRecoverable: data.data.isRecoverable,
    });
  revalidatePath("/app/utilities");
  revalidatePath(`/app/utilities/${period.id}`);
}

export async function updateUtilityPeriodStatus(formData: FormData) {
  const data = z.object({ id: z.string().uuid(), status: z.enum(["draft", "review", "final"]) }).safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession();
  await getDb().update(utilityPeriods).set({ status: data.data.status, updatedAt: new Date() }).where(and(eq(utilityPeriods.id, data.data.id), eq(utilityPeriods.organizationId, session.organizationId)));
  revalidatePath("/app/utilities"); revalidatePath(`/app/utilities/${data.data.id}`);
}

export async function saveUtilityAllocations(formData: FormData) {
  const ids = z.object({ periodId: z.string().uuid(), costItemId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!ids.success) return;
  const session = await requireSession();
  const db = getDb();
  const [cost] = await db.select({ id: utilityCostItems.id, allocationKey: utilityCostItems.allocationKey, propertyId: utilityPeriods.propertyId }).from(utilityCostItems).innerJoin(utilityPeriods, eq(utilityPeriods.id, utilityCostItems.periodId)).where(and(eq(utilityCostItems.id, ids.data.costItemId), eq(utilityCostItems.periodId, ids.data.periodId), eq(utilityCostItems.organizationId, session.organizationId))).limit(1);
  if (!cost || !["consumption", "manual"].includes(cost.allocationKey)) return;
  const allowedUnits = await db.select({ id: units.id }).from(units).where(and(eq(units.organizationId, session.organizationId), eq(units.propertyId, cost.propertyId)));
  const unitIds = new Set(allowedUnits.map((unit) => unit.id));
  const rows = [...formData.entries()].flatMap(([key, raw]) => {
    if (!key.startsWith("unit_") || typeof raw !== "string") return [];
    const unitId = key.slice(5);
    const value = Number(raw.replace(",", "."));
    if (!unitIds.has(unitId) || !Number.isFinite(value) || value < 0) return [];
    return [{ organizationId: session.organizationId, costItemId: cost.id, unitId, weightValue: cost.allocationKey === "consumption" ? Math.round(value * 1000) : null, amountCents: cost.allocationKey === "manual" ? Math.round(value * 100) : null }];
  });
  await db.delete(utilityCostAllocations).where(and(eq(utilityCostAllocations.organizationId, session.organizationId), eq(utilityCostAllocations.costItemId, cost.id)));
  if (rows.length) await db.insert(utilityCostAllocations).values(rows);
  revalidatePath(`/app/utilities/${ids.data.periodId}`);
}

export async function deleteUtilityCost(formData: FormData) {
  const data = z.object({ periodId: z.string().uuid(), costItemId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession();
  await getDb().delete(utilityCostItems).where(and(eq(utilityCostItems.id, data.data.costItemId), eq(utilityCostItems.periodId, data.data.periodId), eq(utilityCostItems.organizationId, session.organizationId)));
  revalidatePath("/app/utilities");
  revalidatePath(`/app/utilities/${data.data.periodId}`);
}
