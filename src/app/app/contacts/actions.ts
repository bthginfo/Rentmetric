"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { contacts } from "@/db/schema";
export async function createContact(formData: FormData) {
  const data = z
    .object({
      name: z.string().trim().min(2).max(160),
      company: z.string().trim().max(160).optional(),
      trade: z.string().trim().max(100).optional(),
      email: z.union([z.literal(""), z.string().email()]),
      phone: z.string().trim().max(50).optional(),
      notes: z.string().trim().max(1000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession();
  await getDb()
    .insert(contacts)
    .values({
      organizationId: session.organizationId,
      ...data.data,
      email: data.data.email || null,
    });
  revalidatePath("/app/contacts");
}
