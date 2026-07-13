import "server-only";
import { and, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { properties, renters, units } from "@/db/schema";

export type GlobalSearchResult = { id: string; type: "property" | "unit" | "renter"; title: string; subtitle: string; href: string };

export async function globalSearch(organizationId: string, rawQuery: string): Promise<GlobalSearchResult[]> {
  const query = `%${rawQuery.trim().replace(/[%_]/g, "")}%`;
  if (query.length < 4) return [];
  const db = getDb();
  const [propertyRows, unitRows, renterRows] = await Promise.all([
    db.select({ id: properties.id, name: properties.name, street: properties.street, houseNumber: properties.houseNumber, city: properties.city }).from(properties).where(and(sql`${properties.organizationId} = ${organizationId}`, or(ilike(properties.name, query), ilike(properties.street, query), ilike(properties.city, query)))).limit(6),
    db.select({ id: units.id, label: units.label, propertyName: properties.name, city: properties.city }).from(units).innerJoin(properties, and(sql`${properties.id} = ${units.propertyId}`, sql`${properties.organizationId} = ${organizationId}`)).where(and(sql`${units.organizationId} = ${organizationId}`, or(ilike(units.label, query), ilike(properties.name, query)))).limit(6),
    db.select({ id: renters.id, firstName: renters.firstName, lastName: renters.lastName, email: renters.email }).from(renters).where(and(sql`${renters.organizationId} = ${organizationId}`, or(ilike(renters.firstName, query), ilike(renters.lastName, query), ilike(renters.email, query)))).limit(6),
  ]);
  return [
    ...propertyRows.map((row) => ({ id: row.id, type: "property" as const, title: row.name, subtitle: `${row.street} ${row.houseNumber}, ${row.city}`, href: `/app/properties/${row.id}` })),
    ...unitRows.map((row) => ({ id: row.id, type: "unit" as const, title: `${row.propertyName} · ${row.label}`, subtitle: row.city, href: `/app/units/${row.id}` })),
    ...renterRows.map((row) => ({ id: row.id, type: "renter" as const, title: `${row.firstName} ${row.lastName}`, subtitle: row.email || "Mieter:in", href: `/app/renters?focus=${row.id}` })),
  ].slice(0, 12);
}
