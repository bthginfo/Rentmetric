"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/auth/crypto";
import { strongPasswordSchema, usernameSchema } from "@/auth/policy";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, sessions, users } from "@/db/schema";

export type ProfileActionState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const personalDataSchema = z.object({
  displayName: z.string().trim().min(2, "Mindestens 2 Zeichen").max(120),
  email: z.union([z.literal(""), z.email("Bitte eine gültige E-Mail eingeben.")]),
  username: usernameSchema,
});

export async function updatePersonalData(
  _: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = personalDataSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await requireSession();
  const db = getDb();
  const [current] = await db
    .select({
      username: users.username,
      displayName: users.displayName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!current) return { status: "error", message: "Profil nicht gefunden." };
  const changedFields = (["username", "displayName", "email"] as const).filter(
    (field) => (current[field] ?? "") !== parsed.data[field],
  );
  if (!changedFields.length)
    return { status: "success", message: "Es gibt keine Änderungen." };
  try {
    await db.batch([
      db
        .update(users)
        .set({
          username: parsed.data.username,
          displayName: parsed.data.displayName,
          email: parsed.data.email || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.userId)),
      db.insert(auditLogs).values({
        organizationId: session.organizationId,
        userId: session.userId,
        action: "profile.updated",
        entityType: "user",
        entityId: session.userId,
        changes: { fields: changedFields },
      }),
    ]);
  } catch {
    return {
      status: "error",
      message: "Der Benutzername ist bereits vergeben oder die Änderung konnte nicht gespeichert werden.",
    };
  }
  revalidatePath("/app/profile");
  revalidatePath("/app/dashboard");
  return { status: "success", message: "Profildaten gespeichert." };
}

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: strongPasswordSchema,
    confirmation: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    path: ["confirmation"],
    message: "Die Passwörter stimmen nicht überein.",
  });

export async function changeOwnPassword(
  _: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = passwordChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await requireSession();
  const db = getDb();
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.currentPassword)))
    return { status: "error", message: "Das aktuelle Passwort ist nicht korrekt." };
  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.batch([
    db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, session.userId)),
    db
      .delete(sessions)
      .where(and(eq(sessions.userId, session.userId), ne(sessions.id, session.sessionId))),
    db.insert(auditLogs).values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "password.changed",
      entityType: "user",
      entityId: session.userId,
      changes: { otherSessionsRevoked: true },
    }),
  ]);
  return {
    status: "success",
    message: "Passwort geändert. Andere Sitzungen wurden abgemeldet.",
  };
}
