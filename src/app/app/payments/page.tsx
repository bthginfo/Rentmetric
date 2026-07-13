import { and, desc, eq } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { bankTransactions, payments, properties, renters, tenancies, units } from "@/db/schema";
import { confirmBankMatch, createManualPayment, generateMonthlyCharges, importBankTransactions, togglePayment } from "./actions";

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const date = new Intl.DateTimeFormat("de-DE");

export default async function PaymentsPage() {
  const session = await requireSession();
  const db = getDb();
  const [rows, transactions, tenancyOptions] = await Promise.all([
    db.select({ id: payments.id, amountCents: payments.amountCents, dueAt: payments.dueAt, paidAt: payments.paidAt, reference: payments.reference, first: renters.firstName, last: renters.lastName, unit: units.label, property: properties.name }).from(payments).innerJoin(tenancies, eq(tenancies.id, payments.tenancyId)).innerJoin(renters, eq(renters.id, tenancies.renterId)).innerJoin(units, eq(units.id, tenancies.unitId)).innerJoin(properties, eq(properties.id, units.propertyId)).where(and(eq(payments.organizationId, session.organizationId), eq(tenancies.organizationId, session.organizationId))).orderBy(desc(payments.dueAt)),
    db.select().from(bankTransactions).where(eq(bankTransactions.organizationId, session.organizationId)).orderBy(desc(bankTransactions.bookingDate)).limit(50),
    db.select({ id: tenancies.id, first: renters.firstName, last: renters.lastName, unit: units.label, property: properties.name }).from(tenancies).innerJoin(renters, eq(renters.id, tenancies.renterId)).innerJoin(units, eq(units.id, tenancies.unitId)).innerJoin(properties, eq(properties.id, units.propertyId)).where(eq(tenancies.organizationId, session.organizationId)).orderBy(properties.name, units.label),
  ]);
  const due = rows.reduce((sum, item) => sum + item.amountCents, 0);
  const paid = rows.filter((item) => item.paidAt).reduce((sum, item) => sum + item.amountCents, 0);
  const proposals = transactions.filter((item) => item.status === "proposed");

  return <AppShell active="/app/payments">
    <PageHeader eyebrow="Finanzen" title="Zahlungen & Sollstellungen" description="Forderungen und Zahlungseingänge automatisch oder manuell erfassen." action={<form action={generateMonthlyCharges}><button className="btn">Aktuellen Monat erzeugen</button></form>} />
    <section className="kpi-strip"><div className="kpi"><span className="kpi-label">Soll gesamt</span><strong className="kpi-value">{money.format(due / 100)}</strong></div><div className="kpi"><span className="kpi-label">Bezahlt</span><strong className="kpi-value">{money.format(paid / 100)}</strong></div><div className="kpi"><span className="kpi-label">Offen</span><strong className="kpi-value">{money.format((due - paid) / 100)}</strong></div><div className="kpi"><span className="kpi-label">Buchungen</span><strong className="kpi-value">{rows.length}</strong></div></section>

    <div className="finance-entry-grid">
      <details className="form-sheet compact-form create-drawer" open={!rows.length}><summary className="form-section-heading"><span>+</span><div><h2>Zahlung manuell buchen</h2><p>Sollstellung oder bereits eingegangene Zahlung erfassen.</p></div></summary><form action={createManualPayment} className="embedded-form"><div className="form-grid"><label className="field wide"><span>Mietverhältnis</span><select name="tenancyId" required><option value="">Bitte auswählen</option>{tenancyOptions.map((item) => <option value={item.id} key={item.id}>{item.property} · {item.unit} · {item.first} {item.last}</option>)}</select></label><label className="field"><span>Betrag €</span><input type="number" min="0.01" step="0.01" name="amount" required /></label><label className="field"><span>Fällig am</span><input type="date" name="dueAt" required /></label><label className="field"><span>Bezahlt am <small>optional</small></span><input type="date" name="paidAt" /></label><label className="field"><span>Verwendungszweck</span><input name="reference" placeholder="z. B. Miete 08/2026" /></label></div><div className="form-actions"><button className="btn">Buchung speichern</button></div></form></details>
      <details className="form-sheet compact-form create-drawer"><summary className="form-section-heading"><span>CSV</span><div><h2>Bankumsätze importieren</h2><p>Mehrere Buchungen aus einer Bankdatei übernehmen.</p></div></summary><form action={importBankTransactions} className="embedded-form"><label className="field wide"><span>CSV-Datei</span><input type="file" name="file" accept=".csv,text/csv" required /></label><div className="form-actions"><button className="btn">Importieren & zuordnen</button></div></form></details>
    </div>

    <section className="detail-panel payment-suggestions"><div className="panel-title"><h2>Zuordnungsvorschläge</h2><span>{proposals.length} offen</span></div>{proposals.length ? <div className="detail-list">{proposals.map((item) => <div key={item.id}><dt>{item.counterparty || item.reference || "Bankumsatz"}<small>{date.format(item.bookingDate)} · {item.confidenceBasisPoints ? `${item.confidenceBasisPoints / 100} %` : ""}</small></dt><dd><strong>{money.format(item.amountCents / 100)}</strong><form action={confirmBankMatch}><input type="hidden" name="id" value={item.id} /><button className="text-button">Zuordnung bestätigen</button></form></dd></div>)}</div> : <p className="panel-empty">Keine offenen Vorschläge. Manuelle Buchungen erscheinen direkt in der Zahlungsliste.</p>}</section>

    {rows.length ? <section className="payment-list-section"><div className="section-heading"><h2>Zahlungsliste</h2><span>{rows.length} Buchungen</span></div><div className="table-wrap payment-table"><table className="data-table responsive-table"><thead><tr><th>Fälligkeit</th><th>Mieter:in</th><th>Einheit</th><th>Referenz</th><th className="align-right">Betrag</th><th>Status</th><th /></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td data-label="Fälligkeit">{date.format(item.dueAt)}</td><td data-label="Mieter:in"><strong>{item.first} {item.last}</strong></td><td data-label="Einheit">{item.property} · {item.unit}</td><td data-label="Referenz">{item.reference || "–"}</td><td data-label="Betrag" className="align-right"><strong>{money.format(item.amountCents / 100)}</strong></td><td data-label="Status"><Badge tone={item.paidAt ? "success" : item.dueAt < new Date() ? "urgent" : "warning"}>{item.paidAt ? `Bezahlt ${date.format(item.paidAt)}` : item.dueAt < new Date() ? "Überfällig" : "Offen"}</Badge></td><td data-label="Aktion"><form action={togglePayment}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="paid" value={item.paidAt ? "false" : "true"} /><button className="text-button">{item.paidAt ? "Eingang lösen" : "Als bezahlt markieren"}</button></form></td></tr>)}</tbody></table></div></section> : <section className="feature-status"><h2>Noch keine Sollstellungen</h2><p>Buche eine Zahlung manuell oder erzeuge den aktuellen Monat aus den laufenden Mietverhältnissen.</p></section>}
  </AppShell>;
}
