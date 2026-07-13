import { randomUUID } from "node:crypto";
import { get, head } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  auditLogs,
  documents,
  notifications,
  propertyImages,
  rentIndexImports,
  shareLinks,
  tenancies,
  utilityPeriods,
} from "@/db/schema";
import { requireSession } from "@/auth/session";
import { organizationOwnsProperty } from "@/repositories/portfolio";
import { processRentIndexImport } from "@/lib/rent-index/processing";
import { hashShareToken, type SharePermissions } from "@/domain/share-links";
import { extractInvoiceProposal } from "@/lib/invoice-extraction";

export const maxDuration = 60;

const uploadPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("property-image"),
    organizationId: z.string().uuid(),
    userId: z.string().uuid(),
    propertyId: z.string().uuid(),
    originalFilename: z.string().min(1).max(180),
  }),
  z.object({
    kind: z.literal("rent-index"),
    organizationId: z.string().uuid(),
    userId: z.string().uuid(),
    municipality: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(180),
    originalFilename: z.string().min(1).max(180),
  }),
  z.object({
    kind: z.literal("document"),
    organizationId: z.string().uuid(),
    userId: z.string().uuid(),
    tenancyId: z.string().uuid().nullable(),
    title: z.string().trim().min(1).max(180),
    category: z.string().trim().min(1).max(80),
    originalFilename: z.string().min(1).max(180),
  }),
  z.object({
    kind: z.literal("utility-document"),
    organizationId: z.string().uuid(),
    userId: z.string().uuid(),
    utilityPeriodId: z.string().uuid(),
    title: z.string().trim().min(1).max(180),
    originalFilename: z.string().min(1).max(180),
  }),
  z.object({
    kind: z.literal("share-document"),
    token: z.string().min(20).max(200),
    title: z.string().trim().min(1).max(180),
    category: z.string().trim().min(1).max(80),
    originalFilename: z.string().min(1).max(180),
    organizationId: z.string().uuid().optional(),
    tenancyId: z.string().uuid().optional(),
    renterId: z.string().uuid().optional(),
  }),
]);
type UploadPayload = z.infer<typeof uploadPayloadSchema>;

