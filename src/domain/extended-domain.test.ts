import { describe, expect, it } from "vitest";
import { evaluateRentIndex } from "./rent-index-engine";
import { allocateCents, overlapDays } from "./utility-allocation";

describe("Betriebskostenverteilung", () => {
  it("verteilt Cent ohne Rundungsverlust", () => {
    const result = allocateCents(100, [1, 1, 1]);
    expect(result).toEqual([34, 33, 33]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(100);
  });
  it("berechnet Mietzeiträume inklusive Ein- und Auszugstag", () => {
    expect(overlapDays(new Date("2026-01-01Z"), new Date("2026-12-31Z"), new Date("2026-07-01Z"), new Date("2026-07-31Z"))).toBe(31);
  });
});

describe("manuelle Mietspiegelregeln", () => {
  it("liefert Bereich und Monatswerte für ein Viertel", () => {
    const result = evaluateRentIndex({ kind: "manual_ranges", version: "2026", applicability: { minArea: 30, maxArea: 100, excluded: [] }, rows: [{ yearFrom: 1950, yearTo: 1990, areaFrom: 50, areaTo: 70, district: "Ehrenfeld", low: 9, reference: 11, high: 13 }] }, { area: 60, constructionYear: 1970, location: "Ehrenfeld" });
    expect(result.referenceMonthly).toBe(660);
    expect(result.lowMonthly).toBe(540);
  });
});
