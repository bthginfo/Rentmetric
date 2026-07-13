import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { properties, renters, tenancies, units } from "@/db/schema";

export async function listOrganizationTenancies(organizationId: string) {
  return getDb()
    .select({
      id: tenancies.id,
      startsAt: tenancies.startsAt,
      endsAt: tenancies.endsAt,
      coldRentCents: tenancies.coldRentCents,
      utilityAdvanceCents: tenancies.utilityAdvanceCents,
      depositCents: tenancies.depositCents,
      lastRentIncreaseAt: tenancies.lastRentIncreaseAt,
      renterId: renters.id,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
      unitId: units.id,
      unitLabel: units.label,
      areaSqm: units.areaSqm,
      propertyName: properties.name,
    })
    .from(tenancies)
    .innerJoin(renters, eq(renters.id, tenancies.renterId))
    .innerJoin(units, eq(units.id, tenancies.unitId))
    .innerJoin(properties, eq(properties.id, units.propertyId))
    .where(
      and(
        eq(tenancies.organizationId, organizationId),
        eq(renters.organizationId, organizationId),
        eq(units.organizationId, organizationId),
      ),
    )
    .orderBy(desc(tenancies.startsAt));
}
