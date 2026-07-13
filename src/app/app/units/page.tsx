import Link from "next/link";
import { DoorOpen } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { listOrganizationUnits } from "@/repositories/portfolio";

export default async function UnitsPage({ searchParams }: { searchParams: Promise<{ property?: string; created?: string }> }) {
  const session = await requireSession();
  const query = await searchParams;
  const units = (await listOrganizationUnits(session.organizationId)).filter((unit) => !query.property || unit.propertyId === query.property);
  return <AppShell active="/app/properties"><PageHeader eyebrow="Portfolio" title="Wohneinheiten" description="Flächen und Grunddaten je Objekt – bereit für Mietverhältnisse und Mietspiegelmerkmale." action={<Link href="/app/units/new" className="btn">＋ Einheit anlegen</Link>} />{query.created === "1" && <div className="success-banner">Einheit wurde angelegt.</div>}{units.length ? <div className="table-wrap"><table className="data-table responsive-table"><thead><tr><th>Einheit</th><th>Objekt</th><th>Etage</th><th>Fläche</th><th>Zimmer</th><th>Status</th></tr></thead><tbody>{units.map((unit) => <tr key={unit.id}><td data-label="Einheit"><strong>{unit.label}</strong><small>{unit.city}</small></td><td data-label="Objekt">{unit.propertyName}</td><td data-label="Etage">{unit.floor || "–"}</td><td data-label="Fläche" className="tabular">{unit.areaSqm ? `${unit.areaSqm} m²` : "–"}</td><td data-label="Zimmer" className="tabular">{unit.roomsTimesTen ? (unit.roomsTimesTen / 10).toLocaleString("de-DE") : "–"}</td><td data-label="Status"><Badge tone={unit.areaSqm ? "success" : "warning"}>{unit.areaSqm ? "Grunddaten gepflegt" : "Daten ergänzen"}</Badge></td></tr>)}</tbody></table></div> : <section className="empty-state"><span className="empty-icon"><DoorOpen size={26} /></span><h2>Keine Einheiten gefunden</h2><p>Legen Sie zuerst ein Objekt oder eine zusätzliche Einheit an.</p><Link href="/app/units/new" className="btn">Einheit anlegen</Link></section>}</AppShell>;
}

