export function allocateCents(totalCents: number, weights: number[]): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new Error("Betrag muss als positive Cent-Ganzzahl vorliegen.");
  const positive = weights.map((weight) => Math.max(0, weight)); const totalWeight = positive.reduce((sum, weight) => sum + weight, 0);
  if (!totalWeight) return positive.map(() => 0);
  const raw = positive.map((weight) => totalCents * weight / totalWeight); const allocated = raw.map(Math.floor); const remaining = totalCents - allocated.reduce((sum, value) => sum + value, 0);
  const order = raw.map((value, index) => ({ index, fraction: value - Math.floor(value) })).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remaining; index += 1) allocated[order[index].index] += 1;
  return allocated;
}

export function overlapDays(periodStart: Date, periodEnd: Date, tenancyStart: Date, tenancyEnd: Date | null) {
  const start = tenancyStart > periodStart ? tenancyStart : periodStart; const effectiveEnd = tenancyEnd ?? periodEnd; const end = effectiveEnd < periodEnd ? effectiveEnd : periodEnd;
  return start > end ? 0 : Math.floor((Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86400000) + 1;
}
