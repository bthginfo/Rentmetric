"use server";

import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { dummyPasswordHash, hashPassword, verifyPassword } from "./crypto";
import { strongPasswordSchema, usernameSchema } from "./policy";
import {
  isAnyRateLimitExceeded,
  rateLimitKeys,
  recordRateLimitResult,
} from "./rate-limit";
import { createSession, deleteSession } from "./session";

export type AuthState =
  { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(128),
});
const registerSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  displayName: z.string().trim().max(120).optional(),
  username: usernameSchema,
  password: strongPasswordSchema,
});

export async function login(
  _: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: "Benutzername oder Passwort ist nicht korrekt." };
  const keys = await rateLimitKeys([
    {
      namespace: "user-login-account",
      identity: parsed.data.username,
      limit: 8,
      windowMs: 15 * 60_000,
    },
    {
      namespace: "user-login-ip",
      limit: 40,
      windowMs: 15 * 60_000,
    },
  ]);
  if (await isAnyRateLimitExceeded(keys))
    return {
      error: "Zu viele Versuche. Bitte versuchen Sie es später erneut.",
    };

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.username, parsed.data.username))
    .limit(1);
  const valid = await verifyPassword(
    user?.passwordHash ?? dummyPasswordHash,
    parsed.data.password,
  );
  await recordRateLimitResult(keys, Boolean(user && valid));
  if (!user || !valid)
    return { error: "Benutzername oder Passwort ist nicht korrekt." };
  await createSession(user.id);
  redirect("/app/dashboard");
}

export async function register(
  _: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const keys = await rateLimitKeys([
    {
      namespace: "registration-ip",
      limit: 5,
      windowMs: 60 * 60_000,
    },
  ]);
  if (await isAnyRateLimitExceeded(keys))
    return {
      error: "Zu viele Registrierungen. Bitte versuchen Sie es später erneut.",
    };
  await recordRateLimitResult(keys, false);
  const db = getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, parsed.data.username))
    .limit(1);
  if (existing) return { error: "Dieser Benutzername ist nicht verfügbar." };

  const userId = randomUUID();
  const organizationId = randomUUID();
  const membershipId = randomUUID();
  const passwordHash = await hashPassword(parsed.data.password);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    return { error: "Registrierung ist derzeit nicht verfügbar." };
  const sql = neon(databaseUrl);
  try {
    await sql.transaction((tx) => [
      tx`insert into users (id, username, password_hash, display_name) values (${userId}, ${parsed.data.username}, ${passwordHash}, ${parsed.data.displayName || null})`,
      tx`insert into organizations (id, name) values (${organizationId}, ${parsed.data.organizationName})`,
      tx`insert into organization_memberships (id, organization_id, user_id, role) values (${membershipId}, ${organizationId}, ${userId}, 'owner')`,
    ]);
  } catch {
    return {
      error:
        "Der Arbeitsbereich konnte nicht erstellt werden. Bitte prüfen Sie den Benutzernamen und versuchen Sie es erneut.",
    };
  }
  await createSession(userId);
  redirect("/onboarding");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
