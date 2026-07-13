export function addCents(...amounts: number[]): number {
  return amounts.reduce((sum, amount) => {
    assertCents(amount);
    return sum + amount;
  }, 0);
}

export function percentageOfCents(
  amountCents: number,
  basisPoints: number,
): number {
  assertCents(amountCents);
  if (!Number.isInteger(basisPoints))
    throw new TypeError("basisPoints muss ganzzahlig sein");
  return Math.round((amountCents * basisPoints) / 10_000);
}

export function formatCents(amountCents: number): string {
  assertCents(amountCents);
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100);
}

function assertCents(value: number) {
  if (!Number.isSafeInteger(value))
    throw new TypeError(
      "Geldbeträge müssen als sichere Integer-Cent vorliegen",
    );
}
