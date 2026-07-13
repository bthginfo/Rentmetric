import "server-only";
import { get } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { rentIndexImports } from "@/db/schema";
import { getRentIndexExtractionProvider } from "@/providers/rent-index-extraction";

export async function processRentIndexImport(
  importId: string,
  organizationId: string,
) {
  const db = getDb();
  const [record] = await db
    .select()
    .from(rentIndexImports)
    .where(
      and(
        eq(rentIndexImports.id, importId),
        eq(rentIndexImports.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!record) throw new Error("Import wurde nicht gefunden.");
  await db
    .update(rentIndexImports)
    .set({ status: "processing", error: null, updatedAt: new Date() })
    .where(eq(rentIndexImports.id, record.id));
  try {
    const blob = await get(record.blobPathname, { access: "private" });
    if (!blob || blob.statusCode !== 200)
      throw new Error("Hochgeladene Datei ist nicht verfügbar.");
    const buffer = new Uint8Array(
      await new Response(blob.stream).arrayBuffer(),
    );
    const extraction = await getRentIndexExtractionProvider().extract({
      buffer,
      filename: record.originalFilename,
      mimeType: record.mimeType,
    });
    if (extraction.structuredRules && !extraction.detectedDocument) {
      extraction.detectedDocument = { municipality: record.municipality, version: record.title.match(/(?:19|20)\d{2}/)?.[0] || "Import", confidence: 0.85, model: "range_table" };
    }
    await db
      .update(rentIndexImports)
      .set({
        status: "needs_review",
        detectedFormat: extraction.format,
        extractedData: extraction,
        warnings: extraction.warnings,
        updatedAt: new Date(),
      })
      .where(eq(rentIndexImports.id, record.id));
    return extraction;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Datei konnte nicht ausgewertet werden.";
    await db
      .update(rentIndexImports)
      .set({ status: "failed", error: message, updatedAt: new Date() })
      .where(eq(rentIndexImports.id, record.id));
    throw error;
  }
}
