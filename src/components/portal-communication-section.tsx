import { Archive, Check, ChevronDown, MessageCircle, RotateCcw, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { archivePortalItem, createPortalItem, deleteArchivedPortalItem, replyAsLandlord, restorePortalItem, setPortalTaskStatusAsLandlord, updatePortalItem } from "@/app/app/tenancies/portal-actions";

type PortalItem = {
  id: string;
  kind: "message" | "task";
  title: string;
  body: string;
  dueAt: Date | null;
  severity: string;
  taskStatus: "open" | "done";
  taskCompletedAt: Date | null;
  taskCompletedBy: string | null;
  tenantAcknowledgedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PortalEntry = {
  id: string;
  portalItemId: string;
  author: "landlord" | "renter" | "system";
  type: "reply" | "status";
  body: string | null;
  metadata: unknown;
  createdAt: Date;
};

const shortDate = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });
const dateTime = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });
const priorityLabel: Record<string, string> = { normal: "Normal", important: "Wichtig", urgent: "Dringend" };

function statusText(entry: PortalEntry) {
  const metadata = entry.metadata && typeof entry.metadata === "object" ? entry.metadata as Record<string, unknown> : {};
  if (metadata.action === "acknowledged") return "Nachricht wurde bestätigt";
  if (metadata.to === "done") return "Aufgabe wurde als erledigt markiert";
  if (metadata.to === "open") return "Aufgabe wurde wieder geöffnet";
  return "Status wurde geändert";
}

function PortalItemCard({ item, entries, tenancyId, readOnly }: { item: PortalItem; entries: PortalEntry[]; tenancyId: string; readOnly: boolean }) {
  const overdue = item.kind === "task" && item.taskStatus === "open" && item.dueAt && item.dueAt < new Date();
  return <article className="portal-thread-card">
    <header className="portal-thread-header">
      <div>
        <div className="portal-thread-badges">
          <Badge tone={item.kind === "task" ? "warning" : ""}>{item.kind === "task" ? "Aufgabe" : "Nachricht"}</Badge>
          {item.kind === "task" && <Badge tone={item.taskStatus === "done" ? "success" : "warning"}>{item.taskStatus === "done" ? "Erledigt" : "Offen"}</Badge>}
          {item.severity !== "normal" && <Badge tone={item.severity === "urgent" ? "danger" : "warning"}>{priorityLabel[item.severity]}</Badge>}
          {overdue && <Badge tone="danger">Überfällig</Badge>}
          {item.kind === "message" && item.tenantAcknowledgedAt && <Badge tone="success">Bestätigt</Badge>}
        </div>
        <h3>{item.title}</h3>
        <small>{dateTime.format(item.createdAt)}{item.dueAt ? ` · fällig ${shortDate.format(item.dueAt)}` : ""}</small>
      </div>
    </header>
    <div className="portal-original-message"><span>Verwaltung</span><p>{item.body}</p></div>
    {entries.length > 0 && <ol className="portal-thread-entries">
      {entries.map((entry) => entry.type === "reply" ? <li key={entry.id} className={`portal-thread-entry is-${entry.author}`}><div><strong>{entry.author === "renter" ? "Mieter:in" : entry.author === "landlord" ? "Verwaltung" : "System"}</strong><time>{dateTime.format(entry.createdAt)}</time></div><p>{entry.body}</p></li> : <li key={entry.id} className="portal-thread-status"><Check size={13}/><span>{statusText(entry)}</span><time>{dateTime.format(entry.createdAt)}</time></li>)}
    </ol>}
    {!readOnly && <div className="portal-thread-actions">
      <form action={replyAsLandlord} className="portal-inline-reply"><input type="hidden" name="tenancyId" value={tenancyId}/><input type="hidden" name="itemId" value={item.id}/><label className="field"><span>Antwort an Mieter:in</span><textarea name="body" rows={2} minLength={1} maxLength={2000} required placeholder="Antwort schreiben …"/></label><button className="btn secondary"><Send size={14}/> Antworten</button></form>
      <div className="portal-item-controls">
        {item.kind === "task" && <form action={setPortalTaskStatusAsLandlord}><input type="hidden" name="tenancyId" value={tenancyId}/><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="status" value={item.taskStatus === "open" ? "done" : "open"}/><button className="text-button">{item.taskStatus === "open" ? "Als erledigt markieren" : "Wieder öffnen"}</button></form>}
        <details className="portal-edit-disclosure"><summary><ChevronDown size={14}/> Bearbeiten</summary><form action={updatePortalItem} className="portal-edit-form"><input type="hidden" name="tenancyId" value={tenancyId}/><input type="hidden" name="itemId" value={item.id}/><div className="form-grid"><label className="field"><span>Typ</span><select name="kind" defaultValue={item.kind}><option value="message">Nachricht</option><option value="task">Aufgabe</option></select></label><label className="field"><span>Priorität</span><select name="severity" defaultValue={item.severity}><option value="normal">Normal</option><option value="important">Wichtig</option><option value="urgent">Dringend</option></select></label><label className="field wide"><span>Titel</span><input name="title" defaultValue={item.title} minLength={2} maxLength={160} required/></label><label className="field wide"><span>Inhalt</span><textarea name="body" defaultValue={item.body} minLength={1} maxLength={3000} rows={4} required/></label><label className="field"><span>Fällig am (nur Aufgabe)</span><input name="dueAt" type="date" defaultValue={item.dueAt?.toISOString().slice(0,10) ?? ""}/></label></div><button className="btn secondary">Änderungen speichern</button></form></details>
        <form action={archivePortalItem}><input type="hidden" name="tenancyId" value={tenancyId}/><input type="hidden" name="itemId" value={item.id}/><button className="text-button"><Archive size={14}/> Archivieren</button></form>
      </div>
    </div>}
  </article>;
}

