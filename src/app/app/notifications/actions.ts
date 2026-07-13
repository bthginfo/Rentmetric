"use server";

import { and, eq, or, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { notifications } from "@/db/schema";

export async function markNotificationRead(id: string) {
  const session = await requireSession();
  await getDb()
    .update(notifications)
    .set({ status: "read", readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.organizationId, session.organizationId),
        or(
          eq(notifications.userId, session.userId),
          isNull(notifications.userId),
        ),
      ),
    );
  revalidatePath("/app/notifications");
}

export async function markAllNotificationsRead() {
  const session = await requireSession();
  await getDb()
    .update(notifications)
    .set({ status: "read", readAt: new Date() })
    .where(
      and(
        eq(notifications.organizationId, session.organizationId),
        eq(notifications.status, "unread"),
        or(
          eq(notifications.userId, session.userId),
          isNull(notifications.userId),
        ),
      ),
    );
  revalidatePath("/app/notifications");
}
