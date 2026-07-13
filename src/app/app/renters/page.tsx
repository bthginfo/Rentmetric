import Link from "next/link";
import { ChevronRight, UserRound } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { PageHeader } from "@/components/ui";
import { listOrganizationRenters } from "@/repositories/portfolio";

export default async function RentersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const renters = await listOrganizationRenters(session.organizationId);
  return (
    <AppShell active="/app/properties">
      <PageHeader
        eyebrow="Portfolio"
        title="Mieter"
        description="Kontaktdaten getrennt von Verträgen und Einheiten verwalten."
        action={
          <Link href="/app/renters/new" className="btn">
            ＋ Mieter anlegen
          </Link>
        }
      />
      {query.created === "1" && (
        <div className="success-banner">Mieter wurde angelegt.</div>
      )}
      {renters.length ? (
        <div className="table-wrap">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>E-Mail</th>
                <th>Telefon</th>
                <th>Aktuelles Mietverhältnis</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {renters.map((renter) => (
                <ClickableTableRow key={renter.id} href={`/app/renters/${renter.id}`} label={`${renter.firstName} ${renter.lastName} öffnen`}>
                  <td data-label="Name">
                    <Link href={`/app/renters/${renter.id}`}>
                      <strong>{renter.firstName} {renter.lastName}</strong>
                      <small>Dossier öffnen</small>
                    </Link>
                  </td>
                  <td data-label="E-Mail">{renter.email || "–"}</td>
                  <td data-label="Telefon">{renter.phone || "–"}</td>
                  <td data-label="Aktuelles Mietverhältnis">
                    {renter.currentTenancy ? <><strong>{renter.currentTenancy.propertyName} · {renter.currentTenancy.unitLabel}</strong><small>seit {renter.currentTenancy.startsAt.toLocaleDateString("de-DE")}</small></> : "–"}
                  </td>
                  <td data-label="Status" className="row-destination">
                    <span className={`badge ${renter.currentTenancy ? "success" : ""}`}>{renter.currentTenancy ? "Aktiver Vertrag" : "Ohne Vertrag"}</span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="empty-state">
          <span className="empty-icon">
            <UserRound size={26} />
          </span>
          <h2>Noch keine Mieter angelegt</h2>
          <p>
            Erfassen Sie zuerst die minimal notwendigen Kontaktdaten. Das
            Mietverhältnis wird anschließend separat zugeordnet.
          </p>
          <Link href="/app/renters/new" className="btn">
            Ersten Mieter anlegen
          </Link>
        </section>
      )}
    </AppShell>
  );
}
