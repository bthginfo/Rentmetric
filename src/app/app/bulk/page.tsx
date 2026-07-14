import { and, asc, eq, isNull } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { BulkCreateCenter } from "@/components/bulk-create-center";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { properties, renters, units } from "@/db/schema";
import { bulkEntityTypes, type BulkEntityType } from "@/domain/bulk-import";

export default async function BulkPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const initialType = bulkEntityTypes.includes(query.type as BulkEntityType)
    ? query.type as BulkEntityType
    : "properties";
  const db = getDb();
  const [propertyRows, unitRows, renterRows] = await Promise.all([
    db.select({ id: properties.id, name: properties.name, postalCode: properties.postalCode, city: properties.city }).from(properties).where(and(eq(properties.organizationId, session.organizationId), isNull(properties.archivedAt))).orderBy(asc(properties.name)),
    db.select({ id: units.id, label: units.label, propertyName: properties.name, propertyPostalCode: properties.postalCode }).from(units).innerJoin(properties, and(eq(properties.id, units.propertyId), eq(properties.organizationId, session.organizationId), isNull(properties.archivedAt))).where(and(eq(units.organizationId, session.organizationId), isNull(units.archivedAt))).orderBy(asc(properties.name), asc(units.label)),
    db.select({ id: renters.id, firstName: renters.firstName, lastName: renters.lastName, email: renters.email }).from(renters).where(eq(renters.organizationId, session.organizationId)).orderBy(asc(renters.lastName), asc(renters.firstName)),
  ]);
  return <AppShell active="/app/bulk">
    <PageHeader eyebrow="Datenimport" title="Mehrere Datensätze anlegen" description="Bestände zeilenweise erfassen oder mit einer geprüften CSV übernehmen." />
    <BulkCreateCenter key={initialType} initialType={initialType} properties={propertyRows} units={unitRows} renters={renterRows} />
  </AppShell>;
}
