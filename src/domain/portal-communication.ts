import { z } from "zod";
import type { SharePermissions } from "./share-links";

export const portalSeveritySchema = z.enum(["normal", "important", "urgent"]);
export const portalTaskStatusSchema = z.enum(["open", "done"]);

const optionalDate = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.coerce.date().optional(),
);

export const portalItemInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("message"),
    title: z.string().trim().min(2).max(160),
    body: z.string().trim().min(1).max(3000),
    severity: portalSeveritySchema.default("normal"),
    dueAt: z.preprocess((value) => value === "" || value == null ? undefined : value, z.undefined()),
  }),
  z.object({
    kind: z.literal("task"),
    title: z.string().trim().min(2).max(160),
    body: z.string().trim().min(1).max(3000),
    severity: portalSeveritySchema.default("normal"),
    dueAt: optionalDate,
  }),
]);

export const portalReplySchema = z.object({
  itemId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
  requestKey: z.string().uuid().optional(),
});

export function canUsePortalCommunication(permissions: SharePermissions | undefined) {
  return permissions?.communication === true;
}

export function canTransitionPortalTask(kind: "message" | "task", from: "open" | "done", to: "open" | "done") {
  return kind === "task" && from !== to;
}

export function nextPortalTaskStatus(status: "open" | "done") {
  return status === "open" ? "done" : "open";
}
