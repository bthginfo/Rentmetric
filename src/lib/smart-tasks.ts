import "server-only";
import { addDays, addMonths, format, startOfDay, subMonths } from "date-fns";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  documents,
  maintenanceCases,
  payments,
  properties,
  renters,
  rentIndexImports,
  tasks,
  tenancies,
  units,
  utilityPeriods,
} from "@/db/schema";

type SmartTask = typeof tasks.$inferInsert;

export async function ensureSmartTasks(organizationId: string) {
  const db = getDb();
  const now = new Date();
  const today = startOfDay(now);
  const [
    overduePayments,
    reviewableTenancies,
    expiringDocuments,
    reviewImports,
    vacantUnits,
    dueMaintenance,
    endingUtilityPeriods,
  ] = await Promise.all([
    db
      .select({
        id: payments.id,
        dueAt: payments.dueAt,
        amount: payments.amountCents,
        unit: units.label,
        property: properties.name,
        first: renters.firstName,
        last: renters.lastName,
      })
      .from(payments)
      .innerJoin(tenancies, eq(tenancies.id, payments.tenancyId))
      .innerJoin(units, eq(units.id, tenancies.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .innerJoin(renters, eq(renters.id, tenancies.renterId))
      .where(
        and(
          eq(payments.organizationId, organizationId),
          isNull(payments.paidAt),
          lte(payments.dueAt, now),
        ),
      )
      .limit(50),
    db
      .select({
        id: tenancies.id,
        startsAt: tenancies.startsAt,
        lastIncrease: tenancies.lastRentIncreaseAt,
        unit: units.label,
        property: properties.name,
        first: renters.firstName,
        last: renters.lastName,
      })
      .from(tenancies)
      .innerJoin(units, eq(units.id, tenancies.unitId))
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .innerJoin(renters, eq(renters.id, tenancies.renterId))
      .where(
        and(
          eq(tenancies.organizationId, organizationId),
          or(isNull(tenancies.endsAt), gte(tenancies.endsAt, now)),
          or(
            lte(tenancies.lastRentIncreaseAt, subMonths(now, 12)),
            and(
              isNull(tenancies.lastRentIncreaseAt),
              lte(tenancies.startsAt, subMonths(now, 12)),
            ),
          ),
        ),
      )
      .limit(50),
    db
      .select({
        id: documents.id,
        title: documents.title,
        expiresAt: documents.expiresAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.organizationId, organizationId),
          gte(documents.expiresAt, today),
          lte(documents.expiresAt, addDays(today, 45)),
        ),
      )
      .limit(50),
    db
      .select({
        id: rentIndexImports.id,
        title: rentIndexImports.title,
        municipality: rentIndexImports.municipality,
      })
      .from(rentIndexImports)
      .where(
        and(
          eq(rentIndexImports.organizationId, organizationId),
          eq(rentIndexImports.status, "needs_review"),
        ),
      )
      .limit(50),
    db
      .select({
        id: units.id,
        label: units.label,
        property: properties.name,
        updatedAt: units.updatedAt,
      })
      .from(units)
      .innerJoin(properties, eq(properties.id, units.propertyId))
      .where(
        and(
          eq(units.organizationId, organizationId),
          eq(units.status, "vacant"),
          lte(units.updatedAt, addDays(now, -14)),
        ),
      )
      .limit(50),
    db
      .select({
        id: maintenanceCases.id,
        title: maintenanceCases.title,
        dueAt: maintenanceCases.dueAt,
      })
      .from(maintenanceCases)
      .where(
        and(
          eq(maintenanceCases.organizationId, organizationId),
          or(
            eq(maintenanceCases.status, "open"),
            eq(maintenanceCases.status, "scheduled"),
          ),
          lte(maintenanceCases.dueAt, addDays(now, 30)),
        ),
      )
      .limit(50),
    db
      .select({
        id: utilityPeriods.id,
        title: utilityPeriods.title,
        endsAt: utilityPeriods.endsAt,
      })
      .from(utilityPeriods)
      .where(
        and(
          eq(utilityPeriods.organizationId, organizationId),
          eq(utilityPeriods.status, "draft"),
          lte(utilityPeriods.endsAt, addDays(now, 60)),
        ),
      )
      .limit(50),
  ]);

  const generated: SmartTask[] = [
    ...overduePayments.map((item) => ({
      organizationId,
      title: "Ausstehenden Mieteingang prüfen",
      description: `${item.property} · ${item.unit} · ${item.first} ${item.last} · ${(item.amount / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}`,
      dueAt: item.dueAt,
      severity: "urgent",
      ruleId: "payment.overdue",
      sourceType: "payment",
      sourceId: item.id,
      deduplicationKey: `payment-overdue:${item.id}`,
      metadata: { explain: "Zahlung ist fällig und hat kein Eingangsdatum." },
    })),
    ...reviewableTenancies.map((item) => {
      const reference = item.lastIncrease || item.startsAt;
      return {
        organizationId,
        title: "Mögliche Mietanpassung fachlich prüfen",
        description: `${item.property} · ${item.unit} · ${item.first} ${item.last}. Mindestens zwölf Monate seit Vertragsbeginn oder letzter Anpassung; weitere rechtliche Voraussetzungen bleiben manuell zu prüfen.`,
        dueAt: addMonths(reference, 12),
        severity: "warning",
        ruleId: "rent.review",
        sourceType: "tenancy",
        sourceId: item.id,
        deduplicationKey: `rent-review:${item.id}:${format(addMonths(reference, 12), "yyyy-MM")}`,
        metadata: {
          explain:
            "Zeitlicher Prüfanlass aus Vertragsstammdaten; keine automatische Freigabe.",
        },
      };
    }),
    ...expiringDocuments.map((item) => ({
      organizationId,
      title: "Dokumentablauf vorbereiten",
      description: `${item.title} läuft am ${format(item.expiresAt!, "dd.MM.yyyy")} ab.`,
      dueAt: addDays(item.expiresAt!, -14),
      severity: "warning",
      ruleId: "document.expiry",
      sourceType: "document",
      sourceId: item.id,
      deduplicationKey: `document-expiry:${item.id}:${format(item.expiresAt!, "yyyy-MM-dd")}`,
      metadata: { explain: "Ablaufdatum aus dem Dokument." },
    })),
    ...reviewImports.map((item) => ({
      organizationId,
      title: "Mietspiegel-Auswertung prüfen",
      description: `${item.title} für ${item.municipality} wartet auf fachliche Freigabe.`,
      dueAt: today,
      severity: "info",
      ruleId: "rent-index.review",
      sourceType: "rent_index_import",
      sourceId: item.id,
      deduplicationKey: `rent-index-review:${item.id}`,
      metadata: {
        explain: "Die Auswertung wird erst nach manueller Prüfung aktiv.",
      },
    })),
    ...vacantUnits.map((item) => ({
      organizationId,
      title: "Leerstand prüfen",
      description: `${item.property} · ${item.label} ist seit mindestens 14 Tagen als frei markiert.`,
      dueAt: today,
      severity: "warning",
      ruleId: "unit.vacancy",
      sourceType: "unit",
      sourceId: item.id,
      deduplicationKey: `unit-vacancy:${item.id}:${format(item.updatedAt, "yyyy-MM")}`,
      metadata: {
        explain: "Einheitenstatus ist seit mindestens 14 Tagen frei.",
      },
    })),
    ...dueMaintenance.map((item) => ({
      organizationId,
      title: "Wartungsfall nachhalten",
      description: `${item.title}${item.dueAt ? ` · fällig ${format(item.dueAt, "dd.MM.yyyy")}` : ""}`,
      dueAt: item.dueAt || today,
      severity: "warning",
      ruleId: "maintenance.due",
      sourceType: "maintenance",
      sourceId: item.id,
      deduplicationKey: `maintenance-due:${item.id}`,
      metadata: {
        explain: "Offener Wartungsfall erreicht sein Fälligkeitsfenster.",
      },
    })),
    ...endingUtilityPeriods.map((item) => ({
      organizationId,
      title: "Betriebskostenperiode abschließen",
      description: `${item.title} endet am ${format(item.endsAt, "dd.MM.yyyy")}. Belege und Verteilerschlüssel prüfen.`,
      dueAt: item.endsAt,
      severity: "info",
      ruleId: "utilities.period_end",
      sourceType: "utility_period",
      sourceId: item.id,
      deduplicationKey: `utility-period:${item.id}`,
      metadata: { explain: "Enddatum einer noch offenen Abrechnungsperiode." },
    })),
  ];
  if (generated.length)
    await db.insert(tasks).values(generated).onConflictDoNothing();
  return generated.length;
}
