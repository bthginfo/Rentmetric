import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader, SectionHeading } from "@/components/ui";
import { ensureSmartTasks } from "@/lib/smart-tasks";
import { getDashboardData } from "@/repositories/dashboard";

const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
});

export default async function DashboardPage() {
  const session = await requireSession();
  await ensureSmartTasks(session.organizationId);
  const data = await getDashboardData(session.organizationId);
  const firstName = session.displayName?.split(/\s+/)[0] || "willkommen";
  const occupancy = data.unitCount
    ? Math.round((data.occupied / data.unitCount) * 100)
    : 0;
  const collection = data.due ? Math.round((data.paid / data.due) * 100) : 0;
  const maxChart = Math.max(...data.chart.map((point) => point.value), 1);
  const health = Math.round((occupancy + Math.min(100, collection || 100)) / 2);
  return (
    <AppShell active="/app/dashboard">
      <PageHeader
        eyebrow={format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
        title={`Guten Morgen, ${firstName}.`}
        description="Ihr Arbeitsbereich auf Basis der aktuell gespeicherten Verträge, Zahlungen und Fristen."
        action={
          <Link href="/app/tasks" className="btn">
            Alle Aufgaben ansehen
          </Link>
        }
      />
      <section className="kpi-strip" aria-label="Portfolio-Kennzahlen">
        <div className="kpi">
          <span className="kpi-label">Sollmiete aktuell</span>
          <strong className="kpi-value tabular">
            {money.format(data.due / 100)}
          </strong>
          <span className="kpi-meta">{data.unitCount} Einheiten</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Eingegangen</span>
          <strong className="kpi-value tabular">
            {money.format(data.paid / 100)}
          </strong>
          <span className="kpi-meta">{collection} %</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Vermietungsstand</span>
          <strong className="kpi-value tabular">
            {data.occupied} / {data.unitCount}
          </strong>
          <span className="kpi-meta">{occupancy} %</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Offene Aufgaben</span>
          <strong className="kpi-value tabular">{data.openTasks}</strong>
          <span className="kpi-meta">regelbasiert aktualisiert</span>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="cash-panel" aria-labelledby="cashflow-title">
          <SectionHeading
            title="Miet-Sollstellungen"
            linkLabel="Letzte 12 Monate"
          />
          <div className="cash-total">
            <strong className="tabular">
              {money.format(
                data.chart.reduce((sum, point) => sum + point.value, 0) / 100,
              )}
            </strong>
            <span>aus gespeicherten Zahlungen</span>
          </div>
          <p className="muted" style={{ fontSize: ".72rem", margin: 0 }}>
            Keine Hochrechnung und keine fiktiven Werte.
          </p>
          <div className="chart" aria-label="Monatliche Sollstellungen">
            {data.chart.map((point) => (
              <div
                key={point.date.toISOString()}
                className={`chart-col ${point.date.getMonth() === new Date().getMonth() ? "current" : ""}`}
                style={{
                  height: `${Math.max(3, (point.value / maxChart) * 100)}%`,
                }}
                title={`${format(point.date, "MMMM yyyy", { locale: de })}: ${money.format(point.value / 100)}`}
              />
            ))}
          </div>
          <div className="chart-labels">
            <span>{format(data.chart[0].date, "MMM yy", { locale: de })}</span>
            <span>{format(data.chart[3].date, "MMM", { locale: de })}</span>
            <span>{format(data.chart[6].date, "MMM yy", { locale: de })}</span>
            <span>{format(data.chart[9].date, "MMM", { locale: de })}</span>
            <span>{format(data.chart[11].date, "MMM", { locale: de })}</span>
          </div>
        </section>
        <aside className="dashboard-side">
          <section className="health-card">
            <div className="health-ring large">
              <span>
                {health}
                <small>%</small>
              </span>
            </div>
            <div>
              <span className="eyebrow">Portfolio-Status</span>
              <h2>
                {health >= 80
                  ? "Gut aufgestellt"
                  : health >= 60
                    ? "Im Blick behalten"
                    : "Handlungsbedarf"}
              </h2>
              <p>
                {data.occupied} von {data.unitCount} Einheiten sind vermietet.{" "}
                {data.openTasks} Aufgaben sind offen.
              </p>
            </div>
          </section>
          <section>
            <SectionHeading
              title="Portfolio kompakt"
              href="/app/properties"
              linkLabel="Portfolio"
            />
            <div className="stat-list">
              <div className="stat-row">
                <span>Immobilien</span>
                <strong>{data.propertyCount}</strong>
              </div>
              <div className="stat-row">
                <span>Wohnfläche</span>
                <strong className="tabular">
                  {data.area.toLocaleString("de-DE")} m²
                </strong>
              </div>
              <div className="stat-row">
                <span>Monatliche Kaltmiete</span>
                <strong className="tabular">
                  {money.format(data.currentRent / 100)}
                </strong>
              </div>
              <div className="stat-row">
                <span>Ø Miete je m²</span>
                <strong className="tabular">
                  {data.area
                    ? money.format(data.currentRent / data.area / 100)
                    : "–"}
                </strong>
              </div>
            </div>
          </section>
          <section className="potential">
            <span className="eyebrow">Mietanpassungs-Prüfung</span>
            <strong>{data.reviewable} Mietverhältnisse</strong>
            <p
              className="muted"
              style={{ fontSize: ".72rem", lineHeight: 1.5, margin: 0 }}
            >
              Zeitlicher Prüfanlass erkannt; rechtliche und fachliche Prüfung
              bleibt erforderlich.
            </p>
            <div className="source-line">
              <span className="status-dot" /> {data.activeSources} Quellen aktiv
              · {data.reviewImports} in Prüfung
            </div>
          </section>
        </aside>
      </div>
      <section className="ledger daily-briefing" aria-labelledby="ledger-title">
        <div className="briefing-head">
          <div>
            <span className="eyebrow">Ihr tägliches Briefing</span>
            <h2 id="ledger-title">Jetzt im Blick</h2>
            <p>{data.tasks.length} priorisierte Hinweise aus Ihren Daten.</p>
          </div>
          <Link href="/app/tasks" className="btn btn-primary">
            Aktionscenter öffnen
          </Link>
        </div>
        {data.tasks.length ? (
          <ol className="ledger-list">
            {data.tasks.slice(0, 4).map((task) => (
              <li className="ledger-item" key={task.id}>
                <time className="ledger-time">
                  {task.dueAt ? date.format(task.dueAt) : "Offen"}
                </time>
                <div className="ledger-track">
                  <span
                    className={`ledger-node ${task.severity === "urgent" ? "urgent" : task.severity === "warning" ? "amber" : ""}`}
                  />
                </div>
                <div className="ledger-copy">
                  <h3>{task.title}</h3>
                  <p>{task.description || "Keine zusätzliche Beschreibung."}</p>
                </div>
                <div className="ledger-side">
                  <Badge
                    tone={
                      task.severity === "urgent"
                        ? "urgent"
                        : task.severity === "warning"
                          ? "warning"
                          : "success"
                    }
                  >
                    {task.sourceType === "manual" ? "Manuell" : "Automatisch"}
                  </Badge>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="feature-status">
            <h2>Keine offenen Aufgaben</h2>
            <p>Aktuell wurde kein Handlungsbedarf erkannt.</p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
