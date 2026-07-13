import Link from "next/link";
import { subMonths } from "date-fns";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { ClickableTableRow } from "@/components/clickable-table-row";
import { Badge, PageHeader } from "@/components/ui";
import { listOrganizationTenancies } from "@/repositories/tenancies";
import { createShareLink, endTenancy } from "./actions";

const date = new Intl.DateTimeFormat("de-DE");
const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export default async function TenanciesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; created?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const selected = query.status ?? "current";
  const now = new Date();
  const all = await listOrganizationTenancies(session.organizationId);
  const isCurrent = (row: (typeof all)[number]) =>
    row.startsAt <= now && (!row.endsAt || row.endsAt >= now);
  const canReview = (row: (typeof all)[number]) =>
    isCurrent(row) &&
    (row.lastRentIncreaseAt || row.startsAt) <= subMonths(now, 12);
  const current = all.filter(isCurrent),
    review = all.filter(canReview),
    archived = all.filter((row) => row.endsAt && row.endsAt < now);
  const rows =
    selected === "review"
      ? review
      : selected === "archived"
        ? archived
        : current;

  return (
    <AppShell active="/app/tenancies">
      <PageHeader
        eyebrow="Bestand"
        title="Mietverhältnisse"
        description="Laufende und frühere Verträge, Miethöhen sowie transparente Prüfanlässe."
        action={
          <Link className="btn" href="/app/tenancies/new">
            Mietverhältnis anlegen
          </Link>
        }
      />
      {query.created === "1" && (
        <div className="success-banner" role="status">
          Mietverhältnis wurde angelegt.
        </div>
      )}
      <div className="filter-row">
        <nav className="filter-tabs" aria-label="Mietverhältnisfilter">
          <Link
            className={`filter-tab ${selected === "current" ? "active" : ""}`}
            href="/app/tenancies"
          >
            Aktuell ({current.length})
          </Link>
          <Link
            className={`filter-tab ${selected === "review" ? "active" : ""}`}
            href="/app/tenancies?status=review"
          >
            Prüfung möglich ({review.length})
          </Link>
          <Link
            className={`filter-tab ${selected === "archived" ? "active" : ""}`}
            href="/app/tenancies?status=archived"
          >
            Archiviert ({archived.length})
          </Link>
        </nav>
        <span className="count-note">Echte Daten Ihres Arbeitsbereichs</span>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Mieter:in</th>
                <th>Einheit</th>
                <th>Laufzeit</th>
                <th>Fläche</th>
                <th className="align-right">Kaltmiete</th>
                <th>Prüfstatus</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ClickableTableRow key={row.id} href={`/app/tenancies/${row.id}`} label={`Mietverhältnis von ${row.renterFirstName} ${row.renterLastName} öffnen`}>
                  <td data-label="Mieter:in">
                    <Link href={`/app/tenancies/${row.id}`} className="table-link"><strong>
                      {row.renterFirstName} {row.renterLastName}
                    </strong></Link>
                  </td>
                  <td data-label="Einheit">
                    <Link
                      className="table-link"
                      href={`/app/units/${row.unitId}`}
                    >
                      {row.propertyName} · {row.unitLabel}
                    </Link>
                  </td>
                  <td data-label="Laufzeit" className="tabular">
                    {date.format(row.startsAt)} –{" "}
                    {row.endsAt ? date.format(row.endsAt) : "unbefristet"}
                  </td>
                  <td data-label="Fläche" className="tabular">
                    {row.areaSqm ? `${row.areaSqm} m²` : "–"}
                  </td>
                  <td data-label="Kaltmiete" className="align-right tabular">
                    <strong>{money.format(row.coldRentCents / 100)}</strong>
                  </td>
                  <td data-label="Prüfstatus">
                    <Badge tone={canReview(row) ? "warning" : "success"}>
                      {canReview(row)
                        ? "Fachlich prüfen"
                        : isCurrent(row)
                          ? "Laufend"
                          : "Beendet"}
                    </Badge>
                  </td>
                  <td data-label="Aktion">
                    {isCurrent(row) && (
                      <>
                        <form action={createShareLink}>
                          <input type="hidden" name="id" value={row.id} />
                          <button className="text-button">Mieterlink</button>
                        </form>
                        <form action={endTenancy}>
                          <input type="hidden" name="id" value={row.id} />
                          <button className="text-button">Heute beenden</button>
                        </form>
                      </>
                    )}
                  </td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="feature-status">
          <span className="eyebrow">Keine Einträge</span>
          <h2>Keine Mietverhältnisse in diesem Filter</h2>
          <p>
            Neue Verträge lassen sich direkt anlegen; beendete Verträge bleiben
            in der Historie erhalten.
          </p>
        </section>
      )}
    </AppShell>
  );
}
