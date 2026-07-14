import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import {
  contacts,
  maintenanceCases,
  maintenanceEvents,
  properties,
  units,
} from "@/db/schema";
import { deleteMaintenanceCase, updateMaintenanceCase } from "../actions";

const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const categories = {
  repair: "Reparatur",
  maintenance: "Wartung",
  damage: "Schaden",
  inspection: "Prüfung",
  complaint: "Meldung",
};

export default async function MaintenanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const session = await requireSession();
  const { caseId } = await params;
  const query = await searchParams;
  const db = getDb();
  const [item] = await db
    .select({
      item: maintenanceCases,
      property: properties,
      unit: units,
      contact: contacts,
    })
    .from(maintenanceCases)
    .leftJoin(properties, eq(properties.id, maintenanceCases.propertyId))
    .leftJoin(units, eq(units.id, maintenanceCases.unitId))
    .leftJoin(contacts, eq(contacts.id, maintenanceCases.assigneeContactId))
    .where(
      and(
        eq(maintenanceCases.id, caseId),
        eq(maintenanceCases.organizationId, session.organizationId),
      ),
    )
    .limit(1);
  if (!item) notFound();
  const [events, propertyRows, unitRows, contactRows] = await Promise.all([
    db
      .select()
      .from(maintenanceEvents)
      .where(
        and(
          eq(maintenanceEvents.caseId, caseId),
          eq(maintenanceEvents.organizationId, session.organizationId),
        ),
      )
      .orderBy(asc(maintenanceEvents.createdAt)),
    db
      .select()
      .from(properties)
      .where(eq(properties.organizationId, session.organizationId))
      .orderBy(asc(properties.name)),
    db
      .select()
      .from(units)
      .where(eq(units.organizationId, session.organizationId))
      .orderBy(asc(units.label)),
    db
      .select()
      .from(contacts)
      .where(eq(contacts.organizationId, session.organizationId))
      .orderBy(asc(contacts.name)),
  ]);
  return (
    <AppShell active="/app/maintenance">
      <Link className="dossier-breadcrumb" href="/app/maintenance">
        <ArrowLeft size={14} /> Wartungen & Fälle
      </Link>
      {query.updated === "1" && (
        <div className="success-banner" role="status">
          Vorgang wurde aktualisiert und im Verlauf dokumentiert.
        </div>
      )}
      {query.error === "invalid" && (
        <div className="error-banner" role="alert">
          Bitte prüfe die eingegebenen Daten.
        </div>
      )}
      {query.error === "relations" && (
        <div className="error-banner" role="alert">
          Objekt, Einheit oder Zuständigkeit passen nicht zusammen.
        </div>
      )}
      {query.error === "portal-history" && (
        <div className="error-banner" role="alert">
          Mieter:innen haben diesen Vorgang gemeldet oder können ihn sehen. Zum
          Schutz der Historie kann er nicht gelöscht werden.
        </div>
      )}
      <PageHeader
        eyebrow={`${categories[item.item.category as keyof typeof categories] || item.item.category} · ${item.property?.name || "Allgemein"}${item.unit ? ` · ${item.unit.label}` : ""}`}
        title={item.item.title}
        description={item.item.description || ""}
        action={
          <Badge
            tone={
              item.item.status === "resolved"
                ? "success"
                : item.item.priority === "urgent"
                  ? "urgent"
                  : "warning"
            }
          >
            {item.item.status === "resolved"
              ? "Erledigt"
              : item.item.status === "scheduled"
                ? "Terminiert"
                : "Offen"}
          </Badge>
        }
      />
      <section className="source-metadata">
        <div>
          <span>Zuständig</span>
          <strong>
            {item.contact?.company || item.contact?.name || "Offen"}
          </strong>
        </div>
        <div>
          <span>Fällig</span>
          <strong>{item.item.dueAt?.toLocaleDateString("de-DE") || "–"}</strong>
        </div>
        <div>
          <span>Termin</span>
          <strong>
            {item.item.scheduledAt?.toLocaleDateString("de-DE") || "–"}
          </strong>
        </div>
        <div>
          <span>Kosten</span>
          <strong>
            {item.item.actualCostCents != null
              ? money.format(item.item.actualCostCents / 100)
              : item.item.estimatedCostCents != null
                ? `~ ${money.format(item.item.estimatedCostCents / 100)}`
                : "–"}
          </strong>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="detail-panel">
          <div className="panel-title">
            <h2>Verlauf</h2>
          </div>
          <ol className="ledger-list">
            {events.map((event) => (
              <li className="ledger-item" key={event.id}>
                <time className="ledger-time">
                  {event.createdAt.toLocaleDateString("de-DE")}
                </time>
                <div className="ledger-track">
                  <span className="ledger-node" />
                </div>
                <div className="ledger-copy">
                  <h3>
                    {event.type === "case.updated"
                      ? "Vorgang bearbeitet"
                      : event.type.replace("status.", "Status: ")}
                  </h3>
                  <p>{event.note || "Status aktualisiert"}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <form
          className="form-sheet compact-form"
          action={updateMaintenanceCase}
          id="case-edit"
        >
          <input type="hidden" name="id" value={caseId} />
          <div className="form-section-heading">
            <span>
              <CalendarClock size={16} />
            </span>
            <div>
              <h2>Vorgang bearbeiten</h2>
            </div>
          </div>
          <div className="form-grid">
            <label className="field wide">
              <span>Titel</span>
              <input name="title" defaultValue={item.item.title} required />
            </label>
            <label className="field">
              <span>Kategorie</span>
              <select name="category" defaultValue={item.item.category}>
                {Object.entries(categories).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Priorität</span>
              <select name="priority" defaultValue={item.item.priority}>
                <option value="normal">Normal</option>
                <option value="important">Wichtig</option>
                <option value="urgent">Dringend</option>
              </select>
            </label>
            <label className="field">
              <span>Objekt</span>
              <select
                name="propertyId"
                defaultValue={item.item.propertyId || ""}
              >
                <option value="">Keine Zuordnung</option>
                {propertyRows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Einheit</span>
              <select name="unitId" defaultValue={item.item.unitId || ""}>
                <option value="">Keine Zuordnung</option>
                {unitRows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Zuständig</span>
              <select
                name="assigneeContactId"
                defaultValue={item.item.assigneeContactId || ""}
              >
                <option value="">Noch offen</option>
                {contactRows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.company || row.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select name="status" defaultValue={item.item.status}>
                <option value="open">Offen</option>
                <option value="scheduled">Terminiert</option>
                <option value="resolved">Erledigt</option>
              </select>
            </label>
            <label className="field">
              <span>Fällig</span>
              <input
                type="date"
                name="dueAt"
                defaultValue={item.item.dueAt?.toISOString().slice(0, 10)}
              />
            </label>
            <label className="field">
              <span>Termin</span>
              <input
                type="date"
                name="scheduledAt"
                defaultValue={item.item.scheduledAt?.toISOString().slice(0, 10)}
              />
            </label>
            <label className="field">
              <span>Kostenschätzung €</span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="estimatedCost"
                defaultValue={
                  item.item.estimatedCostCents == null
                    ? ""
                    : item.item.estimatedCostCents / 100
                }
              />
            </label>
            <label className="field">
              <span>Tatsächliche Kosten €</span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="actualCost"
                defaultValue={
                  item.item.actualCostCents == null
                    ? ""
                    : item.item.actualCostCents / 100
                }
              />
            </label>
            <label className="field">
              <span>Wiederholung</span>
              <input
                name="recurrence"
                defaultValue={item.item.recurrence || ""}
              />
            </label>
            <label className="field wide">
              <span>Beschreibung</span>
              <textarea
                name="description"
                rows={3}
                defaultValue={item.item.description || ""}
              />
            </label>
            <label className="field wide">
              <span>Änderungsnotiz</span>
              <textarea
                name="note"
                rows={3}
                placeholder="Was wurde geändert?"
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn">Änderungen speichern</button>
          </div>
        </form>
      </div>
      <details className="danger-zone" id="case-delete">
        <summary>Vorgang löschen</summary>
        <p>
          Der Vorgang und sein interner Verlauf werden endgültig gelöscht.
          Meldungen aus dem Mieterportal sind davon ausgeschlossen.
        </p>
        <form action={deleteMaintenanceCase}>
          <input type="hidden" name="id" value={caseId} />
          <label className="field">
            <span>„VORGANG LÖSCHEN“ eingeben</span>
            <input
              name="confirmation"
              required
              pattern="VORGANG LÖSCHEN"
              autoComplete="off"
            />
          </label>
          <button className="btn danger">Endgültig löschen</button>
        </form>
      </details>
    </AppShell>
  );
}
