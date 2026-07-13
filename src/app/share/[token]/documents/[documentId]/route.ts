import { get } from "@vercel/blob";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { documents, shareLinks } from "@/db/schema";
import { hashShareToken } from "@/domain/share-links";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; documentId: string }> },
) {
  const { token, documentId } = await params;
  const [document] = await getDb()
    .select({ item: documents })
    .from(documents)
    .innerJoin(shareLinks, eq(shareLinks.tenancyId, documents.tenancyId))
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
  if (!document) return new Response("Nicht gefunden", { status: 404 });
  const result = await get(document.item.blobKey, {
    access: "private",
    ifNoneMatch: request.headers.get("if-none-match") || undefined,
  });
  if (!result || result.statusCode !== 200)
    return new Response("Nicht gefunden", { status: 404 });
  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
    },
  });
}
