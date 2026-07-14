import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionToken, hashSessionToken } from "@/auth/crypto";
import { getDb } from "@/db/client";
import { platformAdmins, platformAdminSessions } from "@/db/schema";

const legacyAdminCookieName = "rentmetric_admin_session";
const adminCookieName =
  process.env.NODE_ENV === "production"
    ? "__Secure-rentmetric_admin_session"
    : legacyAdminCookieName;
const sessionHours = 4;
const idleTimeoutMs = 60 * 60_000;

export async function createAdminSession(adminId: string) {
  const { token, tokenHash } = createSessionToken();
  const expiresAt = new Date(Date.now() + sessionHours * 3_600_000);
  const store = await cookies();
  const existingTokens = [
    store.get(adminCookieName)?.value,
    adminCookieName !== legacyAdminCookieName
      ? store.get(legacyAdminCookieName)?.value
      : undefined,
  ].filter((value): value is string => Boolean(value));
  for (const existingToken of existingTokens)
    await getDb().delete(platformAdminSessions).where(
      eq(platformAdminSessions.tokenHash, hashSessionToken(existingToken)),
    );
  await getDb().insert(platformAdminSessions).values({
    adminId,
    tokenHash,
    expiresAt,
  });
  if (adminCookieName !== legacyAdminCookieName)
    store.set(legacyAdminCookieName, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/admin",
      maxAge: 0,
    });
  store.set(adminCookieName, token, {
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
  if (adminCookieName !== legacyAdminCookieName)
    store.set(legacyAdminCookieName, "", {
      httpOnly: true,
      secure: true,
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
      passwordChangedAt: platformAdmins.passwordChangedAt,
      adminCreatedAt: platformAdmins.createdAt,
    })
    .from(platformAdminSessions)
    .innerJoin(platformAdmins, eq(platformAdmins.id, platformAdminSessions.adminId))
    .where(
      and(
        eq(platformAdminSessions.tokenHash, hashSessionToken(token)),
        gt(platformAdminSessions.expiresAt, new Date()),
        gt(
          platformAdminSessions.lastSeenAt,
          new Date(Date.now() - idleTimeoutMs),
        ),
        isNull(platformAdmins.disabledAt),
      ),
    )
    .limit(1);
  if (context)
    await getDb()
      .update(platformAdminSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(platformAdminSessions.id, context.sessionId));
  if (!context) return null;
  return {
    ...context,
    requiresPasswordChange:
      context.passwordChangedAt.getTime() - context.adminCreatedAt.getTime() <=
      5_000,
  };
});

export async function requireAdminSession(options?: {
  allowInitialPassword?: boolean;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.requiresPasswordChange && !options?.allowInitialPassword)
    redirect("/admin/profile?security=Passwortwechsel+erforderlich");
  return session;
}
