import "server-only";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { endOfDay, startOfDay } from "date-fns";
import { getDb } from "@/db/client";
import { tasks } from "@/db/schema";

export async function listOrganizationTasks(
  organizationId: string,
  filter: string,
) {
  const db = getDb();
  const now = new Date();
  const base = eq(tasks.organizationId, organizationId);
  const condition =
    filter === "done"
      ? and(base, eq(tasks.status, "done"))
      : filter === "today"
        ? and(
            base,
            eq(tasks.status, "open"),
            gte(tasks.dueAt, startOfDay(now)),
            lt(tasks.dueAt, endOfDay(now)),
          )
        : filter === "upcoming"
          ? and(base, eq(tasks.status, "open"), gte(tasks.dueAt, endOfDay(now)))
          : and(base, eq(tasks.status, "open"));
  return db
    .select()
    .from(tasks)
    .where(condition)
    .orderBy(
      filter === "done" ? desc(tasks.updatedAt) : asc(tasks.dueAt),
      desc(tasks.createdAt),
    );
}

export async function taskCounts(organizationId: string) {
  const all = await getDb()
    .select({ status: tasks.status, dueAt: tasks.dueAt })
    .from(tasks)
    .where(eq(tasks.organizationId, organizationId));
  const now = new Date(),
    start = startOfDay(now),
    end = endOfDay(now);
  return {
    open: all.filter((item) => item.status === "open").length,
    today: all.filter(
      (item) =>
        item.status === "open" &&
        item.dueAt &&
        item.dueAt >= start &&
        item.dueAt <= end,
    ).length,
    upcoming: all.filter(
      (item) => item.status === "open" && item.dueAt && item.dueAt > end,
    ).length,
    done: all.filter((item) => item.status === "done").length,
  };
}
