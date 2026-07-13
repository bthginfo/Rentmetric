import { get } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { propertyImages } from "@/db/schema";

export async function GET(
  request: Request,
  context: { params: Promise<{ imageId: string }> },
) {
  const session = await requireSession();
  const { imageId } = await context.params;
  const [image] = await getDb()
    .select()
    .from(propertyImages)
    .where(
      and(
        eq(propertyImages.id, imageId),
        eq(propertyImages.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!image) return new Response("Nicht gefunden", { status: 404 });
  const result = await get(image.blobPathname, {
    access: "private",
    ifNoneMatch: request.headers.get("if-none-match") || undefined,
  });
  if (!result) return new Response("Nicht gefunden", { status: 404 });
  if (result.statusCode === 304)
    return new Response(null, {
      status: 304,
      headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" },
    });
  if (result.statusCode !== 200)
    return new Response("Nicht gefunden", { status: 404 });
  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      ETag: result.blob.etag,
      "Cache-Control": "private, no-cache",
    },
  });
}
