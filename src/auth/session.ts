import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db/client";
import {
  organizationMemberships,
  organizations,
  sessions,
  users,
} from "@/db/schema";
import { createSessionToken, hashSessionToken } from "./crypto";

const legacyCookieName = "rentmetric_session";
const cookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-rentmetric_session"
    : legacyCookieName;
const sessionDays = 7;
const idleTimeoutMs = 24 * 60 * 60_000;

export async function createSession(userId: string) {
  const { token, tokenHash } = createSessionToken();
  const expiresAt = new Date(Date.now() + sessionDays * 86_400_000);
  const store = await cookies();
  const existingTokens = [
    store.get(cookieName)?.value,
    cookieName !== legacyCookieName
      ? store.get(legacyCookieName)?.value
      : undefined,
  ].filter((value): value is string => Boolean(value));
  for (const existingToken of existingTokens)
    await getDb()
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashSessionToken(existingToken)));
  await getDb().insert(sessions).values({ userId, tokenHash, expiresAt });
  if (cookieName !== legacyCookieName) store.delete(legacyCookieName);
  store.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (token)
    await getDb()
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashSessionToken(token)));
  store.delete(cookieName);
  if (cookieName !== legacyCookieName) store.delete(legacyCookieName);
}

export const getSessionContext = cache(async function getSessionContext() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const [context] = await getDb()
    .select({
      sessionId: sessions.id,
      userId: users.id,
      displayName: users.displayName,
      username: users.username,
      email: users.email,
      organizationId: organizations.id,
      organizationName: organizations.name,
      role: organizationMemberships.role,
      lastSeenAt: sessions.lastSeenAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(
      organizationMemberships,
      eq(organizationMemberships.userId, users.id),
    )
    .innerJoin(
      organizations,
      eq(organizations.id, organizationMemberships.organizationId),
    )
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(token)),
        gt(sessions.expiresAt, new Date()),
        gt(sessions.lastSeenAt, new Date(Date.now() - idleTimeoutMs)),
      ),
    )
    .limit(1);
  if (!context) return null;
  if (Date.now() - context.lastSeenAt.getTime() > 5 * 60_000)
    await getDb()
      .update(sessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessions.id, context.sessionId));
  return {
    sessionId: context.sessionId,
    userId: context.userId,
    displayName: context.displayName,
    username: context.username,
    email: context.email,
    organizationId: context.organizationId,
    organizationName: context.organizationName,
    role: context.role,
  };
});

export async function requireSession() {
  const context = await getSessionContext();
  if (!context) redirect("/login");
  return context;
}
