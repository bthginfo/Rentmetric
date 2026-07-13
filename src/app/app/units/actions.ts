"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, units } from "@/db/schema";
import { organizationOwnsProperty } from "@/repositories/portfolio";

export type UnitFormState =
  { error?: string; fieldErrors?: Record<string, string[]> } | undefined;
const schema = z.object({
  propertyId: z.string().uuid(),
  label: z.string().trim().min(1).max(80),
  floor: z.string().trim().max(40).optional(),
  areaSqm: z.coerce.number().int().positive().max(5000).optional(),
  rooms: z.coerce.number().positive().max(100).optional(),
  status: z
    .enum(["vacant", "occupied", "owner_occupied", "renovation"])
    .default("vacant"),
  targetColdRent: z.coerce.number().nonnegative().max(100000).optional(),
  utilityEstimate: z.coerce.number().nonnegative().max(100000).optional(),
  condition: z.string().trim().max(80).optional(),
  heatingType: z.string().trim().max(80).optional(),
  energySource: z.string().trim().max(80).optional(),
  bathroom: z.string().trim().max(120).optional(),
  flooring: z.string().trim().max(120).optional(),
  parkingSpaces: z.coerce.number().int().nonnegative().max(20).default(0),
  hasBalcony: z.coerce.boolean().default(false),
  hasFittedKitchen: z.coerce.boolean().default(false),
  hasElevator: z.coerce.boolean().default(false),
  isAccessible: z.coerce.boolean().default(false),
  notes: z.string().trim().max(3000).optional(),
});

export async function createUnit(
  _: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  const values = Object.fromEntries(formData);
  if (values.areaSqm === "") delete values.areaSqm;
  if (values.rooms === "") delete values.rooms;
  if (values.targetColdRent === "") delete values.targetColdRent;
  if (values.utilityEstimate === "") delete values.utilityEstimate;
  const parsed = schema.safeParse(values);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await requireSession();
  if (
    !(await organizationOwnsProperty(
      session.organizationId,
      parsed.data.propertyId,
    ))
  )
    return { error: "Objekt wurde nicht gefunden." };
  const id = randomUUID();
  const db = getDb();
  await db.insert(units).values({
    id,
    organizationId: session.organizationId,
    propertyId: parsed.data.propertyId,
    label: parsed.data.label,
    floor: parsed.data.floor || null,
    areaSqm: parsed.data.areaSqm,
    roomsTimesTen: parsed.data.rooms
      ? Math.round(parsed.data.rooms * 10)
      : undefined,
    status: parsed.data.status,
    targetColdRentCents:
      parsed.data.targetColdRent == null
        ? undefined
        : Math.round(parsed.data.targetColdRent * 100),
    utilityEstimateCents:
      parsed.data.utilityEstimate == null
        ? undefined
        : Math.round(parsed.data.utilityEstimate * 100),
    condition: parsed.data.condition || null,
    heatingType: parsed.data.heatingType || null,
    energySource: parsed.data.energySource || null,
    bathroom: parsed.data.bathroom || null,
    flooring: parsed.data.flooring || null,
    parkingSpaces: parsed.data.parkingSpaces,
    hasBalcony: parsed.data.hasBalcony,
    hasFittedKitchen: parsed.data.hasFittedKitchen,
    hasElevator: parsed.data.hasElevator,
    isAccessible: parsed.data.isAccessible,
    notes: parsed.data.notes || null,
  });
  await db
    .insert(auditLogs)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "unit.created",
      entityType: "unit",
      entityId: id,
    });
  redirect(`/app/properties/${parsed.data.propertyId}?unitCreated=1`);
}

export async function updateUnit(
  unitId: string,
  _: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  const values = Object.fromEntries(formData);
  for (const key of ["areaSqm", "rooms", "targetColdRent", "utilityEstimate"])
    if (values[key] === "") delete values[key];
  const parsed = schema.safeParse(values);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await requireSession();
  const db = getDb();
  const [existing] = await db
    .select({ id: units.id })
    .from(units)
    .where(
      and(
        eq(units.id, unitId),
        eq(units.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (
    !existing ||
    !(await organizationOwnsProperty(
      session.organizationId,
      parsed.data.propertyId,
    ))
  )
    return { error: "Einheit wurde nicht gefunden." };
  await db
    .update(units)
    .set({
      propertyId: parsed.data.propertyId,
      label: parsed.data.label,
      floor: parsed.data.floor || null,
      areaSqm: parsed.data.areaSqm,
      roomsTimesTen: parsed.data.rooms
        ? Math.round(parsed.data.rooms * 10)
        : null,
      status: parsed.data.status,
      targetColdRentCents:
        parsed.data.targetColdRent == null
          ? null
          : Math.round(parsed.data.targetColdRent * 100),
      utilityEstimateCents:
        parsed.data.utilityEstimate == null
          ? null
          : Math.round(parsed.data.utilityEstimate * 100),
      condition: parsed.data.condition || null,
      heatingType: parsed.data.heatingType || null,
      energySource: parsed.data.energySource || null,
      bathroom: parsed.data.bathroom || null,
      flooring: parsed.data.flooring || null,
      parkingSpaces: parsed.data.parkingSpaces,
      hasBalcony: parsed.data.hasBalcony,
      hasFittedKitchen: parsed.data.hasFittedKitchen,
      hasElevator: parsed.data.hasElevator,
      isAccessible: parsed.data.isAccessible,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(units.id, unitId),
        eq(units.organizationId, session.organizationId),
      ),
    );
  await db
    .insert(auditLogs)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "unit.updated",
      entityType: "unit",
      entityId: unitId,
    });
  redirect(`/app/units/${unitId}?updated=1`);
}
