"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, renters } from "@/db/schema";

export type RenterFormState =
  { error?: string; fieldErrors?: Record<string, string[]> } | undefined;
const schema = z.object({
  firstName: z.string().trim().min(1, "Vorname fehlt").max(80),
  lastName: z.string().trim().min(1, "Nachname fehlt").max(80),
  email: z.union([
    z.literal(""),
    z.string().trim().email("Ungültige E-Mail-Adresse"),
  ]),
  phone: z.string().trim().max(40).optional(),
});

export async function createRenter(
  _: RenterFormState,
  formData: FormData,
): Promise<RenterFormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await requireSession();
  const id = randomUUID();
  const db = getDb();
  try {
    await db
      .insert(renters)
      .values({
        id,
        organizationId: session.organizationId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
      });
    await db
      .insert(auditLogs)
      .values({
        organizationId: session.organizationId,
        userId: session.userId,
        action: "renter.created",
        entityType: "renter",
        entityId: id,
      });
  } catch {
    return { error: "Der Mieter konnte nicht gespeichert werden." };
  }
  redirect("/app/renters?created=1");
}

export async function updateRenter(
  renterId: string,
  _: RenterFormState,
  formData: FormData,
): Promise<RenterFormState> {
  const id = z.string().uuid().safeParse(renterId);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { error: "Mieter:in wurde nicht gefunden." };
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await requireSession();
  const db = getDb();
  const [existing] = await db
    .select({ id: renters.id })
    .from(renters)
    .where(
      and(
        eq(renters.id, id.data),
        eq(renters.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!existing) return { error: "Mieter:in wurde nicht gefunden." };
  try {
    await db
      .update(renters)
      .set({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(renters.id, id.data),
          eq(renters.organizationId, session.organizationId),
        ),
      );
    await db.insert(auditLogs).values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "renter.updated",
      entityType: "renter",
      entityId: id.data,
    });
  } catch {
    return { error: "Die Kontaktdaten konnten nicht gespeichert werden." };
  }
  revalidatePath("/app/renters");
  revalidatePath(`/app/renters/${id.data}`);
  redirect(`/app/renters/${id.data}?updated=1`);
}
