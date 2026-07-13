import "server-only";
import { and, asc, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  properties,
  propertyImages,
  renters,
  tenancies,
  units,
} from "@/db/schema";

export async function listOrganizationProperties(
  organizationId: string,
  lifecycle: "active" | "archived" = "active",
) {
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
    .leftJoin(
      units,
      and(
        eq(units.propertyId, properties.id),
        eq(units.organizationId, organizationId),
      ),
    )
    .where(
      and(
        eq(properties.organizationId, organizationId),
        lifecycle === "archived"
          ? isNotNull(properties.archivedAt)
          : isNull(properties.archivedAt),
      ),
    )
    .groupBy(properties.id)
    .orderBy(asc(properties.name));
}

export async function listOrganizationUnits(
  organizationId: string,
  lifecycle: "active" | "archived" = "active",
) {
  if (!organizationId) throw new Error("organizationId ist erforderlich");
  return getDb()
    .select({
      id: units.id,
      label: units.label,
      floor: units.floor,
      areaSqm: units.areaSqm,
      roomsTimesTen: units.roomsTimesTen,
      status: units.status,
      targetColdRentCents: units.targetColdRentCents,
      condition: units.condition,
      effectiveConstructionYear: units.effectiveConstructionYear,
      locationCategory: units.locationCategory,
      rentIndexFeatures: units.rentIndexFeatures,
      hasBalcony: units.hasBalcony,
      hasFittedKitchen: units.hasFittedKitchen,
      outdoorAreaTimesTen: units.outdoorAreaTimesTen,
      bathroomAreaTimesTen: units.bathroomAreaTimesTen,
      yearBuilt: properties.yearBuilt,
      propertyId: properties.id,
      propertyName: properties.name,
      city: properties.city,
    })
    .from(units)
    .innerJoin(
      properties,
      and(
        eq(properties.id, units.propertyId),
        eq(properties.organizationId, organizationId),
      ),
    )
    .where(
      and(
        eq(units.organizationId, organizationId),
        isNull(properties.archivedAt),
        lifecycle === "archived"
          ? isNotNull(units.archivedAt)
          : isNull(units.archivedAt),
      ),
    )
    .orderBy(asc(properties.name), asc(units.label));
}

