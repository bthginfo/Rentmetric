"use server";

import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { and, count, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { authAttempts, users } from "@/db/schema";
import { hashPassword, verifyPassword } from "./crypto";
import { createSession, deleteSession } from "./session";

export type AuthState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

const username = z.string().trim().toLowerCase().min(3, "Mindestens 3 Zeichen").max(64).regex(/^[a-z0-9._-]+$/, "Nur Buchstaben, Zahlen, Punkt, Unterstrich und Bindestrich");
const password = z.string().min(10, "Mindestens 10 Zeichen").max(128).regex(/[A-Za-zÄÖÜäöüß]/, "Mindestens ein Buchstabe").regex(/[0-9]/, "Mindestens eine Zahl");
const loginSchema = z.object({ username, password: z.string().min(1).max(128) });
const registerSchema = z.object({ organizationName: z.string().trim().min(2).max(120), displayName: z.string().trim().max(120).optional(), username, password });

async function rateLimitKey(value: string) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(`${ip}:${value.toLowerCase()}`).digest("hex");
}

async function isRateLimited(keyHash: string) {
  const [result] = await getDb().select({ value: count() }).from(authAttempts).where(and(eq(authAttempts.keyHash, keyHash), eq(authAttempts.succeeded, false), gt(authAttempts.createdAt, new Date(Date.now() - 15 * 60_000))));
  return Number(result?.value ?? 0) >= 8;
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Benutzername oder Passwort ist nicht korrekt." };
  const keyHash = await rateLimitKey(parsed.data.username);
  if (await isRateLimited(keyHash)) return { error: "Zu viele Versuche. Bitte versuchen Sie es später erneut." };

  const [user] = await getDb().select().from(users).where(eq(users.username, parsed.data.username)).limit(1);
  const valid = user ? await verifyPassword(user.passwordHash, parsed.data.password) : false;
  await getDb().insert(authAttempts).values({ keyHash, succeeded: valid });
  if (!user || !valid) return { error: "Benutzername oder Passwort ist nicht korrekt." };
  await createSession(user.id);
  redirect("/app/dashboard");
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, parsed.data.username)).limit(1);
  if (existing) return { error: "Dieser Benutzername ist nicht verfügbar." };

  const userId = randomUUID();
  const organizationId = randomUUID();
  const membershipId = randomUUID();
  const passwordHash = await hashPassword(parsed.data.password);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { error: "Registrierung ist derzeit nicht verfügbar." };
  const sql = neon(databaseUrl);
  try {
    await sql.transaction((tx) => [
      tx`insert into users (id, username, password_hash, display_name) values (${userId}, ${parsed.data.username}, ${passwordHash}, ${parsed.data.displayName || null})`,
      tx`insert into organizations (id, name) values (${organizationId}, ${parsed.data.organizationName})`,
      tx`insert into organization_memberships (id, organization_id, user_id, role) values (${membershipId}, ${organizationId}, ${userId}, 'owner')`,
    ]);
  } catch {
    return { error: "Der Arbeitsbereich konnte nicht erstellt werden. Bitte prüfen Sie den Benutzernamen und versuchen Sie es erneut." };
  }
  await createSession(userId);
  redirect("/onboarding");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
