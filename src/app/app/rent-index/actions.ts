"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, notifications, rentIndexImports, rentIndexSources } from "@/db/schema";
import type { RentIndexExtraction } from "@/lib/rent-index/types";
import { processRentIndexImport } from "@/lib/rent-index/processing";

export async function retryRentIndexImport(importId: string) {
  const session = await requireSession();
  await processRentIndexImport(importId, session.organizationId);
  revalidatePath(`/app/rent-index/imports/${importId}`);
}

const sourceSchema = z.object({
  municipality: z.string().trim().min(2).max(120),
  version: z.string().trim().min(1).max(40),
  effectiveFrom: z.coerce.date(),
  validUntil: z.union([z.literal(""), z.coerce.date()]).optional(),
  districts: z.string().max(1000).optional(),
  postalCodes: z.string().max(1000).optional(),
  notes: z.string().max(4000).optional(),
  rows: z.string().min(1).max(100000),
  activate: z.coerce.boolean().default(false),
});

function parseManualRows(value: string) {
  const rows = value.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line, index) => {
    const cells = line.split(";").map((cell) => cell.trim());
    if (cells.length !== 9) throw new Error(`Zeile ${index + 1}: Erwartet werden 9 mit Semikolon getrennte Werte.`);
    const [yearFrom, yearTo, areaFrom, areaTo, district, low, reference, high] = [cells[0], cells[1], cells[2], cells[3], cells[4], cells[5], cells[6], cells[7]];
    const parsed = { yearFrom: yearFrom ? Number(yearFrom) : null, yearTo: yearTo ? Number(yearTo) : null, areaFrom: Number(areaFrom.replace(",", ".")), areaTo: Number(areaTo.replace(",", ".")), district: district || undefined, low: Number(low.replace(",", ".")), reference: Number(reference.replace(",", ".")), high: Number(high.replace(",", ".")) };
    if ([parsed.areaFrom, parsed.areaTo, parsed.low, parsed.reference, parsed.high].some((item) => !Number.isFinite(item)) || parsed.low > parsed.reference || parsed.reference > parsed.high) throw new Error(`Zeile ${index + 1}: Zahlen oder Spannen sind ungültig.`);
    return parsed;
  });
  if (!rows.length) throw new Error("Mindestens eine Regelzeile ist erforderlich.");
  return rows;
}

export async function saveManualRentIndexSource(_: { error?: string } | undefined, formData: FormData): Promise<{ error?: string } | undefined> {
  const parsed = sourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Bitte Metadaten, Gültigkeit und Regelzeilen vollständig prüfen." };
  let rows;
  try { rows = parseManualRows(parsed.data.rows); } catch (error) { return { error: error instanceof Error ? error.message : "Regelzeilen ungültig." }; }
  const session = await requireSession();
  const districts = parsed.data.districts?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  const postalCodes = parsed.data.postalCodes?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  const rules = { kind: "manual_ranges" as const, version: parsed.data.version, rows, applicability: { minArea: Math.min(...rows.map((row) => row.areaFrom)), maxArea: Math.max(...rows.map((row) => row.areaTo)), excluded: [] } };
  const id = randomUUID();
  await getDb().insert(rentIndexSources).values({ id, organizationId: session.organizationId, municipality: parsed.data.municipality, providerType: "manual", version: parsed.data.version, effectiveFrom: parsed.data.effectiveFrom, validUntil: parsed.data.validUntil || null, status: parsed.data.activate ? "active" : "pending_review", rules, geographicScope: { level: districts.length ? "district" : "city", districts, postalCodes }, notes: parsed.data.notes || null, checksum: createHash("sha256").update(JSON.stringify(rules)).digest("hex") });
  redirect(`/app/rent-index?sourceCreated=1`);
}

