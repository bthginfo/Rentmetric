"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, documents } from "@/db/schema";

export async function toggleDocumentVisibility(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  const visible = z.enum(["true", "false"]).safeParse(formData.get("visible"));
  if (!id.success || !visible.success) return;
  const session = await requireSession();
  const db = getDb();
  await db
    .update(documents)
    .set({
      visibleToRenter: visible.data === "true",
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.id, id.data),
        eq(documents.organizationId, session.organizationId),
      ),
    );
  await db
    .insert(auditLogs)
    .values({
      organizationId: session.organizationId,
      userId: session.userId,
      action: visible.data === "true" ? "document.shared" : "document.unshared",
      entityType: "document",
      entityId: id.data,
    });
  revalidatePath("/app/documents");
}

export async function setDocumentTrash(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id")); const trash = z.enum(["true", "false"]).safeParse(formData.get("trash")); if (!id.success || !trash.success) return; const session = await requireSession();
  await getDb().update(documents).set({ deletedAt: trash.data === "true" ? new Date() : null, visibleToRenter: false, updatedAt: new Date() }).where(and(eq(documents.id, id.data), eq(documents.organizationId, session.organizationId)));
  revalidatePath("/app/documents");
}
