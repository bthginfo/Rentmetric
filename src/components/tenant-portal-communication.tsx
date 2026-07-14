import { randomUUID } from "node:crypto";
import { Check, CheckCircle2, Circle, MessageCircle, Send } from "lucide-react";
import { acknowledgePortalMessage, replyToPortalItem, setPortalTaskStatusFromPortal } from "@/app/share/actions";
import { Badge, SectionHeading } from "@/components/ui";

type Item = { id: string; kind: "message" | "task"; title: string; body: string; dueAt: Date | null; severity: string; taskStatus: "open" | "done"; tenantAcknowledgedAt: Date | null; createdAt: Date };
type Entry = { id: string; portalItemId: string; author: "landlord" | "renter" | "system"; type: "reply" | "status"; body: string | null; metadata: unknown; createdAt: Date };

const date = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });
const dateTime = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

function sortItems(items: Item[]) {
  const now = new Date();
  const rank = (item: Item) => item.kind === "task" && item.taskStatus === "open" && item.dueAt && item.dueAt < now ? 0 : item.kind === "task" && item.taskStatus === "open" ? 1 : item.kind === "task" ? 2 : 3;
  return [...items].sort((a, b) => rank(a) - rank(b) || b.createdAt.getTime() - a.createdAt.getTime());
}

function statusText(entry: Entry) {
  const metadata = entry.metadata && typeof entry.metadata === "object" ? entry.metadata as Record<string, unknown> : {};
  if (metadata.action === "acknowledged") return "Nachricht bestätigt";
  if (metadata.to === "done") return "Aufgabe erledigt";
  if (metadata.to === "open") return "Aufgabe wieder geöffnet";
  return "Status geändert";
}

export function TenantPortalCommunication({ token, items, entries, readOnly }: { token: string; items: Item[]; entries: Entry[]; readOnly: boolean }) {
  const reply = replyToPortalItem.bind(null, token);
  const acknowledge = acknowledgePortalMessage.bind(null, token);
  const setStatus = setPortalTaskStatusFromPortal.bind(null, token);
  return <section className="tenant-communication" id="nachrichten">
    <SectionHeading title="Nachrichten & Aufgaben" linkLabel={`${items.length} aktiv`}/>
    {items.length === 0 ? <div className="tenant-communication-empty"><MessageCircle size={22}/><div><strong>Alles ruhig</strong><p>Ihre Verwaltung hat aktuell keine Nachricht oder Aufgabe für Sie hinterlegt.</p></div></div> : <div className="tenant-communication-list">
      {sortItems(items).map((item) => {
        const overdue = item.kind === "task" && item.taskStatus === "open" && item.dueAt && item.dueAt < new Date();
        const thread = entries.filter((entry) => entry.portalItemId === item.id);
        return <article key={item.id} className={`tenant-message-card${overdue ? " is-overdue" : ""}`}>
          <header><div className="portal-thread-badges"><Badge tone={item.kind === "task" ? "warning" : ""}>{item.kind === "task" ? "Aufgabe" : "Nachricht"}</Badge>{item.kind === "task" && <Badge tone={item.taskStatus === "done" ? "success" : "warning"}>{item.taskStatus === "done" ? "Erledigt" : "Offen"}</Badge>}{overdue && <Badge tone="danger">Überfällig</Badge>}{item.severity !== "normal" && <Badge tone={item.severity === "urgent" ? "danger" : "warning"}>{item.severity === "urgent" ? "Dringend" : "Wichtig"}</Badge>}</div><h3>{item.title}</h3><small>{dateTime.format(item.createdAt)}{item.dueAt ? ` · fällig ${date.format(item.dueAt)}` : ""}</small></header>
          <div className="tenant-original-message"><span>Ihre Verwaltung</span><p>{item.body}</p></div>
          {thread.length > 0 && <ol className="portal-thread-entries">{thread.map((entry) => entry.type === "reply" ? <li key={entry.id} className={`portal-thread-entry is-${entry.author}`}><div><strong>{entry.author === "renter" ? "Sie" : entry.author === "landlord" ? "Verwaltung" : "System"}</strong><time>{dateTime.format(entry.createdAt)}</time></div><p>{entry.body}</p></li> : <li key={entry.id} className="portal-thread-status"><Check size={13}/><span>{statusText(entry)}</span><time>{dateTime.format(entry.createdAt)}</time></li>)}</ol>}
          {readOnly ? <p className="tenant-readonly-note">Dieses Mietverhältnis ist beendet. Der Verlauf bleibt lesbar.</p> : <div className="tenant-message-actions">
            {item.kind === "message" && !item.tenantAcknowledgedAt && <form action={acknowledge}><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="requestKey" value={randomUUID()}/><button className="btn secondary"><CheckCircle2 size={15}/> Gelesen &amp; verstanden</button></form>}
            {item.kind === "message" && item.tenantAcknowledgedAt && <span className="tenant-acknowledged"><CheckCircle2 size={15}/> Bestätigt am {date.format(item.tenantAcknowledgedAt)}</span>}
            {item.kind === "task" && <form action={setStatus}><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="requestKey" value={randomUUID()}/><input type="hidden" name="status" value={item.taskStatus === "open" ? "done" : "open"}/><button className="btn secondary">{item.taskStatus === "open" ? <CheckCircle2 size={15}/> : <Circle size={15}/>} {item.taskStatus === "open" ? "Als erledigt markieren" : "Wieder öffnen"}</button></form>}
            <form action={reply} className="tenant-reply-form"><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="requestKey" value={randomUUID()}/><label className="field"><span>Antwort</span><textarea name="body" rows={2} minLength={1} maxLength={2000} required placeholder="Ihre Antwort …"/></label><button className="btn"><Send size={14}/> Senden</button></form>
          </div>}
        </article>;
      })}
    </div>}
  </section>;
}
