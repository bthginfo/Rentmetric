import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/auth/session";
import { PrintButton } from "@/components/print-button";
import { getUtilityWorkspace } from "@/repositories/utilities";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const allocationLabels: Record<string, string> = { area: "Wohnfläche", units: "Einheiten", consumption: "Verbrauch", manual: "Individuelle Zuordnung" };

export default async function UtilityStatementPage({ params }: { params: Promise<{ periodId: string; tenancyId: string }> }) {
  const session = await requireSession();
  const { periodId, tenancyId } = await params;
  const workspace = await getUtilityWorkspace(session.organizationId, periodId);
  const statement = workspace?.calculation.statements.find((item) => item.tenancyId === tenancyId);
  const tenancy = workspace?.tenancyRows.find((item) => item.tenancy.id === tenancyId);
  if (!workspace || !statement || !tenancy) notFound();
  const costMap = new Map(workspace.costs.map((cost) => [cost.id, cost]));
  const address = `${workspace.property.street} ${workspace.property.houseNumber}, ${workspace.property.postalCode} ${workspace.property.city}`;
  const resultLabel = statement.balanceCents > 0 ? "Nachzahlung" : statement.balanceCents < 0 ? "Guthaben" : "Ausgeglichen";

  return <main className="statement-page">
    <div className="statement-toolbar"><Link className="back-link" href={`/app/utilities/${periodId}`}><ArrowLeft size={14} /> Zur Abrechnung</Link><PrintButton /></div>
    <article className="utility-statement">
      <header className="statement-header"><div><span className="eyebrow">Betriebskostenabrechnung</span><h1>{workspace.period.title}</h1><p>{workspace.organization.name}<br />{workspace.property.name} · {address}</p></div><div className="statement-status"><span>{workspace.period.status === "final" ? "Abgeschlossen" : "Entwurf – bitte prüfen"}</span></div></header>
      <section className="statement-recipient"><span>Für</span><strong>{statement.renterName}</strong><p>Einheit {statement.unitLabel}<br />Abrechnungszeitraum {workspace.period.startsAt.toLocaleDateString("de-DE")} bis {workspace.period.endsAt.toLocaleDateString("de-DE")}<br />Berücksichtigte Mietdauer: {statement.occupiedDays} Tage</p></section>
      <section><h2>Kostenaufstellung</h2><div className="statement-table-wrap"><table className="statement-table"><thead><tr><th>Kostenart</th><th>Umlageschlüssel</th><th className="align-right">Ihr Anteil</th></tr></thead><tbody>{statement.lines.map((line) => <tr key={line.costItemId}><td>{line.label}</td><td>{allocationLabels[costMap.get(line.costItemId)?.allocationKey || ""] || "Manuell"}</td><td className="align-right">{money.format(line.amountCents / 100)}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Umlagefähige Kosten</th><th className="align-right">{money.format(statement.totalCents / 100)}</th></tr><tr><th colSpan={2}>Geleistete Vorauszahlungen</th><th className="align-right">– {money.format(statement.advancesCents / 100)}</th></tr></tfoot></table></div></section>
      <section className={`statement-result ${statement.balanceCents <= 0 ? "credit" : "due"}`}><span>{resultLabel}</span><strong>{money.format(Math.abs(statement.balanceCents) / 100)}</strong><p>{statement.balanceCents > 0 ? "Bitte prüfen Sie den Betrag und ergänzen Sie vor Versand Ihre Zahlungsfrist und Bankverbindung." : statement.balanceCents < 0 ? "Das Guthaben ist nach Ihrer abschließenden Prüfung an die Mietpartei auszuzahlen oder zu verrechnen." : "Kosten und Vorauszahlungen gleichen sich aus."}</p></section>
      <footer className="statement-footer"><p>Die zugrunde liegenden Belege können im Rahmen der gesetzlichen Belegeinsicht bereitgestellt werden. Diese Abrechnung wurde rechnerisch aus den in Rentmetric erfassten Daten erstellt und muss vor Versand fachlich geprüft werden.</p><div><span>Ort, Datum</span><span>Unterschrift Vermieter:in</span></div></footer>
    </article>
  </main>;
}
