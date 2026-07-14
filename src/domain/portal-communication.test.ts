import { describe, expect, it } from "vitest";
import { canTransitionPortalTask, canUsePortalCommunication, nextPortalTaskStatus, portalItemInputSchema } from "./portal-communication";

describe("portal communication", () => {
  const base = { title: "Termin", body: "Bitte bestätigen.", severity: "normal" };

  it("validates messages without task fields", () => {
    expect(portalItemInputSchema.safeParse({ ...base, kind: "message" }).success).toBe(true);
    expect(portalItemInputSchema.safeParse({ ...base, kind: "message", dueAt: "2026-08-01" }).success).toBe(false);
  });

  it("validates tasks and rejects invalid dates", () => {
    expect(portalItemInputSchema.safeParse({ ...base, kind: "task", dueAt: "2026-08-01" }).success).toBe(true);
    expect(portalItemInputSchema.safeParse({ ...base, kind: "task", dueAt: "kein datum" }).success).toBe(false);
  });

  it("requires explicit communication permission", () => {
    expect(canUsePortalCommunication({ masterData: true, documents: true, deadlines: true, uploads: true })).toBe(false);
    expect(canUsePortalCommunication({ masterData: true, documents: true, deadlines: true, uploads: true, communication: true })).toBe(true);
  });

  it("allows only task status toggles", () => {
    expect(canTransitionPortalTask("message", "open", "done")).toBe(false);
    expect(canTransitionPortalTask("task", "open", "open")).toBe(false);
    expect(canTransitionPortalTask("task", "open", "done")).toBe(true);
    expect(nextPortalTaskStatus("open")).toBe("done");
    expect(nextPortalTaskStatus("done")).toBe("open");
  });
});
