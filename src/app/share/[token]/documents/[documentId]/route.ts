import { get } from "@vercel/blob";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { documents, shareLinks } from "@/db/schema";
import { hashShareToken, type SharePermissions } from "@/domain/share-links";

const routeParamsSchema = z.object({
  token: z.string().min(20).max(200),
  documentId: z.uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; documentId: string }> },
) {
  const parsed = routeParamsSchema.safeParse(await params);
  if (!parsed.success) return new Response("Nicht gefunden", { status: 404 });
  const { token, documentId } = parsed.data;
  const [document] = await getDb()
    .select({ item: documents, permissions: shareLinks.permissions })
    .from(documents)
    .innerJoin(
      shareLinks,
      and(
        eq(shareLinks.tenancyId, documents.tenancyId),
        eq(shareLinks.organizationId, documents.organizationId),
      ),
    )
    .where(
      and(
        eq(shareLinks.tokenHash, hashShareToken(token)),
        isNull(shareLinks.revokedAt),
        gt(shareLinks.expiresAt, new Date()),
        eq(documents.id, documentId),
        eq(documents.visibleToRenter, true),
      ),
    )
    .limit(1);
  if (
    !document ||
    !(document.permissions as SharePermissions).documents
  )
    return new Response("Nicht gefunden", { status: 404 });
  const result = await get(document.item.blobKey, {
    access: "private",
    ifNoneMatch: request.headers.get("if-none-match") || undefined,
  });
  if (!result) return new Response("Nicht gefunden", { status: 404 });
  if (result.statusCode === 304)
    return new Response(null, {
      status: 304,
      headers: {
        ETag: result.blob.etag,
        "Cache-Control": "private, no-store",
      },
    });
  if (result.statusCode !== 200)
    return new Response("Nicht gefunden", { status: 404 });
  const safeName = (document.item.originalFilename || document.item.title)
    .replace(/["\r\n]/g, "")
    .slice(0, 180);
  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Cache-Control": "private, no-store",
      ETag: result.blob.etag,
    },
  });
}
