"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, tasks } from "@/db/schema";

const idSchema = z.string().uuid();
const createSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  dueAt: z.string().optional(),
  severity: z.enum(["info", "warning", "urgent"]).default("info"),
});
export type TaskFormState =
  { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function createTask(
  _: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await requireSession();
  const id = randomUUID();
  const db = getDb();
  await db
    .insert(tasks)
    .values({
      id,
      organizationId: session.organizationId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueAt: parsed.data.dueAt
        ? new Date(`${parsed.data.dueAt}T12:00:00`)
        : null,
      severity: parsed.data.severity,
      sourceType: "manual",
    });
  await db
    .insert(auditLogs)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "task.created",
      entityType: "task",
      entityId: id,
    });
  redirect("/app/tasks?created=1");
}

export async function setTaskStatus(formData: FormData) {
  const id = idSchema.safeParse(formData.get("id"));
  const status = z
    .enum(["open", "done", "dismissed"])
    .safeParse(formData.get("status"));
  if (!id.success || !status.success) return;
  const session = await requireSession();
  const db = getDb();
  await db
    .update(tasks)
    .set({ status: status.data, updatedAt: new Date() })
    .where(
      and(
        eq(tasks.id, id.data),
        eq(tasks.organizationId, session.organizationId),
      ),
    );
  await db
    .insert(auditLogs)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: `task.${status.data}`,
      entityType: "task",
      entityId: id.data,
    });
  revalidatePath("/app/tasks");
  revalidatePath("/app/dashboard");
}
