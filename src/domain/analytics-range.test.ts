import { describe, expect, it } from "vitest";
import { differenceInCalendarDays } from "date-fns";
import { occupiedUnitCountAt, parseAnalyticsRange, percentageDelta } from "./analytics-range";

const now = new Date("2026-07-14T12:00:00+02:00");

describe("analytics range", () => {
  it("parses presets with inclusive boundaries", () => {
    const range = parseAnalyticsRange({ range: "30d" }, now);
    expect(differenceInCalendarDays(range.to, range.from) + 1).toBe(30);
    expect(range.bucket).toBe("day");
  });
  it("rejects reversed custom dates", () => {
    const range = parseAnalyticsRange({ range: "custom", from: "2026-08-01", to: "2026-07-01" }, now);
    expect(range.error).toContain("gültigen Zeitraum");
  });
  it("clamps custom ranges to five years", () => {
    const range = parseAnalyticsRange({ range: "custom", from: "2010-01-01", to: "2026-07-01" }, now);
    expect(range.error).toContain("fünf Jahre");
    expect(differenceInCalendarDays(range.to, range.from)).toBeLessThanOrEqual(1827);
  });
  it("builds an immediately preceding equal comparison period", () => {
    const range = parseAnalyticsRange({ range: "90d", compare: "previous" }, now);
    expect(range.comparison).toBeDefined();
    expect(differenceInCalendarDays(range.to, range.from)).toBe(differenceInCalendarDays(range.comparison!.to, range.comparison!.from));
    expect(differenceInCalendarDays(range.from, range.comparison!.to)).toBe(1);
  });
  it("returns neutral and unavailable zero deltas", () => {
    expect(percentageDelta(0, 0)).toBe(0);
    expect(percentageDelta(10, 0)).toBeNull();
  });
  it("keeps calendar-day boundaries across daylight-saving changes", () => {
    const range = parseAnalyticsRange({ range: "30d" }, new Date("2026-04-05T12:00:00+02:00"));
    expect(differenceInCalendarDays(range.to, range.from) + 1).toBe(30);
    expect(range.from.getHours()).toBe(0);
    expect(range.to.getHours()).toBe(23);
  });
  it("calculates occupancy at a historical range end without double-counting units", () => {
    const at = new Date("2026-03-31T23:59:59+02:00");
    expect(occupiedUnitCountAt([
      { unitId: "a", startsAt: new Date("2025-01-01"), endsAt: null },
      { unitId: "a", startsAt: new Date("2026-03-01"), endsAt: null },
      { unitId: "b", startsAt: new Date("2025-01-01"), endsAt: new Date("2026-03-31T23:59:59+02:00") },
      { unitId: "c", startsAt: new Date("2026-04-01"), endsAt: null },
    ], at)).toBe(2);
  });
});
