import { requireSession } from "@/auth/session";
import { searchGovDataRentIndexes } from "@/lib/govdata";

export async function GET(request: Request) {
  await requireSession();
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").slice(0, 80);
  try {
    return Response.json(await searchGovDataRentIndexes(query));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Suche fehlgeschlagen." }, { status: 502 });
  }
}
