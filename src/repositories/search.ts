import "server-only";
import { and, ilike, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { documents, maintenanceCases, properties, renters, rentIndexSources, tasks, units } from "@/db/schema";

export type GlobalSearchResult = {
  id: string;
  type: "property" | "unit" | "renter" | "document" | "case" | "task" | "source";
  title: string;
  subtitle: string;
  href: string;
};

export async function globalSearch(
  organizationId: string,
  rawQuery: string,
): Promise<GlobalSearchResult[]> {
  const query = `%${rawQuery.trim().replace(/[%_]/g, "")}%`;
  if (query.length < 4) return [];
  const db = getDb();
  const [propertyRows, unitRows, renterRows, documentRows, caseRows, taskRows, sourceRows] = await Promise.all([
    db
      .select({
        id: properties.id,
        name: properties.name,
        street: properties.street,
        houseNumber: properties.houseNumber,
        city: properties.city,
      })
      .from(properties)
      .where(
        and(
          sql`${properties.organizationId} = ${organizationId}`,
          isNull(properties.archivedAt),
          or(
            ilike(properties.name, query),
            ilike(properties.street, query),
            ilike(properties.city, query),
          ),
        ),
      )
      .limit(6),
    db
      .select({
        id: units.id,
        label: units.label,
        propertyName: properties.name,
        city: properties.city,
      })
      .from(units)
      .innerJoin(
        properties,
        and(
          sql`${properties.id} = ${units.propertyId}`,
          sql`${properties.organizationId} = ${organizationId}`,
        ),
      )
      .where(
        and(
          sql`${units.organizationId} = ${organizationId}`,
          isNull(units.archivedAt),
          isNull(properties.archivedAt),
          or(ilike(units.label, query), ilike(properties.name, query)),
        ),
      )
      .limit(6),
    db
      .select({
        id: renters.id,
        firstName: renters.firstName,
        lastName: renters.lastName,
        email: renters.email,
      })
      .from(renters)
      .where(
        and(
          sql`${renters.organizationId} = ${organizationId}`,
          or(
            ilike(renters.firstName, query),
            ilike(renters.lastName, query),
            ilike(renters.email, query),
          ),
        ),
      )
      .limit(6),
    db.select({ id: documents.id, title: documents.title, category: documents.category }).from(documents).where(and(sql`${documents.organizationId} = ${organizationId}`, or(ilike(documents.title, query), ilike(documents.originalFilename, query), ilike(documents.category, query)))).limit(5),
    db.select({ id: maintenanceCases.id, title: maintenanceCases.title, category: maintenanceCases.category, status: maintenanceCases.status }).from(maintenanceCases).where(and(sql`${maintenanceCases.organizationId} = ${organizationId}`, or(ilike(maintenanceCases.title, query), ilike(maintenanceCases.description, query)))).limit(5),
    db.select({ id: tasks.id, title: tasks.title, status: tasks.status }).from(tasks).where(and(sql`${tasks.organizationId} = ${organizationId}`, or(ilike(tasks.title, query), ilike(tasks.description, query)))).limit(5),
    db.select({ id: rentIndexSources.id, municipality: rentIndexSources.municipality, version: rentIndexSources.version, status: rentIndexSources.status }).from(rentIndexSources).where(and(sql`${rentIndexSources.organizationId} = ${organizationId}`, or(ilike(rentIndexSources.municipality, query), ilike(rentIndexSources.version, query)))).limit(5),
  ]);
  return [
    ...propertyRows.map((row) => ({
      id: row.id,
      type: "property" as const,
      title: row.name,
      subtitle: `${row.street} ${row.houseNumber}, ${row.city}`,
      href: `/app/properties/${row.id}`,
    })),
    ...unitRows.map((row) => ({
      id: row.id,
      type: "unit" as const,
      title: `${row.propertyName} · ${row.label}`,
      subtitle: row.city,
      href: `/app/units/${row.id}`,
    })),
    ...renterRows.map((row) => ({
      id: row.id,
      type: "renter" as const,
      title: `${row.firstName} ${row.lastName}`,
      subtitle: row.email || "Mieter:in",
      href: `/app/renters?focus=${row.id}`,
    })),
    ...documentRows.map((row) => ({ id: row.id, type: "document" as const, title: row.title, subtitle: row.category, href: "/app/documents" })),
    ...caseRows.map((row) => ({ id: row.id, type: "case" as const, title: row.title, subtitle: `${row.category} · ${row.status}`, href: `/app/maintenance/${row.id}` })),
    ...taskRows.map((row) => ({ id: row.id, type: "task" as const, title: row.title, subtitle: row.status, href: "/app/tasks" })),
    ...sourceRows.map((row) => ({ id: row.id, type: "source" as const, title: `${row.municipality} ${row.version}`, subtitle: row.status, href: `/app/rent-index/sources/${row.id}/edit` })),
  ].slice(0, 24);
}
