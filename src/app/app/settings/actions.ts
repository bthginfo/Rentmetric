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
      bankAccountHolder: z.string().trim().max(160).optional(),
      bankName: z.string().trim().max(160).optional(),
      iban: z.string().trim().toUpperCase().transform((value) => value.replace(/\s/g, "")).refine((value) => !value || /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value), "Ungültige IBAN").optional(),
      bic: z.string().trim().toUpperCase().transform((value) => value.replace(/\s/g, "")).refine((value) => !value || /^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(value), "Ungültiger BIC").optional(),
      transferNote: z.string().trim().max(240).optional(),
      rentDueDay: z.coerce.number().int().min(1).max(28),
    })
    .safeParse(Object.fromEntries(formData));
  if (!data.success) return;
  const session = await requireSession();
  await getDb()
    .update(organizations)
    .set({ ...data.data, bankAccountHolder: data.data.bankAccountHolder || null, bankName: data.data.bankName || null, iban: data.data.iban || null, bic: data.data.bic || null, transferNote: data.data.transferNote || null, updatedAt: new Date() })
    .where(eq(organizations.id, session.organizationId));
  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
}
