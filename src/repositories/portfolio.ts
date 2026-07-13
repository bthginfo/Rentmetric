import "server-only";
import { and, asc, count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { properties, renters, units } from "@/db/schema";

export async function listOrganizationProperties(organizationId: string) {
  if (!organizationId) throw new Error("organizationId ist erforderlich");
  return getDb()
    .select({
      id: properties.id,
      name: properties.name,
      street: properties.street,
      houseNumber: properties.houseNumber,
      postalCode: properties.postalCode,
      city: properties.city,
      yearBuilt: properties.yearBuilt,
      unitCount: count(units.id),
    })
    .from(properties)
    .leftJoin(units, and(eq(units.propertyId, properties.id), eq(units.organizationId, organizationId)))
    .where(eq(properties.organizationId, organizationId))
    .groupBy(properties.id)
    .orderBy(asc(properties.name));
}

export async function listOrganizationUnits(organizationId: string) {
  if (!organizationId) throw new Error("organizationId ist erforderlich");
  return getDb()
    .select({
      id: units.id,
      label: units.label,
      floor: units.floor,
      areaSqm: units.areaSqm,
      roomsTimesTen: units.roomsTimesTen,
      propertyId: properties.id,
      propertyName: properties.name,
      city: properties.city,
    })
    .from(units)
    .innerJoin(properties, and(eq(properties.id, units.propertyId), eq(properties.organizationId, organizationId)))
    .where(eq(units.organizationId, organizationId))
    .orderBy(asc(properties.name), asc(units.label));
}

export async function listOrganizationRenters(organizationId: string) {
  if (!organizationId) throw new Error("organizationId ist erforderlich");
  return getDb()
    .select({ id: renters.id, firstName: renters.firstName, lastName: renters.lastName, email: renters.email, phone: renters.phone })
    .from(renters)
    .where(eq(renters.organizationId, organizationId))
    .orderBy(asc(renters.lastName), asc(renters.firstName));
}

export async function organizationOwnsProperty(organizationId: string, propertyId: string) {
  const [result] = await getDb()
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, organizationId)))
    .limit(1);
  return Boolean(result);
}

