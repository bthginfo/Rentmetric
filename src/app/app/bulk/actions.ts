"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, properties, renters, tenancies, units } from "@/db/schema";
import {
  bulkEntityTypes,
  findPropertyBatchDuplicateIssues,
  findRenterBatchDuplicateIssues,
  findTenancyBatchOverlapIssues,
  findUnitBatchDuplicateIssues,
  isTenancyCurrentOn,
  parseBulkCsv,
  rangesOverlap,
  validateBasicRows,
  type BulkEntityType,
  type BulkIssue,
  type BulkRow,
  type BulkSource,
  type NormalizedProperty,
  type NormalizedRenter,
  type NormalizedTenancy,
  type NormalizedUnit,
} from "@/domain/bulk-import";

export type BulkRequest = {
  type: BulkEntityType;
  source: BulkSource;
  rows?: BulkRow[];
  csv?: string;
};

export type BulkPreview = {
  ok: boolean;
  rows: BulkRow[];
  rowCount: number;
  validCount: number;
  conflictCount: number;
  issues: BulkIssue[];
};

export type BulkCommitResult = BulkPreview & { createdCount?: number };

function validRequest(input: BulkRequest) {
  return bulkEntityTypes.includes(input.type) && ["manual", "csv"].includes(input.source);
}

function readRows(input: BulkRequest): { rows: BulkRow[]; issues: BulkIssue[] } {
  if (!validRequest(input)) return { rows: [], issues: [{ row: 0, field: "anfrage", message: "Importtyp ist ungültig." }] };
  if (input.source === "csv") {
    const csv = input.csv ?? "";
    if (Buffer.byteLength(csv, "utf8") > 2 * 1024 * 1024) return { rows: [], issues: [{ row: 0, field: "datei", message: "Die CSV darf höchstens 2 MB groß sein." }] };
    const parsed = parseBulkCsv(input.type, csv);
    if (parsed.rows.length > 500) parsed.issues.push({ row: 0, field: "datei", message: "Eine CSV darf höchstens 500 Datenzeilen enthalten." });
    return parsed;
  }
  const rows = (input.rows ?? []).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? "").trim()])));
  if (rows.length > 100) return { rows: [], issues: [{ row: 0, field: "daten", message: "Manuell können höchstens 100 Zeilen auf einmal angelegt werden." }] };
  return { rows, issues: [] };
}

