"use server";

import { createHash } from "node:crypto";
import { and, count, eq, gt, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminSession, deleteAdminSession, requireAdminSession } from "@/admin/session";
import { hashPassword, verifyPassword } from "@/auth/crypto";
import { strongPasswordSchema, usernameSchema } from "@/auth/policy";
import { getDb } from "@/db/client";
import {
  authAttempts,
  billingPlans,
  organizationSubscriptions,
  platformAdmins,
  platformAdminSessions,
  platformAuditLogs,
  sessions,
  users,
} from "@/db/schema";
import { billingPlanInputSchema } from "@/domain/billing";

export type AdminActionState = {
  status?: "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

async function adminRateLimitKey(username: string) {
  const forwarded = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`platform-admin:${forwarded}:${username}`).digest("hex");
}

export async function adminLogin(
  _: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = z.object({ username: usernameSchema, password: z.string().min(1).max(128) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Anmeldung nicht möglich." };
  const keyHash = await adminRateLimitKey(parsed.data.username);
  const [attempts] = await getDb().select({ value: count() }).from(authAttempts).where(and(eq(authAttempts.keyHash, keyHash), eq(authAttempts.succeeded, false), gt(authAttempts.createdAt, new Date(Date.now() - 15 * 60_000))));
  if (Number(attempts?.value ?? 0) >= 5)
    return { status: "error", message: "Zu viele Versuche. Bitte später erneut versuchen." };
  const [admin] = await getDb().select().from(platformAdmins).where(eq(platformAdmins.username, parsed.data.username)).limit(1);
  const valid = Boolean(admin && !admin.disabledAt && (await verifyPassword(admin.passwordHash, parsed.data.password)));
  await getDb().insert(authAttempts).values({ keyHash, succeeded: valid });
  if (!admin || !valid) return { status: "error", message: "Anmeldung nicht möglich." };
  await createAdminSession(admin.id);
  await getDb().insert(platformAuditLogs).values({ adminId: admin.id, action: "admin.login", targetType: "platform_admin", targetId: admin.id });
  redirect("/admin");
}

export async function adminLogout() {
  const admin = await requireAdminSession();
  await getDb().insert(platformAuditLogs).values({ adminId: admin.adminId, action: "admin.logout", targetType: "platform_admin", targetId: admin.adminId });
  await deleteAdminSession();
  redirect("/admin/login");
}

const resetSchema = z.object({
  userId: z.uuid(),
  newPassword: strongPasswordSchema,
  confirmation: z.string(),
}).refine((value) => value.newPassword === value.confirmation, { path: ["confirmation"], message: "Passwörter stimmen nicht überein." });

export async function resetUserPassword(formData: FormData) {
  const admin = await requireAdminSession();
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/users?error=Passwortanforderungen+nicht+erfüllt");
  const [target] = await getDb().select({ id: users.id }).from(users).where(eq(users.id, parsed.data.userId)).limit(1);
  if (!target) redirect("/admin/users?error=Nutzer+nicht+gefunden");
  const passwordHash = await hashPassword(parsed.data.newPassword);
  await getDb().batch([
    getDb().update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, target.id)),
    getDb().delete(sessions).where(eq(sessions.userId, target.id)),
    getDb().insert(platformAuditLogs).values({ adminId: admin.adminId, action: "user.password_reset", targetType: "user", targetId: target.id, metadata: { sessionsRevoked: true } }),
  ]);
  redirect("/admin/users?success=Passwort+gesetzt+und+Sitzungen+widerrufen");
}

