"use server";

import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import {
  auditLogs,
  documents,
  maintenanceCases,
  properties,
  units,
  utilityPeriods,
} from "@/db/schema";

export type PropertyFormState =
  { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

const schema = z.object({
  name: z.string().trim().min(2, "Mindestens 2 Zeichen").max(120),
  street: z.string().trim().min(2, "Straße fehlt").max(120),
  houseNumber: z.string().trim().min(1, "Hausnummer fehlt").max(20),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Bitte fünfstellige PLZ eingeben"),
  city: z.string().trim().min(2, "Ort fehlt").max(100),
  state: z.string().trim().max(80).optional(),
  yearBuilt: z.coerce
    .number()
    .int()
    .min(1600)
    .max(new Date().getFullYear() + 2)
    .optional(),
  unitCount: z.coerce.number().int().min(1).max(100),
});

export async function createProperty(
  _: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const values = Object.fromEntries(formData);
  if (values.yearBuilt === "") delete values.yearBuilt;
  const parsed = schema.safeParse(values);
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await requireSession();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { error: "Datenbank ist nicht konfiguriert." };

  const propertyId = randomUUID();
  const sql = neon(databaseUrl);
  const unitQueries = Array.from(
    { length: parsed.data.unitCount },
    (_, index) => {
      const label =
        parsed.data.unitCount === 1 ? "Einheit 1" : `Einheit ${index + 1}`;
      return sql`insert into units (id, organization_id, property_id, label) values (${randomUUID()}, ${session.organizationId}, ${propertyId}, ${label})`;
    },
  );

  try {
    await sql.transaction([
      sql`insert into properties (id, organization_id, name, street, house_number, postal_code, city, state, year_built) values (${propertyId}, ${session.organizationId}, ${parsed.data.name}, ${parsed.data.street}, ${parsed.data.houseNumber}, ${parsed.data.postalCode}, ${parsed.data.city}, ${parsed.data.state || null}, ${parsed.data.yearBuilt || null})`,
      ...unitQueries,
      sql`insert into audit_logs (organization_id, user_id, action, entity_type, entity_id, changes) values (${session.organizationId}, ${session.userId}, 'property.created', 'property', ${propertyId}, ${JSON.stringify({ unitCount: parsed.data.unitCount })}::jsonb)`,
    ]);
  } catch {
    return {
      error:
        "Das Objekt konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    };
  }
  redirect("/app/properties?created=1");
}

export async function archiveProperty(formData: FormData) {
  const parsed = z.object({
    id: z.string().uuid(),
    confirmation: z.literal("ARCHIVIEREN"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const session = await requireSession();
  const db = getDb();
  const [property] = await db
    .update(properties)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(properties.id, parsed.data.id), eq(properties.organizationId, session.organizationId)))
    .returning({ id: properties.id });
  if (!property) return;
  await db.insert(auditLogs).values({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "property.archived",
    entityType: "property",
    entityId: property.id,
  });
  redirect("/app/properties?status=archived");
}

export async function restoreProperty(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const session = await requireSession();
  const db = getDb();
  const [property] = await db
    .update(properties)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(and(eq(properties.id, id.data), eq(properties.organizationId, session.organizationId), isNotNull(properties.archivedAt)))
    .returning({ id: properties.id });
  if (!property) return;
  await db.insert(auditLogs).values({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "property.restored",
    entityType: "property",
    entityId: property.id,
  });
  revalidatePath("/app/properties");
  redirect(`/app/properties/${property.id}`);
}

export async function deleteArchivedProperty(formData: FormData) {
  const parsed = z.object({
    id: z.string().uuid(),
    confirmation: z.literal("OBJEKT LÖSCHEN"),
    irreversible: z.literal("yes"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const session = await requireSession();
  const db = getDb();
  const [property] = await db.select({ id: properties.id }).from(properties).where(and(
    eq(properties.id, parsed.data.id),
    eq(properties.organizationId, session.organizationId),
    isNotNull(properties.archivedAt),
  )).limit(1);
  if (!property) return;
  const [unitRefs, documentRefs, maintenanceRefs, utilityRefs] = await Promise.all([
    db.select({ id: units.id }).from(units).where(and(eq(units.organizationId, session.organizationId), eq(units.propertyId, property.id))).limit(1),
    db.select({ id: documents.id }).from(documents).where(and(eq(documents.organizationId, session.organizationId), eq(documents.propertyId, property.id))).limit(1),
    db.select({ id: maintenanceCases.id }).from(maintenanceCases).where(and(eq(maintenanceCases.organizationId, session.organizationId), eq(maintenanceCases.propertyId, property.id))).limit(1),
    db.select({ id: utilityPeriods.id }).from(utilityPeriods).where(and(eq(utilityPeriods.organizationId, session.organizationId), eq(utilityPeriods.propertyId, property.id))).limit(1),
  ]);
  if (unitRefs.length || documentRefs.length || maintenanceRefs.length || utilityRefs.length) {
    redirect(`/app/properties/${property.id}?deleteBlocked=1`);
  }
  await db.delete(properties).where(and(eq(properties.id, property.id), eq(properties.organizationId, session.organizationId)));
  await db.insert(auditLogs).values({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "property.deleted",
    entityType: "property",
    entityId: property.id,
  });
  redirect("/app/properties?status=archived");
}
