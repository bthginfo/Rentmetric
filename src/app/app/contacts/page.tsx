import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Pencil } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { contacts } from "@/db/schema";
import { createContact, deleteContact, updateContact } from "./actions";

type Query = {
  edit?: string;
  created?: string;
  updated?: string;
  deleted?: string;
  error?: string;
};

function ContactFields({ row }: { row?: typeof contacts.$inferSelect }) {
  return (
    <div className="form-grid">
      <label className="field">
        <span>Name</span>
        <input name="name" defaultValue={row?.name} required />
      </label>
      <label className="field">
        <span>Firma</span>
        <input name="company" defaultValue={row?.company || ""} />
      </label>
      <label className="field">
        <span>Gewerk / Rolle</span>
        <input name="trade" defaultValue={row?.trade || ""} />
      </label>
      <label className="field">
        <span>E-Mail</span>
        <input type="email" name="email" defaultValue={row?.email || ""} />
      </label>
      <label className="field">
        <span>Telefon</span>
        <input name="phone" defaultValue={row?.phone || ""} />
      </label>
      <label className="field wide">
        <span>Notiz</span>
        <textarea name="notes" rows={3} defaultValue={row?.notes || ""} />
      </label>
    </div>
  );
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const rows = await getDb()
    .select()
    .from(contacts)
    .where(eq(contacts.organizationId, session.organizationId))
    .orderBy(asc(contacts.name));
  const editing = rows.find((row) => row.id === query.edit);
  return (
    <AppShell active="/app/contacts">
      {query.created === "1" && (
        <div className="success-banner" role="status">
          Kontakt wurde angelegt.
        </div>
      )}
      {query.updated === "1" && (
        <div className="success-banner" role="status">
          Kontakt wurde aktualisiert.
        </div>
      )}
      {query.deleted === "1" && (
        <div className="success-banner" role="status">
          Kontakt wurde gelöscht.
        </div>
      )}
      {query.error === "invalid" && (
        <div className="error-banner" role="alert">
          Bitte prüfe die eingegebenen Kontaktdaten.
        </div>
      )}
      {query.error === "confirmation" && (
        <div className="error-banner" role="alert">
          Die Löschbestätigung war nicht vollständig.
        </div>
      )}
      {query.error === "referenced" && (
        <div className="error-banner" role="alert">
          Der Kontakt ist noch einem Wartungsfall zugewiesen. Weise den Vorgang
          zuerst neu zu oder entferne die Zuständigkeit.
        </div>
      )}
      <PageHeader
        eyebrow="Netzwerk"
        title="Kontakte & Dienstleister"
        description="Handwerksbetriebe, Hausverwaltungen und weitere Ansprechpartner zentral verwalten."
      />
      <details className="detail-panel create-drawer" id="contact-create">
        <summary className="btn">Kontakt anlegen</summary>
        <form action={createContact} className="compact-form">
          <ContactFields />
          <div className="form-actions">
            <button className="btn">Kontakt speichern</button>
          </div>
        </form>
      </details>
      {editing && (
        <section className="form-sheet compact-form" id="contact-edit">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Kontakt bearbeiten</span>
              <h2>{editing.name}</h2>
            </div>
            <Link className="text-button" href="/app/contacts">
              Schließen
            </Link>
          </div>
          <form action={updateContact}>
            <input type="hidden" name="id" value={editing.id} />
            <ContactFields row={editing} />
            <div className="form-actions">
              <button className="btn">Änderungen speichern</button>
            </div>
          </form>
          <details className="danger-zone">
            <summary>Kontakt löschen</summary>
            <p>
              Der Kontakt wird endgültig gelöscht. Zugewiesene Wartungsfälle
              blockieren den Vorgang.
            </p>
            <form action={deleteContact}>
              <input type="hidden" name="id" value={editing.id} />
              <label className="field">
                <span>„KONTAKT LÖSCHEN“ eingeben</span>
                <input
                  name="confirmation"
                  pattern="KONTAKT LÖSCHEN"
                  required
                  autoComplete="off"
                />
              </label>
              <button className="btn danger">Endgültig löschen</button>
            </form>
          </details>
        </section>
      )}
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
                <th>Aktion</th>
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
                  <td data-label="Aktion">
                    <Link
                      className="row-action"
                      href={`/app/contacts?edit=${row.id}#contact-edit`}
                    >
                      <Pencil size={14} /> Bearbeiten
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="empty-state">
          <h2>Noch keine Kontakte</h2>
          <p>Lege den ersten Dienstleister oder Ansprechpartner an.</p>
          <a className="btn secondary" href="#contact-create">
            Kontakt anlegen
          </a>
        </section>
      )}
    </AppShell>
  );
}
