"use server";
import { addDays, endOfMonth, format, startOfMonth } from "date-fns";
import { revalidatePath } from "next/cache";
import { and, eq, gte, isNull, lt, lte, or } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, payments, tenancies } from "@/db/schema";

export async function generateMonthlyCharges() {
  const session = await requireSession();
  const db = getDb();
  const now = new Date();
  const month = startOfMonth(now);
  const next = addDays(endOfMonth(now), 1);
  const active = await db
    .select()
    .from(tenancies)
    .where(
      and(
        eq(tenancies.organizationId, session.organizationId),
        lte(tenancies.startsAt, now),
        or(isNull(tenancies.endsAt), gte(tenancies.endsAt, now)),
      ),
    );
  const existing = await db
    .select({ tenancyId: payments.tenancyId })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, session.organizationId),
        gte(payments.dueAt, month),
        lt(payments.dueAt, next),
      ),
    );
  const existingIds = new Set(existing.map((item) => item.tenancyId));
  const rows = active
    .filter((item) => !existingIds.has(item.id))
    .map((item) => ({
      organizationId: session.organizationId,
      tenancyId: item.id,
      amountCents: item.coldRentCents + item.utilityAdvanceCents,
      dueAt: new Date(now.getFullYear(), now.getMonth(), 3, 12),
      reference: `Miete ${format(now, "MM/yyyy")}`,
    }));
  if (rows.length) await db.insert(payments).values(rows);
  await db
    .insert(auditLogs)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "payments.month_generated",
      entityType: "payment",
      changes: { count: rows.length, month: format(now, "yyyy-MM") },
    });
  revalidatePath("/app/payments");
  revalidatePath("/app/dashboard");
}

export async function togglePayment(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  const paid = z.enum(["true", "false"]).safeParse(formData.get("paid"));
  if (!id.success || !paid.success) return;
  const session = await requireSession();
  await getDb()
    .update(payments)
    .set({
      paidAt: paid.data === "true" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(payments.id, id.data),
        eq(payments.organizationId, session.organizationId),
      ),
    );
  revalidatePath("/app/payments");
  revalidatePath("/app/dashboard");
}
