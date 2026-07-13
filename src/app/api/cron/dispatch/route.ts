import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !provided) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  // Der Dispatcher wird im nächsten vertikalen Release mit FOR UPDATE SKIP LOCKED
  // an background_jobs angeschlossen. Der geschützte Endpunkt ist bereits deploybar.
  return NextResponse.json({ ok: true, dispatched: 0, at: new Date().toISOString() });
}

