import "server-only";
import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { addMonths, startOfMonth, subMonths } from "date-fns";
import { getDb } from "@/db/client";
import {
  payments,
  properties,
  rentIndexImports,
  rentIndexSources,
  tasks,
  tenancies,
  units,
} from "@/db/schema";

export async function getDashboardData(organizationId: string) {
  const db = getDb();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = addMonths(monthStart, 1);
  const chartStart = subMonths(monthStart, 11);
  const [
    propertyRows,
    unitRows,
    tenancyRows,
    monthPayments,
    chartPayments,
    taskRows,
    importRows,
    sourceRows,
  ] = await Promise.all([
    db
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.organizationId, organizationId), isNull(properties.archivedAt))),
    db
      .select({ id: units.id, status: units.status, areaSqm: units.areaSqm })
      .from(units)
      .where(and(eq(units.organizationId, organizationId), isNull(units.archivedAt))),
    db
      .select({
        id: tenancies.id,
        startsAt: tenancies.startsAt,
        endsAt: tenancies.endsAt,
        coldRentCents: tenancies.coldRentCents,
        lastRentIncreaseAt: tenancies.lastRentIncreaseAt,
      })
      .from(tenancies)
      .where(eq(tenancies.organizationId, organizationId)),
    db
      .select({ amountCents: payments.amountCents, paidAt: payments.paidAt })
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, organizationId),
          gte(payments.dueAt, monthStart),
          lt(payments.dueAt, monthEnd),
        ),
      ),
    db
      .select({ amountCents: payments.amountCents, dueAt: payments.dueAt })
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, organizationId),
          gte(payments.dueAt, chartStart),
          lt(payments.dueAt, monthEnd),
        ),
      ),
    db
      .select()
      .from(tasks)
      .where(
        and(eq(tasks.organizationId, organizationId), eq(tasks.status, "open")),
      )
      .orderBy(tasks.dueAt, desc(tasks.createdAt)),
    db
      .select({ status: rentIndexImports.status })
      .from(rentIndexImports)
      .where(eq(rentIndexImports.organizationId, organizationId)),
    db
      .select({ status: rentIndexSources.status })
      .from(rentIndexSources)
      .where(eq(rentIndexSources.organizationId, organizationId)),
  ]);
  const currentTenancies = tenancyRows.filter(
    (row) => row.startsAt <= now && (!row.endsAt || row.endsAt >= now),
  );
  const currentRent = currentTenancies.reduce(
    (sum, row) => sum + row.coldRentCents,
    0,
  );
  const area = unitRows.reduce((sum, row) => sum + (row.areaSqm || 0), 0);
  const occupied = unitRows.filter((row) => row.status === "occupied").length;
  const due = monthPayments.reduce((sum, row) => sum + row.amountCents, 0);
  const paid = monthPayments
    .filter((row) => row.paidAt)
    .reduce((sum, row) => sum + row.amountCents, 0);
  const reviewable = currentTenancies.filter(
    (row) => (row.lastRentIncreaseAt || row.startsAt) <= subMonths(now, 12),
  ).length;
  const chart = Array.from({ length: 12 }, (_, index) => {
    const from = addMonths(chartStart, index);
    const to = addMonths(from, 1);
    return {
      date: from,
      value: chartPayments
        .filter((row) => row.dueAt >= from && row.dueAt < to)
        .reduce((sum, row) => sum + row.amountCents, 0),
    };
  });
  return {
    hasPortfolioData: unitRows.length > 0,
    propertyCount: propertyRows.length,
    unitCount: unitRows.length,
    occupied,
    area,
    currentRent,
    due: due || currentRent,
    paid,
    openTasks: taskRows.length,
    tasks: taskRows.slice(0, 6),
    reviewable,
    chart,
    activeSources: sourceRows.filter((row) => row.status === "active").length,
    reviewImports: importRows.filter((row) => row.status === "needs_review")
      .length,
  };
}