export async function updateAdminProfile(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireAdminSession();
  const parsed = z.object({ displayName: z.string().trim().min(2).max(120), email: z.union([z.literal(""), z.email()]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  await getDb().batch([
    getDb().update(platformAdmins).set({ displayName: parsed.data.displayName, email: parsed.data.email || null, updatedAt: new Date() }).where(eq(platformAdmins.id, admin.adminId)),
    getDb().insert(platformAuditLogs).values({ adminId: admin.adminId, action: "admin.profile_updated", targetType: "platform_admin", targetId: admin.adminId, metadata: { fields: ["displayName", "email"] } }),
  ]);
  revalidatePath("/admin/profile");
  return { status: "success", message: "Profil gespeichert." };
}

export async function changeAdminPassword(_: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireAdminSession();
  const parsed = z.object({ currentPassword: z.string().min(1), newPassword: strongPasswordSchema, confirmation: z.string() }).refine((value) => value.newPassword === value.confirmation, { path: ["confirmation"], message: "Passwörter stimmen nicht überein." }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  const [row] = await getDb().select({ passwordHash: platformAdmins.passwordHash }).from(platformAdmins).where(eq(platformAdmins.id, admin.adminId)).limit(1);
  if (!row || !(await verifyPassword(row.passwordHash, parsed.data.currentPassword))) return { status: "error", message: "Das aktuelle Passwort ist nicht korrekt." };
  const passwordHash = await hashPassword(parsed.data.newPassword);
  await getDb().batch([
    getDb().update(platformAdmins).set({ passwordHash, passwordChangedAt: new Date(), updatedAt: new Date() }).where(eq(platformAdmins.id, admin.adminId)),
    getDb().delete(platformAdminSessions).where(and(eq(platformAdminSessions.adminId, admin.adminId), ne(platformAdminSessions.id, admin.sessionId))),
    getDb().insert(platformAuditLogs).values({ adminId: admin.adminId, action: "admin.password_changed", targetType: "platform_admin", targetId: admin.adminId, metadata: { otherSessionsRevoked: true } }),
  ]);
  return { status: "success", message: "Admin-Passwort geändert. Andere Sitzungen wurden beendet." };
}

export async function createBillingPlan(formData: FormData) {
  const admin = await requireAdminSession();
  const input = Object.fromEntries(formData);
  const parsed = billingPlanInputSchema.safeParse({ ...input, active: formData.has("active"), public: formData.has("public") });
  if (!parsed.success) redirect("/admin/pricing?error=Plangaben+prüfen");
  const featureLimits = { ...(parsed.data.maxProperties ? { maxProperties: parsed.data.maxProperties } : {}), ...(parsed.data.maxUsers ? { maxUsers: parsed.data.maxUsers } : {}) };
  try {
    const [plan] = await getDb().insert(billingPlans).values({ code: parsed.data.code, name: parsed.data.name, description: parsed.data.description || null, amountCents: parsed.data.amountCents, currency: parsed.data.currency, interval: parsed.data.interval, active: parsed.data.active, public: parsed.data.public, featureLimits }).returning({ id: billingPlans.id });
    await getDb().insert(platformAuditLogs).values({ adminId: admin.adminId, action: "billing_plan.created", targetType: "billing_plan", targetId: plan.id });
  } catch {
    redirect("/admin/pricing?error=Plan-Code+bereits+vergeben");
  }
  revalidatePath("/admin/pricing");
  revalidatePath("/");
  redirect("/admin/pricing?success=Plan+angelegt");
}

export async function archiveBillingPlan(formData: FormData) {
  const admin = await requireAdminSession();
  const planId = z.uuid().parse(formData.get("planId"));
  await getDb().batch([
    getDb().update(billingPlans).set({ active: false, public: false, updatedAt: new Date() }).where(eq(billingPlans.id, planId)),
    getDb().insert(platformAuditLogs).values({ adminId: admin.adminId, action: "billing_plan.archived", targetType: "billing_plan", targetId: planId }),
  ]);
  revalidatePath("/admin/pricing");
  revalidatePath("/");
}

export async function updateBillingPlanVisibility(formData: FormData) {
  const admin = await requireAdminSession();
  const planId = z.uuid().parse(formData.get("planId"));
  const active = formData.has("active");
  const isPublic = active && formData.has("public");
  await getDb().batch([
    getDb().update(billingPlans).set({ active, public: isPublic, updatedAt: new Date() }).where(eq(billingPlans.id, planId)),
    getDb().insert(platformAuditLogs).values({ adminId: admin.adminId, action: "billing_plan.visibility_updated", targetType: "billing_plan", targetId: planId, metadata: { active, public: isPublic } }),
  ]);
  revalidatePath("/admin/pricing");
  revalidatePath("/");
}

export async function updateBillingPlan(formData: FormData) {
  const admin = await requireAdminSession();
  const planId = z.uuid().safeParse(formData.get("planId"));
  const parsed = billingPlanInputSchema.safeParse({
    ...Object.fromEntries(formData),
    active: formData.has("active"),
    public: formData.has("public"),
  });
  if (!planId.success || !parsed.success)
    redirect("/admin/pricing?error=Plangaben+prüfen");
  const db = getDb();
  const [[current], [references]] = await Promise.all([
    db.select().from(billingPlans).where(eq(billingPlans.id, planId.data)).limit(1),
    db.select({ value: count() }).from(organizationSubscriptions).where(eq(organizationSubscriptions.planId, planId.data)),
  ]);
  if (!current) redirect("/admin/pricing?error=Plan+nicht+gefunden");
  const commercialChange = current.code !== parsed.data.code || current.amountCents !== parsed.data.amountCents || current.currency !== parsed.data.currency || current.interval !== parsed.data.interval;
  if (Number(references?.value ?? 0) > 0 && commercialChange)
    redirect("/admin/pricing?error=Genutzte+Pläne+nicht+umpreisen.+Bitte+archivieren+und+neue+Version+anlegen");
  const featureLimits = {
    ...(parsed.data.maxProperties ? { maxProperties: parsed.data.maxProperties } : {}),
    ...(parsed.data.maxUsers ? { maxUsers: parsed.data.maxUsers } : {}),
  };
  try {
    await db.batch([
      db.update(billingPlans).set({
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description || null,
        amountCents: parsed.data.amountCents,
        currency: parsed.data.currency,
        interval: parsed.data.interval,
        active: parsed.data.active,
        public: parsed.data.active && parsed.data.public,
        featureLimits,
        updatedAt: new Date(),
      }).where(eq(billingPlans.id, planId.data)),
      db.insert(platformAuditLogs).values({
        adminId: admin.adminId,
        action: "billing_plan.updated",
        targetType: "billing_plan",
        targetId: planId.data,
        metadata: { commercialChange, referenced: Number(references?.value ?? 0) > 0 },
      }),
    ]);
  } catch {
    redirect("/admin/pricing?error=Plan+konnte+nicht+gespeichert+werden");
  }
  revalidatePath("/admin/pricing");
  revalidatePath("/");
  redirect("/admin/pricing?success=Plan+gespeichert");
}
