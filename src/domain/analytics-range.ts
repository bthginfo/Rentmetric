import {
  differenceInCalendarDays,
  endOfDay,
  endOfYear,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";

export const analyticsRangeKeys = ["30d", "90d", "year", "previous-year", "12m", "custom"] as const;
export type AnalyticsRangeKey = (typeof analyticsRangeKeys)[number];
export type AnalyticsRange = {
  key: AnalyticsRangeKey;
  from: Date;
  to: Date;
  label: string;
  bucket: "day" | "week" | "month";
  compare: boolean;
  comparison?: { from: Date; to: Date; label: string };
  error?: string;
};

function format(date: Date) {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function parseAnalyticsRange(
  input: Record<string, string | string[] | undefined>,
  now = new Date(),
): AnalyticsRange {
  const rawKey = typeof input.range === "string" ? input.range : "12m";
  const key = analyticsRangeKeys.includes(rawKey as AnalyticsRangeKey) ? rawKey as AnalyticsRangeKey : "12m";
  const today = endOfDay(now);
  let from: Date;
  let to: Date = today;
  let error: string | undefined = rawKey === key ? undefined : "Unbekannter Zeitraum – 12 Monate werden angezeigt.";
  if (key === "30d") from = startOfDay(subDays(today, 29));
  else if (key === "90d") from = startOfDay(subDays(today, 89));
  else if (key === "year") from = startOfYear(today);
  else if (key === "previous-year") {
    from = startOfYear(subYears(today, 1));
    to = endOfYear(subYears(today, 1));
  } else if (key === "custom") {
    const parsedFrom = typeof input.from === "string" ? parseISO(input.from) : new Date(NaN);
    const parsedTo = typeof input.to === "string" ? parseISO(input.to) : new Date(NaN);
    if (!isValid(parsedFrom) || !isValid(parsedTo) || parsedFrom > parsedTo) {
      from = startOfMonth(subMonths(today, 11));
      error = "Bitte einen gültigen Zeitraum mit Start vor Ende wählen.";
    } else {
      from = startOfDay(parsedFrom);
      to = endOfDay(parsedTo);
    }
  } else from = startOfMonth(subMonths(today, 11));
  const maximumFrom = startOfDay(subYears(to, 5));
  if (from < maximumFrom) {
    from = maximumFrom;
    error = "Der Zeitraum wurde auf maximal fünf Jahre begrenzt.";
  }
  const days = differenceInCalendarDays(to, from) + 1;
  const compare = input.compare === "previous";
  const comparisonTo = endOfDay(subDays(from, 1));
  const comparisonFrom = startOfDay(subDays(comparisonTo, days - 1));
  return {
    key,
    from,
    to,
    label: `${format(from)} – ${format(to)}`,
    bucket: days <= 45 ? "day" : days <= 120 ? "week" : "month",
    compare,
    comparison: compare ? { from: comparisonFrom, to: comparisonTo, label: `${format(comparisonFrom)} – ${format(comparisonTo)}` } : undefined,
    error,
  };
}

export function percentageDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous) * 100;
}

export function isTenancyActiveAt(
  tenancy: { startsAt: Date; endsAt: Date | null },
  at: Date,
) {
  return tenancy.startsAt <= at && (!tenancy.endsAt || tenancy.endsAt >= at);
}

export function occupiedUnitCountAt<T extends { unitId: string; startsAt: Date; endsAt: Date | null }>(
  tenancies: T[],
  at: Date,
) {
  return new Set(tenancies.filter((tenancy) => isTenancyActiveAt(tenancy, at)).map((tenancy) => tenancy.unitId)).size;
}
