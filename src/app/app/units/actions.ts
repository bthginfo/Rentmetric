"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/auth/session";
import { getDb } from "@/db/client";
import { auditLogs, units } from "@/db/schema";
import { organizationOwnsProperty } from "@/repositories/portfolio";

export type UnitFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;
const schema = z.object({
  propertyId: z.string().uuid(),
  label: z.string().trim().min(1).max(80),
  floor: z.string().trim().max(40).optional(),
  areaSqm: z.coerce.number().int().positive().max(5000).optional(),
  rooms: z.coerce.number().positive().max(100).optional(),
});

export async function createUnit(_: UnitFormState, formData: FormData): Promise<UnitFormState> {
  const values = Object.fromEntries(formData);
  if (values.areaSqm === "") delete values.areaSqm;
  if (values.rooms === "") delete values.rooms;
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const session = await requireSession();
  if (!await organizationOwnsProperty(session.organizationId, parsed.data.propertyId)) return { error: "Objekt wurde nicht gefunden." };
  const id = randomUUID();
  const db = getDb();
  await db.insert(units).values({
    id,
    organizationId: session.organizationId,
    propertyId: parsed.data.propertyId,
    label: parsed.data.label,
    floor: parsed.data.floor || null,
    areaSqm: parsed.data.areaSqm,
    roomsTimesTen: parsed.data.rooms ? Math.round(parsed.data.rooms * 10) : undefined,
  });
  await db.insert(auditLogs).values({ organizationId: session.organizationId, userId: session.userId, action: "unit.created", entityType: "unit", entityId: id });
  redirect("/app/units?created=1");
}

