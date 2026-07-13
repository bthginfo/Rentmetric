import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader, SectionHeading } from "@/components/ui";
import { requireSession } from "@/auth/session";

const bars = [42, 55, 51, 62, 58, 70, 68, 73, 75, 79, 77, 82];

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = session.displayName?.split(/\s+/)[0] || "willkommen";
  return (
    <AppShell active="/app/dashboard">
      <PageHeader eyebrow="Montag, 13. Juli 2026" title={`Guten Morgen, ${firstName}.`} description="Diese Vorschau zeigt, wie Rentmetric Handlungsbedarf in Ihrem Arbeitsbereich priorisiert." action={<Link href="/app/tasks" className="btn">Alle Aufgaben ansehen</Link>} />
      <nav className="period-control" aria-label="Auswertungszeitraum"><span className="active">Juli</span><span>Quartal</span><span>2026</span></nav>
      <section className="kpi-strip" aria-label="Portfolio-Kennzahlen">
        <div className="kpi"><span className="kpi-label">Sollmiete Juli</span><strong className="kpi-value tabular">7.420 €</strong><span className="kpi-meta">+1,8 %</span></div>
        <div className="kpi"><span className="kpi-label">Eingegangen</span><strong className="kpi-value tabular">6.240 €</strong><span className="kpi-meta">84 %</span></div>
        <div className="kpi"><span className="kpi-label">Vermietungsstand</span><strong className="kpi-value tabular">7 / 8</strong><span className="kpi-meta">87,5 %</span></div>
        <div className="kpi"><span className="kpi-label">Offene Aufgaben</span><strong className="kpi-value tabular">6</strong><span className="kpi-meta">2 heute</span></div>
      </section>

      <div className="dashboard-grid">
        <section className="cash-panel" aria-labelledby="cashflow-title">
          <SectionHeading title="Miet-Cashflow" linkLabel="Letzte 12 Monate" />
          <div className="cash-total"><strong className="tabular">86.480 €</strong><span>+ 2.940 € zum Vorjahr</span></div>
          <p className="muted" style={{ fontSize: ".72rem", margin: 0 }}>Nettokaltmieten, Sollstellung · fiktive Demodaten</p>
          <div className="chart" aria-label="Balkendiagramm der monatlichen Sollmieten von August 2025 bis Juli 2026">
            {bars.map((height, index) => <div key={index} className={`chart-col ${index === bars.length - 1 ? "current" : ""}`} style={{ height: `${height}%` }} title={`${height}%`} />)}
          </div>
          <div className="chart-labels"><span>Aug. 25</span><span>Nov.</span><span>Feb. 26</span><span>Mai</span><span>Juli</span></div>
        </section>
        <aside className="dashboard-side">
          <section className="health-card"><div className="health-ring large"><span>88<small>%</small></span></div><div><span className="eyebrow">Portfolio Health</span><h2>Gut aufgestellt</h2><p>Sieben von acht Einheiten sind vermietet. Zwei Hinweise benötigen heute Aufmerksamkeit.</p></div></section>
          <section><SectionHeading title="Portfolio kompakt" href="/app/properties" linkLabel="Portfolio" /><div className="stat-list"><div className="stat-row"><span>Immobilien</span><strong>2</strong></div><div className="stat-row"><span>Wohnfläche</span><strong className="tabular">656 m²</strong></div><div className="stat-row"><span>Monatliche Kaltmiete</span><strong className="tabular">7.420 €</strong></div><div className="stat-row"><span>Ø Miete je m²</span><strong className="tabular">11,31 €</strong></div></div></section>
          <section className="potential"><span className="eyebrow">Erkanntes Mietpotenzial</span><strong className="tabular">+ 185 € / Monat</strong><p className="muted" style={{ fontSize: ".72rem", lineHeight: 1.5, margin: 0 }}>Bei drei Mietverhältnissen lohnt sich eine fachliche Prüfung.</p><div className="source-line"><span className="status-dot" /> 2 Quellen aktuell · 1 in Prüfung</div></section>
        </aside>
      </div>

      <section className="ledger daily-briefing" aria-labelledby="ledger-title">
        <div className="briefing-head"><div><span className="eyebrow">Ihr tägliches Briefing</span><h2 id="ledger-title">Heute im Blick</h2><p>4 Hinweise aus Zahlungen, Fristen, Dokumenten und Mietprüfungen.</p></div><div className="status-rail" aria-label="Status: eine dringende, zwei anstehende und eine kontrollierte Aufgabe"><i className="urgent" /><i className="warning" /><i className="warning" /><i className="success" /></div><Link href="/app/tasks" className="btn btn-primary">Aktionscenter öffnen</Link></div>
        <ol className="ledger-list">
          <li className="ledger-item"><time className="ledger-time">Heute<br />09:00</time><div className="ledger-track"><span className="ledger-node urgent" /></div><div className="ledger-copy"><h3>Mieteingang nicht zugeordnet</h3><p>Rheinblick · 1. OG · Der Juli-Eingang von Rosa Beispielfrau fehlt noch.</p></div><div className="ledger-side"><strong className="tabular">1.180,00 €</strong><Badge tone="urgent">Dringend</Badge></div></li>
          <li className="ledger-item"><time className="ledger-time">Heute<br />Prüfen</time><div className="ledger-track"><span className="ledger-node amber" /></div><div className="ledger-copy"><h3>Mietprüfung kann vorbereitet werden</h3><p>Kastanienhof · EG links · 38 Monate seit letzter Anpassung. Kappungsgrenze und Vergleichsmiete bitte fachlich prüfen.</p></div><div className="ledger-side"><strong className="tabular">+ 72 € / Mon.</strong><Badge tone="warning">Potenzial</Badge></div></li>
          <li className="ledger-item"><time className="ledger-time">18. Juli<br />Frist</time><div className="ledger-track"><span className="ledger-node amber" /></div><div className="ledger-copy"><h3>Rauchwarnmelder-Wartung terminieren</h3><p>Kastanienhof · fünf Einheiten · Termin und späteren Nachweis dokumentieren.</p></div><div className="ledger-side"><Badge tone="warning">5 Tage</Badge></div></li>
          <li className="ledger-item"><time className="ledger-time">22. Juli<br />Quelle</time><div className="ledger-track"><span className="ledger-node" /></div><div className="ledger-copy"><h3>Mietspiegel Köln 2025 prüfen</h3><p>Neue strukturierte Quelle importiert. Sie wird erst nach Ihrer fachlichen Freigabe für Bewertungen verwendet.</p></div><div className="ledger-side"><Badge tone="success">Kontrolliert</Badge></div></li>
        </ol>
      </section>
    </AppShell>
  );
}
