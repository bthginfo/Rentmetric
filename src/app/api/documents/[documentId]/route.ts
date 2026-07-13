import { get } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { documents } from "@/db/schema";

export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const session = await requireSession();
  const { documentId } = await context.params;
  const [document] = await getDb()
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!document) return new Response("Nicht gefunden", { status: 404 });
  const result = await get(document.blobKey, {
    access: "private",
    ifNoneMatch: request.headers.get("if-none-match") || undefined,
  });
  if (!result) return new Response("Nicht gefunden", { status: 404 });
  if (result.statusCode === 304)
    return new Response(null, {
      status: 304,
      headers: { ETag: result.blob.etag },
    });
  if (result.statusCode !== 200)
    return new Response("Nicht gefunden", { status: 404 });
  const safeName = (document.originalFilename || document.title).replace(
    /["\r\n]/g,
    "",
  );
  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
      ETag: result.blob.etag,
    },
  });
}
