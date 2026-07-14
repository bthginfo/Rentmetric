"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import {
  auditLogs,
  contacts,
  maintenanceCases,
  maintenanceEvents,
  properties,
  units,
} from "@/db/schema";
export async function createMaintenance(formData: FormData) {
  const data = z
    .object({
      title: z.string().trim().min(2).max(160),
      description: z.string().trim().max(1000).optional(),
      propertyId: z.union([z.literal(""), z.string().uuid()]),
      unitId: z.union([z.literal(""), z.string().uuid()]),
      priority: z.enum(["normal", "important", "urgent"]),
      category: z.enum([
        "repair",
        "maintenance",
        "damage",
        "inspection",
        "complaint",
      ]),
      assigneeContactId: z.union([z.literal(""), z.string().uuid()]),
      estimatedCost: z
        .union([z.literal(""), z.coerce.number().nonnegative()])
        .optional(),
      scheduledAt: z.string().optional(),
      recurrence: z.string().trim().max(80).optional(),
      dueAt: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!data.success)
    redirect("/app/maintenance?new=1&error=invalid#maintenance-create");
  const session = await requireSession();
  const db = getDb();
  const [property, unit, contact] = await Promise.all([
    data.data.propertyId
      ? db
          .select({ id: properties.id })
          .from(properties)
          .where(
            and(
              eq(properties.id, data.data.propertyId),
              eq(properties.organizationId, session.organizationId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    data.data.unitId
      ? db
          .select({ id: units.id, propertyId: units.propertyId })
          .from(units)
          .where(
            and(
              eq(units.id, data.data.unitId),
              eq(units.organizationId, session.organizationId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    data.data.assigneeContactId
      ? db
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            and(
              eq(contacts.id, data.data.assigneeContactId),
              eq(contacts.organizationId, session.organizationId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);
  const relationInvalid =
    (data.data.propertyId && !property[0]) ||
    (data.data.unitId &&
      (!unit[0] ||
        !data.data.propertyId ||
        unit[0].propertyId !== data.data.propertyId)) ||
    (data.data.assigneeContactId && !contact[0]);
  if (relationInvalid)
    redirect("/app/maintenance?new=1&error=relations#maintenance-create");
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
      estimatedCostCents:
        data.data.estimatedCost === "" || data.data.estimatedCost == null
          ? null
          : Math.round(data.data.estimatedCost * 100),
      scheduledAt: data.data.scheduledAt
        ? new Date(`${data.data.scheduledAt}T12:00:00`)
        : null,
      recurrence: data.data.recurrence || null,
      dueAt: data.data.dueAt ? new Date(`${data.data.dueAt}T12:00:00`) : null,
    })
    .returning({ id: maintenanceCases.id });
  await getDb()
    .insert(maintenanceEvents)
    .values({
      organizationId: session.organizationId,
      caseId: created.id,
      userId: session.userId,
      type: "created",
      note: data.data.description || null,
    });
  revalidatePath("/app/maintenance");
  redirect("/app/maintenance?created=1");
}
export async function resolveMaintenance(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const session = await requireSession();
  const [updated] = await getDb()
    .update(maintenanceCases)
    .set({ status: "resolved", resolvedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(maintenanceCases.id, id.data),
        eq(maintenanceCases.organizationId, session.organizationId),
      ),
    )
    .returning({ id: maintenanceCases.id });
  if (!updated) return;
  await getDb().insert(maintenanceEvents).values({
    organizationId: session.organizationId,
    caseId: id.data,
    userId: session.userId,
    type: "resolved",
  });
  revalidatePath("/app/maintenance");
  revalidatePath(`/app/maintenance/${id.data}`);
}

export async function updateMaintenanceCase(formData: FormData) {
  const data = z
    .object({
      id: z.string().uuid(),
      title: z.string().trim().min(2).max(160),
      description: z.string().trim().max(1000).optional(),
      propertyId: z.union([z.literal(""), z.string().uuid()]),
      unitId: z.union([z.literal(""), z.string().uuid()]),
      assigneeContactId: z.union([z.literal(""), z.string().uuid()]),
      priority: z.enum(["normal", "important", "urgent"]),
      category: z.enum([
        "repair",
        "maintenance",
        "damage",
        "inspection",
        "complaint",
      ]),
      status: z.enum(["open", "scheduled", "resolved"]),
      estimatedCost: z
        .union([z.literal(""), z.coerce.number().nonnegative()])
        .optional(),
      actualCost: z
        .union([z.literal(""), z.coerce.number().nonnegative()])
        .optional(),
      scheduledAt: z.string().optional(),
      dueAt: z.string().optional(),
      recurrence: z.string().trim().max(80).optional(),
      note: z.string().trim().max(2000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!data.success)
    redirect(
      `/app/maintenance/${String(formData.get("id") || "")}?error=invalid#case-edit`,
    );
  const session = await requireSession();
  const now = new Date();
  const db = getDb();
  const [property, unit, contact] = await Promise.all([
    data.data.propertyId
      ? db
          .select({ id: properties.id })
          .from(properties)
          .where(
            and(
              eq(properties.id, data.data.propertyId),
              eq(properties.organizationId, session.organizationId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    data.data.unitId
      ? db
          .select({ id: units.id, propertyId: units.propertyId })
          .from(units)
          .where(
            and(
              eq(units.id, data.data.unitId),
              eq(units.organizationId, session.organizationId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    data.data.assigneeContactId
      ? db
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            and(
              eq(contacts.id, data.data.assigneeContactId),
              eq(contacts.organizationId, session.organizationId),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);
  if (
    (data.data.propertyId && !property[0]) ||
    (data.data.unitId &&
      (!unit[0] || unit[0].propertyId !== data.data.propertyId)) ||
    (data.data.assigneeContactId && !contact[0])
  )
    redirect(`/app/maintenance/${data.data.id}?error=relations#case-edit`);
  const [updated] = await db
    .update(maintenanceCases)
    .set({
      title: data.data.title,
      description: data.data.description || null,
      propertyId: data.data.propertyId || null,
      unitId: data.data.unitId || null,
      assigneeContactId: data.data.assigneeContactId || null,
      priority: data.data.priority,
      category: data.data.category,
      status: data.data.status,
      estimatedCostCents:
        data.data.estimatedCost === "" || data.data.estimatedCost == null
          ? null
          : Math.round(data.data.estimatedCost * 100),
      actualCostCents:
        data.data.actualCost === "" || data.data.actualCost == null
          ? null
          : Math.round(data.data.actualCost * 100),
      scheduledAt: data.data.scheduledAt
        ? new Date(`${data.data.scheduledAt}T12:00:00`)
        : null,
      dueAt: data.data.dueAt ? new Date(`${data.data.dueAt}T12:00:00`) : null,
      recurrence: data.data.recurrence || null,
      resolvedAt: data.data.status === "resolved" ? now : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(maintenanceCases.id, data.data.id),
        eq(maintenanceCases.organizationId, session.organizationId),
      ),
    )
    .returning({ id: maintenanceCases.id });
  if (!updated) redirect("/app/maintenance?error=not-found");
  await db.batch([
    db.insert(maintenanceEvents).values({
      organizationId: session.organizationId,
      caseId: data.data.id,
      userId: session.userId,
      type: "case.updated",
      note: data.data.note || "Stammdaten und Status aktualisiert",
      metadata: { status: data.data.status, priority: data.data.priority },
    }),
    db.insert(auditLogs).values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "maintenance.updated",
      entityType: "maintenance_case",
      entityId: data.data.id,
    }),
  ]);
  revalidatePath("/app/maintenance");
  revalidatePath(`/app/maintenance/${data.data.id}`);
  redirect(`/app/maintenance/${data.data.id}?updated=1`);
}

export async function deleteMaintenanceCase(formData: FormData) {
  const data = z
    .object({
      id: z.string().uuid(),
      confirmation: z.literal("VORGANG LÖSCHEN"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!data.success)
    redirect(
      `/app/maintenance/${String(formData.get("id") || "")}?error=confirmation#case-delete`,
    );
  const session = await requireSession();
  const db = getDb();
  const [item] = await db
    .select({
      id: maintenanceCases.id,
      reportedByRenter: maintenanceCases.reportedByRenter,
      portalVisible: maintenanceCases.portalVisible,
    })
    .from(maintenanceCases)
    .where(
      and(
        eq(maintenanceCases.id, data.data.id),
        eq(maintenanceCases.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!item) redirect("/app/maintenance?error=not-found");
  if (item.reportedByRenter || item.portalVisible)
    redirect(`/app/maintenance/${item.id}?error=portal-history#case-delete`);
  await db.batch([
    db
      .delete(maintenanceCases)
      .where(
        and(
          eq(maintenanceCases.id, item.id),
          eq(maintenanceCases.organizationId, session.organizationId),
        ),
      ),
    db.insert(auditLogs).values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "maintenance.deleted",
      entityType: "maintenance_case",
      entityId: item.id,
    }),
  ]);
  revalidatePath("/app/maintenance");
  redirect("/app/maintenance?deleted=1");
}
