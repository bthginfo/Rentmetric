import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { properties } from "@/db/schema";

export async function listProperties(organizationId: string) {
  if (!organizationId) throw new Error("organizationId ist erforderlich");
  return getDb()
    .select()
    .from(properties)
    .where(eq(properties.organizationId, organizationId));
}

export async function getProperty(organizationId: string, propertyId: string) {
  if (!organizationId) throw new Error("organizationId ist erforderlich");
  const [property] = await getDb()
    .select()
    .from(properties)
    .where(
      and(
        eq(properties.organizationId, organizationId),
        eq(properties.id, propertyId),
      ),
    )
    .limit(1);
  return property ?? null;
}
