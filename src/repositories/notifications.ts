import "server-only";
import { and, count, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { notifications } from "@/db/schema";

export async function listNotifications(organizationId: string, userId: string, limit = 30) {
  return getDb().select().from(notifications).where(and(eq(notifications.organizationId, organizationId), or(eq(notifications.userId, userId), isNull(notifications.userId)))).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function countUnreadNotifications(organizationId: string, userId: string) {
  const [result] = await getDb().select({ value: count() }).from(notifications).where(and(eq(notifications.organizationId, organizationId), eq(notifications.status, "unread"), or(eq(notifications.userId, userId), isNull(notifications.userId))));
  return result?.value || 0;
}
