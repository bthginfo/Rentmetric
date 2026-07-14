"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, userProductState } from "@/db/schema";
import {
  PRODUCT_TOUR_VERSION,
  productTourResultSchema,
  type ProductTourResult,
} from "@/domain/product-tour";

export async function finishProductTour(result: ProductTourResult) {
  const parsed = productTourResultSchema.safeParse(result);
  if (!parsed.success)
    return { ok: false as const, error: "Ungültiger Tourstatus." };
  const session = await requireSession();
  const now = new Date();
  const db = getDb();
  await db.batch([
    db
      .insert(userProductState)
      .values({
        userId: session.userId,
        tourVersion: PRODUCT_TOUR_VERSION,
        tourStatus: parsed.data,
        finishedAt: now,
      })
      .onConflictDoUpdate({
        target: userProductState.userId,
        set: {
          tourVersion: PRODUCT_TOUR_VERSION,
          tourStatus: parsed.data,
          finishedAt: now,
          updatedAt: now,
        },
      }),
    db.insert(auditLogs).values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: `product_tour.${parsed.data}`,
      entityType: "user",
      entityId: session.userId,
      changes: { tourVersion: PRODUCT_TOUR_VERSION },
    }),
  ]);
  revalidatePath("/app", "layout");
  return { ok: true as const };
}

export async function restartProductTour() {
  const session = await requireSession();
  const now = new Date();
  const db = getDb();
  await db.batch([
    db
      .insert(userProductState)
      .values({
        userId: session.userId,
        tourVersion: PRODUCT_TOUR_VERSION,
        tourStatus: "pending",
        finishedAt: null,
      })
      .onConflictDoUpdate({
        target: userProductState.userId,
        set: {
          tourVersion: PRODUCT_TOUR_VERSION,
          tourStatus: "pending",
          finishedAt: null,
          updatedAt: now,
        },
      }),
    db.insert(auditLogs).values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "product_tour.restarted",
      entityType: "user",
      entityId: session.userId,
      changes: { tourVersion: PRODUCT_TOUR_VERSION },
    }),
  ]);
  revalidatePath("/app", "layout");
  return { ok: true as const };
}
