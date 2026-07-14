import Link from "next/link";
import { ChevronRight, DoorOpen, FileUp } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { Badge, PageHeader } from "@/components/ui";
import { listOrganizationUnits } from "@/repositories/portfolio";

export default async function UnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; created?: string; status?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const lifecycle = query.status === "archived" ? "archived" : "active";
  const units = (await listOrganizationUnits(session.organizationId, lifecycle)).filter(
    (unit) => !query.property || unit.propertyId === query.property,
  );
  return (
    <AppShell active="/app/properties">
      <PageHeader
        eyebrow="Portfolio"
        title="Wohneinheiten"
        description="Flächen und Grunddaten je Objekt – bereit für Mietverhältnisse und Mietspiegelmerkmale."
        action={
          <>
            <Link href="/app/bulk?type=units" className="btn secondary">
              <FileUp size={15} /> Mehrere anlegen / CSV
            </Link>
            <Link href="/app/units/new" className="btn">
              ＋ Einheit anlegen
            </Link>
          </>
        }
      />
      {query.created === "1" && (
        <div className="success-banner">Einheit wurde angelegt.</div>
      )}
      <nav className="filter-tabs" aria-label="Einheitenstatus">
        <Link className={lifecycle === "active" ? "active" : ""} href="/app/units">Aktiv</Link>
        <Link className={lifecycle === "archived" ? "active" : ""} href="/app/units?status=archived">Archiv</Link>
      </nav>
      {units.length ? (
        <div className="table-wrap">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Einheit</th>
                <th>Objekt</th>
                <th>Etage</th>
                <th>Fläche</th>
                <th>Zimmer</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <ClickableTableRow key={unit.id} href={`/app/units/${unit.id}`} label={`${unit.propertyName}, ${unit.label} öffnen`}>
                  <td data-label="Einheit">
                    <Link href={`/app/units/${unit.id}`}>
                      <strong>{unit.label}</strong>
                      <small>{unit.city}</small>
                    </Link>
                  </td>
                  <td data-label="Objekt">{unit.propertyName}</td>
                  <td data-label="Etage">{unit.floor || "–"}</td>
                  <td data-label="Fläche" className="tabular">
                    {unit.areaSqm ? `${unit.areaSqm} m²` : "–"}
                  </td>
                  <td data-label="Zimmer" className="tabular">
                    {unit.roomsTimesTen
                      ? (unit.roomsTimesTen / 10).toLocaleString("de-DE")
                      : "–"}
                  </td>
                  <td data-label="Status">
                    <Badge tone={unit.areaSqm ? "success" : "warning"}>
                      {unit.areaSqm ? "Grunddaten gepflegt" : "Daten ergänzen"}
                    </Badge>
                  </td>
                  <td data-label="Details" className="row-destination"><span>Dossier</span><ChevronRight size={16} aria-hidden="true" /></td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="empty-state">
          <span className="empty-icon">
            <DoorOpen size={26} />
          </span>
          <h2>{lifecycle === "archived" ? "Keine archivierten Einheiten" : "Keine Einheiten gefunden"}</h2>
          <p>{lifecycle === "archived" ? "Archivierte Einheiten können hier wiederhergestellt werden." : "Legen Sie zuerst ein Objekt oder eine zusätzliche Einheit an."}</p>
          {lifecycle === "active" && <Link href="/app/units/new" className="btn">Einheit anlegen</Link>}
        </section>
      )}
    </AppShell>
  );
}
