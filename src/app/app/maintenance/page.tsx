import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import {
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Wrench,
} from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { contacts, maintenanceCases } from "@/db/schema";
import {
  listOrganizationProperties,
  listOrganizationUnits,
} from "@/repositories/portfolio";
import { createMaintenance } from "./actions";
const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const categoryLabels: Record<string, string> = {
  repair: "Reparatur",
  maintenance: "Wartung",
  damage: "Schaden",
  inspection: "Prüfung",
  complaint: "Meldung",
};
export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    new?: string;
    error?: string;
    created?: string;
    deleted?: string;
  }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const [items, properties, units, contactRows] = await Promise.all([
    getDb()
      .select()
      .from(maintenanceCases)
      .where(eq(maintenanceCases.organizationId, session.organizationId))
      .orderBy(desc(maintenanceCases.createdAt)),
    listOrganizationProperties(session.organizationId),
    listOrganizationUnits(session.organizationId),
    getDb()
      .select()
      .from(contacts)
      .where(eq(contacts.organizationId, session.organizationId)),
  ]);
  const visible =
    query.status && query.status !== "all"
      ? items.filter((item) => item.status === query.status)
      : items;
  const labels = new Map([
    ...properties.map((item) => [item.id, item.name] as const),
    ...units.map(
      (item) => [item.id, `${item.propertyName} · ${item.label}`] as const,
    ),
  ]);
  const names = new Map(
    contactRows.map((item) => [item.id, item.company || item.name]),
  );
  const estimated = items
    .filter((item) => item.status !== "resolved")
    .reduce((sum, item) => sum + (item.estimatedCostCents || 0), 0);
  const overdue = items.filter(
    (item) =>
      item.status !== "resolved" && item.dueAt && item.dueAt < new Date(),
  ).length;
  const activeFilter =
    query.status && query.status !== "all" ? query.status : "all";
  const emptyCopy =
    activeFilter === "all"
      ? "Noch keine Wartungen oder Meldungen erfasst. Lege den ersten Vorgang an, um Termine, Zuständigkeiten und Kosten zentral nachzuverfolgen."
      : `Keine ${activeFilter === "open" ? "offenen" : activeFilter === "scheduled" ? "terminierten" : "erledigten"} Vorgänge für diesen Filter.`;
  return (
    <AppShell active="/app/maintenance">
      {query.error === "relations" && (
        <div className="error-banner" role="alert">
          Objekt, Einheit oder Zuständigkeit passen nicht zu diesem
          Arbeitsbereich. Bitte Auswahl prüfen.
        </div>
      )}
      {query.error === "invalid" && (
        <div className="error-banner" role="alert">
          Einige Angaben fehlen oder sind ungültig. Bitte Formular prüfen.
        </div>
      )}
      {query.created === "1" && (
        <div className="success-banner" role="status">
          Vorgang wurde angelegt.
        </div>
      )}
      {query.deleted === "1" && (
        <div className="success-banner" role="status">
          Vorgang wurde gelöscht.
        </div>
      )}
      <PageHeader
        eyebrow="Betrieb & Service"
        title="Wartungen & Fälle"
        description="Meldungen, Reparaturen, Termine, Zuständigkeiten und Kosten."
      />
      <section className="kpi-grid">
        <article>
          <Wrench size={19} />
          <span>Offen</span>
          <strong>
            {items.filter((item) => item.status !== "resolved").length}
          </strong>
          <small>
            {
              items.filter(
                (item) =>
                  item.priority === "urgent" && item.status !== "resolved",
              ).length
            }{" "}
            dringend
          </small>
        </article>
        <article>
          <CalendarClock size={19} />
          <span>Überfällig</span>
          <strong>{overdue}</strong>
          <small>Fälligkeit überschritten</small>
        </article>
        <article>
          <CircleDollarSign size={19} />
          <span>Kostenschätzung</span>
          <strong>{money.format(estimated / 100)}</strong>
          <small>offene Vorgänge</small>
        </article>
        <article>
          <CheckCircle2 size={19} />
          <span>Erledigt</span>
          <strong>
            {items.filter((item) => item.status === "resolved").length}
          </strong>
          <small>mit Verlauf</small>
        </article>
      </section>
      <details
        className="detail-panel create-drawer"
        id="maintenance-create"
        open={query.new === "1"}
      >
        <summary className="btn">Neuen Vorgang anlegen</summary>
        <form action={createMaintenance} className="compact-form">
          <div className="form-grid">
            <label className="field wide">
              <span>Titel</span>
              <input name="title" required />
            </label>
            <label className="field">
              <span>Kategorie</span>
              <select name="category">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Priorität</span>
              <select name="priority">
                <option value="normal">Normal</option>
                <option value="important">Wichtig</option>
                <option value="urgent">Dringend</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label-with-action">
                Objekt{" "}
                <Link href="/app/properties/new" target="_blank">
                  Neu ↗
                </Link>
              </span>
              <select name="propertyId">
                <option value="">Keine Zuordnung</option>
                {properties.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label-with-action">
                Einheit{" "}
                <Link href="/app/units/new" target="_blank">
                  Neu ↗
                </Link>
              </span>
              <select name="unitId">
                <option value="">Keine Zuordnung</option>
                {units.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.propertyName} · {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label-with-action">
                Zuständig{" "}
                <Link href="/app/contacts#contact-create" target="_blank">
                  Kontakt anlegen ↗
                </Link>
              </span>
              <select name="assigneeContactId">
                <option value="">Noch offen</option>
                {contactRows.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.company || item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Fällig</span>
              <input type="date" name="dueAt" />
            </label>
            <label className="field">
              <span>Termin</span>
              <input type="date" name="scheduledAt" />
            </label>
            <label className="field">
              <span>Kostenschätzung €</span>
              <input type="number" step="0.01" min="0" name="estimatedCost" />
            </label>
            <label className="field">
              <span>Wiederholung</span>
              <input name="recurrence" placeholder="z. B. jährlich" />
            </label>
            <label className="field wide">
              <span>Beschreibung</span>
              <textarea name="description" rows={3} />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn">Vorgang anlegen</button>
          </div>
        </form>
      </details>
      <nav className="filter-tabs">
        <Link
          className={!query.status || query.status === "all" ? "active" : ""}
          href="/app/maintenance?status=all"
        >
          Alle
        </Link>
        <Link
          className={query.status === "open" ? "active" : ""}
          href="/app/maintenance?status=open"
        >
          Offen
        </Link>
        <Link
          className={query.status === "scheduled" ? "active" : ""}
          href="/app/maintenance?status=scheduled"
        >
          Terminiert
        </Link>
        <Link
          className={query.status === "resolved" ? "active" : ""}
          href="/app/maintenance?status=resolved"
        >
          Erledigt
        </Link>
      </nav>
      {visible.length ? (
        <div className="task-list">
          {visible.map((item, index) => (
            <Link
              href={`/app/maintenance/${item.id}`}
              className="task-item"
              key={item.id}
            >
              <span className="task-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="task-copy">
                <span className="eyebrow">
                  {categoryLabels[item.category]} ·{" "}
                  {labels.get(item.unitId || item.propertyId || "") ||
                    "Allgemein"}
                </span>
                <h3>{item.title}</h3>
                <p>
                  {names.get(item.assigneeContactId || "") ||
                    "Noch nicht zugewiesen"}
                  {item.dueAt
                    ? ` · fällig ${item.dueAt.toLocaleDateString("de-DE")}`
                    : ""}
                </p>
              </div>
              <div className="task-meta maintenance-task-meta">
                <Badge
                  tone={
                    item.status === "resolved"
                      ? "success"
                      : item.priority === "urgent"
                        ? "urgent"
                        : "warning"
                  }
                >
                  {item.status === "resolved"
                    ? "Erledigt"
                    : item.status === "scheduled"
                      ? "Terminiert"
                      : item.priority === "urgent"
                        ? "Dringend"
                        : "Offen"}
                </Badge>
                {(item.actualCostCents != null ||
                  item.estimatedCostCents != null) && (
                  <strong>
                    {item.actualCostCents != null
                      ? money.format(item.actualCostCents / 100)
                      : `~ ${money.format((item.estimatedCostCents || 0) / 100)}`}
                  </strong>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="empty-state maintenance-empty" aria-live="polite">
          <span className="empty-icon">
            {activeFilter === "resolved" ? (
              <CheckCircle2 size={24} />
            ) : (
              <Wrench size={24} />
            )}
          </span>
          <span className="eyebrow">Aktueller Filter</span>
          <h2>Keine Vorgänge</h2>
          <p>{emptyCopy}</p>
          <Link
            className="btn btn-quiet"
            href={`/app/maintenance?status=${activeFilter}&new=1#maintenance-create`}
          >
            Ersten Vorgang anlegen
          </Link>
        </section>
      )}
    </AppShell>
  );
}
