"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, contacts, maintenanceCases } from "@/db/schema";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(160),
  company: z.string().trim().max(160).optional(),
  trade: z.string().trim().max(100).optional(),
  email: z.union([z.literal(""), z.string().email()]),
  phone: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const contactValues = (data: z.infer<typeof contactSchema>) => ({
  name: data.name,
  company: data.company || null,
  trade: data.trade || null,
  email: data.email || null,
  phone: data.phone || null,
  notes: data.notes || null,
  updatedAt: new Date(),
});

export async function createContact(formData: FormData) {
  const data = contactSchema.safeParse(Object.fromEntries(formData));
  if (!data.success) redirect("/app/contacts?error=invalid#contact-create");
  const session = await requireSession();
  const [created] = await getDb()
    .insert(contacts)
    .values({
      organizationId: session.organizationId,
      ...contactValues(data.data),
    })
    .returning({ id: contacts.id });
  await getDb()
    .insert(auditLogs)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "contact.created",
      entityType: "contact",
      entityId: created.id,
    });
  revalidatePath("/app/contacts");
  redirect("/app/contacts?created=1");
}

export async function updateContact(formData: FormData) {
  const data = contactSchema
    .extend({ id: z.string().uuid() })
    .safeParse(Object.fromEntries(formData));
  if (!data.success) redirect("/app/contacts?error=invalid");
  const session = await requireSession();
  const [updated] = await getDb()
    .update(contacts)
    .set(contactValues(data.data))
    .where(
      and(
        eq(contacts.id, data.data.id),
        eq(contacts.organizationId, session.organizationId),
      ),
    )
    .returning({ id: contacts.id });
  if (!updated) redirect("/app/contacts?error=not-found");
  await getDb()
    .insert(auditLogs)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "contact.updated",
      entityType: "contact",
      entityId: updated.id,
    });
  revalidatePath("/app/contacts");
  redirect("/app/contacts?updated=1");
}

export async function deleteContact(formData: FormData) {
  const data = z
    .object({
      id: z.string().uuid(),
      confirmation: z.literal("KONTAKT LÖSCHEN"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!data.success) redirect("/app/contacts?error=confirmation");
  const session = await requireSession();
  const db = getDb();
  const [referenced] = await db
    .select({ id: maintenanceCases.id })
    .from(maintenanceCases)
    .where(
      and(
        eq(maintenanceCases.organizationId, session.organizationId),
        eq(maintenanceCases.assigneeContactId, data.data.id),
      ),
    )
    .limit(1);
  if (referenced)
    redirect(
      `/app/contacts?edit=${data.data.id}&error=referenced#contact-edit`,
    );
  const [deleted] = await db
    .delete(contacts)
    .where(
      and(
        eq(contacts.id, data.data.id),
        eq(contacts.organizationId, session.organizationId),
      ),
    )
    .returning({ id: contacts.id });
  if (!deleted) redirect("/app/contacts?error=not-found");
  await db
    .insert(auditLogs)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "contact.deleted",
      entityType: "contact",
      entityId: deleted.id,
    });
  revalidatePath("/app/contacts");
  redirect("/app/contacts?deleted=1");
}
