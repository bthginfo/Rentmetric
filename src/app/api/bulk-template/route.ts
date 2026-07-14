import { NextResponse } from "next/server";
import { requireSession } from "@/auth/session";
import { bulkEntityTypes, createCsvTemplate, type BulkEntityType } from "@/domain/bulk-import";

export async function GET(request: Request) {
  await requireSession();
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as BulkEntityType | null;
  const variant = url.searchParams.get("variant");
  if (!type || !bulkEntityTypes.includes(type) || !["blank", "example"].includes(variant ?? "")) {
    return NextResponse.json({ error: "Vorlage wurde nicht gefunden." }, { status: 400 });
  }
  const body = createCsvTemplate(type, variant === "example");
  const filename = `rentmetric-${type}-${variant === "example" ? "beispiel" : "vorlage"}.csv`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
