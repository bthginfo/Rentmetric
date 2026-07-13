import {
  addDays,
  differenceInCalendarDays,
  isBefore,
  startOfDay,
} from "date-fns";

export type ReminderCandidate = {
  ruleId: string;
  deduplicationKey: string;
  title: string;
  description: string;
  dueAt: Date;
  severity: "info" | "attention" | "urgent";
  confidence: "verified" | "derived" | "needs_review";
  legalNotice?: string;
  source: { type: string; id: string };
};

export type ReminderInput = {
  now: Date;
  tenancies: Array<{
    id: string;
    label: string;
    endsAt?: Date | null;
    lastRentIncreaseAt?: Date | null;
    depositDueCents: number;
    depositPaidCents: number;
  }>;
  documents: Array<{ id: string; title: string; expiresAt?: Date | null }>;
  receivables: Array<{
    id: string;
    label: string;
    dueAt: Date;
    openCents: number;
  }>;
};

const legalNotice =
  "Automatisch abgeleiteter Hinweis – keine Rechtsberatung. Voraussetzungen und lokale Regelungen bitte prüfen.";

export function deriveReminders(input: ReminderInput): ReminderCandidate[] {
  const today = startOfDay(input.now);
  const reminders: ReminderCandidate[] = [];

  for (const tenancy of input.tenancies) {
    if (tenancy.endsAt) {
      const days = differenceInCalendarDays(tenancy.endsAt, today);
      if (days <= 120)
        reminders.push({
          ruleId: "tenancy.end.review.v1",
          deduplicationKey: `tenancy-end:${tenancy.id}:${tenancy.endsAt.toISOString().slice(0, 10)}`,
          title: `Vertragsende für ${tenancy.label} prüfen`,
          description:
            days < 0
              ? `Das hinterlegte Vertragsende ist seit ${Math.abs(days)} Tagen überschritten.`
              : `Das Vertragsende ist in ${days} Tagen erreicht. Anschlussprozess und Fristen prüfen.`,
          dueAt: tenancy.endsAt,
          severity: days < 0 ? "urgent" : days <= 30 ? "attention" : "info",
          confidence: "derived",
          legalNotice,
          source: { type: "tenancy", id: tenancy.id },
        });
    }

    if (tenancy.depositPaidCents < tenancy.depositDueCents)
      reminders.push({
        ruleId: "deposit.incomplete.v1",
        deduplicationKey: `deposit-incomplete:${tenancy.id}:${tenancy.depositDueCents - tenancy.depositPaidCents}`,
        title: `Kaution für ${tenancy.label} unvollständig`,
        description:
          "Vereinbarter und verbuchter Kautionsbetrag weichen voneinander ab.",
        dueAt: today,
        severity: "attention",
        confidence: "verified",
        source: { type: "tenancy", id: tenancy.id },
      });

    if (tenancy.lastRentIncreaseAt) {
      const reviewAt = addDays(tenancy.lastRentIncreaseAt, 365);
      if (!isBefore(today, addDays(reviewAt, -45))) continue;
      reminders.push({
        ruleId: "rent.review.window.v1",
        deduplicationKey: `rent-review:${tenancy.id}:${reviewAt.toISOString().slice(0, 10)}`,
        title: `Mietprüfung für ${tenancy.label} vormerken`,
        description:
          "Der zeitliche Prüfpunkt ist erreicht. Vergleichsmiete, Kappungsgrenze, Begründung und Sperrfristen separat validieren.",
        dueAt: reviewAt,
        severity: isBefore(reviewAt, today) ? "attention" : "info",
        confidence: "needs_review",
        legalNotice,
        source: { type: "tenancy", id: tenancy.id },
      });
    }
  }

  for (const document of input.documents) {
    if (!document.expiresAt) continue;
    const days = differenceInCalendarDays(document.expiresAt, today);
    if (days <= 90)
      reminders.push({
        ruleId: "document.expiry.v1",
        deduplicationKey: `document-expiry:${document.id}:${document.expiresAt.toISOString().slice(0, 10)}`,
        title: `${document.title} ${days < 0 ? "ist abgelaufen" : "läuft aus"}`,
        description:
          days < 0
            ? `Seit ${Math.abs(days)} Tagen abgelaufen.`
            : `Noch ${days} Tage gültig. Erneuerung vorbereiten.`,
        dueAt: document.expiresAt,
        severity: days < 0 ? "urgent" : days <= 30 ? "attention" : "info",
        confidence: "verified",
        source: { type: "document", id: document.id },
      });
  }

  for (const receivable of input.receivables) {
    if (receivable.openCents <= 0 || !isBefore(receivable.dueAt, today))
      continue;
    reminders.push({
      ruleId: "receivable.overdue.v1",
      deduplicationKey: `receivable-overdue:${receivable.id}:${receivable.openCents}`,
      title: `Zahlung für ${receivable.label} überfällig`,
      description:
        "Offener Saldo nach Fälligkeit. Zahlungseingang und Zuordnung prüfen.",
      dueAt: receivable.dueAt,
      severity: "urgent",
      confidence: "verified",
      source: { type: "receivable", id: receivable.id },
    });
  }

  return reminders.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}
