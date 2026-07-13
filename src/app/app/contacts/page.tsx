import { asc, eq } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { contacts } from "@/db/schema";
import { createContact } from "./actions";
export default async function ContactsPage() {
  const session = await requireSession();
  const rows = await getDb()
    .select()
    .from(contacts)
    .where(eq(contacts.organizationId, session.organizationId))
    .orderBy(asc(contacts.name));
  return (
    <AppShell active="/app/contacts">
      <PageHeader
        eyebrow="Netzwerk"
        title="Kontakte & Dienstleister"
        description="Handwerksbetriebe, Hausverwaltungen und weitere Ansprechpartner zentral verwalten."
      />
      <form action={createContact} className="form-sheet compact-form" id="contact-create">
        <div className="form-grid">
          <label className="field">
            <span>Name</span>
            <input name="name" required />
          </label>
          <label className="field">
            <span>Firma</span>
            <input name="company" />
          </label>
          <label className="field">
            <span>Gewerk / Rolle</span>
            <input name="trade" />
          </label>
          <label className="field">
            <span>E-Mail</span>
            <input type="email" name="email" />
          </label>
          <label className="field">
            <span>Telefon</span>
            <input name="phone" />
          </label>
          <label className="field wide">
            <span>Notiz</span>
            <textarea name="notes" rows={2} />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn">Kontakt speichern</button>
        </div>
      </form>
      <div className="section-heading dossier-section-title">
        <div>
          <span className="eyebrow">Adressbuch</span>
          <h2>{rows.length} Kontakte</h2>
        </div>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Firma</th>
                <th>Rolle</th>
                <th>E-Mail</th>
                <th>Telefon</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Name">
                    <strong>{row.name}</strong>
                  </td>
                  <td data-label="Firma">{row.company || "–"}</td>
                  <td data-label="Rolle">{row.trade || "–"}</td>
                  <td data-label="E-Mail">
                    {row.email ? (
                      <a className="table-link" href={`mailto:${row.email}`}>
                        {row.email}
                      </a>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td data-label="Telefon">{row.phone || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="feature-status">
          <h2>Noch keine Kontakte</h2>
        </section>
      )}
    </AppShell>
  );
}
