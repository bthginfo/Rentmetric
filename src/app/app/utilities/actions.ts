"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { properties, utilityCostItems, utilityPeriods } from "@/db/schema";
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
  await db
    .insert(utilityPeriods)
    .values({
      organizationId: session.organizationId,
      propertyId: property.id,
      title: data.data.title,
      startsAt: new Date(`${data.data.startsAt}T12:00:00`),
      endsAt: new Date(`${data.data.endsAt}T12:00:00`),
    });
  revalidatePath("/app/utilities");
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
}

export async function updateUtilityPeriodStatus(formData: FormData) {
  const data = z.object({ id: z.string().uuid(), status: z.enum(["draft", "review", "final"]) }).safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession();
  await getDb().update(utilityPeriods).set({ status: data.data.status, updatedAt: new Date() }).where(and(eq(utilityPeriods.id, data.data.id), eq(utilityPeriods.organizationId, session.organizationId)));
  revalidatePath("/app/utilities"); revalidatePath(`/app/utilities/${data.data.id}`);
}
