import "server-only";

import { createHash } from "node:crypto";
import { and, count, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db/client";
import { authAttempts } from "@/db/schema";

export type RateLimitRule = {
  namespace: string;
  identity?: string;
  limit: number;
  windowMs: number;
};

function normalizeClientIp(value: string | null) {
  const candidate = value?.split(",")[0]?.trim().slice(0, 64) ?? "";
  return /^[0-9a-f:.]+$/i.test(candidate) ? candidate : "unknown";
}

export async function getClientIp() {
  const requestHeaders = await headers();
  return normalizeClientIp(
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip"),
  );
}

export function hashRateLimitKey(
  namespace: string,
  clientIp: string,
  identity = "*",
) {
  return createHash("sha256")
    .update(`${namespace}:${clientIp}:${identity.trim().toLowerCase()}`)
    .digest("hex");
}

export async function rateLimitKeys(rules: RateLimitRule[]) {
  const clientIp = await getClientIp();
  return rules
    .filter((rule) => clientIp !== "unknown" || Boolean(rule.identity))
    .map((rule) => ({
      ...rule,
      keyHash: hashRateLimitKey(
        rule.namespace,
        clientIp,
        rule.identity ?? "*",
      ),
    }));
}

export async function isAnyRateLimitExceeded(
  keys: Awaited<ReturnType<typeof rateLimitKeys>>,
) {
  const db = getDb();
  const results = await Promise.all(
    keys.map(async (rule) => {
      const [result] = await db
        .select({ value: count() })
        .from(authAttempts)
        .where(
          and(
            eq(authAttempts.keyHash, rule.keyHash),
            eq(authAttempts.succeeded, false),
            gt(
              authAttempts.createdAt,
              new Date(Date.now() - rule.windowMs),
            ),
          ),
        );
      return Number(result?.value ?? 0) >= rule.limit;
    }),
  );
  return results.some(Boolean);
}

export async function recordRateLimitResult(
  keys: Awaited<ReturnType<typeof rateLimitKeys>>,
  succeeded: boolean,
) {
  if (!keys.length) return;
  await getDb()
    .insert(authAttempts)
    .values(keys.map(({ keyHash }) => ({ keyHash, succeeded })));
}
