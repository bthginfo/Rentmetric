import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db/client";
import { organizationMemberships, organizations, sessions, users } from "@/db/schema";
import { createSessionToken, hashSessionToken } from "./crypto";

const cookieName = "rentmetric_session";
const sessionDays = 14;

export async function createSession(userId: string) {
  const { token, tokenHash } = createSessionToken();
  const expiresAt = new Date(Date.now() + sessionDays * 86_400_000);
  await getDb().insert(sessions).values({ userId, tokenHash, expiresAt });
  (await cookies()).set(cookieName, token, {
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
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  store.delete(cookieName);
}

export const getSessionContext = cache(async function getSessionContext() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const [context] = await getDb()
    .select({ userId: users.id, displayName: users.displayName, organizationId: organizations.id, organizationName: organizations.name, role: organizationMemberships.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(organizationMemberships, eq(organizationMemberships.userId, users.id))
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return context ?? null;
});

export async function requireSession() {
  const context = await getSessionContext();
  if (!context) redirect("/login");
  return context;
}
