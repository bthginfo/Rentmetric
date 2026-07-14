"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, gte, isNotNull, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import {
  auditLogs,
  documents,
  maintenanceCases,
  properties,
  tenancies,
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
  const propertyId = randomUUID();
  const unitRows = Array.from({ length: parsed.data.unitCount }, (_, index) => {
    const label =
      parsed.data.unitCount === 1 ? "Einheit 1" : `Einheit ${index + 1}`;
    return {
      id: randomUUID(),
      organizationId: session.organizationId,
      propertyId,
      label,
    };
  });

  try {
    const db = getDb();
    await db.batch([
      db
        .insert(properties)
        .values({
          id: propertyId,
          organizationId: session.organizationId,
          name: parsed.data.name,
          street: parsed.data.street,
          houseNumber: parsed.data.houseNumber,
          postalCode: parsed.data.postalCode,
          city: parsed.data.city,
          state: parsed.data.state || null,
          yearBuilt: parsed.data.yearBuilt || null,
        }),
      db.insert(units).values(unitRows),
      db
        .insert(auditLogs)
        .values({
          organizationId: session.organizationId,
          userId: session.userId,
          action: "property.created",
          entityType: "property",
          entityId: propertyId,
          changes: { unitCount: parsed.data.unitCount },
        }),
    ]);
  } catch {
    return {
      error:
        "Das Objekt konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    };
  }
  redirect("/app/properties?created=1");
}

export async function updateProperty(formData: FormData) {
  const values = Object.fromEntries(formData);
  if (values.yearBuilt === "") delete values.yearBuilt;
  const parsed = schema
    .omit({ unitCount: true })
    .extend({ id: z.string().uuid() })
    .safeParse(values);
  if (!parsed.success)
    redirect(
      `/app/properties/${String(formData.get("id") || "")}/edit?error=invalid`,
    );
  const session = await requireSession();
  const db = getDb();
  const [updated] = await db
    .update(properties)
    .set({
      name: parsed.data.name,
      street: parsed.data.street,
      houseNumber: parsed.data.houseNumber,
      postalCode: parsed.data.postalCode,
      city: parsed.data.city,
      state: parsed.data.state || null,
      yearBuilt: parsed.data.yearBuilt || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(properties.id, parsed.data.id),
        eq(properties.organizationId, session.organizationId),
        isNull(properties.archivedAt),
      ),
    )
    .returning({ id: properties.id });
  if (!updated) redirect(`/app/properties/${parsed.data.id}?editBlocked=1`);
  await db
    .insert(auditLogs)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "property.updated",
      entityType: "property",
      entityId: updated.id,
    });
  revalidatePath(`/app/properties/${updated.id}`);
  redirect(`/app/properties/${updated.id}?updated=1`);
}

export async function archiveProperty(formData: FormData) {
  const parsed = z
    .object({
      id: z.string().uuid(),
      confirmation: z.literal("ARCHIVIEREN"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const session = await requireSession();
  const db = getDb();
  const [activeTenancy] = await db
    .select({ id: tenancies.id })
    .from(tenancies)
    .innerJoin(
      units,
      and(
        eq(units.id, tenancies.unitId),
        eq(units.organizationId, session.organizationId),
      ),
    )
    .where(
      and(
        eq(tenancies.organizationId, session.organizationId),
        eq(units.propertyId, parsed.data.id),
        or(isNull(tenancies.endsAt), gte(tenancies.endsAt, new Date())),
      ),
    )
    .limit(1);
  if (activeTenancy)
    redirect(`/app/properties/${parsed.data.id}?archiveBlocked=1`);
  const [property] = await db
    .update(properties)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(properties.id, parsed.data.id),
        eq(properties.organizationId, session.organizationId),
      ),
    )
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
    .where(
      and(
        eq(properties.id, id.data),
        eq(properties.organizationId, session.organizationId),
        isNotNull(properties.archivedAt),
      ),
    )
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
  const parsed = z
    .object({
      id: z.string().uuid(),
      confirmation: z.literal("OBJEKT LÖSCHEN"),
      irreversible: z.literal("yes"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const session = await requireSession();
  const db = getDb();
  const [property] = await db
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        eq(properties.id, parsed.data.id),
        eq(properties.organizationId, session.organizationId),
        isNotNull(properties.archivedAt),
      ),
    )
    .limit(1);
  if (!property) return;
  const [unitRefs, documentRefs, maintenanceRefs, utilityRefs] =
    await Promise.all([
      db
        .select({ id: units.id })
        .from(units)
        .where(
          and(
            eq(units.organizationId, session.organizationId),
            eq(units.propertyId, property.id),
          ),
        )
        .limit(1),
      db
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.organizationId, session.organizationId),
            eq(documents.propertyId, property.id),
          ),
        )
        .limit(1),
      db
        .select({ id: maintenanceCases.id })
        .from(maintenanceCases)
        .where(
          and(
            eq(maintenanceCases.organizationId, session.organizationId),
            eq(maintenanceCases.propertyId, property.id),
          ),
        )
        .limit(1),
      db
        .select({ id: utilityPeriods.id })
        .from(utilityPeriods)
        .where(
          and(
            eq(utilityPeriods.organizationId, session.organizationId),
            eq(utilityPeriods.propertyId, property.id),
          ),
        )
        .limit(1),
    ]);
  if (
    unitRefs.length ||
    documentRefs.length ||
    maintenanceRefs.length ||
    utilityRefs.length
  ) {
    redirect(`/app/properties/${property.id}?deleteBlocked=1`);
  }
  await db
    .delete(properties)
    .where(
      and(
        eq(properties.id, property.id),
        eq(properties.organizationId, session.organizationId),
      ),
    );
  await db.insert(auditLogs).values({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "property.deleted",
    entityType: "property",
    entityId: property.id,
  });
  redirect("/app/properties?status=archived");
}
