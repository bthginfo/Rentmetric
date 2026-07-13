import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { getDashboardData } from "@/repositories/dashboard";
const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
export default async function AnalyticsPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.organizationId);
  const vacancy = data.unitCount - data.occupied;
  return (
    <AppShell active="/app/analytics">
      <PageHeader
        eyebrow="Auswertung"
        title="Portfolio-Analyse"
        description="Verdichtete Kennzahlen ausschließlich aus den gespeicherten Bestandsdaten."
      />
      <section className="kpi-strip">
        <div className="kpi">
          <span className="kpi-label">Kaltmiete / Monat</span>
          <strong className="kpi-value">
            {money.format(data.currentRent / 100)}
          </strong>
        </div>
        <div className="kpi">
          <span className="kpi-label">Miete je m²</span>
          <strong className="kpi-value">
            {data.area ? money.format(data.currentRent / data.area / 100) : "–"}
          </strong>
        </div>
        <div className="kpi">
          <span className="kpi-label">Leerstand</span>
          <strong className="kpi-value">{vacancy}</strong>
          <span className="kpi-meta">von {data.unitCount} Einheiten</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Prüfanlässe</span>
          <strong className="kpi-value">{data.reviewable}</strong>
        </div>
      </section>
      <section className="detail-panel">
        <div className="panel-title">
          <h2>Datenqualität &amp; Einordnung</h2>
        </div>
        <dl className="detail-list">
          <div>
            <dt>Immobilien</dt>
            <dd>{data.propertyCount}</dd>
          </div>
          <div>
            <dt>Erfasste Wohnfläche</dt>
            <dd>{data.area.toLocaleString("de-DE")} m²</dd>
          </div>
          <div>
            <dt>Aktive Mietspiegelquellen</dt>
            <dd>{data.activeSources}</dd>
          </div>
          <div>
            <dt>Quellen in Prüfung</dt>
            <dd>{data.reviewImports}</dd>
          </div>
          <div>
            <dt>Offene Aufgaben</dt>
            <dd>{data.openTasks}</dd>
          </div>
        </dl>
      </section>
    </AppShell>
  );
}