function parsePayload(value: string | null): UploadPayload {
  if (!value) throw new Error("Upload-Kontext fehlt.");
  return uploadPayloadSchema.parse(JSON.parse(value));
}

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parsePayload(clientPayload);
        if (payload.kind === "share-document") {
          const [share] = await getDb()
            .select({
              id: shareLinks.id,
              organizationId: shareLinks.organizationId,
              tenancyId: shareLinks.tenancyId,
              permissions: shareLinks.permissions,
              renterId: tenancies.renterId,
            })
            .from(shareLinks)
            .innerJoin(tenancies, eq(tenancies.id, shareLinks.tenancyId))
            .where(
              and(
                eq(shareLinks.tokenHash, hashShareToken(payload.token)),
                isNull(shareLinks.revokedAt),
                gt(shareLinks.expiresAt, new Date()),
              ),
            )
            .limit(1);
          if (!share || !(share.permissions as SharePermissions).uploads)
            throw new Error("Dieser Freigabelink erlaubt keine Uploads.");
          if (
            !pathname.startsWith("share-inbox/") ||
            pathname.includes("..") ||
            pathname.includes("\\")
          )
            throw new Error("Ungültiger Upload-Pfad.");
          return {
            allowedContentTypes: [
              "application/pdf",
              "image/jpeg",
              "image/png",
              "image/webp",
              "text/plain",
            ],
            maximumSizeInBytes: 10 * 1024 * 1024,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({
              ...payload,
              organizationId: share.organizationId,
              tenancyId: share.tenancyId,
              renterId: share.renterId,
            }),
          };
        }
        const session = await requireSession();
        if (
          payload.organizationId !== session.organizationId ||
          payload.userId !== session.userId
        )
          throw new Error("Upload ist nicht autorisiert.");
        if (
          !payload.originalFilename ||
          payload.originalFilename.length > 180 ||
          /[\\/]/.test(payload.originalFilename)
        )
          throw new Error("Ungültiger Dateiname.");
        const folder =
          payload.kind === "property-image"
            ? "properties"
            : payload.kind === "rent-index"
              ? "rent-index"
              : "documents";
        const expectedPrefix = `organizations/${session.organizationId}/${folder}/`;
        if (
          !pathname.startsWith(expectedPrefix) ||
          pathname.includes("..") ||
          pathname.includes("\\")
        )
          throw new Error("Ungültiger Upload-Pfad.");
        if (payload.kind === "property-image") {
          if (
            !payload.propertyId ||
            !(await organizationOwnsProperty(
              session.organizationId,
              payload.propertyId,
            ))
          )
            throw new Error("Objekt wurde nicht gefunden.");
          return {
            allowedContentTypes: [
              "image/jpeg",
              "image/png",
              "image/webp",
              "image/heic",
            ],
            maximumSizeInBytes: 12 * 1024 * 1024,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify(payload),
          };
        }
        if (payload.kind === "document" || payload.kind === "utility-document") {
          if (payload.kind === "utility-document") {
            const [period] = await getDb().select({ id: utilityPeriods.id }).from(utilityPeriods).where(and(eq(utilityPeriods.id, payload.utilityPeriodId), eq(utilityPeriods.organizationId, session.organizationId))).limit(1);
            if (!period) throw new Error("Abrechnungsperiode wurde nicht gefunden.");
          }
          if (payload.kind === "document" && payload.tenancyId) {
            const [tenancy] = await getDb()
              .select({ id: tenancies.id })
              .from(tenancies)
              .where(
                and(
                  eq(tenancies.id, payload.tenancyId),
                  eq(tenancies.organizationId, session.organizationId),
                ),
              )
              .limit(1);
            if (!tenancy)
              throw new Error("Mietverhältnis wurde nicht gefunden.");
          }
          return {
            allowedContentTypes: [
              "application/pdf",
              "image/jpeg",
              "image/png",
              "image/webp",
              "text/plain",
            ],
            maximumSizeInBytes: 20 * 1024 * 1024,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify(payload),
          };
        }
        if (!payload.municipality?.trim() || !payload.title?.trim())
          throw new Error("Stadt und Titel sind erforderlich.");
        return {
          allowedContentTypes: [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "text/csv",
            "text/tab-separated-values",
            "text/plain",
          ],
          maximumSizeInBytes: 30 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify(payload),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = parsePayload(tokenPayload || null);
        const db = getDb();
        const metadata = await head(blob.pathname);
        if (payload.kind === "share-document") {
          if (
            !payload.organizationId ||
            !payload.tenancyId ||
            !payload.renterId
          )
            throw new Error("Freigabekontext fehlt.");
          const documentId = randomUUID();
          await db.insert(documents).values({
            id: documentId,
            organizationId: payload.organizationId,
            tenancyId: payload.tenancyId,
            renterId: payload.renterId,
            title: payload.title,
            category: payload.category,
            originalFilename: payload.originalFilename,
            blobKey: blob.pathname,
            mimeType: blob.contentType,
            sizeBytes: metadata.size,
            uploadedByRenter: true,
          });
          await db.insert(notifications).values({
            organizationId: payload.organizationId,
            title: "Neues Dokument aus dem Mieterportal",
            body: payload.title,
            href: "/app/documents",
            type: "document",
            deduplicationKey: `renter-document:${documentId}`,
          });
          return;
        }
        if (payload.kind === "property-image") {
          if (!payload.propertyId) throw new Error("Objektbezug fehlt.");
          const imageId = randomUUID();
          await db
            .insert(propertyImages)
            .values({
              id: imageId,
              organizationId: payload.organizationId,
              propertyId: payload.propertyId,
              blobPathname: blob.pathname,
              originalFilename: payload.originalFilename,
              mimeType: blob.contentType,
              sizeBytes: metadata.size,
            })
            .onConflictDoNothing();
          await db.insert(auditLogs).values({
            organizationId: payload.organizationId,
            userId: payload.userId,
            action: "property.image_uploaded",
            entityType: "property",
            entityId: payload.propertyId,
          });
          return;
        }
        if (payload.kind === "document" || payload.kind === "utility-document") {
          const documentId = randomUUID();
          let extraction = null;
          if (payload.kind === "utility-document") {
            const stored = await get(blob.pathname, { access: "private" });
            if (stored?.statusCode === 200) extraction = await extractInvoiceProposal(new Uint8Array(await new Response(stored.stream).arrayBuffer()), blob.contentType);
          }
          await db.insert(documents).values({
            id: documentId,
            organizationId: payload.organizationId,
            title: payload.title,
            category: payload.kind === "utility-document" ? "Betriebskostenbeleg" : payload.category,
            originalFilename: payload.originalFilename,
            blobKey: blob.pathname,
            mimeType: blob.contentType,
            sizeBytes: metadata.size,
            uploadedByUserId: payload.userId,
            tenancyId: payload.kind === "document" ? payload.tenancyId : null,
            utilityPeriodId: payload.kind === "utility-document" ? payload.utilityPeriodId : null,
            extractedData: extraction,
            processingStatus: payload.kind === "utility-document" ? "needs_review" : "confirmed",
            approvedAt: new Date(),
          });
          await db.insert(auditLogs).values({
            organizationId: payload.organizationId,
            userId: payload.userId,
            action: "document.uploaded",
            entityType: "document",
            entityId: documentId,
          });
          return;
        }
        const importId = randomUUID();
        const inserted = await db
          .insert(rentIndexImports)
          .values({
            id: importId,
            organizationId: payload.organizationId,
            uploadedByUserId: payload.userId,
            municipality: payload.municipality!,
            title: payload.title!,
            originalFilename: payload.originalFilename,
            mimeType: blob.contentType,
            sizeBytes: metadata.size,
            blobPathname: blob.pathname,
          })
          .onConflictDoNothing()
          .returning({ id: rentIndexImports.id });
        if (!inserted.length) return;
        await db.insert(notifications).values({
          organizationId: payload.organizationId,
          userId: payload.userId,
          title: `Mietspiegel ${payload.municipality} wird ausgewertet`,
          body: payload.originalFilename,
          href: `/app/rent-index/imports/${importId}`,
          type: "processing",
          deduplicationKey: `rent-index-upload:${importId}`,
        });
        await processRentIndexImport(importId, payload.organizationId).catch(
          () => undefined,
        );
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Upload fehlgeschlagen.",
      },
      { status: 400 },
    );
  }
}
