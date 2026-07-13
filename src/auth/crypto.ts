import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "argon2";

export const hashPassword = (password: string) => hash(password, { type: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password);

export function createSessionToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashSessionToken(token) };
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

