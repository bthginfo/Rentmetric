"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { maintenanceCases } from "@/db/schema";
export async function createMaintenance(formData: FormData) {
  const data = z
    .object({
      title: z.string().trim().min(2).max(160),
      description: z.string().trim().max(1000).optional(),
      propertyId: z.union([z.literal(""), z.string().uuid()]),
      unitId: z.union([z.literal(""), z.string().uuid()]),
      priority: z.enum(["normal", "important", "urgent"]),
      dueAt: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession();
  await getDb()
    .insert(maintenanceCases)
    .values({
      organizationId: session.organizationId,
      title: data.data.title,
      description: data.data.description || null,
      propertyId: data.data.propertyId || null,
      unitId: data.data.unitId || null,
      priority: data.data.priority,
      dueAt: data.data.dueAt ? new Date(`${data.data.dueAt}T12:00:00`) : null,
    });
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
  revalidatePath("/app/maintenance");
}
