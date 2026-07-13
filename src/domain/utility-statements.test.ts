import { describe, expect, it } from "vitest";
import { calculateUtilityStatements } from "./utility-statements";

const periodStart = new Date("2025-01-01T12:00:00Z");
const periodEnd = new Date("2025-12-31T12:00:00Z");
const units = [{ id: "u1", label: "1. OG", areaSqm: 60 }, { id: "u2", label: "2. OG", areaSqm: 40 }];

describe("utility statements", () => {
  it("allocates area costs and creates tenant balances", () => {
    const result = calculateUtilityStatements({ periodStart, periodEnd, units, allocations: [], costs: [{ id: "c1", label: "Grundsteuer", amountCents: 10000, allocationKey: "area", isRecoverable: true }], tenancies: [{ id: "t1", unitId: "u1", renterName: "Ada Mieter", startsAt: periodStart, endsAt: null, utilityAdvanceCents: 10 }] });
    expect(result.unresolvedCostIds).toEqual([]);
    expect(result.statements[0].totalCents).toBe(6000);
    expect(result.unitResults.find((unit) => unit.unitId === "u2")?.vacancyCents).toBe(4000);
  });

  it("requires exact manual allocations", () => {
    const base = { periodStart, periodEnd, units, costs: [{ id: "c1", label: "Sonstiges", amountCents: 10000, allocationKey: "manual", isRecoverable: true }], tenancies: [] };
    expect(calculateUtilityStatements({ ...base, allocations: [{ costItemId: "c1", unitId: "u1", amountCents: 9000, weightValue: null }] }).unresolvedCostIds).toEqual(["c1"]);
    expect(calculateUtilityStatements({ ...base, allocations: [{ costItemId: "c1", unitId: "u1", amountCents: 6000, weightValue: null }, { costItemId: "c1", unitId: "u2", amountCents: 4000, weightValue: null }] }).unresolvedCostIds).toEqual([]);
  });
});
