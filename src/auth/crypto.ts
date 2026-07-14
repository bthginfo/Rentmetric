import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "argon2";

// A real Argon2id hash used only to keep unknown-account checks close in cost
// to valid-account checks. It is not tied to any credential.
export const dummyPasswordHash =
  "$argon2id$v=19$m=19456,t=2,p=1$sUpIj5lDQbg2+LfL7RpSFg$P2fDhaHI39vnI6l/2AKm+rvNYOfRt+9w+ySwh3tKeQ0";

export const hashPassword = (password: string) =>
  hash(password, { type: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (passwordHash: string, password: string) =>
  verify(passwordHash, password);

export function createSessionToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashSessionToken(token) };
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
