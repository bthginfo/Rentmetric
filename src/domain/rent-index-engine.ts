import type { StructuredRentIndexRules } from "@/lib/rent-index/types";

export type RentIndexInput = { area: number; constructionYear: number; location: string; region?: string; equipmentClass?: number; adjustmentKeys?: string[] };
export type RentIndexResult = { lowPerSqm: number; referencePerSqm: number; highPerSqm: number; lowMonthly: number; referenceMonthly: number; highMonthly: number; breakdown: Array<{ label: string; amount: number; page?: number }>; warnings: string[] };
const round = (value: number) => Math.round(value * 100) / 100;

export function evaluateRentIndex(rules: StructuredRentIndexRules, input: RentIndexInput): RentIndexResult {
  const warnings: string[] = [];
  if (input.area < rules.applicability.minArea || input.area > rules.applicability.maxArea) warnings.push(`Wohnfläche außerhalb des direkten Anwendungsbereichs (${rules.applicability.minArea}–${rules.applicability.maxArea} m²).`);
  if (rules.kind === "manual_ranges") {
    const row = rules.rows.find((item) => input.area >= item.areaFrom && input.area <= item.areaTo && (item.yearFrom == null || input.constructionYear >= item.yearFrom) && (item.yearTo == null || input.constructionYear <= item.yearTo) && (!item.district || item.district.toLocaleLowerCase("de") === input.location.toLocaleLowerCase("de")));
    if (!row) throw new Error("Keine manuelle Tabellenzeile passt zu Fläche, Baujahr und Gebiet.");
    return makeResult(input.area, row.low, row.reference, row.high, [{ label: `Manuelle Regel ${row.areaFrom}–${row.areaTo} m²${row.district ? ` · ${row.district}` : ""}`, amount: row.reference }], warnings);
  }
  if (rules.kind === "berlin_ranges") {
    const rows = rules.rows.filter((item) => input.area >= item.areaFrom && (item.areaTo == null || input.area < item.areaTo) && item.location === input.location && (item.yearFrom == null || input.constructionYear >= item.yearFrom) && (item.yearTo == null || input.constructionYear <= item.yearTo));
    const row = rows.find((item) => !item.region || item.region === input.region) ?? rows.find((item) => !item.region);
    if (!row) throw new Error("Kein Berliner Tabellenfeld für Baujahr, Fläche, Lage und Ost/West-Zuordnung.");
    return makeResult(input.area, row.low, row.reference, row.high, [{ label: `Berliner Tabellenzeile ${row.row}`, amount: row.reference, page: row.page }], warnings);
  }
  if (rules.kind === "munich_regression") {
    const row = rules.baseRows.find((item) => input.area >= item.areaFrom && input.area <= item.areaTo) ?? rules.baseRows.find((item) => input.area <= item.areaTo);
    const yearIndex = rules.yearBands.findIndex((band) => input.constructionYear <= band.to && (band.from == null || input.constructionYear >= band.from));
    if (!row || yearIndex < 0) throw new Error("Kein Münchner Tabellenwert für Fläche oder Baujahr.");
    const base = row.values[yearIndex];
    const selected = rules.adjustments.filter((item) => input.adjustmentKeys?.includes(item.key));
    const reference = base + selected.reduce((sum, item) => sum + item.amount, 0);
    const spread = input.location.startsWith("central_") ? rules.spreads.central : rules.spreads.nonCentral;
    return makeResult(input.area, reference + spread.low, reference, reference + spread.high, [{ label: `Grundpreis ${row.areaFrom}–${row.areaTo} m² / ${rules.yearBands[yearIndex].label}`, amount: base, page: row.page }, ...selected.map((item) => ({ label: item.label, amount: item.amount, page: item.page }))], warnings);
  }
  const group = rules.constructionGroups.find((item) => (item.from == null || input.constructionYear >= item.from) && (item.to == null || input.constructionYear <= item.to));
  if (!group) throw new Error("Keine Kölner Baualtersgruppe gefunden.");
  const candidates = rules.rows.filter((row) => row.constructionGroup === group.group && input.area >= row.areaFrom && input.area <= row.areaTo);
  const row = candidates.find((item) => item.equipmentClass === input.equipmentClass) ?? candidates.find((item) => item.equipmentClass == null) ?? candidates[0];
  if (!row) throw new Error("Kein Kölner Tabellenwert für diese Fläche.");
  let range = input.location === "simple" ? row.ranges.simple : input.location === "best" ? row.ranges.veryGood : row.ranges.medium;
  if (input.location === "good" && row.ranges.medium && row.ranges.veryGood) range = { low: (row.ranges.medium.low + row.ranges.veryGood.low) / 2, high: (row.ranges.medium.high + row.ranges.veryGood.high) / 2 };
  if (!range) throw new Error("Für Lage/Ausstattung ist kein belastbarer Kölner Wert belegt.");
  const reference = (range.low + range.high) / 2;
  return makeResult(input.area, range.low, reference, range.high, [{ label: `Gruppe ${group.group}, ${row.areaFrom}–${row.areaTo} m², Ausstattung ${row.equipmentClass ?? "nicht differenziert"}`, amount: reference, page: row.page }], warnings);
}

function makeResult(area: number, low: number, reference: number, high: number, breakdown: RentIndexResult["breakdown"], warnings: string[]): RentIndexResult {
  return { lowPerSqm: round(low), referencePerSqm: round(reference), highPerSqm: round(high), lowMonthly: round(low * area), referenceMonthly: round(reference * area), highMonthly: round(high * area), breakdown, warnings };
}
