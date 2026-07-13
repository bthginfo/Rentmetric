import "server-only";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { addMonths, format, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import { getDb } from "@/db/client";
import { notifications, properties, renters, tasks, tenancies, units } from "@/db/schema";

export async function ensureSmartNotifications(organizationId: string, userId: string) {
  const db = getDb();
  const now = new Date();
  const soon = new Date(now.getTime() + 21 * 86_400_000);
  const [dueTasks, reviewableTenancies] = await Promise.all([
    db.select({ id: tasks.id, title: tasks.title, dueAt: tasks.dueAt, severity: tasks.severity }).from(tasks).where(and(eq(tasks.organizationId, organizationId), eq(tasks.status, "open"), lte(tasks.dueAt, soon))).limit(20),
    db.select({ id: tenancies.id, lastIncrease: tenancies.lastRentIncreaseAt, startsAt: tenancies.startsAt, renterFirst: renters.firstName, renterLast: renters.lastName, unitLabel: units.label, propertyName: properties.name }).from(tenancies).innerJoin(units, eq(units.id, tenancies.unitId)).innerJoin(properties, eq(properties.id, units.propertyId)).innerJoin(renters, eq(renters.id, tenancies.renterId)).where(and(eq(tenancies.organizationId, organizationId), or(isNull(tenancies.endsAt), gte(tenancies.endsAt, now)), or(lte(tenancies.lastRentIncreaseAt, subMonths(now, 12)), and(isNull(tenancies.lastRentIncreaseAt), lte(tenancies.startsAt, subMonths(now, 12)))))).limit(20),
  ]);
  if (dueTasks.length) await db.insert(notifications).values(dueTasks.map((task) => ({ organizationId, userId, title: task.title, body: task.dueAt ? `Fällig am ${format(task.dueAt, "dd. MMMM yyyy", { locale: de })}` : "Frist prüfen", href: "/app/tasks", type: task.severity === "critical" ? "warning" : "deadline", deduplicationKey: `task-due:${task.id}:${task.dueAt?.toISOString().slice(0, 10) || "open"}` }))).onConflictDoNothing();
  if (reviewableTenancies.length) await db.insert(notifications).values(reviewableTenancies.map((tenancy) => {
    const reference = tenancy.lastIncrease || tenancy.startsAt;
    return { organizationId, userId, title: `Mietanpassung für ${tenancy.propertyName} prüfen`, body: `${tenancy.unitLabel} · ${tenancy.renterFirst} ${tenancy.renterLast}. Frühester Prüfzeitpunkt aus Stammdaten: ${format(addMonths(reference, 12), "dd.MM.yyyy")}. Rechtliche Voraussetzungen separat prüfen.`, href: "/app/rent-index", type: "rent_review", deduplicationKey: `rent-review:${tenancy.id}:${format(addMonths(reference, 12), "yyyy-MM")}` };
  })).onConflictDoNothing();
}
