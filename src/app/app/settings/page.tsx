import { eq } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { auditLogs, organizations } from "@/db/schema";
import { desc } from "drizzle-orm";
import { updateOrganization } from "./actions";
export default async function SettingsPage() {
  const session = await requireSession();
  const [organization] = await getDb()
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.organizationId))
    .limit(1);
  const audits = await getDb().select().from(auditLogs).where(eq(auditLogs.organizationId, session.organizationId)).orderBy(desc(auditLogs.createdAt)).limit(30);
  return (
    <AppShell active="/app/settings">
      <PageHeader
        eyebrow="Arbeitsbereich"
        title="Einstellungen"
        description="Organisation, Sprache und Währung für diesen Mandanten verwalten."
      />
      <form action={updateOrganization} className="form-sheet">
        <div className="form-grid">
          <label className="field wide">
            <span>Name des Arbeitsbereichs</span>
            <input name="name" required defaultValue={organization.name} />
          </label>
          <label className="field">
            <span>Sprache / Region</span>
            <select name="locale" defaultValue={organization.locale}>
              <option value="de-DE">Deutsch (Deutschland)</option>
              <option value="de-AT">Deutsch (Österreich)</option>
              <option value="de-CH">Deutsch (Schweiz)</option>
            </select>
          </label>
          <label className="field">
            <span>Währung</span>
            <select name="currency" defaultValue={organization.currency}>
              <option value="EUR">EUR</option>
              <option value="CHF">CHF</option>
            </select>
          </label>
          <label className="field"><span>Mietfälligkeit (Tag im Monat)</span><input name="rentDueDay" type="number" min="1" max="28" required defaultValue={organization.rentDueDay} /></label>
          <label className="field"><span>Kontoinhaber:in</span><input name="bankAccountHolder" defaultValue={organization.bankAccountHolder || ""} autoComplete="name" /></label>
          <label className="field"><span>Bank</span><input name="bankName" defaultValue={organization.bankName || ""} /></label>
          <label className="field wide"><span>IBAN für Mietzahlungen</span><input name="iban" defaultValue={organization.iban || ""} autoComplete="off" placeholder="DE…" /></label>
          <label className="field"><span>BIC</span><input name="bic" defaultValue={organization.bic || ""} autoComplete="off" placeholder="ABCDEFGHXXX" /></label>
          <label className="field wide"><span>Hinweis zur Überweisung</span><input name="transferNote" defaultValue={organization.transferNote || ""} maxLength={240} placeholder="Optionaler Hinweis für Mieter:innen" /></label>
        </div>
        <div className="form-actions">
          <button className="btn">Einstellungen speichern</button>
        </div>
      </form>
      <section className="detail-panel"><div className="panel-title"><h2>Datenexport</h2></div><div className="header-actions">{["properties", "units", "renters", "tenancies", "contacts"].map((type) => <a className="btn secondary" key={type} href={`/api/export?type=${type}`}>{type}.csv</a>)}</div></section>
      <section className="detail-panel"><div className="panel-title"><h2>Änderungsprotokoll</h2><span>Letzte 30 Ereignisse</span></div><div className="detail-list">{audits.map((audit) => <div key={audit.id}><dt>{audit.action}<small>{audit.entityType}{audit.entityId ? ` · ${audit.entityId}` : ""}</small></dt><dd>{audit.createdAt.toLocaleString("de-DE")}</dd></div>)}</div></section>
    </AppShell>
  );
}
