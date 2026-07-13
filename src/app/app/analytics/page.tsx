import { AlertTriangle, Banknote, Building2, CircleGauge, PiggyBank, Wrench } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AnalyticsCharts } from "@/components/analytics-charts";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { getAnalyticsData } from "@/repositories/analytics";
const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export default async function AnalyticsPage() {
  const session = await requireSession(); const data = await getAnalyticsData(session.organizationId); const occupancy = data.unitCount ? data.occupied / data.unitCount * 100 : 0;
  return <AppShell active="/app/analytics"><PageHeader eyebrow="Portfolio Intelligence" title="Analyse & Potenziale" description="Finanzen, Vermietung, Betriebskosten und Instandhaltung aus dem aktuellen Datenbestand." />
    <section className="kpi-grid analytics-kpis"><article><Banknote size={19}/><span>Jahreskaltmiete</span><strong>{money.format(data.annualRent)}</strong><small>{data.averageRentSqm.toFixed(2)} €/m² im Mittel</small></article><article><CircleGauge size={19}/><span>Zahlungsquote</span><strong>{data.collectionRate.toFixed(1)} %</strong><small>{money.format(data.arrears)} offen</small></article><article><Building2 size={19}/><span>Vermietungsstand</span><strong>{occupancy.toFixed(1)} %</strong><small>{data.occupied} von {data.unitCount} Einheiten</small></article><article><Wrench size={19}/><span>Offene Fälle</span><strong>{data.openCases}</strong><small>{data.urgentCases} dringend · Ø {data.resolutionDays.toFixed(0)} Tage</small></article><article><CircleGauge size={19}/><span>Datenqualität</span><strong>{data.completeness} %</strong><small>Fläche, Baujahr, Zielmiete, Lage</small></article></section>
    <AnalyticsCharts monthly={data.monthly} properties={data.properties} utility={data.utilityByCategory} arrearsAging={data.arrearsAging} maintenanceMonthly={data.maintenanceMonthly} costRatio={data.costRatioByProperty} />
    <div className="section-heading dossier-section-title"><div><span className="eyebrow">Handlungspotenziale</span><h2>Finanzielle Hebel</h2></div></div><div className="dashboard-grid analytics-potentials"><section className="potential"><PiggyBank size={21}/><span className="eyebrow">Leerstand</span><strong>{money.format(data.vacancyPotential)} / Monat</strong><p>Planmiete freier Einheiten</p></section><section className="potential"><PiggyBank size={21}/><span className="eyebrow">Zielmietendifferenz</span><strong>{money.format(data.rentGap)} / Monat</strong></section><section className="potential"><AlertTriangle size={21}/><span className="eyebrow">Betrieb & Wartung</span><strong>{money.format(data.utilityTotal + data.maintenanceCost)}</strong><p>Erfasste Gesamtkosten</p></section></div>
  </AppShell>;
}
