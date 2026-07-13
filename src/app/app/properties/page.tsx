import Link from "next/link";
import { Building2, ChevronRight, DoorOpen, UserRound } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { Badge, PageHeader } from "@/components/ui";
import { listOrganizationProperties } from "@/repositories/portfolio";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const rows = await listOrganizationProperties(session.organizationId);
  const unitCount = rows.reduce((sum, row) => sum + Number(row.unitCount), 0);

  return (
    <AppShell active="/app/properties">
      <PageHeader
        eyebrow="Portfolio"
        title="Immobilien"
        description="Ihre echten Objekte und Einheiten – strikt auf diesen Arbeitsbereich begrenzt."
        action={
          <Link className="btn" href="/app/properties/new">
            ＋ Objekt anlegen
          </Link>
        }
      />
      {query.created === "1" && (
        <div className="success-banner" role="status">
          Objekt und Einheiten wurden erfolgreich angelegt.
        </div>
      )}
      <nav className="subnav-cards" aria-label="Bestandsbereiche">
        <Link href="/app/properties" className="subnav-card active">
          <Building2 size={18} />
          <span>
            <strong>{rows.length}</strong> Objekte
          </span>
        </Link>
        <Link href="/app/units" className="subnav-card">
          <DoorOpen size={18} />
          <span>
            <strong>{unitCount}</strong> Einheiten
          </span>
        </Link>
        <Link href="/app/renters" className="subnav-card">
          <UserRound size={18} />
          <span>Mieter verwalten</span>
        </Link>
      </nav>
      {rows.length ? (
        <div className="table-wrap">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Objekt</th>
                <th>Einheiten</th>
                <th>Baujahr</th>
                <th>Datenstatus</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((property) => (
                <ClickableTableRow key={property.id} href={`/app/properties/${property.id}`} label={`${property.name} öffnen`}>
                  <td data-label="Objekt">
                    <Link
                      className="property-name-link"
                      href={`/app/properties/${property.id}`}
                    >
                      <strong>{property.name}</strong>
                      <small>
                        {property.street} {property.houseNumber},{" "}
                        {property.postalCode} {property.city}
                      </small>
                    </Link>
                  </td>
                  <td data-label="Einheiten" className="tabular">
                    <strong>{Number(property.unitCount)}</strong>
                    <small>angelegt</small>
                  </td>
                  <td data-label="Baujahr" className="tabular">
                    {property.yearBuilt ?? "–"}
                  </td>
                  <td data-label="Datenstatus">
                    <Badge tone={property.yearBuilt ? "success" : "warning"}>
                      {property.yearBuilt
                        ? "Grunddaten vollständig"
                        : "Baujahr ergänzen"}
                    </Badge>
                  </td>
                  <td data-label="Details" className="align-right">
                    <span className="row-destination">Dossier <ChevronRight size={16} aria-hidden="true" /></span>
                  </td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="empty-state">
          <span className="empty-icon">
            <Building2 size={26} />
          </span>
          <p className="eyebrow">Ihr erster Schritt</p>
          <h2>Noch kein Objekt angelegt</h2>
          <p>
            Legen Sie Adresse und Anzahl der Einheiten an. Danach können Sie
            Mieter und Mietverhältnisse zuordnen.
          </p>
          <Link href="/app/properties/new" className="btn">
            Erstes Objekt anlegen
          </Link>
        </section>
      )}
    </AppShell>
  );
}
