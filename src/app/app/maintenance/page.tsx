import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { maintenanceCases } from "@/db/schema";
import {
  listOrganizationProperties,
  listOrganizationUnits,
} from "@/repositories/portfolio";
import { createMaintenance, resolveMaintenance } from "./actions";
export default async function MaintenancePage() {
  const session = await requireSession();
  const [items, properties, units] = await Promise.all([
    getDb()
      .select()
      .from(maintenanceCases)
      .where(eq(maintenanceCases.organizationId, session.organizationId))
      .orderBy(desc(maintenanceCases.createdAt)),
    listOrganizationProperties(session.organizationId),
    listOrganizationUnits(session.organizationId),
  ]);
  const labels = new Map([
    ...properties.map((item) => [item.id, item.name] as const),
    ...units.map(
      (item) => [item.id, `${item.propertyName} · ${item.label}`] as const,
    ),
  ]);
  return (
    <AppShell active="/app/maintenance">
      <PageHeader
        eyebrow="Betrieb"
        title="Wartung & Fälle"
        description="Mängel, Reparaturen und wiederkehrende Wartung nachvollziehbar bearbeiten."
      />
      <form action={createMaintenance} className="form-sheet compact-form">
        <div className="form-grid">
          <label className="field">
            <span>Titel</span>
            <input name="title" required />
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
            <span>Objekt</span>
            <select name="propertyId">
              <option value="">Ohne Zuordnung</option>
              {properties.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Einheit</span>
            <select name="unitId">
              <option value="">Ohne Zuordnung</option>
              {units.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.propertyName} · {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fällig</span>
            <input type="date" name="dueAt" />
          </label>
          <label className="field wide">
            <span>Beschreibung</span>
            <textarea name="description" rows={2} />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn">Fall anlegen</button>
        </div>
      </form>
      <div className="section-heading dossier-section-title">
        <div>
          <span className="eyebrow">Falljournal</span>
          <h2>{items.length} Vorgänge</h2>
        </div>
      </div>
      {items.length ? (
        <div className="task-list">
          {items.map((item, i) => (
            <article className="task-item" key={item.id}>
              <span className="task-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="task-copy">
                <h3>{item.title}</h3>
                <p>
                  {item.description || "Keine Beschreibung"} ·{" "}
                  {labels.get(item.unitId || item.propertyId || "") ||
                    "ohne Zuordnung"}
                </p>
              </div>
              <div className="task-meta">
                <Badge
                  tone={
                    item.status === "resolved"
                      ? "success"
                      : item.priority === "urgent"
                        ? "urgent"
                        : "warning"
                  }
                >
                  {item.status === "resolved" ? "Erledigt" : item.priority}
                </Badge>
                {item.status !== "resolved" && (
                  <form action={resolveMaintenance}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="task-action">Erledigen</button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="feature-status">
          <h2>Keine offenen Fälle</h2>
        </section>
      )}
    </AppShell>
  );
}
