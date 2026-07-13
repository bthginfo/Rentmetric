import { eq } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { contacts, properties, renters, tenancies, units } from "@/db/schema";

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ""; const headers = Object.keys(rows[0]); const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.map(escape).join(";"), ...rows.map((row) => headers.map((header) => escape(row[header] instanceof Date ? (row[header] as Date).toISOString() : row[header])).join(";"))].join("\r\n");
}
export async function GET(request: Request) {
  const session = await requireSession(); const type = new URL(request.url).searchParams.get("type") || "properties"; const db = getDb();
  const tables = { properties, units, renters, tenancies, contacts } as const; const table = tables[type as keyof typeof tables];
  if (!table) return Response.json({ error: "Unbekannter Exporttyp." }, { status: 400 });
  const rows = await db.select().from(table).where(eq(table.organizationId, session.organizationId));
  return new Response(`\uFEFF${csv(rows)}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="rentmetric-${type}.csv"`, "Cache-Control": "no-store" } });
}
