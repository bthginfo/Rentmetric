"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, notifications, rentIndexImports } from "@/db/schema";
import { processRentIndexImport } from "@/lib/rent-index/processing";

export async function retryRentIndexImport(importId: string) {
  const session = await requireSession();
  await processRentIndexImport(importId, session.organizationId);
  revalidatePath(`/app/rent-index/imports/${importId}`);
}

export async function approveRentIndexImport(importId: string) {
  const session = await requireSession();
  const db = getDb();
  const [record] = await db
    .update(rentIndexImports)
    .set({ status: "approved", reviewedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(rentIndexImports.id, importId),
        eq(rentIndexImports.organizationId, session.organizationId),
        eq(rentIndexImports.status, "needs_review"),
      ),
    )
    .returning({
      id: rentIndexImports.id,
      municipality: rentIndexImports.municipality,
    });
  if (!record)
    redirect(`/app/rent-index/imports/${importId}?error=not-reviewable`);
  await db
    .insert(auditLogs)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "rent_index_import.reviewed",
      entityType: "rent_index_import",
      entityId: importId,
    });
  await db
    .insert(notifications)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      title: `Mietspiegel ${record.municipality} geprüft`,
      body: "Die Extraktion ist bestätigt. Eine Rechenlogik wird erst nach strukturierter Regelzuordnung aktiviert.",
      href: `/app/rent-index/imports/${importId}`,
      type: "success",
      deduplicationKey: `rent-index-approved:${importId}`,
    })
    .onConflictDoNothing();
  redirect(`/app/rent-index/imports/${importId}?approved=1`);
}
