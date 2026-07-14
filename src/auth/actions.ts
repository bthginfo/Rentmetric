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
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
      values?: {
        organizationName?: string;
        displayName?: string;
        email?: string;
        username?: string;
      };
    }
  | undefined;

const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(128),
});
const registerSchema = z
  .object({
    organizationName: z
      .string()
      .trim()
      .min(2, "Bitte mindestens 2 Zeichen eingeben")
      .max(120),
    displayName: z.string().trim().max(120).optional(),
    email: z
      .union([
        z.literal(""),
        z
          .string()
          .trim()
          .email("Bitte eine gültige E-Mail-Adresse eingeben")
          .max(254),
      ])
      .optional(),
    username: usernameSchema,
    password: strongPasswordSchema,
    passwordConfirmation: z
      .string()
      .min(1, "Bitte das Passwort wiederholen")
      .max(128),
  })
  .superRefine((data, context) => {
    if (data.password !== data.passwordConfirmation)
      context.addIssue({
        code: "custom",
        path: ["passwordConfirmation"],
        message: "Die Passwörter stimmen nicht überein",
      });
  });

function safeValues(formData: FormData) {
  const read = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.slice(0, 254) : "";
  };
  return {
    organizationName: read("organizationName"),
    displayName: read("displayName"),
    email: read("email"),
    username: read("username"),
  };
}

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
  const values = safeValues(formData);
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors, values };
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
      values,
    };
  await recordRateLimitResult(keys, false);
  const db = getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, parsed.data.username))
    .limit(1);
  if (existing)
    return {
      fieldErrors: { username: ["Dieser Benutzername ist nicht verfügbar"] },
      values,
    };

  const userId = randomUUID();
  const organizationId = randomUUID();
  const membershipId = randomUUID();
  const passwordHash = await hashPassword(parsed.data.password);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    return { error: "Registrierung ist derzeit nicht verfügbar.", values };
  const sql = neon(databaseUrl);
  try {
    await sql.transaction((tx) => [
      tx`insert into users (id, username, password_hash, display_name, email) values (${userId}, ${parsed.data.username}, ${passwordHash}, ${parsed.data.displayName || null}, ${parsed.data.email || null})`,
      tx`insert into organizations (id, name) values (${organizationId}, ${parsed.data.organizationName})`,
      tx`insert into organization_memberships (id, organization_id, user_id, role) values (${membershipId}, ${organizationId}, ${userId}, 'owner')`,
    ]);
  } catch {
    return {
      error:
        "Der Arbeitsbereich konnte nicht erstellt werden. Bitte prüfen Sie den Benutzernamen und versuchen Sie es erneut.",
      values,
    };
  }
  await createSession(userId);
  redirect("/onboarding");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
