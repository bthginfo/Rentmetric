export type RentAssessmentInput = {
  currentColdRentCents: number;
  areaSqmTimes100: number;
  rangeLowCentsPerSqm: number;
  rangeMidCentsPerSqm: number;
  rangeHighCentsPerSqm: number;
  localCapBasisPoints: number;
  featureAdjustmentBasisPoints?: number;
};

export type RentAssessment = {
  currentCentsPerSqm: number;
  adjustedReferenceCentsPerSqm: number;
  referenceRentCents: number;
  maximumByCapCents: number;
  orientationCents: number;
  monthlyPotentialCents: number;
  constraints: string[];
};

export function assessRent(input: RentAssessmentInput): RentAssessment {
  if (input.areaSqmTimes100 <= 0)
    throw new Error("Wohnfläche muss größer als null sein");
  const adjustment = input.featureAdjustmentBasisPoints ?? 0;
  const adjustedReferenceCentsPerSqm = Math.round(
    (input.rangeMidCentsPerSqm * (10_000 + adjustment)) / 10_000,
  );
  const boundedReference = Math.max(
    input.rangeLowCentsPerSqm,
    Math.min(input.rangeHighCentsPerSqm, adjustedReferenceCentsPerSqm),
  );
  const referenceRentCents = Math.round(
    (boundedReference * input.areaSqmTimes100) / 100,
  );
  const maximumByCapCents = Math.round(
    (input.currentColdRentCents * (10_000 + input.localCapBasisPoints)) /
      10_000,
  );
  const orientationCents = Math.min(referenceRentCents, maximumByCapCents);
  return {
    currentCentsPerSqm: Math.round(
      (input.currentColdRentCents * 100) / input.areaSqmTimes100,
    ),
    adjustedReferenceCentsPerSqm: boundedReference,
    referenceRentCents,
    maximumByCapCents,
    orientationCents,
    monthlyPotentialCents: Math.max(
      0,
      orientationCents - input.currentColdRentCents,
    ),
    constraints: [
      "Die örtliche Vergleichsmiete begrenzt die Orientierung.",
      "Die konfigurierte Kappungsgrenze wird separat berücksichtigt.",
      "Warte-, Zustimmungs- und Begründungsfristen sind vor Umsetzung rechtlich zu prüfen.",
    ],
  };
}
