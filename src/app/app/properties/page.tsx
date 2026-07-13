import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { properties } from "@/lib/demo-data";

const filters = [
  { key: "all", label: "Alle Objekte" },
  { key: "full", label: "Voll vermietet" },
  { key: "vacancy", label: "Mit Leerstand" },
] as const;

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const selected = (await searchParams).status ?? "all";
  const rows = properties.filter((property) => selected === "all" || (selected === "full" ? property.occupied === property.units : property.occupied < property.units));

  return <AppShell active="/app/properties">
    <PageHeader eyebrow="Portfolio" title="Immobilien" description="Zwei Häuser, acht Einheiten und alle wichtigen Kennzahlen in einer klaren Bestandsansicht." action={<span className="availability-note">Objekterfassung wird im nächsten Ausbau freigeschaltet.</span>} />
    <div className="filter-row"><nav className="filter-tabs" aria-label="Portfoliofilter">{filters.map((filter) => <Link key={filter.key} className={`filter-tab ${selected === filter.key ? "active" : ""}`} aria-current={selected === filter.key ? "page" : undefined} href={filter.key === "all" ? "/app/properties" : `/app/properties?status=${filter.key}`}>{filter.label}</Link>)}</nav><span className="count-note">{rows.length} Objekte · 8 Einheiten gesamt</span></div>
    <div className="table-wrap"><table className="data-table responsive-table"><thead><tr><th>Objekt</th><th>Belegung</th><th>Monatliche Kaltmiete</th><th>Schätzwert</th><th>Status</th><th></th></tr></thead><tbody>{rows.map((property) => <tr key={property.name}><td data-label="Objekt"><strong>{property.name}</strong><small>{property.address}</small></td><td data-label="Belegung" className="tabular"><strong>{property.occupied} / {property.units}</strong><small>Einheiten belegt</small></td><td data-label="Monatliche Kaltmiete" className="tabular">{property.rent}</td><td data-label="Schätzwert" className="tabular">{property.value}</td><td data-label="Status"><Badge tone={property.occupied === property.units ? "success" : "warning"}>{property.status}</Badge></td><td data-label="Einheiten" className="align-right"><Link className="table-link" href="/app/tenancies">Mietverhältnisse →</Link></td></tr>)}</tbody></table></div>
  </AppShell>;
}
