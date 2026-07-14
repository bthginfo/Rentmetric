import { describe, expect, it } from "vitest";
import {
  productTourResultSchema,
  shouldStartProductTour,
} from "./product-tour";

describe("product tour state", () => {
  it("starts for a new user without product state", () => {
    expect(shouldStartProductTour(null)).toBe(true);
  });

  it("starts pending and outdated tours", () => {
    expect(
      shouldStartProductTour({ tourVersion: 1, tourStatus: "pending" }),
    ).toBe(true);
    expect(
      shouldStartProductTour({ tourVersion: 0, tourStatus: "completed" }),
    ).toBe(true);
  });

  it("does not restart a completed or skipped current tour", () => {
    expect(
      shouldStartProductTour({ tourVersion: 1, tourStatus: "completed" }),
    ).toBe(false);
    expect(
      shouldStartProductTour({ tourVersion: 1, tourStatus: "skipped" }),
    ).toBe(false);
  });

  it("accepts only explicit terminal results", () => {
    expect(productTourResultSchema.safeParse("completed").success).toBe(true);
    expect(productTourResultSchema.safeParse("skipped").success).toBe(true);
    expect(productTourResultSchema.safeParse("pending").success).toBe(false);
  });
});
