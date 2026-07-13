"use server";

import { randomUUID } from "node:crypto";
import { and, eq, gte, isNotNull, isNull, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, documents, maintenanceCases, properties, tenancies, units, utilityCostAllocations } from "@/db/schema";
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
  effectiveConstructionYear: z.coerce.number().int().min(1700).max(2100).optional(),
  modernizationYear: z.coerce.number().int().min(1700).max(2100).optional(),
  locationCategory: z.string().trim().max(60).optional(),
  buildingType: z.string().trim().max(80).optional(),
  unitType: z.string().trim().max(80).optional(),
  outdoorArea: z.coerce.number().nonnegative().max(1000).optional(),
  bathroomArea: z.coerce.number().nonnegative().max(1000).optional(),
  hasBalcony: z.coerce.boolean().default(false),
  hasFittedKitchen: z.coerce.boolean().default(false),
  hasElevator: z.coerce.boolean().default(false),
  isAccessible: z.coerce.boolean().default(false),
  notes: z.string().trim().max(3000).optional(),
});

const featureNames = [
  "isFurnished", "isBasement", "isAttic", "hasOpenKitchen", "hasDishwasher",
  "hasCeramicHob", "hasFridge", "hasUnderfloorHeating", "hasIncompleteHeating",
  "hasWalkInShower", "hasTowelRadiator", "hasSecondBathroom", "hasElectricShutters",
  "hasVideoIntercom", "hasModernWindows", "hasModernFlooring", "hasStuck",
] as const;

function rentIndexFeatures(formData: FormData) {
  return Object.fromEntries(featureNames.map((name) => [name, formData.has(name)]));
}

export async function createUnit(
  _: UnitFormState,
  formData: FormData,
): Promise<UnitFormState> {
  const values = Object.fromEntries(formData);
  if (values.areaSqm === "") delete values.areaSqm;
  if (values.rooms === "") delete values.rooms;
  if (values.targetColdRent === "") delete values.targetColdRent;
  if (values.utilityEstimate === "") delete values.utilityEstimate;
  for (const key of ["effectiveConstructionYear", "modernizationYear", "outdoorArea", "bathroomArea"])
    if (values[key] === "") delete values[key];
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
    effectiveConstructionYear: parsed.data.effectiveConstructionYear,
    modernizationYear: parsed.data.modernizationYear,
    locationCategory: parsed.data.locationCategory || null,
    buildingType: parsed.data.buildingType || null,
    unitType: parsed.data.unitType || null,
    outdoorAreaTimesTen: parsed.data.outdoorArea == null ? null : Math.round(parsed.data.outdoorArea * 10),
    bathroomAreaTimesTen: parsed.data.bathroomArea == null ? null : Math.round(parsed.data.bathroomArea * 10),
    rentIndexFeatures: rentIndexFeatures(formData),
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
  for (const key of ["areaSqm", "rooms", "targetColdRent", "utilityEstimate", "effectiveConstructionYear", "modernizationYear", "outdoorArea", "bathroomArea"])
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
      effectiveConstructionYear: parsed.data.effectiveConstructionYear ?? null,
      modernizationYear: parsed.data.modernizationYear ?? null,
      locationCategory: parsed.data.locationCategory || null,
      buildingType: parsed.data.buildingType || null,
      unitType: parsed.data.unitType || null,
      outdoorAreaTimesTen: parsed.data.outdoorArea == null ? null : Math.round(parsed.data.outdoorArea * 10),
      bathroomAreaTimesTen: parsed.data.bathroomArea == null ? null : Math.round(parsed.data.bathroomArea * 10),
      rentIndexFeatures: rentIndexFeatures(formData),
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

export async function archiveUnit(formData: FormData) {
  const parsed = z.object({ id: z.string().uuid(), confirmation: z.literal("ARCHIVIEREN") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const session = await requireSession();
  const db = getDb();
  const [unit] = await db.select({ id: units.id }).from(units).where(and(eq(units.id, parsed.data.id), eq(units.organizationId, session.organizationId), isNull(units.archivedAt))).limit(1);
  if (!unit) return;
  const [activeTenancy] = await db.select({ id: tenancies.id }).from(tenancies).where(and(eq(tenancies.organizationId, session.organizationId), eq(tenancies.unitId, unit.id), or(isNull(tenancies.endsAt), gte(tenancies.endsAt, new Date())))).limit(1);
  if (activeTenancy) redirect(`/app/units/${unit.id}?archiveBlocked=1`);
  await db.update(units).set({ archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(units.id, unit.id), eq(units.organizationId, session.organizationId)));
  await db.insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "unit.archived", entityType: "unit", entityId: unit.id });
  redirect("/app/units?status=archived");
}

export async function restoreUnit(formData: FormData) {
  const parsed = z.object({ id: z.string().uuid(), confirmation: z.literal("WIEDERHERSTELLEN") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const session = await requireSession();
  const db = getDb();
  const [unit] = await db.select({ id: units.id, propertyId: units.propertyId }).from(units).innerJoin(properties, and(eq(properties.id, units.propertyId), eq(properties.organizationId, session.organizationId), isNull(properties.archivedAt))).where(and(eq(units.id, parsed.data.id), eq(units.organizationId, session.organizationId), isNotNull(units.archivedAt))).limit(1);
  if (!unit) redirect(`/app/units/${parsed.data.id}?restoreBlocked=1`);
  await db.update(units).set({ archivedAt: null, updatedAt: new Date() }).where(and(eq(units.id, unit.id), eq(units.organizationId, session.organizationId)));
  await db.insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "unit.restored", entityType: "unit", entityId: unit.id });
  revalidatePath("/app/units");
  redirect(`/app/units/${unit.id}?restored=1`);
}

export async function deleteArchivedUnit(formData: FormData) {
  const parsed = z.object({ id: z.string().uuid(), confirmation: z.literal("EINHEIT LÖSCHEN"), irreversible: z.literal("yes") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const session = await requireSession();
  const db = getDb();
  const [unit] = await db.select({ id: units.id }).from(units).where(and(eq(units.id, parsed.data.id), eq(units.organizationId, session.organizationId), isNotNull(units.archivedAt))).limit(1);
  if (!unit) return;
  const [tenancyRefs, documentRefs, maintenanceRefs, allocationRefs] = await Promise.all([
    db.select({ id: tenancies.id }).from(tenancies).where(and(eq(tenancies.organizationId, session.organizationId), eq(tenancies.unitId, unit.id))).limit(1),
    db.select({ id: documents.id }).from(documents).where(and(eq(documents.organizationId, session.organizationId), eq(documents.unitId, unit.id))).limit(1),
    db.select({ id: maintenanceCases.id }).from(maintenanceCases).where(and(eq(maintenanceCases.organizationId, session.organizationId), eq(maintenanceCases.unitId, unit.id))).limit(1),
    db.select({ id: utilityCostAllocations.id }).from(utilityCostAllocations).where(and(eq(utilityCostAllocations.organizationId, session.organizationId), eq(utilityCostAllocations.unitId, unit.id))).limit(1),
  ]);
  if (tenancyRefs.length || documentRefs.length || maintenanceRefs.length || allocationRefs.length) redirect(`/app/units/${unit.id}?deleteBlocked=1`);
  await db.delete(units).where(and(eq(units.id, unit.id), eq(units.organizationId, session.organizationId)));
  await db.insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "unit.deleted", entityType: "unit", entityId: unit.id });
  redirect("/app/units?status=archived");
}
