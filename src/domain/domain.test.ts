import { describe, expect, it } from "vitest";
import { addCents, percentageOfCents } from "./money";
import { assessRent } from "./rent-index";
import { deriveReminders } from "./reminders";
import { createShareToken, hashShareToken, isShareLinkActive } from "./share-links";

describe("deterministische Geldberechnung", () => {
  it("addiert Cent und rundet Basis-Punkte", () => {
    expect(addCents(1099, 2001)).toBe(3100);
    expect(percentageOfCents(999, 1900)).toBe(190);
  });
});

describe("Mietspiegelbewertung", () => {
  it("begrenzt die Orientierung auf die niedrigere Grenze", () => {
    const result = assessRent({ currentColdRentCents: 70_000, areaSqmTimes100: 7_000, rangeLowCentsPerSqm: 1050, rangeMidCentsPerSqm: 1200, rangeHighCentsPerSqm: 1300, localCapBasisPoints: 1500 });
    expect(result.referenceRentCents).toBe(84_000);
    expect(result.maximumByCapCents).toBe(80_500);
    expect(result.orientationCents).toBe(80_500);
    expect(result.monthlyPotentialCents).toBe(10_500);
  });
});

describe("Reminder Engine", () => {
  it("leitet überfällige Zahlung und auslaufendes Dokument mit stabilen Keys ab", () => {
    const result = deriveReminders({
      now: new Date("2026-07-13T12:00:00Z"),
      tenancies: [],
      documents: [{ id: "doc-1", title: "Energieausweis", expiresAt: new Date("2026-07-20T00:00:00Z") }],
      receivables: [{ id: "pay-1", label: "WE 3", dueAt: new Date("2026-07-03T00:00:00Z"), openCents: 125_00 }],
    });
    expect(result.map((item) => item.ruleId)).toEqual(["receivable.overdue.v1", "document.expiry.v1"]);
    expect(new Set(result.map((item) => item.deduplicationKey)).size).toBe(2);
  });
});

describe("Freigabelinks", () => {
  it("speichert nur Hash und respektiert Ablauf/Widerruf", () => {
    const value = createShareToken();
    expect(value.token).not.toBe(value.tokenHash);
    expect(hashShareToken(value.token)).toBe(value.tokenHash);
    expect(isShareLinkActive({ expiresAt: new Date("2027-01-01"), revokedAt: null }, new Date("2026-01-01"))).toBe(true);
    expect(isShareLinkActive({ expiresAt: new Date("2027-01-01"), revokedAt: new Date("2026-01-01") }, new Date("2026-01-02"))).toBe(false);
  });
});

