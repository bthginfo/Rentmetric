import { randomUUID } from "node:crypto";
import { head } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { getDb } from "@/db/client";
import { auditLogs, notifications, propertyImages, rentIndexImports } from "@/db/schema";
import { requireSession } from "@/auth/session";
import { organizationOwnsProperty } from "@/repositories/portfolio";
import { processRentIndexImport } from "@/lib/rent-index/processing";

export const maxDuration = 60;

const uploadPayloadSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("property-image"), organizationId: z.string().uuid(), userId: z.string().uuid(), propertyId: z.string().uuid(), originalFilename: z.string().min(1).max(180) }),
  z.object({ kind: z.literal("rent-index"), organizationId: z.string().uuid(), userId: z.string().uuid(), municipality: z.string().trim().min(1).max(120), title: z.string().trim().min(1).max(180), originalFilename: z.string().min(1).max(180) }),
]);
type UploadPayload = z.infer<typeof uploadPayloadSchema>;

function parsePayload(value: string | null): UploadPayload {
  if (!value) throw new Error("Upload-Kontext fehlt.");
  return uploadPayloadSchema.parse(JSON.parse(value));
}

export async function POST(request: Request) {
  const body = await request.json() as HandleUploadBody;
  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await requireSession();
        const payload = parsePayload(clientPayload);
        if (payload.organizationId !== session.organizationId || payload.userId !== session.userId) throw new Error("Upload ist nicht autorisiert.");
        if (!payload.originalFilename || payload.originalFilename.length > 180 || /[\\/]/.test(payload.originalFilename)) throw new Error("Ungültiger Dateiname.");
        const expectedPrefix = `organizations/${session.organizationId}/${payload.kind === "property-image" ? "properties" : "rent-index"}/`;
        if (!pathname.startsWith(expectedPrefix) || pathname.includes("..") || pathname.includes("\\")) throw new Error("Ungültiger Upload-Pfad.");
        if (payload.kind === "property-image") {
          if (!payload.propertyId || !await organizationOwnsProperty(session.organizationId, payload.propertyId)) throw new Error("Objekt wurde nicht gefunden.");
          return { allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"], maximumSizeInBytes: 12 * 1024 * 1024, addRandomSuffix: true, tokenPayload: JSON.stringify(payload) };
        }
        if (!payload.municipality?.trim() || !payload.title?.trim()) throw new Error("Stadt und Titel sind erforderlich.");
        return { allowedContentTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv", "text/tab-separated-values", "text/plain"], maximumSizeInBytes: 30 * 1024 * 1024, addRandomSuffix: true, tokenPayload: JSON.stringify(payload) };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = parsePayload(tokenPayload || null);
        const db = getDb();
        const metadata = await head(blob.pathname);
        if (payload.kind === "property-image") {
          if (!payload.propertyId) throw new Error("Objektbezug fehlt.");
          const imageId = randomUUID();
          await db.insert(propertyImages).values({ id: imageId, organizationId: payload.organizationId, propertyId: payload.propertyId, blobPathname: blob.pathname, originalFilename: payload.originalFilename, mimeType: blob.contentType, sizeBytes: metadata.size }).onConflictDoNothing();
          await db.insert(auditLogs).values({ organizationId: payload.organizationId, userId: payload.userId, action: "property.image_uploaded", entityType: "property", entityId: payload.propertyId });
          return;
        }
        const importId = randomUUID();
        const inserted = await db.insert(rentIndexImports).values({ id: importId, organizationId: payload.organizationId, uploadedByUserId: payload.userId, municipality: payload.municipality!, title: payload.title!, originalFilename: payload.originalFilename, mimeType: blob.contentType, sizeBytes: metadata.size, blobPathname: blob.pathname }).onConflictDoNothing().returning({ id: rentIndexImports.id });
        if (!inserted.length) return;
        await db.insert(notifications).values({ organizationId: payload.organizationId, userId: payload.userId, title: `Mietspiegel ${payload.municipality} wird ausgewertet`, body: payload.originalFilename, href: `/app/rent-index/imports/${importId}`, type: "processing", deduplicationKey: `rent-index-upload:${importId}` });
        await processRentIndexImport(importId, payload.organizationId).catch(() => undefined);
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload fehlgeschlagen." }, { status: 400 });
  }
}
