import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { organizationMemberships } from "@/db/schema";
import { ensureSmartNotifications } from "@/lib/smart-notifications";
import { ensureSmartTasks } from "@/lib/smart-tasks";

export const runtime = "nodejs";
function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!expected || !provided) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}
export async function GET(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const memberships = await getDb()
    .select({
      organizationId: organizationMemberships.organizationId,
      userId: organizationMemberships.userId,
    })
    .from(organizationMemberships);
  const organizations = [
    ...new Set(memberships.map((item) => item.organizationId)),
  ];
  let generated = 0;
  for (const organizationId of organizations)
    generated += await ensureSmartTasks(organizationId);
  for (const membership of memberships)
    await ensureSmartNotifications(
      membership.organizationId,
      membership.userId,
    );
  return NextResponse.json({
    ok: true,
    organizations: organizations.length,
    memberships: memberships.length,
    evaluatedRules: generated,
    at: new Date().toISOString(),
  });
}
