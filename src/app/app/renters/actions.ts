"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, renters } from "@/db/schema";

export type RenterFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;
const schema = z.object({
  firstName: z.string().trim().min(1, "Vorname fehlt").max(80),
  lastName: z.string().trim().min(1, "Nachname fehlt").max(80),
  email: z.union([z.literal(""), z.string().trim().email("Ungültige E-Mail-Adresse")]),
  phone: z.string().trim().max(40).optional(),
});

export async function createRenter(_: RenterFormState, formData: FormData): Promise<RenterFormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await requireSession();
  const id = randomUUID();
  const db = getDb();
  try {
    await db.insert(renters).values({ id, organizationId: session.organizationId, firstName: parsed.data.firstName, lastName: parsed.data.lastName, email: parsed.data.email || null, phone: parsed.data.phone || null });
    await db.insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "renter.created", entityType: "renter", entityId: id });
  } catch {
    return { error: "Der Mieter konnte nicht gespeichert werden." };
  }
  redirect("/app/renters?created=1");
}

