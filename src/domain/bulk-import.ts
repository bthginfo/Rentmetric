import { parse } from "csv-parse/sync";

export const bulkEntityTypes = ["properties", "units", "renters", "tenancies"] as const;
export type BulkEntityType = (typeof bulkEntityTypes)[number];
export type BulkSource = "manual" | "csv";
export type BulkRow = Record<string, string>;

export type BulkIssue = {
  row: number;
  field: string;
  message: string;
};

export const bulkContracts: Record<BulkEntityType, {
  label: string;
  singular: string;
  headers: readonly string[];
  required: readonly string[];
  core: readonly string[];
}> = {
  properties: {
    label: "Objekte",
    singular: "Objekt",
    headers: ["name", "strasse", "hausnummer", "plz", "ort", "bundesland", "baujahr"],
    required: ["name", "strasse", "hausnummer", "plz", "ort"],
    core: ["name", "strasse", "hausnummer", "plz", "ort"],
  },
  units: {
    label: "Einheiten",
    singular: "Einheit",
    headers: ["objekt", "objekt_plz", "bezeichnung", "etage", "flaeche_m2", "zimmer", "status", "ziel_kaltmiete_eur", "nebenkosten_eur", "zustand", "heizungsart", "energietraeger", "bad", "boden", "stellplaetze", "baujahr_mietspiegel", "modernisierungsjahr", "wohnlage", "gebaeudetyp", "wohnungstyp", "balkonflaeche_m2", "badflaeche_m2", "balkon", "einbaukueche", "aufzug", "barrierearm", "notizen"],
    required: ["objekt", "objekt_plz", "bezeichnung"],
    core: ["objekt", "objekt_plz", "bezeichnung", "etage", "flaeche_m2", "zimmer", "status"],
  },
  renters: {
    label: "Mieter:innen",
    singular: "Mieter:in",
    headers: ["vorname", "nachname", "email", "telefon"],
    required: ["vorname", "nachname"],
    core: ["vorname", "nachname", "email", "telefon"],
  },
  tenancies: {
    label: "Mietverhältnisse",
    singular: "Mietverhältnis",
    headers: ["objekt", "objekt_plz", "einheit", "mieter_email", "vorname", "nachname", "beginn", "ende", "kaltmiete_eur", "nebenkosten_eur", "kaution_eur", "mietfaellig_am", "verwendungszweck"],
    required: ["objekt", "objekt_plz", "einheit", "beginn", "kaltmiete_eur"],
    core: ["objekt", "einheit", "mieter_email", "beginn", "ende", "kaltmiete_eur", "nebenkosten_eur"],
  },
};

const statusAliases: Record<string, "vacant" | "occupied" | "owner_occupied" | "renovation"> = {
  leer: "vacant", vacant: "vacant", vermietet: "occupied", occupied: "occupied",
  eigennutzung: "owner_occupied", owner_occupied: "owner_occupied",
  renovierung: "renovation", renovation: "renovation",
};

export function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  if (["ja", "true", "1"].includes(normalized)) return true;
  if (["nein", "false", "0"].includes(normalized)) return false;
  return null;
}

