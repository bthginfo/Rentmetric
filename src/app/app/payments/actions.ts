"use server";
import { addDays, endOfMonth, format, startOfMonth } from "date-fns";
import { revalidatePath } from "next/cache";
import { and, eq, gte, isNull, lt, lte, or } from "drizzle-orm";
import { z } from "zod";
import { parse as parseCsv } from "csv-parse/sync";
import { createHash, randomUUID } from "node:crypto";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, bankTransactions, payments, tenancies } from "@/db/schema";

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

const normalized = (value: string) => value.toLocaleLowerCase("de").normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]/g, "");
function parseDate(value: string) { const match = value.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/); return match ? new Date(`${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}T12:00:00`) : new Date(value); }
function parseAmount(value: string) { return Math.round(Number(value.replace(/\s|€|EUR/gi, "").replaceAll(".", "").replace(",", ".")) * 100); }

export async function importBankTransactions(formData: FormData) {
  const file = formData.get("file"); if (!(file instanceof File) || file.size > 1024 * 1024) return;
  const session = await requireSession(); const content = await file.text(); const delimiter = content.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
  const records = parseCsv(content, { columns: true, bom: true, delimiter, skip_empty_lines: true, relax_column_count: true }) as Record<string,string>[];
  const unpaid = await getDb().select().from(payments).where(and(eq(payments.organizationId, session.organizationId), isNull(payments.paidAt)));
  const rows = records.slice(0, 1000).flatMap((record, index) => { const entries = Object.entries(record); const pick = (...aliases: string[]) => entries.find(([key]) => aliases.includes(normalized(key)))?.[1] || ""; const dateRaw = pick("buchungstag", "buchungsdatum", "datum", "bookingdate"); const amountRaw = pick("betrag", "umsatz", "amount"); if (!dateRaw || !amountRaw) return []; const bookingDate = parseDate(dateRaw); const amountCents = parseAmount(amountRaw); if (!Number.isFinite(bookingDate.getTime()) || !Number.isFinite(amountCents) || amountCents <= 0) return []; const reference = pick("verwendungszweck", "buchungstext", "referenz", "reference"); const candidates = unpaid.filter((payment) => payment.amountCents === amountCents); const exact = candidates.find((payment) => payment.reference && normalized(reference).includes(normalized(payment.reference))); const match = exact ?? (candidates.length === 1 ? candidates[0] : null); const externalId = createHash("sha256").update(`${dateRaw}|${amountRaw}|${reference}|${index}`).digest("hex"); return [{ id: randomUUID(), organizationId: session.organizationId, bookingDate, amountCents, reference: reference || null, counterparty: pick("auftraggeberempfanger", "zahlungspflichtiger", "name", "counterparty") || null, externalId, matchedPaymentId: match?.id || null, confidenceBasisPoints: exact ? 9800 : match ? 8000 : null, status: match ? "proposed" : "unmatched" }]; });
  if (rows.length) await getDb().insert(bankTransactions).values(rows).onConflictDoNothing();
  await getDb().insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "bank_transactions.imported", entityType: "bank_transaction", changes: { rows: rows.length } });
  revalidatePath("/app/payments");
}

export async function confirmBankMatch(formData: FormData) {
  const transactionId = z.string().uuid().safeParse(formData.get("id")); if (!transactionId.success) return; const session = await requireSession(); const db = getDb();
  const [transaction] = await db.select().from(bankTransactions).where(and(eq(bankTransactions.id, transactionId.data), eq(bankTransactions.organizationId, session.organizationId), eq(bankTransactions.status, "proposed"))).limit(1); if (!transaction?.matchedPaymentId) return;
  await db.update(payments).set({ paidAt: transaction.bookingDate, updatedAt: new Date() }).where(and(eq(payments.id, transaction.matchedPaymentId), eq(payments.organizationId, session.organizationId)));
  await db.update(bankTransactions).set({ status: "matched", updatedAt: new Date() }).where(eq(bankTransactions.id, transaction.id)); revalidatePath("/app/payments"); revalidatePath("/app/dashboard");
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