export async function getOrganizationProperty(
  organizationId: string,
  propertyId: string,
) {
  const db = getDb();
  const [property] = await db
    .select()
    .from(properties)
    .where(
      and(
        eq(properties.id, propertyId),
        eq(properties.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!property) return null;
  const [propertyUnits, images] = await Promise.all([
    db
      .select()
      .from(units)
      .where(
        and(
          eq(units.propertyId, propertyId),
          eq(units.organizationId, organizationId),
          isNull(units.archivedAt),
        ),
      )
      .orderBy(asc(units.label)),
    db
      .select()
      .from(propertyImages)
      .where(
        and(
          eq(propertyImages.propertyId, propertyId),
          eq(propertyImages.organizationId, organizationId),
        ),
      )
      .orderBy(asc(propertyImages.sortOrder), asc(propertyImages.createdAt)),
  ]);
  return { ...property, units: propertyUnits, images };
}

export async function getOrganizationUnit(
  organizationId: string,
  unitId: string,
) {
  const db = getDb();
  const [result] = await db
    .select({ unit: units, property: properties })
    .from(units)
    .innerJoin(
      properties,
      and(
        eq(properties.id, units.propertyId),
        eq(properties.organizationId, organizationId),
      ),
    )
    .where(and(eq(units.id, unitId), eq(units.organizationId, organizationId)))
    .limit(1);
  if (!result) return null;
  const tenancyHistory = await db
    .select({
      id: tenancies.id,
      startsAt: tenancies.startsAt,
      endsAt: tenancies.endsAt,
      coldRentCents: tenancies.coldRentCents,
      utilityAdvanceCents: tenancies.utilityAdvanceCents,
      depositCents: tenancies.depositCents,
      renterId: renters.id,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
      renterEmail: renters.email,
      renterPhone: renters.phone,
    })
    .from(tenancies)
    .innerJoin(
      renters,
      and(
        eq(renters.id, tenancies.renterId),
        eq(renters.organizationId, organizationId),
      ),
    )
    .where(
      and(
        eq(tenancies.organizationId, organizationId),
        eq(tenancies.unitId, unitId),
      ),
    )
    .orderBy(desc(tenancies.startsAt));
  const now = new Date();
  const currentTenancy =
    tenancyHistory.find(
      (tenancy) =>
        tenancy.startsAt <= now && (!tenancy.endsAt || tenancy.endsAt >= now),
    ) ?? null;
  return { ...result, currentTenancy, tenancyHistory };
}

export async function listOrganizationRenters(organizationId: string) {
  if (!organizationId) throw new Error("organizationId ist erforderlich");
  const db = getDb();
  const [people, tenancyRows] = await Promise.all([
    db
    .select({
      id: renters.id,
      firstName: renters.firstName,
      lastName: renters.lastName,
      email: renters.email,
      phone: renters.phone,
    })
    .from(renters)
    .where(eq(renters.organizationId, organizationId))
    .orderBy(asc(renters.lastName), asc(renters.firstName)),
    db
      .select({
        id: tenancies.id,
        renterId: tenancies.renterId,
        startsAt: tenancies.startsAt,
        endsAt: tenancies.endsAt,
        unitId: units.id,
        unitLabel: units.label,
        propertyId: properties.id,
        propertyName: properties.name,
      })
      .from(tenancies)
      .innerJoin(
        units,
        and(
          eq(units.id, tenancies.unitId),
          eq(units.organizationId, organizationId),
        ),
      )
      .innerJoin(
        properties,
        and(
          eq(properties.id, units.propertyId),
          eq(properties.organizationId, organizationId),
        ),
      )
      .where(eq(tenancies.organizationId, organizationId))
      .orderBy(desc(tenancies.startsAt)),
  ]);
  const now = new Date();
  return people.map((renter) => ({
    ...renter,
    currentTenancy:
      tenancyRows.find(
        (tenancy) =>
          tenancy.renterId === renter.id &&
          tenancy.startsAt <= now &&
          (!tenancy.endsAt || tenancy.endsAt >= now),
      ) ?? null,
  }));
}

export async function getOrganizationRenter(
  organizationId: string,
  renterId: string,
) {
  if (!organizationId || !renterId) return null;
  const db = getDb();
  const [renter] = await db
    .select()
    .from(renters)
    .where(
      and(
        eq(renters.id, renterId),
        eq(renters.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!renter) return null;
  const tenancyHistory = await db
    .select({
      id: tenancies.id,
      startsAt: tenancies.startsAt,
      endsAt: tenancies.endsAt,
      coldRentCents: tenancies.coldRentCents,
      utilityAdvanceCents: tenancies.utilityAdvanceCents,
      depositCents: tenancies.depositCents,
      unitId: units.id,
      unitLabel: units.label,
      propertyId: properties.id,
      propertyName: properties.name,
      propertyStreet: properties.street,
      propertyHouseNumber: properties.houseNumber,
      propertyPostalCode: properties.postalCode,
      propertyCity: properties.city,
    })
    .from(tenancies)
    .innerJoin(
      units,
      and(
        eq(units.id, tenancies.unitId),
        eq(units.organizationId, organizationId),
      ),
    )
    .innerJoin(
      properties,
      and(
        eq(properties.id, units.propertyId),
        eq(properties.organizationId, organizationId),
      ),
    )
    .where(
      and(
        eq(tenancies.renterId, renterId),
        eq(tenancies.organizationId, organizationId),
      ),
    )
    .orderBy(desc(tenancies.startsAt));
  const now = new Date();
  const currentTenancy =
    tenancyHistory.find(
      (tenancy) =>
        tenancy.startsAt <= now &&
        (!tenancy.endsAt || tenancy.endsAt >= now),
    ) ?? null;
  return { renter, currentTenancy, tenancyHistory };
}

export async function organizationOwnsProperty(
  organizationId: string,
  propertyId: string,
) {
  const [result] = await getDb()
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        eq(properties.id, propertyId),
        eq(properties.organizationId, organizationId),
        isNull(properties.archivedAt),
      ),
    )
    .limit(1);
  return Boolean(result);
}
