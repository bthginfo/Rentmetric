import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { startOfMonth, subMonths } from "date-fns";
import { getDb } from "@/db/client";
import { maintenanceCases, payments, properties, tenancies, units, utilityCostItems, utilityPeriods } from "@/db/schema";

export async function getAnalyticsData(organizationId: string) {
  const db = getDb(); const now = new Date(); const chartStart = subMonths(startOfMonth(now), 11);
  const [propertyRows, allUnitRows, allTenancyRows, allPaymentRows, allCostRows, allCaseRows] = await Promise.all([
    db.select().from(properties).where(and(eq(properties.organizationId, organizationId), isNull(properties.archivedAt))),
    db.select().from(units).where(and(eq(units.organizationId, organizationId), isNull(units.archivedAt))),
    db.select().from(tenancies).where(eq(tenancies.organizationId, organizationId)),
    db.select().from(payments).where(eq(payments.organizationId, organizationId)),
    db.select({ item: utilityCostItems, period: utilityPeriods }).from(utilityCostItems).innerJoin(utilityPeriods, eq(utilityPeriods.id, utilityCostItems.periodId)).where(eq(utilityCostItems.organizationId, organizationId)),
    db.select().from(maintenanceCases).where(eq(maintenanceCases.organizationId, organizationId)),
  ]);
  const activePropertyIds = new Set(propertyRows.map((row) => row.id));
  const unitRows = allUnitRows.filter((row) => activePropertyIds.has(row.propertyId));
  const activeUnitIds = new Set(unitRows.map((row) => row.id));
  const tenancyRows = allTenancyRows.filter((row) => activeUnitIds.has(row.unitId));
  const activeTenancyIds = new Set(tenancyRows.map((row) => row.id));
  const paymentRows = allPaymentRows.filter((row) => activeTenancyIds.has(row.tenancyId));
  const costRows = allCostRows.filter((row) => activePropertyIds.has(row.period.propertyId));
  const caseRows = allCaseRows.filter((row) =>
    row.propertyId ? activePropertyIds.has(row.propertyId) : row.unitId ? activeUnitIds.has(row.unitId) : true,
  );
  const current = tenancyRows.filter((row) => row.startsAt <= now && (!row.endsAt || row.endsAt >= now)); const currentByUnit = new Map(current.map((row) => [row.unitId, row]));
  const monthly = Array.from({ length: 12 }, (_, index) => { const date = new Date(chartStart.getFullYear(), chartStart.getMonth() + index, 1); const next = new Date(date.getFullYear(), date.getMonth() + 1, 1); const rows = paymentRows.filter((row) => row.dueAt >= date && row.dueAt < next); return { month: date.toLocaleDateString("de-DE", { month: "short" }), due: rows.reduce((sum, row) => sum + row.amountCents, 0) / 100, paid: rows.filter((row) => row.paidAt).reduce((sum, row) => sum + row.amountCents, 0) / 100 } });
  const propertiesData = propertyRows.map((property) => { const scoped = unitRows.filter((unit) => unit.propertyId === property.id); const area = scoped.reduce((sum, unit) => sum + (unit.areaSqm || 0), 0); const rent = scoped.reduce((sum, unit) => sum + (currentByUnit.get(unit.id)?.coldRentCents || 0), 0); const targetRent = scoped.reduce((sum, unit) => sum + (unit.targetColdRentCents || 0), 0); return { id: property.id, name: property.name, units: scoped.length, occupied: scoped.filter((unit) => currentByUnit.has(unit.id)).length, area, rent: rent / 100, targetRent: targetRent / 100, rentPerSqm: area ? rent / 100 / area : 0 } });
  const openPayments = paymentRows.filter((row) => !row.paidAt);
  const arrearsAging = [
    { name: "Noch nicht fällig", min: -Infinity, max: 0 },
    { name: "1–30 Tage", min: 1, max: 30 },
    { name: "31–60 Tage", min: 31, max: 60 },
    { name: "61–90 Tage", min: 61, max: 90 },
    { name: "Über 90 Tage", min: 91, max: Infinity },
  ].map((bucket) => {
    const rows = openPayments.filter((row) => {
      const days = Math.floor((now.getTime() - row.dueAt.getTime()) / 86400000);
      return days >= bucket.min && days <= bucket.max;
    });
    return { name: bucket.name, value: rows.reduce((sum, row) => sum + row.amountCents, 0) / 100, count: rows.length };
  });
  const maintenanceMonthly = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(chartStart.getFullYear(), chartStart.getMonth() + index, 1);
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const rows = caseRows.filter((row) => row.createdAt >= date && row.createdAt < next);
    return { month: date.toLocaleDateString("de-DE", { month: "short" }), count: rows.length, cost: rows.reduce((sum, row) => sum + (row.actualCostCents || row.estimatedCostCents || 0), 0) / 100 };
  });
  const propertyByUnit = new Map(unitRows.map((unit) => [unit.id, unit.propertyId]));
  const costRatioByProperty = propertiesData.map((property) => {
    const utility = costRows.filter((row) => row.period.propertyId === property.id).reduce((sum, row) => sum + row.item.amountCents, 0) / 100;
    const maintenance = caseRows.filter((row) => row.propertyId === property.id || (row.unitId && propertyByUnit.get(row.unitId) === property.id)).reduce((sum, row) => sum + (row.actualCostCents || row.estimatedCostCents || 0), 0) / 100;
    const annualRent = property.rent * 12;
    return { name: property.name, costs: utility + maintenance, ratio: annualRent ? (utility + maintenance) / annualRent * 100 : 0 };
  });
  const currentRent = current.reduce((sum, row) => sum + row.coldRentCents, 0); const occupiedArea = unitRows.filter((unit) => currentByUnit.has(unit.id)).reduce((sum, unit) => sum + (unit.areaSqm || 0), 0); const vacant = unitRows.filter((unit) => !currentByUnit.has(unit.id)); const averageRentSqm = occupiedArea ? currentRent / 100 / occupiedArea : 0; const vacancyPotential = vacant.reduce((sum, unit) => sum + (unit.targetColdRentCents || Math.round((unit.areaSqm || 0) * averageRentSqm * 100)), 0);
  const rentGap = unitRows.reduce((sum, unit) => Math.max(0, (unit.targetColdRentCents || 0) - (currentByUnit.get(unit.id)?.coldRentCents || 0)) + sum, 0);
  const utilityByCategory = Object.entries(costRows.reduce<Record<string, number>>((acc, row) => { acc[row.item.label] = (acc[row.item.label] || 0) + row.item.amountCents / 100; return acc; }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  const due = monthly.reduce((sum, row) => sum + row.due, 0); const paid = monthly.reduce((sum, row) => sum + row.paid, 0); const resolved = caseRows.filter((item) => item.resolvedAt); const resolutionDays = resolved.length ? resolved.reduce((sum, item) => sum + Math.max(0, (item.resolvedAt!.getTime() - item.createdAt.getTime()) / 86400000), 0) / resolved.length : 0;
  const completenessFields = unitRows.flatMap((unit) => [unit.areaSqm, unit.effectiveConstructionYear, unit.targetColdRentCents, unit.locationCategory]); const completeness = completenessFields.length ? Math.round(completenessFields.filter((value) => value != null && value !== "").length / completenessFields.length * 100) : 0;
  return { propertyCount: propertyRows.length, unitCount: unitRows.length, occupied: current.length, currentRent: currentRent / 100, annualRent: currentRent * 12 / 100, averageRentSqm, collectionRate: due ? paid / due * 100 : 0, arrears: openPayments.reduce((sum, row) => sum + row.amountCents, 0) / 100, vacancyPotential: vacancyPotential / 100, rentGap: rentGap / 100, utilityTotal: costRows.reduce((sum, row) => sum + row.item.amountCents, 0) / 100, maintenanceCost: caseRows.reduce((sum, item) => sum + (item.actualCostCents || item.estimatedCostCents || 0), 0) / 100, openCases: caseRows.filter((item) => item.status !== "resolved").length, urgentCases: caseRows.filter((item) => item.status !== "resolved" && item.priority === "urgent").length, resolutionDays, completeness, monthly, properties: propertiesData, utilityByCategory, arrearsAging, maintenanceMonthly, costRatioByProperty };
}