export function parseGermanNumber(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  if (!normalized) return null;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

export function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const date = new Date(`${value.trim()}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.trim() ? date : null;
}

function delimiterCount(line: string, delimiter: string) {
  let quoted = false;
  let count = 0;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') {
      if (quoted && line[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && line[index] === delimiter) count += 1;
  }
  return count;
}

export function parseBulkCsv(type: BulkEntityType, input: string): { rows: BulkRow[]; issues: BulkIssue[] } {
  const text = input.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = delimiterCount(firstLine, ";") >= delimiterCount(firstLine, ",") ? ";" : ",";
  let matrix: string[][];
  try {
    matrix = parse(text, { delimiter, bom: true, skip_empty_lines: true, relax_column_count: false, trim: true });
  } catch {
    return { rows: [], issues: [{ row: 0, field: "datei", message: "Die CSV ist nicht korrekt aufgebaut. Bitte Trennzeichen und Anführungszeichen prüfen." }] };
  }
  if (!matrix.length) return { rows: [], issues: [{ row: 0, field: "datei", message: "Die Datei enthält keine Kopfzeile." }] };
  const headers = matrix[0].map((header) => header.trim().toLowerCase());
  const contract = bulkContracts[type];
  const issues: BulkIssue[] = [];
  const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
  for (const header of [...new Set(duplicates)]) issues.push({ row: 0, field: header || "kopfzeile", message: `Die Spalte „${header || "leer"}“ kommt mehrfach vor.` });
  for (const header of headers) if (!contract.headers.includes(header)) issues.push({ row: 0, field: header || "kopfzeile", message: `Die Spalte „${header || "leer"}“ ist für ${contract.label} nicht vorgesehen.` });
  for (const required of contract.required) if (!headers.includes(required)) issues.push({ row: 0, field: required, message: `Die Pflichtspalte „${required}“ fehlt.` });
  if (issues.length) return { rows: [], issues };
  return {
    rows: matrix.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]))),
    issues,
  };
}

function required(row: BulkRow, rowNumber: number, field: string, label: string, issues: BulkIssue[]) {
  if (!row[field]?.trim()) issues.push({ row: rowNumber, field, message: `${label} fehlt.` });
}
function length(row: BulkRow, rowNumber: number, field: string, label: string, min: number, max: number, issues: BulkIssue[]) {
  const value = row[field]?.trim() ?? "";
  if (!value) return;
  if (value.length < min || value.length > max) issues.push({ row: rowNumber, field, message: `${label} muss ${min === 1 ? "höchstens" : `zwischen ${min} und`} ${max} Zeichen haben.` });
}
function numberRange(row: BulkRow, rowNumber: number, field: string, label: string, min: number, max: number, issues: BulkIssue[], options: { integer?: boolean; required?: boolean; positive?: boolean } = {}) {
  const raw = row[field]?.trim() ?? "";
  if (!raw && !options.required) return null;
  const value = parseGermanNumber(raw);
  if (value === null || (options.integer && !Number.isInteger(value)) || (options.positive ? value <= 0 : value < min) || value > max) {
    issues.push({ row: rowNumber, field, message: `${label} muss ${options.positive ? "größer als 0" : `zwischen ${min} und ${max}`} liegen${options.integer ? " und ganzzahlig sein" : ""}.` });
    return null;
  }
  return value;
}

export type NormalizedProperty = { name: string; street: string; houseNumber: string; postalCode: string; city: string; state: string | null; yearBuilt: number | null };
export type NormalizedUnit = { propertyId?: string; propertyName: string; propertyPostalCode: string; label: string; floor: string | null; areaSqm: number | null; roomsTimesTen: number | null; status: "vacant" | "occupied" | "owner_occupied" | "renovation"; targetColdRentCents: number | null; utilityEstimateCents: number | null; condition: string | null; heatingType: string | null; energySource: string | null; bathroom: string | null; flooring: string | null; parkingSpaces: number; effectiveConstructionYear: number | null; modernizationYear: number | null; locationCategory: string | null; buildingType: string | null; unitType: string | null; outdoorAreaTimesTen: number | null; bathroomAreaTimesTen: number | null; hasBalcony: boolean; hasFittedKitchen: boolean; hasElevator: boolean; isAccessible: boolean; notes: string | null };
export type NormalizedRenter = { firstName: string; lastName: string; email: string | null; phone: string | null };
export type NormalizedTenancy = { unitId?: string; renterId?: string; propertyName: string; propertyPostalCode: string; unitLabel: string; renterEmail: string | null; firstName: string; lastName: string; startsAt: Date; endsAt: Date | null; coldRentCents: number; utilityAdvanceCents: number; depositCents: number; rentDueDay: number | null; paymentReference: string | null };
export type NormalizedRow = NormalizedProperty | NormalizedUnit | NormalizedRenter | NormalizedTenancy;

export function validateBasicRows(type: BulkEntityType, rows: BulkRow[]) {
  const issues: BulkIssue[] = [];
  const normalized: NormalizedRow[] = [];
  const currentMaxYear = new Date().getFullYear() + 2;
  rows.forEach((row, index) => {
    const n = index + 1;
    if (type === "properties") {
      required(row, n, "name", "Objektname", issues); length(row, n, "name", "Objektname", 2, 120, issues);
      required(row, n, "strasse", "Straße", issues); length(row, n, "strasse", "Straße", 2, 120, issues);
      required(row, n, "hausnummer", "Hausnummer", issues); length(row, n, "hausnummer", "Hausnummer", 1, 20, issues);
      required(row, n, "plz", "PLZ", issues); if (row.plz && !/^\d{5}$/.test(row.plz.trim())) issues.push({ row: n, field: "plz", message: "PLZ muss genau 5 Ziffern enthalten." });
      required(row, n, "ort", "Ort", issues); length(row, n, "ort", "Ort", 2, 100, issues);
      length(row, n, "bundesland", "Bundesland", 1, 80, issues);
      const yearBuilt = numberRange(row, n, "baujahr", "Baujahr", 1600, currentMaxYear, issues, { integer: true });
      normalized.push({ name: row.name?.trim(), street: row.strasse?.trim(), houseNumber: row.hausnummer?.trim(), postalCode: row.plz?.trim(), city: row.ort?.trim(), state: row.bundesland?.trim() || null, yearBuilt });
    } else if (type === "renters") {
      required(row, n, "vorname", "Vorname", issues); length(row, n, "vorname", "Vorname", 1, 80, issues);
      required(row, n, "nachname", "Nachname", issues); length(row, n, "nachname", "Nachname", 1, 80, issues);
      const email = row.email?.trim().toLowerCase() || null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push({ row: n, field: "email", message: "E-Mail-Adresse ist nicht gültig." });
      length(row, n, "telefon", "Telefon", 1, 40, issues);
      normalized.push({ firstName: row.vorname?.trim(), lastName: row.nachname?.trim(), email, phone: row.telefon?.trim() || null });
    } else if (type === "units") {
      required(row, n, "objekt", "Objekt", issues); required(row, n, "objekt_plz", "Objekt-PLZ", issues);
      required(row, n, "bezeichnung", "Bezeichnung", issues); length(row, n, "bezeichnung", "Bezeichnung", 1, 80, issues);
      length(row, n, "etage", "Etage", 1, 40, issues); length(row, n, "notizen", "Notizen", 1, 3000, issues);
      const area = numberRange(row, n, "flaeche_m2", "Fläche", 0, 5000, issues, { integer: true, positive: Boolean(row.flaeche_m2) });
      const rooms = numberRange(row, n, "zimmer", "Zimmer", 0, 100, issues, { positive: Boolean(row.zimmer) });
      const statusRaw = row.status?.trim().toLowerCase() || "leer"; const status = statusAliases[statusRaw];
      if (!status) issues.push({ row: n, field: "status", message: "Status muss leer, vermietet, Eigennutzung oder Renovierung sein." });
      const booleanValue = (field: string, label: string) => { const raw = row[field]?.trim(); if (!raw) return false; const value = parseBoolean(raw); if (value === null) issues.push({ row: n, field, message: `${label} muss ja oder nein sein.` }); return value ?? false; };
      const money = (field: string, label: string) => { const value = numberRange(row, n, field, label, 0, 100000, issues); return value === null ? null : Math.round(value * 100); };
      const aux = (field: string, label: string) => { const value = numberRange(row, n, field, label, 0, 1000, issues); return value === null ? null : Math.round(value * 10); };
      normalized.push({ propertyId: row._propertyId || undefined, propertyName: row.objekt?.trim(), propertyPostalCode: row.objekt_plz?.trim(), label: row.bezeichnung?.trim(), floor: row.etage?.trim() || null, areaSqm: area, roomsTimesTen: rooms === null ? null : Math.round(rooms * 10), status: status || "vacant", targetColdRentCents: money("ziel_kaltmiete_eur", "Ziel-Kaltmiete"), utilityEstimateCents: money("nebenkosten_eur", "Nebenkosten"), condition: row.zustand?.trim() || null, heatingType: row.heizungsart?.trim() || null, energySource: row.energietraeger?.trim() || null, bathroom: row.bad?.trim() || null, flooring: row.boden?.trim() || null, parkingSpaces: numberRange(row, n, "stellplaetze", "Stellplätze", 0, 20, issues, { integer: true }) ?? 0, effectiveConstructionYear: numberRange(row, n, "baujahr_mietspiegel", "Mietspiegel-Baujahr", 1700, 2100, issues, { integer: true }), modernizationYear: numberRange(row, n, "modernisierungsjahr", "Modernisierungsjahr", 1700, 2100, issues, { integer: true }), locationCategory: row.wohnlage?.trim() || null, buildingType: row.gebaeudetyp?.trim() || null, unitType: row.wohnungstyp?.trim() || null, outdoorAreaTimesTen: aux("balkonflaeche_m2", "Balkonfläche"), bathroomAreaTimesTen: aux("badflaeche_m2", "Badfläche"), hasBalcony: booleanValue("balkon", "Balkon"), hasFittedKitchen: booleanValue("einbaukueche", "Einbauküche"), hasElevator: booleanValue("aufzug", "Aufzug"), isAccessible: booleanValue("barrierearm", "Barrierearm"), notes: row.notizen?.trim() || null });
    } else {
      required(row, n, "objekt", "Objekt", issues); required(row, n, "objekt_plz", "Objekt-PLZ", issues); required(row, n, "einheit", "Einheit", issues);
      if (!row._renterId && !row.mieter_email?.trim() && (!row.vorname?.trim() || !row.nachname?.trim())) issues.push({ row: n, field: "mieter_email", message: "Mieter:in bitte per E-Mail oder eindeutigem Namen angeben." });
      const startsAt = parseIsoDate(row.beginn || ""); if (!startsAt) issues.push({ row: n, field: "beginn", message: "Beginn muss im Format JJJJ-MM-TT angegeben werden." });
      const endsAt = row.ende?.trim() ? parseIsoDate(row.ende) : null; if (row.ende?.trim() && !endsAt) issues.push({ row: n, field: "ende", message: "Ende muss im Format JJJJ-MM-TT angegeben werden." });
      if (startsAt && endsAt && endsAt <= startsAt) issues.push({ row: n, field: "ende", message: "Ende muss nach dem Beginn liegen." });
      const coldRent = numberRange(row, n, "kaltmiete_eur", "Kaltmiete", 0, 100000, issues, { required: true, positive: true });
      const utility = numberRange(row, n, "nebenkosten_eur", "Nebenkosten", 0, 100000, issues) ?? 0;
      const deposit = numberRange(row, n, "kaution_eur", "Kaution", 0, 100000, issues) ?? 0;
      const due = numberRange(row, n, "mietfaellig_am", "Mietfälligkeit", 1, 28, issues, { integer: true });
      length(row, n, "verwendungszweck", "Verwendungszweck", 1, 180, issues);
      normalized.push({ unitId: row._unitId || undefined, renterId: row._renterId || undefined, propertyName: row.objekt?.trim(), propertyPostalCode: row.objekt_plz?.trim(), unitLabel: row.einheit?.trim(), renterEmail: row.mieter_email?.trim().toLowerCase() || null, firstName: row.vorname?.trim() || "", lastName: row.nachname?.trim() || "", startsAt: startsAt ?? new Date(0), endsAt, coldRentCents: Math.round((coldRent ?? 0) * 100), utilityAdvanceCents: Math.round(utility * 100), depositCents: Math.round(deposit * 100), rentDueDay: due, paymentReference: row.verwendungszweck?.trim() || null });
    }
  });
  return { normalized, issues };
}

export function rangesOverlap(startA: Date, endA: Date | null, startB: Date, endB: Date | null) {
  return startA <= (endB ?? new Date(8640000000000000)) && startB <= (endA ?? new Date(8640000000000000));
}

function duplicateIssues<T>(
  rows: T[],
  keyFor: (row: T) => string | null,
  field: string,
  message: (firstRow: number) => string,
) {
  const seen = new Map<string, number>();
  const issues: BulkIssue[] = [];
  rows.forEach((row, index) => {
    const key = keyFor(row);
    if (!key) return;
    const firstRow = seen.get(key);
    if (firstRow) issues.push({ row: index + 1, field, message: message(firstRow) });
    else seen.set(key, index + 1);
  });
  return issues;
}

export function findPropertyBatchDuplicateIssues(rows: NormalizedProperty[]) {
  return duplicateIssues(
    rows,
    (row) => row.street && row.houseNumber && row.postalCode
      ? `${row.street}|${row.houseNumber}|${row.postalCode}`.toLocaleLowerCase("de-DE")
      : null,
    "strasse",
    (firstRow) => `Doppelte Adresse in der Datei (bereits Zeile ${firstRow}).`,
  );
}

export function findRenterBatchDuplicateIssues(rows: NormalizedRenter[]) {
  return duplicateIssues(
    rows,
    (row) => row.email,
    "email",
    (firstRow) => `Doppelte E-Mail-Adresse in der Datei (bereits Zeile ${firstRow}).`,
  );
}

export function findUnitBatchDuplicateIssues(rows: NormalizedUnit[]) {
  return duplicateIssues(
    rows,
    (row) => row.propertyId && row.label
      ? `${row.propertyId}|${row.label}`.toLocaleLowerCase("de-DE")
      : null,
    "bezeichnung",
    (firstRow) => `Doppelte Einheit in der Datei (bereits Zeile ${firstRow}).`,
  );
}

export function findTenancyBatchOverlapIssues(rows: NormalizedTenancy[]) {
  const issues: BulkIssue[] = [];
  rows.forEach((row, index) => {
    if (!row.unitId || row.startsAt.getTime() === 0) return;
    for (let previous = 0; previous < index; previous += 1) {
      const other = rows[previous];
      if (
        other.unitId === row.unitId
        && other.startsAt.getTime() !== 0
        && rangesOverlap(row.startsAt, row.endsAt, other.startsAt, other.endsAt)
      ) {
        issues.push({ row: index + 1, field: "beginn", message: `Zeitraum überschneidet sich mit Zeile ${previous + 1}.` });
        break;
      }
    }
  });
  return issues;
}

const germanDateKey = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function isTenancyCurrentOn(
  tenancy: Pick<NormalizedTenancy, "startsAt" | "endsAt">,
  at: Date,
) {
  const day = germanDateKey.format(at);
  return germanDateKey.format(tenancy.startsAt) <= day
    && (!tenancy.endsAt || germanDateKey.format(tenancy.endsAt) >= day);
}

export function escapeCsv(value: string) {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function createCsvTemplate(type: BulkEntityType, example: boolean) {
  const headers = bulkContracts[type].headers;
  const examples: Record<BulkEntityType, string[]> = {
    properties: ["Lindenhof Beispiel", "Lindenstraße", "12a", "50667", "Köln", "Nordrhein-Westfalen", "1988"],
    units: ["Lindenhof Beispiel", "50667", "2. OG links", "2. OG", "78", "3,5", "leer", "1190,00", "260,00", "gepflegt", "Zentralheizung", "Gas", "Tageslichtbad", "Parkett", "1", "1988", "2019", "mittel", "Mehrfamilienhaus", "Etagenwohnung", "8,0", "7,5", "ja", "ja", "nein", "nein", "Offensichtlich fiktiver Beispieldatensatz"],
    renters: ["Mara", "Beispiel", "mara.beispiel@example.invalid", "+49 221 000000"],
    tenancies: ["Lindenhof Beispiel", "50667", "2. OG links", "mara.beispiel@example.invalid", "Mara", "Beispiel", "2026-08-01", "", "1190,00", "260,00", "3570,00", "3", "Miete Lindenhof Beispiel 2. OG links"],
  };
  const lines = [headers.join(";")];
  if (example) lines.push(examples[type].map(escapeCsv).join(";"));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