async function validateTenantRows(organizationId: string, type: BulkEntityType, rows: BulkRow[]) {
  const basic = validateBasicRows(type, rows);
  const issues = [...basic.issues];
  const db = getDb();
  if (!rows.length) issues.push({ row: 0, field: "daten", message: "Mindestens eine ausgefüllte Zeile ist erforderlich." });

  if (type === "properties") {
    const normalized = basic.normalized as NormalizedProperty[];
    const existing = await db.select({ street: properties.street, houseNumber: properties.houseNumber, postalCode: properties.postalCode }).from(properties).where(eq(properties.organizationId, organizationId));
    normalized.forEach((row, index) => {
      const key = `${row.street}|${row.houseNumber}|${row.postalCode}`.toLocaleLowerCase("de-DE");
      if (existing.some((item) => `${item.street}|${item.houseNumber}|${item.postalCode}`.toLocaleLowerCase("de-DE") === key)) issues.push({ row: index + 1, field: "strasse", message: "Diese Adresse ist im Arbeitsbereich bereits vorhanden." });
    });
    issues.push(...findPropertyBatchDuplicateIssues(normalized));
  }

  if (type === "renters") {
    const normalized = basic.normalized as NormalizedRenter[];
    const existing = await db.select({ email: renters.email }).from(renters).where(eq(renters.organizationId, organizationId));
    const existingEmails = new Set(existing.flatMap((item) => item.email ? [item.email.toLowerCase()] : []));
    normalized.forEach((row, index) => {
      if (!row.email) return;
      if (existingEmails.has(row.email)) issues.push({ row: index + 1, field: "email", message: "Diese E-Mail-Adresse gehört bereits zu einer Person im Arbeitsbereich." });
    });
    issues.push(...findRenterBatchDuplicateIssues(normalized));
  }

  if (type === "units") {
    const normalized = basic.normalized as NormalizedUnit[];
    const [propertyRows, unitRows] = await Promise.all([
      db.select({ id: properties.id, name: properties.name, postalCode: properties.postalCode }).from(properties).where(and(eq(properties.organizationId, organizationId), isNull(properties.archivedAt))),
      db.select({ propertyId: units.propertyId, label: units.label }).from(units).where(eq(units.organizationId, organizationId)),
    ]);
    normalized.forEach((row, index) => {
      const matches = row.propertyId ? propertyRows.filter((item) => item.id === row.propertyId) : propertyRows.filter((item) => item.name.trim() === row.propertyName && item.postalCode === row.propertyPostalCode);
      if (matches.length !== 1) issues.push({ row: index + 1, field: "objekt", message: matches.length ? "Objekt ist nicht eindeutig. Bitte Name und PLZ prüfen." : "Aktives Objekt wurde nicht gefunden." });
      else {
        row.propertyId = matches[0].id;
        const key = `${matches[0].id}|${row.label}`.toLocaleLowerCase("de-DE");
        if (unitRows.some((item) => `${item.propertyId}|${item.label}`.toLocaleLowerCase("de-DE") === key)) issues.push({ row: index + 1, field: "bezeichnung", message: "Diese Bezeichnung existiert im Objekt bereits." });
      }
    });
    issues.push(...findUnitBatchDuplicateIssues(normalized));
  }

  if (type === "tenancies") {
    const normalized = basic.normalized as NormalizedTenancy[];
    const [unitRows, renterRows, tenancyRows] = await Promise.all([
      db.select({ id: units.id, label: units.label, propertyId: properties.id, propertyName: properties.name, postalCode: properties.postalCode }).from(units).innerJoin(properties, and(eq(properties.id, units.propertyId), eq(properties.organizationId, organizationId), isNull(properties.archivedAt))).where(and(eq(units.organizationId, organizationId), isNull(units.archivedAt))),
      db.select({ id: renters.id, firstName: renters.firstName, lastName: renters.lastName, email: renters.email }).from(renters).where(eq(renters.organizationId, organizationId)),
      db.select({ unitId: tenancies.unitId, startsAt: tenancies.startsAt, endsAt: tenancies.endsAt }).from(tenancies).where(eq(tenancies.organizationId, organizationId)),
    ]);
    normalized.forEach((row, index) => {
      const unitMatches = row.unitId ? unitRows.filter((item) => item.id === row.unitId) : unitRows.filter((item) => item.propertyName.trim() === row.propertyName && item.postalCode === row.propertyPostalCode && item.label.trim() === row.unitLabel);
      if (unitMatches.length !== 1) issues.push({ row: index + 1, field: "einheit", message: unitMatches.length ? "Einheit ist nicht eindeutig. Bitte Objekt, PLZ und Bezeichnung prüfen." : "Aktive Einheit wurde nicht gefunden." }); else row.unitId = unitMatches[0].id;
      const renterMatches = row.renterId ? renterRows.filter((item) => item.id === row.renterId) : row.renterEmail ? renterRows.filter((item) => item.email?.toLowerCase() === row.renterEmail) : renterRows.filter((item) => item.firstName.trim() === row.firstName && item.lastName.trim() === row.lastName);
      if (renterMatches.length !== 1) issues.push({ row: index + 1, field: "mieter_email", message: renterMatches.length ? "Mieter:in ist nicht eindeutig. Bitte eine eindeutige E-Mail-Adresse verwenden." : "Mieter:in wurde nicht gefunden." }); else row.renterId = renterMatches[0].id;
      if (row.unitId && tenancyRows.some((item) => item.unitId === row.unitId && rangesOverlap(row.startsAt, row.endsAt, item.startsAt, item.endsAt))) issues.push({ row: index + 1, field: "beginn", message: "Für diese Einheit überschneidet sich bereits ein Mietverhältnis." });
    });
    issues.push(...findTenancyBatchOverlapIssues(normalized));
  }
  return { normalized: basic.normalized, issues };
}

async function prepare(input: BulkRequest) {
  const session = await requireSession();
  const parsed = readRows(input);
  if (parsed.issues.length) return { session, rows: parsed.rows, normalized: [], issues: parsed.issues };
  const validated = await validateTenantRows(session.organizationId, input.type, parsed.rows);
  return { session, rows: parsed.rows, ...validated };
}

