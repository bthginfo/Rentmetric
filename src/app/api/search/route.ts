import { requireSession } from "@/auth/session";
import { globalSearch } from "@/repositories/search";

export async function GET(request: Request) {
  const session = await requireSession();
  const query = new URL(request.url).searchParams.get("q")?.slice(0, 80) || "";
  return Response.json({ results: await globalSearch(session.organizationId, query) });
}