export function PortalCommunicationSection({ tenancyId, activeItems, archivedItems, entries, readOnly, activeLinkCount }: { tenancyId: string; activeItems: PortalItem[]; archivedItems: PortalItem[]; entries: PortalEntry[]; readOnly: boolean; activeLinkCount: number }) {
  return <section className="detail-panel portal-communication" id="portal-communication">
    <div className="portal-communication-heading"><div className="panel-title"><MessageCircle size={18}/><div><h2>Nachrichten &amp; Aufgaben im Mieterportal</h2><p>{activeLinkCount ? `In ${activeLinkCount} aktivem Mieterlink sichtbar.` : "Wird sichtbar, sobald ein aktiver Mieterlink besteht."}</p></div></div><Badge tone={activeItems.some((item) => item.kind === "task" && item.taskStatus === "open") ? "warning" : "success"}>{activeItems.length} aktiv</Badge></div>
    {readOnly ? <div className="info-banner">Dieses Mietverhältnis ist beendet. Die Kommunikation bleibt lesbar.</div> : <details className="portal-create-disclosure" open={activeItems.length === 0}><summary><MessageCircle size={15}/> Nachricht oder Aufgabe hinzufügen</summary><form action={createPortalItem} className="portal-create-form"><input type="hidden" name="tenancyId" value={tenancyId}/><div className="form-grid"><label className="field"><span>Typ</span><select name="kind"><option value="message">Nachricht</option><option value="task">Aufgabe</option></select></label><label className="field"><span>Priorität</span><select name="severity"><option value="normal">Normal</option><option value="important">Wichtig</option><option value="urgent">Dringend</option></select></label><label className="field wide"><span>Titel</span><input name="title" minLength={2} maxLength={160} required placeholder="Worum geht es?"/></label><label className="field wide"><span>Nachricht</span><textarea name="body" minLength={1} maxLength={3000} rows={4} required placeholder="Klare Information oder Aufgabe für Ihre Mieter:innen"/></label><label className="field"><span>Fällig am (optional, nur Aufgabe)</span><input name="dueAt" type="date"/></label></div><button className="btn">Im Mieterportal veröffentlichen</button></form></details>}
    <div className="portal-thread-list">
      {activeItems.length ? activeItems.map((item) => <PortalItemCard key={item.id} item={item} entries={entries.filter((entry) => entry.portalItemId === item.id)} tenancyId={tenancyId} readOnly={readOnly}/>) : <div className="portal-communication-empty"><MessageCircle size={22}/><div><strong>Noch keine Nachricht oder Aufgabe</strong><p>Hinweise, Rückfragen und To-dos erscheinen hier als ruhiger Gesprächsverlauf.</p></div></div>}
    </div>
    {archivedItems.length > 0 && <details className="portal-archive"><summary><Archive size={15}/> Archiv ({archivedItems.length})</summary><div className="portal-archive-list">{archivedItems.map((item) => <article key={item.id} className="portal-archive-row"><div><strong>{item.title}</strong><small>{item.kind === "task" ? "Aufgabe" : "Nachricht"} · archiviert {item.archivedAt ? shortDate.format(item.archivedAt) : ""}</small></div>{!readOnly && <div className="portal-item-controls"><form action={restorePortalItem}><input type="hidden" name="tenancyId" value={tenancyId}/><input type="hidden" name="itemId" value={item.id}/><button className="text-button"><RotateCcw size={14}/> Wiederherstellen</button></form><details className="danger-zone"><summary><Trash2 size={14}/> Endgültig löschen</summary><form action={deleteArchivedPortalItem}><input type="hidden" name="tenancyId" value={tenancyId}/><input type="hidden" name="itemId" value={item.id}/><label className="field"><span>KOMMUNIKATION LÖSCHEN eingeben</span><input name="confirmation" pattern="KOMMUNIKATION LÖSCHEN" required/></label><label className="feature-check"><input type="checkbox" name="irreversible" value="yes" required/><span><i/>Unumkehrbares Löschen bestätigen</span></label><button className="btn secondary">Endgültig löschen</button></form></details></div>}</article>)}</div></details>}
  </section>;
}
