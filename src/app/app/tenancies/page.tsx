import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { tenancies } from "@/lib/demo-data";

export default async function TenanciesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const selected = (await searchParams).status ?? "current";
  const rows = selected === "review" ? tenancies.filter((row) => row.review === "Prüfung möglich") : selected === "archived" ? [] : tenancies;

  return <AppShell active="/app/tenancies">
    <PageHeader eyebrow="Bestand" title="Mietverhältnisse" description="Laufende Verträge, Miethöhen und der nachvollziehbare Status möglicher Mietprüfungen." action={<Link className="btn" href="/share/demo">Mieteransicht öffnen</Link>} />
    <div className="filter-row"><nav className="filter-tabs" aria-label="Mietverhältnisfilter"><Link className={`filter-tab ${selected === "current" ? "active" : ""}`} href="/app/tenancies">Aktuell (7)</Link><Link className={`filter-tab ${selected === "review" ? "active" : ""}`} href="/app/tenancies?status=review">Prüfung möglich (3)</Link><Link className={`filter-tab ${selected === "archived" ? "active" : ""}`} href="/app/tenancies?status=archived">Archiviert</Link></nav><span className="count-note">Alle Namen sind fiktiv</span></div>
    {rows.length ? <div className="table-wrap"><table className="data-table responsive-table"><thead><tr><th>Mieter:in</th><th>Einheit</th><th>Mietbeginn</th><th>Fläche</th><th className="align-right">Kaltmiete</th><th>Prüfstatus</th></tr></thead><tbody>{rows.map((row) => <tr key={row.tenant}><td data-label="Mieter:in"><strong>{row.tenant}</strong><small>Fiktiver Demo-Datensatz</small></td><td data-label="Einheit">{row.unit}</td><td data-label="Mietbeginn" className="tabular">{row.start}</td><td data-label="Fläche" className="tabular">{row.sqm}</td><td data-label="Kaltmiete" className="align-right tabular"><strong>{row.rent}</strong></td><td data-label="Prüfstatus"><Badge tone={row.tone}>{row.review}</Badge></td></tr>)}</tbody></table></div> : <section className="feature-status"><span className="eyebrow">Keine Einträge</span><h2>Keine archivierten Mietverhältnisse</h2><p>Beendete Verträge werden später hier nachvollziehbar und getrennt vom aktiven Bestand aufgeführt.</p></section>}
  </AppShell>;
}
