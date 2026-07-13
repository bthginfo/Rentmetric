import { allocateCents, overlapDays } from "./utility-allocation";

export type UtilityStatementInput = {
  periodStart: Date;
  periodEnd: Date;
  costs: Array<{
    id: string;
    label: string;
    amountCents: number;
    allocationKey: string;
    isRecoverable: boolean;
  }>;
  units: Array<{ id: string; label: string; areaSqm: number | null }>;
  allocations: Array<{
    costItemId: string;
    unitId: string;
    weightValue: number | null;
    amountCents: number | null;
  }>;
  tenancies: Array<{
    id: string;
    unitId: string;
    renterName: string;
    startsAt: Date;
    endsAt: Date | null;
    utilityAdvanceCents: number;
  }>;
};

export type UtilityStatementResult = {
  unresolvedCostIds: string[];
  unitResults: Array<{
    unitId: string;
    label: string;
    totalCents: number;
    vacancyCents: number;
  }>;
  statements: Array<{
    tenancyId: string;
    unitId: string;
    unitLabel: string;
    renterName: string;
    occupiedDays: number;
    lines: Array<{ costItemId: string; label: string; amountCents: number }>;
    totalCents: number;
    advancesCents: number;
    balanceCents: number;
  }>;
};

export function calculateUtilityStatements(input: UtilityStatementInput): UtilityStatementResult {
  const periodDays = overlapDays(input.periodStart, input.periodEnd, input.periodStart, input.periodEnd);
  const recoverable = input.costs.filter((cost) => cost.isRecoverable);
  const unitAmounts = new Map(input.units.map((unit) => [unit.id, new Map<string, number>()]));
  const unresolvedCostIds: string[] = [];

  for (const cost of recoverable) {
    let amounts: number[] | null = null;
    if (cost.allocationKey === "area") {
      amounts = allocateCents(cost.amountCents, input.units.map((unit) => unit.areaSqm || 0));
      if (!input.units.some((unit) => (unit.areaSqm || 0) > 0)) unresolvedCostIds.push(cost.id);
    } else if (cost.allocationKey === "units") {
      amounts = allocateCents(cost.amountCents, input.units.map(() => 1));
    } else if (cost.allocationKey === "consumption") {
      const weights = input.units.map((unit) => input.allocations.find((entry) => entry.costItemId === cost.id && entry.unitId === unit.id)?.weightValue || 0);
      if (weights.some((weight) => weight > 0)) amounts = allocateCents(cost.amountCents, weights);
      else unresolvedCostIds.push(cost.id);
    } else if (cost.allocationKey === "manual") {
      const manual = input.units.map((unit) => input.allocations.find((entry) => entry.costItemId === cost.id && entry.unitId === unit.id)?.amountCents || 0);
      if (manual.reduce((sum, amount) => sum + amount, 0) === cost.amountCents) amounts = manual;
      else unresolvedCostIds.push(cost.id);
    }
    amounts?.forEach((amount, index) => unitAmounts.get(input.units[index].id)?.set(cost.id, amount));
  }

  const statements: UtilityStatementResult["statements"] = [];
  const unitResults = input.units.map((unit) => {
    const costMap = unitAmounts.get(unit.id) || new Map<string, number>();
    const unitTotal = [...costMap.values()].reduce((sum, amount) => sum + amount, 0);
    const unitTenancies = input.tenancies.filter((tenancy) => tenancy.unitId === unit.id);
    let tenantTotal = 0;
    for (const tenancy of unitTenancies) {
      const occupiedDays = overlapDays(input.periodStart, input.periodEnd, tenancy.startsAt, tenancy.endsAt);
      if (!occupiedDays) continue;
      const lines = recoverable.flatMap((cost) => {
        const unitCost = costMap.get(cost.id);
        if (unitCost == null) return [];
        return [{ costItemId: cost.id, label: cost.label, amountCents: Math.round(unitCost * occupiedDays / periodDays) }];
      });
      const totalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
      const advancesCents = Math.round(tenancy.utilityAdvanceCents * 12 * occupiedDays / 365.2425);
      tenantTotal += totalCents;
      statements.push({ tenancyId: tenancy.id, unitId: unit.id, unitLabel: unit.label, renterName: tenancy.renterName, occupiedDays, lines, totalCents, advancesCents, balanceCents: totalCents - advancesCents });
    }
    return { unitId: unit.id, label: unit.label, totalCents: unitTotal, vacancyCents: Math.max(0, unitTotal - tenantTotal) };
  });

  return { unresolvedCostIds: [...new Set(unresolvedCostIds)], unitResults, statements };
}
