import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { rentIndexImports, rentIndexSources } from "@/db/schema";
import type { RentIndexExtraction } from "@/lib/rent-index/types";

export async function listRentIndexImports(organizationId: string) {
  return getDb()
    .select()
    .from(rentIndexImports)
    .where(eq(rentIndexImports.organizationId, organizationId))
    .orderBy(desc(rentIndexImports.createdAt))
    .limit(30);
}

export async function getRentIndexImport(
  organizationId: string,
  importId: string,
) {
  const [record] = await getDb()
    .select()
    .from(rentIndexImports)
    .where(
      and(
        eq(rentIndexImports.id, importId),
        eq(rentIndexImports.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!record) return null;
  return {
    ...record,
    extraction: record.extractedData as RentIndexExtraction | null,
    warningList: (record.warnings as string[] | null) || [],
  };
}

export async function listActiveRentIndexSources(organizationId: string) {
  return getDb().select().from(rentIndexSources).where(and(eq(rentIndexSources.organizationId, organizationId), eq(rentIndexSources.status, "active"))).orderBy(desc(rentIndexSources.effectiveFrom));
}

export async function listRentIndexSources(organizationId: string) {
  return getDb().select().from(rentIndexSources).where(eq(rentIndexSources.organizationId, organizationId)).orderBy(desc(rentIndexSources.effectiveFrom));
}

export async function getRentIndexSource(organizationId: string, sourceId: string) {
  const [source] = await getDb().select().from(rentIndexSources).where(and(eq(rentIndexSources.organizationId, organizationId), eq(rentIndexSources.id, sourceId))).limit(1);
  return source ?? null;
}