function result(rows: BulkRow[], issues: BulkIssue[]): BulkPreview {
  const invalidRows = new Set(issues.filter((issue) => issue.row > 0).map((issue) => issue.row));
  const globalErrors = issues.some((issue) => issue.row === 0);
  return { ok: issues.length === 0, rows, rowCount: rows.length, validCount: globalErrors ? 0 : Math.max(0, rows.length - invalidRows.size), conflictCount: invalidRows.size + (globalErrors ? 1 : 0), issues };
}

export async function previewBulkImport(input: BulkRequest): Promise<BulkPreview> {
  const prepared = await prepare(input);
  return result(prepared.rows, prepared.issues);
}

export async function commitBulkImport(input: BulkRequest): Promise<BulkCommitResult> {
  const prepared = await prepare(input);
  const preview = result(prepared.rows, prepared.issues);
  if (!preview.ok) return preview;
  const db = getDb();
  const now = new Date();
  const queries = [];

  if (input.type === "properties") {
    for (const row of prepared.normalized as NormalizedProperty[]) queries.push(db.insert(properties).values({ id: randomUUID(), organizationId: prepared.session.organizationId, name: row.name, street: row.street, houseNumber: row.houseNumber, postalCode: row.postalCode, city: row.city, state: row.state, yearBuilt: row.yearBuilt }));
  } else if (input.type === "renters") {
    for (const row of prepared.normalized as NormalizedRenter[]) queries.push(db.insert(renters).values({ id: randomUUID(), organizationId: prepared.session.organizationId, firstName: row.firstName, lastName: row.lastName, email: row.email, phone: row.phone }));
  } else if (input.type === "units") {
    for (const row of prepared.normalized as NormalizedUnit[]) queries.push(db.insert(units).values({ id: randomUUID(), organizationId: prepared.session.organizationId, propertyId: row.propertyId!, label: row.label, floor: row.floor, areaSqm: row.areaSqm, roomsTimesTen: row.roomsTimesTen, status: row.status, targetColdRentCents: row.targetColdRentCents, utilityEstimateCents: row.utilityEstimateCents, condition: row.condition, heatingType: row.heatingType, energySource: row.energySource, bathroom: row.bathroom, flooring: row.flooring, parkingSpaces: row.parkingSpaces, effectiveConstructionYear: row.effectiveConstructionYear, modernizationYear: row.modernizationYear, locationCategory: row.locationCategory, buildingType: row.buildingType, unitType: row.unitType, outdoorAreaTimesTen: row.outdoorAreaTimesTen, bathroomAreaTimesTen: row.bathroomAreaTimesTen, hasBalcony: row.hasBalcony, hasFittedKitchen: row.hasFittedKitchen, hasElevator: row.hasElevator, isAccessible: row.isAccessible, notes: row.notes }));
  } else {
    const occupied = new Set<string>();
    for (const row of prepared.normalized as NormalizedTenancy[]) {
      queries.push(db.insert(tenancies).values({ id: randomUUID(), organizationId: prepared.session.organizationId, unitId: row.unitId!, renterId: row.renterId!, startsAt: row.startsAt, endsAt: row.endsAt, coldRentCents: row.coldRentCents, utilityAdvanceCents: row.utilityAdvanceCents, depositCents: row.depositCents, rentDueDay: row.rentDueDay, paymentReference: row.paymentReference }));
      if (isTenancyCurrentOn(row, now)) occupied.add(row.unitId!);
    }
    for (const unitId of occupied) queries.push(db.update(units).set({ status: "occupied", updatedAt: now }).where(and(eq(units.id, unitId), eq(units.organizationId, prepared.session.organizationId))));
  }
  queries.push(db.insert(auditLogs).values({ organizationId: prepared.session.organizationId, userId: prepared.session.userId, action: "bulk_import.created", entityType: input.type, changes: { source: input.source, rowCount: prepared.rows.length } }));
  await db.batch(queries as [typeof queries[number], ...typeof queries]);
  for (const path of ["/app/bulk", "/app/dashboard", "/app/properties", "/app/units", "/app/renters", "/app/tenancies"]) revalidatePath(path);
  return { ...preview, createdCount: prepared.rows.length };
}