export async function updateRentIndexSource(sourceId: string, _: { error?: string } | undefined, formData: FormData): Promise<{ error?: string } | undefined> {
  const session = await requireSession();
  const municipality = String(formData.get("municipality") || "").trim();
  const version = String(formData.get("version") || "").trim();
  const rulesText = String(formData.get("rulesJson") || "");
  if (!municipality || !version || !rulesText) return { error: "Stadt, Version und Regeln sind erforderlich." };
  let rules: RentIndexExtraction["structuredRules"];
  try { rules = JSON.parse(rulesText); } catch { return { error: "Das Regel-JSON ist syntaktisch ungültig." }; }
  if (!rules || !["munich_regression", "cologne_ranges", "berlin_ranges", "manual_ranges"].includes(rules.kind)) return { error: "Unbekannter Regeltyp." };
  const districts = String(formData.get("districts") || "").split(",").map((item) => item.trim()).filter(Boolean);
  const postalCodes = String(formData.get("postalCodes") || "").split(",").map((item) => item.trim()).filter(Boolean);
  const status = formData.has("activate") ? "active" : "pending_review";
  if (status === "active") await getDb().update(rentIndexSources).set({ status: "superseded", updatedAt: new Date() }).where(and(eq(rentIndexSources.organizationId, session.organizationId), eq(rentIndexSources.municipality, municipality), eq(rentIndexSources.status, "active")));
  const [updated] = await getDb().update(rentIndexSources).set({ municipality, version, status, rules, geographicScope: { level: districts.length ? "district" : "city", districts, postalCodes }, notes: String(formData.get("notes") || "") || null, checksum: createHash("sha256").update(JSON.stringify(rules)).digest("hex"), updatedAt: new Date() }).where(and(eq(rentIndexSources.id, sourceId), eq(rentIndexSources.organizationId, session.organizationId))).returning({ id: rentIndexSources.id });
  if (!updated) return { error: "Quelle wurde nicht gefunden." };
  redirect(`/app/rent-index?sourceUpdated=1`);
}

export async function approveRentIndexImport(importId: string) {
  const session = await requireSession();
  const db = getDb();
  const [record] = await db
    .update(rentIndexImports)
    .set({ status: "approved", reviewedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(rentIndexImports.id, importId),
        eq(rentIndexImports.organizationId, session.organizationId),
        eq(rentIndexImports.status, "needs_review"),
      ),
    )
    .returning({
      id: rentIndexImports.id,
      municipality: rentIndexImports.municipality,
      extractedData: rentIndexImports.extractedData,
      sourceUrl: rentIndexImports.sourceUrl,
      blobPathname: rentIndexImports.blobPathname,
    });
  if (!record)
    redirect(`/app/rent-index/imports/${importId}?error=not-reviewable`);
  const extraction = record.extractedData as RentIndexExtraction | null;
  if (extraction?.structuredRules && extraction.detectedDocument) {
    await db.update(rentIndexSources).set({ status: "superseded", updatedAt: new Date() }).where(
      and(
        eq(rentIndexSources.organizationId, session.organizationId),
        eq(rentIndexSources.municipality, extraction.detectedDocument.municipality),
        eq(rentIndexSources.status, "active"),
      ),
    );
    const [existing] = await db.select({ id: rentIndexSources.id }).from(rentIndexSources).where(
      and(
        eq(rentIndexSources.organizationId, session.organizationId),
        eq(rentIndexSources.municipality, extraction.detectedDocument.municipality),
        eq(rentIndexSources.version, extraction.detectedDocument.version),
      ),
    ).limit(1);
    const sourceValues = {
      municipality: extraction.detectedDocument.municipality,
      providerType: "verified_upload",
      sourceUrl: record.sourceUrl,
      version: extraction.detectedDocument.version,
      effectiveFrom: new Date(`${extraction.detectedDocument.version}-01-01T00:00:00.000Z`),
      status: "active" as const,
      rules: extraction.structuredRules,
      checksum: record.blobPathname,
      updatedAt: new Date(),
    };
    if (existing) await db.update(rentIndexSources).set(sourceValues).where(eq(rentIndexSources.id, existing.id));
    else await db.insert(rentIndexSources).values({ organizationId: session.organizationId, ...sourceValues });
  }
  await db
    .insert(auditLogs)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "rent_index_import.reviewed",
      entityType: "rent_index_import",
      entityId: importId,
    });
  await db
    .insert(notifications)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      title: `Mietspiegel ${record.municipality} geprüft`,
      body: extraction?.structuredRules
        ? "Die geprüften Regeln wurden als aktive Berechnungsquelle gespeichert."
        : "Die Extraktion ist bestätigt; für dieses Format ist noch eine manuelle Regelzuordnung nötig.",
      href: `/app/rent-index/imports/${importId}`,
      type: "success",
      deduplicationKey: `rent-index-approved:${importId}`,
    })
    .onConflictDoNothing();
  redirect(`/app/rent-index/imports/${importId}?approved=1`);
}
