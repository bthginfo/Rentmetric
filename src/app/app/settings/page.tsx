import { eq } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { organizations } from "@/db/schema";
import { updateOrganization } from "./actions";
export default async function SettingsPage() {
  const session = await requireSession();
  const [organization] = await getDb()
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.organizationId))
    .limit(1);
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
        </div>
        <div className="form-actions">
          <button className="btn">Einstellungen speichern</button>
        </div>
      </form>
    </AppShell>
  );
}
