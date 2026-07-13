import Link from "next/link";
import { UserRound } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
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
                <th>Datenschutz</th>
              </tr>
            </thead>
            <tbody>
              {renters.map((renter) => (
                <tr key={renter.id}>
                  <td data-label="Name">
                    <strong>
                      {renter.firstName} {renter.lastName}
                    </strong>
                    <small>Personenstammdaten</small>
                  </td>
                  <td data-label="E-Mail">{renter.email || "–"}</td>
                  <td data-label="Telefon">{renter.phone || "–"}</td>
                  <td data-label="Datenschutz">
                    <span className="scope-chip">Arbeitsbereich</span>
                  </td>
                </tr>
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
