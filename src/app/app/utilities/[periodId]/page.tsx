import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { UtilityCostActions } from "@/components/utility-cost-actions";
import { UtilityDocumentUploader } from "@/components/utility-document-uploader";
import { Badge, PageHeader } from "@/components/ui";
import { listOrganizationProperties } from "@/repositories/portfolio";
import { getUtilityWorkspace } from "@/repositories/utilities";
import {
  addUtilityCost,
  deleteUtilityCost,
  deleteUtilityPeriod,
  saveUtilityAllocations,
  updateUtilityCost,
  updateUtilityPeriod,
  updateUtilityPeriodStatus,
} from "../actions";

const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const allocationLabels: Record<string, string> = {
  area: "Wohnfläche",
  units: "Einheiten",
  consumption: "Verbrauch",
  manual: "Manuell",
};

export default async function UtilityPeriodPage({
  params,
  searchParams,
}: {
  params: Promise<{ periodId: string }>;
  searchParams: Promise<{
    error?: string;
    updated?: string;
    periodUpdated?: string;
    editPeriod?: string;
  }>;
}) {
  const session = await requireSession();
  const { periodId } = await params;
  const query = await searchParams;
  const workspace = await getUtilityWorkspace(session.organizationId, periodId);
  if (!workspace) notFound();
  const properties = await listOrganizationProperties(session.organizationId);
  const {
    period,
    property,
    costs,
    propertyUnits,
    receipts,
    allocationRows,
    calculation,
  } = workspace;
  const recoverable = costs.filter((item) => item.isRecoverable);
  const total = recoverable.reduce((sum, item) => sum + item.amountCents, 0);
  const landlordShare = calculation.unitResults.reduce(
    (sum, item) => sum + item.vacancyCents,
    0,
  );

  return (
    <AppShell active="/app/utilities">
      <Link className="dossier-breadcrumb" href="/app/utilities">
        <ArrowLeft size={14} /> Betriebskosten
      </Link>
      <PageHeader
        eyebrow={`${property.name} · ${period.status === "final" ? "Abgeschlossen" : "In Bearbeitung"}`}
        title={period.title}
        description={`${period.startsAt.toLocaleDateString("de-DE")} – ${period.endsAt.toLocaleDateString("de-DE")}`}
        action={
          <div className="header-actions">
            {period.status !== "final" && (
              <a className="btn secondary" href="?editPeriod=1#period-edit">
                Periode bearbeiten
              </a>
            )}
            <Badge tone={period.status === "final" ? "success" : "warning"}>
              {period.status === "final"
                ? "Abgeschlossen"
                : period.status === "review"
                  ? "Prüfung"
                  : "Entwurf"}
            </Badge>
          </div>
        }
      />
      {query.error === "locked" && (
        <div className="error-banner" role="alert">
          Diese Abrechnung ist abgeschlossen und kann nicht mehr verändert
          werden.
        </div>
      )}
      {query.error === "review-first" && (
        <div className="error-banner" role="alert">
          Wechsle zuerst in die Prüfung und kontrolliere die Einzelabrechnungen.
        </div>
      )}
      {query.updated === "1" && (
        <div className="success-banner" role="status">
          Kostenposition wurde aktualisiert.
        </div>
      )}
      {query.periodUpdated === "1" && (
        <div className="success-banner" role="status">
          Periode wurde aktualisiert.
        </div>
      )}
      {query.error === "period-invalid" && (
        <div className="error-banner" role="alert">
          Bitte prüfe Titel, Objekt und Zeitraum.
        </div>
      )}
      {query.error === "period-range" && (
        <div className="error-banner" role="alert">
          Das Enddatum muss nach dem Startdatum liegen.
        </div>
      )}
      {query.error === "property-locked" && (
        <div className="error-banner" role="alert">
          Das Objekt kann nicht mehr gewechselt werden, weil bereits Kosten oder
          Belege zugeordnet sind.
        </div>
      )}
      {query.error === "period-dependencies" && (
        <div className="error-banner" role="alert">
          Die Periode enthält noch Kosten oder Belege und kann deshalb nicht
          gelöscht werden.
        </div>
      )}
      {query.error === "period-confirmation" && (
        <div className="error-banner" role="alert">
          Bitte bestätige die Löschung vollständig.
        </div>
      )}
      {period.status === "final" && (
        <div className="info-banner" role="status">
          Abgeschlossen am aktuellen Datenstand. Kosten, Verteilungen und Belege
          sind unveränderlich.
        </div>
      )}
      {period.status !== "final" && (
        <details
          className="form-sheet compact-form create-drawer"
          id="period-edit"
          open={
            query.editPeriod === "1" ||
            Boolean(
              query.error?.startsWith("period-") ||
              query.error === "property-locked",
            )
          }
        >
          <summary className="btn secondary">Periode bearbeiten</summary>
          <form action={updateUtilityPeriod} className="embedded-form">
            <input type="hidden" name="id" value={period.id} />
            <div className="form-grid">
              <label className="field wide">
                <span>Titel</span>
                <input name="title" defaultValue={period.title} required />
              </label>
              {costs.length || receipts.length ? (
                <>
                  <input
                    type="hidden"
                    name="propertyId"
                    value={period.propertyId}
                  />
                  <label className="field">
                    <span>Objekt</span>
                    <input value={property.name} disabled />
                    <small>Mit Kosten oder Belegen nicht mehr änderbar.</small>
                  </label>
                </>
              ) : (
                <label className="field">
                  <span>Objekt</span>
                  <select name="propertyId" defaultValue={period.propertyId}>
                    {properties.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field">
                <span>Von</span>
                <input
                  type="date"
                  name="startsAt"
                  defaultValue={period.startsAt.toISOString().slice(0, 10)}
                  required
                />
              </label>
              <label className="field">
                <span>Bis</span>
                <input
                  type="date"
                  name="endsAt"
                  defaultValue={period.endsAt.toISOString().slice(0, 10)}
                  required
                />
              </label>
            </div>
            <div className="form-actions">
              <button className="btn">Änderungen speichern</button>
            </div>
          </form>
        </details>
      )}
      <section className="kpi-grid">
        <article>
          <ReceiptText size={19} />
          <span>Umlagefähige Kosten</span>
          <strong>{money.format(total / 100)}</strong>
          <small>{recoverable.length} Positionen</small>
        </article>
        <article>
          <CheckCircle2 size={19} />
          <span>Belege</span>
          <strong>{receipts.length}</strong>
          <small>
            {receipts.filter((item) => item.extractedData).length} ausgelesen
          </small>
        </article>
        <article>
          <AlertTriangle size={19} />
          <span>Offene Zuordnung</span>
          <strong>{calculation.unresolvedCostIds.length}</strong>
          <small>vor Abschluss zu bearbeiten</small>
        </article>
      </section>

      <ol className="utility-stepper">
        <li className={costs.length ? "done" : "active"}>
          <b>1</b>
          <span>
            <strong>Kosten erfassen</strong>
            <small>Manuell oder per Beleg</small>
          </span>
        </li>
        <li
          className={
            calculation.unresolvedCostIds.length
              ? "active"
              : costs.length
                ? "done"
                : ""
          }
        >
          <b>2</b>
          <span>
            <strong>Verteilung prüfen</strong>
            <small>Fläche, Einheiten oder Verbrauch</small>
          </span>
        </li>
        <li
          className={
            !calculation.unresolvedCostIds.length && costs.length
              ? "active"
              : ""
          }
        >
          <b>3</b>
          <span>
            <strong>Abrechnungen ausgeben</strong>
            <small>Je Mietverhältnis drucken</small>
          </span>
        </li>
      </ol>

      {period.status !== "final" && (
        <div className="utility-entry-grid">
          <details
            className="form-sheet compact-form create-drawer"
            open={!costs.length}
          >
            <summary className="form-section-heading">
              <span>+</span>
              <div>
                <h2>Kosten manuell erfassen</h2>
                <p>Jede Rechnung kann auch ohne Upload eingetragen werden.</p>
              </div>
            </summary>
            <form action={addUtilityCost} className="embedded-form">
              <input type="hidden" name="periodId" value={periodId} />
              <div className="form-grid">
                <label className="field wide">
                  <span>Kostenart</span>
                  <input
                    name="label"
                    required
                    placeholder="z. B. Grundsteuer"
                  />
                </label>
                <label className="field">
                  <span>Betrag €</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="amount"
                    required
                  />
                </label>
                <label className="field">
                  <span>Verteilung</span>
                  <select name="allocationKey">
                    <option value="area">Nach Wohnfläche</option>
                    <option value="units">Gleich je Einheit</option>
                    <option value="consumption">Nach Verbrauchswert</option>
                    <option value="manual">Betrag je Einheit eingeben</option>
                  </select>
                </label>
                <label className="field">
                  <span>Lieferant</span>
                  <input name="vendor" />
                </label>
                <label className="field">
                  <span>Rechnungsdatum</span>
                  <input type="date" name="invoiceDate" />
                </label>
                <label className="field wide">
                  <span>Notiz</span>
                  <input name="notes" />
                </label>
              </div>
              <input type="hidden" name="isRecoverable" value="false" />
              <label className="feature-check">
                <input
                  type="checkbox"
                  name="isRecoverable"
                  value="true"
                  defaultChecked
                />
                <span>
                  <i />
                  Auf Mieter:innen umlagefähig
                </span>
              </label>
              <div className="form-actions">
                <button className="btn">Kostenposition speichern</button>
              </div>
            </form>
          </details>
          <UtilityDocumentUploader
            organizationId={session.organizationId}
            userId={session.userId}
            periodId={periodId}
          />
        </div>
      )}

      {period.status !== "final" && receipts.length > 0 && (
        <section className="detail-panel utility-receipts">
          <div className="panel-title">
            <h2>Belege prüfen und übernehmen</h2>
            <span>{receipts.length}</span>
          </div>
          <div className="utility-receipt-grid">
            {receipts.map((receipt) => {
              const data = receipt.extractedData as {
                totalGross?: number;
                supplier?: string;
                invoiceDate?: string;
                warnings?: string[];
              } | null;
              return (
                <article key={receipt.id}>
                  <div>
                    <strong>{receipt.title}</strong>
                    <small>{receipt.originalFilename}</small>
                  </div>
                  {data?.warnings?.length ? <p>{data.warnings[0]}</p> : null}
                  <form action={addUtilityCost}>
                    <input type="hidden" name="periodId" value={periodId} />
                    <input type="hidden" name="isRecoverable" value="true" />
                    <div className="form-grid">
                      <label className="field">
                        <span>Kostenart</span>
                        <input
                          name="label"
                          defaultValue={receipt.title}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>Betrag €</span>
                        <input
                          name="amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          defaultValue={data?.totalGross || ""}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>Verteilung</span>
                        <select name="allocationKey">
                          <option value="area">Nach Wohnfläche</option>
                          <option value="units">Gleich je Einheit</option>
                          <option value="consumption">Nach Verbrauch</option>
                          <option value="manual">Manuell</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Lieferant</span>
                        <input
                          name="vendor"
                          defaultValue={data?.supplier || ""}
                        />
                      </label>
                    </div>
                    <button className="btn secondary">
                      Als Kostenposition übernehmen
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="detail-panel">
        <div className="panel-title">
          <h2>Kosten und Verteilung</h2>
          <span>{costs.length} Positionen</span>
        </div>
        {costs.length ? (
          <div className="utility-cost-list">
            {costs.map((item) => {
              const needsInput = ["consumption", "manual"].includes(
                item.allocationKey,
              );
              const existing = new Map(
                allocationRows
                  .filter((row) => row.costItemId === item.id)
                  .map((row) => [row.unitId, row]),
              );
              const unresolved = calculation.unresolvedCostIds.includes(
                item.id,
              );
              return (
                <article
                  key={item.id}
                  className={unresolved ? "needs-attention" : ""}
                >
                  <header>
                    <div>
                      <strong>{item.label}</strong>
                      <small>
                        {item.vendor || "Ohne Lieferant"} ·{" "}
                        {allocationLabels[item.allocationKey] ||
                          item.allocationKey}{" "}
                        ·{" "}
                        {item.isRecoverable ? "umlagefähig" : "Vermieteranteil"}
                      </small>
                    </div>
                    <strong>{money.format(item.amountCents / 100)}</strong>
                    {period.status !== "final" && (
                      <UtilityCostActions periodId={periodId} item={item} />
                    )}
                    {period.status !== "final" && (
                      <details className="utility-row-actions" hidden>
                        <summary
                          className="icon-button"
                          aria-label={`${item.label} bearbeiten`}
                        >
                          <span aria-hidden>•••</span>
                        </summary>
                        <div className="utility-row-menu">
                          <details>
                            <summary className="text-button">
                              Bearbeiten
                            </summary>
                            <form
                              action={updateUtilityCost}
                              className="compact-form"
                            >
                              <input
                                type="hidden"
                                name="periodId"
                                value={periodId}
                              />
                              <input
                                type="hidden"
                                name="costItemId"
                                value={item.id}
                              />
                              <div className="form-grid">
                                <label className="field wide">
                                  <span>Kostenart</span>
                                  <input
                                    name="label"
                                    defaultValue={item.label}
                                    required
                                  />
                                </label>
                                <label className="field">
                                  <span>Betrag €</span>
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    name="amount"
                                    defaultValue={item.amountCents / 100}
                                    required
                                  />
                                </label>
                                <label className="field">
                                  <span>Verteilung</span>
                                  <select
                                    name="allocationKey"
                                    defaultValue={item.allocationKey}
                                  >
                                    <option value="area">
                                      Nach Wohnfläche
                                    </option>
                                    <option value="units">
                                      Gleich je Einheit
                                    </option>
                                    <option value="consumption">
                                      Nach Verbrauch
                                    </option>
                                    <option value="manual">Manuell</option>
                                  </select>
                                </label>
                                <label className="field">
                                  <span>Lieferant</span>
                                  <input
                                    name="vendor"
                                    defaultValue={item.vendor || ""}
                                  />
                                </label>
                                <label className="field">
                                  <span>Rechnungsdatum</span>
                                  <input
                                    type="date"
                                    name="invoiceDate"
                                    defaultValue={item.invoiceDate
                                      ?.toISOString()
                                      .slice(0, 10)}
                                  />
                                </label>
                                <label className="field wide">
                                  <span>Notiz</span>
                                  <input
                                    name="notes"
                                    defaultValue={item.notes || ""}
                                  />
                                </label>
                              </div>
                              <input
                                type="hidden"
                                name="isRecoverable"
                                value="false"
                              />
                              <label className="feature-check">
                                <input
                                  type="checkbox"
                                  name="isRecoverable"
                                  value="true"
                                  defaultChecked={item.isRecoverable}
                                />
                                <span>
                                  <i />
                                  Umlagefähig
                                </span>
                              </label>
                              <button className="btn secondary">
                                Änderung speichern
                              </button>
                            </form>
                          </details>
                          <details className="danger-zone">
                            <summary>Position löschen</summary>
                            <p>
                              Die Kostenposition und ihre Verteilungen werden
                              endgültig gelöscht.
                            </p>
                            <form action={deleteUtilityCost}>
                              <input
                                type="hidden"
                                name="periodId"
                                value={periodId}
                              />
                              <input
                                type="hidden"
                                name="costItemId"
                                value={item.id}
                              />
                              <label className="field">
                                <span>„KOSTEN LÖSCHEN“ eingeben</span>
                                <input
                                  name="confirmation"
                                  pattern="KOSTEN LÖSCHEN"
                                  required
                                />
                              </label>
                              <button className="btn danger">
                                <Trash2 size={15} /> Löschen
                              </button>
                            </form>
                          </details>
                        </div>
                      </details>
                    )}
                  </header>
                  {period.status !== "final" &&
                  needsInput &&
                  item.isRecoverable ? (
                    <form
                      action={saveUtilityAllocations}
                      className="allocation-editor"
                    >
                      <input type="hidden" name="periodId" value={periodId} />
                      <input type="hidden" name="costItemId" value={item.id} />
                      <p>
                        {item.allocationKey === "consumption"
                          ? "Verbrauchswert je Einheit eingeben. Die Einheit ist frei wählbar, wichtig ist nur das Verhältnis."
                          : `Beträge je Einheit eingeben. Die Summe muss ${money.format(item.amountCents / 100)} ergeben.`}
                      </p>
                      <div className="allocation-unit-grid">
                        {propertyUnits.map((unit) => {
                          const row = existing.get(unit.id);
                          const value =
                            item.allocationKey === "consumption"
                              ? row?.weightValue
                                ? row.weightValue / 1000
                                : ""
                              : row?.amountCents != null
                                ? row.amountCents / 100
                                : "";
                          return (
                            <label className="field" key={unit.id}>
                              <span>{unit.label}</span>
                              <input
                                name={`unit_${unit.id}`}
                                type="number"
                                min="0"
                                step={
                                  item.allocationKey === "consumption"
                                    ? "0.001"
                                    : "0.01"
                                }
                                defaultValue={value}
                              />
                            </label>
                          );
                        })}
                      </div>
                      <button className="btn secondary">
                        Verteilung speichern
                      </button>
                      {unresolved ? (
                        <small className="allocation-warning">
                          Diese Position ist noch nicht vollständig verteilt.
                        </small>
                      ) : (
                        <small className="allocation-success">
                          Verteilung vollständig.
                        </small>
                      )}
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="panel-empty">
            Noch keine Kosten erfasst. Beginne oben manuell oder mit einem
            Beleg.
          </p>
        )}
      </section>

      <section className="detail-panel">
        <div className="panel-title">
          <h2>Abrechnung je Mietverhältnis</h2>
          <span>{calculation.statements.length}</span>
        </div>
        {landlordShare > 0 && (
          <div className="utility-landlord-share">
            <AlertTriangle size={17} />
            <div>
              <strong>
                {money.format(landlordShare / 100)} Vermieteranteil
              </strong>
              <small>
                Dieser Anteil entfällt auf Leerstand oder nicht vermietete
                Zeiträume und wird nicht auf Mieter:innen umgelegt.
              </small>
            </div>
          </div>
        )}
        {calculation.statements.length ? (
          <>
            <p className="mobile-scroll-hint">
              Tabelle seitlich wischen, um Saldo und Abrechnung zu sehen.
            </p>
            <div className="candidate-table-wrap">
              <table className="candidate-table">
                <thead>
                  <tr>
                    <th>Einheit / Mietpartei</th>
                    <th>Tage</th>
                    <th>Kostenanteil</th>
                    <th>Vorauszahlung</th>
                    <th>Saldo</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {calculation.statements.map((statement) => (
                    <tr key={statement.tenancyId}>
                      <td>
                        <strong>{statement.unitLabel}</strong>
                        <br />
                        {statement.renterName}
                      </td>
                      <td>{statement.occupiedDays}</td>
                      <td>{money.format(statement.totalCents / 100)}</td>
                      <td>{money.format(statement.advancesCents / 100)}</td>
                      <td>
                        <strong>
                          {money.format(statement.balanceCents / 100)}
                        </strong>
                      </td>
                      <td>
                        <Link
                          className="text-button"
                          href={`/app/utilities/${periodId}/statements/${statement.tenancyId}`}
                        >
                          Abrechnung öffnen <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="panel-empty">
            Lege Mietverhältnisse mit Vorauszahlungen an, damit
            Einzelabrechnungen erstellt werden.
          </p>
        )}
      </section>

      {period.status !== "final" && (
        <>
          <section className="danger-zone" id="period-delete">
            <h2>Periode löschen</h2>
            <p>
              {costs.length || receipts.length
                ? "Entferne zuerst alle Kostenpositionen und zugeordneten Belege. Erst danach kann die Periode gelöscht werden."
                : "Die leere Periode wird endgültig gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."}
            </p>
            <form action={deleteUtilityPeriod}>
              <input type="hidden" name="id" value={period.id} />
              <label className="field">
                <span>„PERIODE LÖSCHEN“ eingeben</span>
                <input
                  name="confirmation"
                  pattern="PERIODE LÖSCHEN"
                  required
                  autoComplete="off"
                />
              </label>
              <button
                className="btn danger"
                disabled={Boolean(costs.length || receipts.length)}
              >
                Periode endgültig löschen
              </button>
            </form>
          </section>
          <section className="approval-panel">
            <CheckCircle2 size={22} />
            <div>
              <h2>Prüfen und abschließen</h2>
              <p>
                {calculation.unresolvedCostIds.length
                  ? `${calculation.unresolvedCostIds.length} Kostenpositionen müssen noch verteilt werden.`
                  : "Alle umlagefähigen Kosten sind verteilt. Prüfe die Einzelabrechnungen vor dem Abschluss."}
              </p>
            </div>
            <form action={updateUtilityPeriodStatus}>
              <input type="hidden" name="id" value={periodId} />
              <button
                className="btn secondary"
                name="status"
                value={period.status === "review" ? "draft" : "review"}
              >
                {period.status === "review"
                  ? "Zurück in Entwurf"
                  : "Zur Prüfung"}
              </button>
              <button
                className="btn"
                name="status"
                value="final"
                disabled={
                  period.status !== "review" ||
                  calculation.unresolvedCostIds.length > 0 ||
                  !costs.length
                }
              >
                Abschließen
              </button>
            </form>
          </section>
        </>
      )}
    </AppShell>
  );
}
