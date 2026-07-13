import { createHash, randomBytes } from "node:crypto";

export type SharePermissions = {
  masterData: boolean;
  documents: boolean;
  deadlines: boolean;
  uploads: boolean;
  maintenanceReports?: boolean;
  reports?: boolean;
  paymentDetails?: boolean;
};

export function createShareToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashShareToken(token) };
}

export function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isShareLinkActive(
  link: { expiresAt: Date; revokedAt: Date | null },
  now = new Date(),
) {
  return !link.revokedAt && link.expiresAt.getTime() > now.getTime();
}
