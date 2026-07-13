"use server";

import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/auth/session";

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
