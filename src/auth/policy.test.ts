import { describe, expect, it } from "vitest";
import { strongPasswordSchema } from "./policy";

describe("strongPasswordSchema", () => {
  it("requires length, a letter and a number", () => {
    expect(strongPasswordSchema.safeParse("kurz1").success).toBe(false);
    expect(strongPasswordSchema.safeParse("abcdefghijkl").success).toBe(false);
    expect(strongPasswordSchema.safeParse("123456789012").success).toBe(false);
    expect(strongPasswordSchema.safeParse("SicheresPasswort2026").success).toBe(
      true,
    );
  });
});
