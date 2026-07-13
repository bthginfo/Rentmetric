"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { maintenanceCases, maintenanceEvents } from "@/db/schema";
export async function createMaintenance(formData: FormData) {
  const data = z
    .object({
      title: z.string().trim().min(2).max(160),
      description: z.string().trim().max(1000).optional(),
      propertyId: z.union([z.literal(""), z.string().uuid()]),
      unitId: z.union([z.literal(""), z.string().uuid()]),
      priority: z.enum(["normal", "important", "urgent"]),
      category: z.enum(["repair", "maintenance", "damage", "inspection", "complaint"]),
      assigneeContactId: z.union([z.literal(""), z.string().uuid()]),
      estimatedCost: z.union([z.literal(""), z.coerce.number().nonnegative()]).optional(),
      scheduledAt: z.string().optional(),
      recurrence: z.string().trim().max(80).optional(),
      dueAt: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession();
  const [created] = await getDb()
    .insert(maintenanceCases)
    .values({
      organizationId: session.organizationId,
      title: data.data.title,
      description: data.data.description || null,
      propertyId: data.data.propertyId || null,
      unitId: data.data.unitId || null,
      priority: data.data.priority,
      category: data.data.category,
      assigneeContactId: data.data.assigneeContactId || null,
      estimatedCostCents: data.data.estimatedCost === "" || data.data.estimatedCost == null ? null : Math.round(data.data.estimatedCost * 100),
      scheduledAt: data.data.scheduledAt ? new Date(`${data.data.scheduledAt}T12:00:00`) : null,
      recurrence: data.data.recurrence || null,
      dueAt: data.data.dueAt ? new Date(`${data.data.dueAt}T12:00:00`) : null,
    }).returning({ id: maintenanceCases.id });
  await getDb().insert(maintenanceEvents).values({ organizationId: session.organizationId, caseId: created.id, userId: session.userId, type: "created", note: data.data.description || null });
  revalidatePath("/app/maintenance");
}
export async function resolveMaintenance(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const session = await requireSession();
  await getDb()
    .update(maintenanceCases)
    .set({ status: "resolved", resolvedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(maintenanceCases.id, id.data),
        eq(maintenanceCases.organizationId, session.organizationId),
      ),
    );
  await getDb().insert(maintenanceEvents).values({ organizationId: session.organizationId, caseId: id.data, userId: session.userId, type: "resolved" });
  revalidatePath("/app/maintenance");
  revalidatePath(`/app/maintenance/${id.data}`);
}

export async function updateMaintenanceCase(formData: FormData) {
  const data = z.object({ id: z.string().uuid(), status: z.enum(["open", "scheduled", "resolved"]), actualCost: z.union([z.literal(""), z.coerce.number().nonnegative()]).optional(), scheduledAt: z.string().optional(), note: z.string().trim().max(2000).optional() }).safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession(); const now = new Date();
  const [updated] = await getDb().update(maintenanceCases).set({ status: data.data.status, actualCostCents: data.data.actualCost === "" || data.data.actualCost == null ? undefined : Math.round(data.data.actualCost * 100), scheduledAt: data.data.scheduledAt ? new Date(`${data.data.scheduledAt}T12:00:00`) : undefined, resolvedAt: data.data.status === "resolved" ? now : null, updatedAt: now }).where(and(eq(maintenanceCases.id, data.data.id), eq(maintenanceCases.organizationId, session.organizationId))).returning({ id: maintenanceCases.id });
  if (!updated) return;
  await getDb().insert(maintenanceEvents).values({ organizationId: session.organizationId, caseId: data.data.id, userId: session.userId, type: `status.${data.data.status}`, note: data.data.note || null, metadata: { actualCost: data.data.actualCost || null, scheduledAt: data.data.scheduledAt || null } });
  revalidatePath("/app/maintenance"); revalidatePath(`/app/maintenance/${data.data.id}`);
}
