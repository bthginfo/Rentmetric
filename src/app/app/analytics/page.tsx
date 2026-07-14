import { AlertTriangle, Banknote, Building2, CircleGauge, PiggyBank, Wrench } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { requireSession } from "@/auth/session";
import { AnalyticsCharts } from "@/components/analytics-charts";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { parseAnalyticsRange } from "@/domain/analytics-range";
import { getAnalyticsData } from "@/repositories/analytics";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const presets = [["30d", "30 Tage"], ["90d", "90 Tage"], ["year", "Dieses Jahr"], ["previous-year", "Vorjahr"], ["12m", "12 Monate"], ["custom", "Eigener Zeitraum"]] as const;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const params = await searchParams;
  const range = parseAnalyticsRange(params);
  const data = await getAnalyticsData(session.organizationId, range);
  const occupancy = data.unitCount ? data.occupied / data.unitCount * 100 : 0;
  const query = (key: string) => `/app/analytics?range=${key}${range.compare ? "&compare=previous" : ""}`;
  const fromValue = typeof params.from === "string" ? params.from : range.from.toISOString().slice(0, 10);
  const toValue = typeof params.to === "string" ? params.to : range.to.toISOString().slice(0, 10);
  return <AppShell active="/app/analytics">
    <PageHeader eyebrow="Portfolio Intelligence" title="Analyse & Potenziale" description="Finanzen, Vermietung, Betriebskosten und Instandhaltung im gewählten Zeitraum." />
    <section className="analytics-range-panel" aria-labelledby="analytics-range-title">
      <div><span className="eyebrow">Auswertungszeitraum</span><h2 id="analytics-range-title">{range.label}</h2><p>Flusskennzahlen werden gefiltert; Bestandswerte zeigen den Stand am Periodenende.</p></div>
      <nav className="analytics-presets" aria-label="Zeitraum wählen">{presets.map(([key, label]) => <Link key={key} href={query(key)} className={range.key === key ? "active" : ""} aria-current={range.key === key ? "page" : undefined}>{label}</Link>)}</nav>
      <Form action="/app/analytics" className="analytics-custom-range">
        <input type="hidden" name="range" value={range.key === "custom" ? "custom" : range.key} />
        <label><span>Von</span><input name="from" type="date" defaultValue={fromValue} disabled={range.key !== "custom"} /></label>
        <label><span>Bis</span><input name="to" type="date" defaultValue={toValue} disabled={range.key !== "custom"} /></label>
        <label className="analytics-compare"><input type="checkbox" name="compare" value="previous" defaultChecked={range.compare} /> Mit vorherigem Zeitraum vergleichen</label>
        <button className="btn btn-primary">Anwenden</button>
      </Form>
      {range.error && <p className="error-banner" role="alert">{range.error}</p>}
    </section>
    {data.comparison && <section className="analytics-comparison" aria-label="Vergleich zum vorherigen Zeitraum"><div><span>Vorheriges Soll</span><strong>{money.format(data.comparison.due)}</strong><small>{data.comparison.dueDelta === null ? "Kein sinnvoller Prozentvergleich" : `${data.comparison.dueDelta >= 0 ? "+" : ""}${data.comparison.dueDelta.toFixed(1)} %`}</small></div><div><span>Vorheriger Eingang</span><strong>{money.format(data.comparison.paid)}</strong><small>{data.comparison.paidDelta === null ? "Kein sinnvoller Prozentvergleich" : `${data.comparison.paidDelta >= 0 ? "+" : ""}${data.comparison.paidDelta.toFixed(1)} %`}</small></div><p>Vergleich: {range.comparison?.label}</p></section>}
    <section className="kpi-grid analytics-kpis"><article><Banknote size={19}/><span>Jahreskaltmiete <em>aktuell</em></span><strong>{money.format(data.annualRent)}</strong><small>{data.averageRentSqm.toFixed(2)} €/m² im Mittel</small></article><article><CircleGauge size={19}/><span>Zahlungsquote</span><strong>{data.collectionRate.toFixed(1)} %</strong><small>{money.format(data.arrears)} offen zum Periodenende</small></article><article><Building2 size={19}/><span>Vermietungsstand <em>Periodenende</em></span><strong>{occupancy.toFixed(1)} %</strong><small>{data.occupied} von {data.unitCount} Einheiten</small></article><article><Wrench size={19}/><span>Fälle im Zeitraum</span><strong>{data.openCases}</strong><small>{data.urgentCases} dringend · Ø {data.resolutionDays.toFixed(0)} Tage</small></article><article><CircleGauge size={19}/><span>Datenqualität <em>aktuell</em></span><strong>{data.completeness} %</strong><small>Fläche, Baujahr, Zielmiete, Lage</small></article></section>
    <AnalyticsCharts periodLabel={range.label} monthly={data.monthly} properties={data.properties} utility={data.utilityByCategory} arrearsAging={data.arrearsAging} maintenanceMonthly={data.maintenanceMonthly} costRatio={data.costRatioByProperty} />
    <div className="section-heading dossier-section-title"><div><span className="eyebrow">Handlungspotenziale</span><h2>Finanzielle Hebel</h2></div></div><div className="dashboard-grid analytics-potentials"><section className="potential"><PiggyBank size={21}/><span className="eyebrow">Leerstand · aktuell</span><strong>{money.format(data.vacancyPotential)} / Monat</strong><p>Planmiete freier Einheiten</p></section><section className="potential"><PiggyBank size={21}/><span className="eyebrow">Zielmietendifferenz · aktuell</span><strong>{money.format(data.rentGap)} / Monat</strong></section><section className="potential"><AlertTriangle size={21}/><span className="eyebrow">Betrieb & Wartung · Zeitraum</span><strong>{money.format(data.utilityTotal + data.maintenanceCost)}</strong><p>Erfasste Kosten im gewählten Zeitraum</p></section></div>
  </AppShell>;
}
