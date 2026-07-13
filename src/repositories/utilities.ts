import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { documents, organizations, properties, renters, tenancies, units, utilityCostAllocations, utilityCostItems, utilityPeriods } from "@/db/schema";
import { calculateUtilityStatements } from "@/domain/utility-statements";

export async function getUtilityWorkspace(organizationId: string, periodId: string) {
  const db = getDb();
  const [period] = await db.select({ period: utilityPeriods, property: properties, organization: organizations }).from(utilityPeriods).innerJoin(properties, eq(properties.id, utilityPeriods.propertyId)).innerJoin(organizations, eq(organizations.id, utilityPeriods.organizationId)).where(and(eq(utilityPeriods.id, periodId), eq(utilityPeriods.organizationId, organizationId))).limit(1);
  if (!period) return null;
  const [costs, propertyUnits, tenancyRows, receipts, allocationRows] = await Promise.all([
    db.select().from(utilityCostItems).where(and(eq(utilityCostItems.periodId, periodId), eq(utilityCostItems.organizationId, organizationId))).orderBy(asc(utilityCostItems.createdAt)),
    db.select().from(units).where(and(eq(units.propertyId, period.period.propertyId), eq(units.organizationId, organizationId))).orderBy(asc(units.label)),
    db.select({ tenancy: tenancies, renter: renters }).from(tenancies).innerJoin(renters, eq(renters.id, tenancies.renterId)).innerJoin(units, eq(units.id, tenancies.unitId)).where(and(eq(tenancies.organizationId, organizationId), eq(units.propertyId, period.period.propertyId))),
    db.select().from(documents).where(and(eq(documents.organizationId, organizationId), eq(documents.utilityPeriodId, periodId))).orderBy(asc(documents.createdAt)),
    db.select({ id: utilityCostAllocations.id, organizationId: utilityCostAllocations.organizationId, costItemId: utilityCostAllocations.costItemId, unitId: utilityCostAllocations.unitId, weightValue: utilityCostAllocations.weightValue, amountCents: utilityCostAllocations.amountCents }).from(utilityCostAllocations).innerJoin(utilityCostItems, eq(utilityCostItems.id, utilityCostAllocations.costItemId)).where(and(eq(utilityCostAllocations.organizationId, organizationId), eq(utilityCostItems.periodId, periodId))),
  ]);
  const calculation = calculateUtilityStatements({
    periodStart: period.period.startsAt,
    periodEnd: period.period.endsAt,
    costs,
    units: propertyUnits.map((unit) => ({ id: unit.id, label: unit.label, areaSqm: unit.areaSqm })),
    allocations: allocationRows,
    tenancies: tenancyRows.map((row) => ({ id: row.tenancy.id, unitId: row.tenancy.unitId, renterName: `${row.renter.firstName} ${row.renter.lastName}`, startsAt: row.tenancy.startsAt, endsAt: row.tenancy.endsAt, utilityAdvanceCents: row.tenancy.utilityAdvanceCents })),
  });
  return { ...period, costs, propertyUnits, tenancyRows, receipts, allocationRows, calculation };
}
