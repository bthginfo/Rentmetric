"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { organizations } from "@/db/schema";
export async function updateOrganization(formData: FormData) {
  const data = z
    .object({
      name: z.string().trim().min(2).max(160),
      locale: z.enum(["de-DE", "de-AT", "de-CH"]),
      currency: z.enum(["EUR", "CHF"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession();
  await getDb()
    .update(organizations)
    .set({ ...data.data, updatedAt: new Date() })
    .where(eq(organizations.id, session.organizationId));
  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
}
