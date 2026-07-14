import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionToken, hashSessionToken } from "@/auth/crypto";
import { getDb } from "@/db/client";
import { platformAdmins, platformAdminSessions } from "@/db/schema";

const adminCookieName = "rentmetric_admin_session";
const sessionHours = 8;

export async function createAdminSession(adminId: string) {
  const { token, tokenHash } = createSessionToken();
  const expiresAt = new Date(Date.now() + sessionHours * 3_600_000);
  await getDb().insert(platformAdminSessions).values({ adminId, tokenHash, expiresAt });
  (await cookies()).set(adminCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    expires: expiresAt,
    priority: "high",
  });
}

export async function deleteAdminSession() {
  const store = await cookies();
  const token = store.get(adminCookieName)?.value;
  if (token)
    await getDb().delete(platformAdminSessions).where(
      eq(platformAdminSessions.tokenHash, hashSessionToken(token)),
    );
  store.set(adminCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 0,
  });
}

export const getAdminSession = cache(async function getAdminSession() {
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!token) return null;
  const [context] = await getDb()
    .select({
      sessionId: platformAdminSessions.id,
      adminId: platformAdmins.id,
      username: platformAdmins.username,
      displayName: platformAdmins.displayName,
      email: platformAdmins.email,
    })
    .from(platformAdminSessions)
    .innerJoin(platformAdmins, eq(platformAdmins.id, platformAdminSessions.adminId))
    .where(
      and(
        eq(platformAdminSessions.tokenHash, hashSessionToken(token)),
        gt(platformAdminSessions.expiresAt, new Date()),
        isNull(platformAdmins.disabledAt),
      ),
    )
    .limit(1);
  if (context)
    await getDb()
      .update(platformAdminSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(platformAdminSessions.id, context.sessionId));
  return context ?? null;
});

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}
