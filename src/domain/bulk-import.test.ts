import { describe, expect, it } from "vitest";
import {
  createCsvTemplate,
  escapeCsv,
  findPropertyBatchDuplicateIssues,
  findRenterBatchDuplicateIssues,
  findTenancyBatchOverlapIssues,
  findUnitBatchDuplicateIssues,
  isTenancyCurrentOn,
  parseBoolean,
  parseBulkCsv,
  parseGermanNumber,
  parseIsoDate,
  rangesOverlap,
  validateBasicRows,
  type NormalizedProperty,
  type NormalizedRenter,
  type NormalizedTenancy,
  type NormalizedUnit,
} from "./bulk-import";

describe("bulk CSV parsing", () => {
  it("parses a BOM-prefixed German Excel CSV with quoted delimiters", () => {
    const input = "\uFEFFvorname;nachname;email;telefon\r\n\"Mara;Lou\";Beispiel;mara@example.invalid;+49 221 000\r\n";
    const result = parseBulkCsv("renters", input);
    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual([{ vorname: "Mara;Lou", nachname: "Beispiel", email: "mara@example.invalid", telefon: "+49 221 000" }]);
  });

  it("detects comma-delimited files", () => {
    const result = parseBulkCsv("renters", "vorname,nachname,email,telefon\nMara,Beispiel,,\n");
    expect(result.issues).toEqual([]);
    expect(result.rows[0].vorname).toBe("Mara");
  });

  it("rejects duplicate, unknown and missing headers", () => {
    const result = parseBulkCsv("properties", "name;name;fremd\nA;B;C\n");
    expect(result.rows).toEqual([]);
    expect(result.issues.map((issue) => issue.message).join(" ")).toMatch(/mehrfach/);
    expect(result.issues.map((issue) => issue.message).join(" ")).toMatch(/nicht vorgesehen/);
    expect(result.issues.map((issue) => issue.message).join(" ")).toMatch(/Pflichtspalte/);
  });

  it("generates Excel-compatible templates with stable headers", () => {
    const blank = createCsvTemplate("renters", false);
    const example = createCsvTemplate("properties", true);
    expect(blank.startsWith("\uFEFFvorname;nachname;email;telefon\r\n")).toBe(true);
    expect(example.split("\r\n")[0]).toBe("\uFEFFname;strasse;hausnummer;plz;ort;bundesland;baujahr");
    expect(example.split("\r\n")).toHaveLength(3);
    expect(escapeCsv('A; "B"')).toBe('"A; ""B"""');
  });
});

describe("bulk value normalization", () => {
  it("accepts documented boolean aliases", () => {
    expect(["ja", "true", "1"].map(parseBoolean)).toEqual([true, true, true]);
    expect(["nein", "false", "0"].map(parseBoolean)).toEqual([false, false, false]);
    expect(parseBoolean("vielleicht")).toBeNull();
  });

  it("parses German and international decimal formats", () => {
    expect(parseGermanNumber("1.234,56")).toBe(1234.56);
    expect(parseGermanNumber("78.5")).toBe(78.5);
    expect(parseGermanNumber("kein Wert")).toBeNull();
  });

  it("only accepts real ISO calendar dates", () => {
    expect(parseIsoDate("2028-02-29")?.toISOString().slice(0, 10)).toBe("2028-02-29");
    expect(parseIsoDate("2027-02-29")).toBeNull();
    expect(parseIsoDate("29.02.2028")).toBeNull();
  });

  it("normalizes unit aliases, money, booleans and room decimals", () => {
    const result = validateBasicRows("units", [{
      objekt: "Lindenhof",
      objekt_plz: "50667",
      bezeichnung: "2. OG links",
      status: "vermietet",
      flaeche_m2: "78",
      zimmer: "3,5",
      ziel_kaltmiete_eur: "1.190,50",
      balkon: "ja",
      aufzug: "0",
    }]);
    expect(result.issues).toEqual([]);
    expect(result.normalized[0]).toMatchObject({
      status: "occupied",
      areaSqm: 78,
      roomsTimesTen: 35,
      targetColdRentCents: 119050,
      hasBalcony: true,
      hasElevator: false,
    });
  });
});

describe("cross-row conflict detection", () => {
  it("detects duplicate addresses, emails and unit labels case-insensitively", () => {
    const properties = [
      { street: "Lindenstraße", houseNumber: "12", postalCode: "50667" },
      { street: "lindenstraße", houseNumber: "12", postalCode: "50667" },
    ] as NormalizedProperty[];
    const renters = [
      { email: "mara@example.invalid" },
      { email: "mara@example.invalid" },
    ] as NormalizedRenter[];
    const units = [
      { propertyId: "property-1", label: "2. OG links" },
      { propertyId: "property-1", label: "2. og LINKS" },
    ] as NormalizedUnit[];
    expect(findPropertyBatchDuplicateIssues(properties)).toHaveLength(1);
    expect(findRenterBatchDuplicateIssues(renters)).toHaveLength(1);
    expect(findUnitBatchDuplicateIssues(units)).toHaveLength(1);
  });

  it("detects an overlapping tenancy for the same unit only", () => {
    const base = {
      propertyName: "Lindenhof",
      propertyPostalCode: "50667",
      unitLabel: "2. OG links",
      renterEmail: null,
      firstName: "Mara",
      lastName: "Beispiel",
      coldRentCents: 100000,
      utilityAdvanceCents: 20000,
      depositCents: 300000,
      rentDueDay: 3,
      paymentReference: null,
    };
    const rows = [
      { ...base, unitId: "unit-1", startsAt: new Date("2026-01-01T12:00:00Z"), endsAt: new Date("2026-12-31T12:00:00Z") },
      { ...base, unitId: "unit-1", startsAt: new Date("2026-12-01T12:00:00Z"), endsAt: null },
      { ...base, unitId: "unit-2", startsAt: new Date("2026-12-01T12:00:00Z"), endsAt: null },
    ] as NormalizedTenancy[];
    expect(findTenancyBatchOverlapIssues(rows)).toEqual([{ row: 2, field: "beginn", message: "Zeitraum überschneidet sich mit Zeile 1." }]);
    expect(rangesOverlap(rows[0].startsAt, rows[0].endsAt, rows[2].startsAt, rows[2].endsAt)).toBe(true);
  });
});

describe("tenancy status timing", () => {
  const at = new Date("2026-07-14T07:00:00+02:00");

  it("treats a tenancy beginning today as current for the whole calendar day", () => {
    expect(isTenancyCurrentOn({ startsAt: new Date("2026-07-14T12:00:00Z"), endsAt: null }, at)).toBe(true);
  });

  it("does not mark future or historical tenancies as current", () => {
    expect(isTenancyCurrentOn({ startsAt: new Date("2026-07-15T12:00:00Z"), endsAt: null }, at)).toBe(false);
    expect(isTenancyCurrentOn({ startsAt: new Date("2025-01-01T12:00:00Z"), endsAt: new Date("2026-07-13T12:00:00Z") }, at)).toBe(false);
  });
});
