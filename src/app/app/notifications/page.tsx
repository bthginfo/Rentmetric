import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { listNotifications } from "@/repositories/notifications";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

export default async function NotificationsPage() {
  const session = await requireSession();
  const items = await listNotifications(session.organizationId, session.userId);
  return (
    <AppShell active="/app/notifications">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Intelligenter Posteingang</span>
          <h1>Benachrichtigungen</h1>
          <p>Fristen, Prüfanlässe und abgeschlossene Importe an einem Ort.</p>
        </div>
        {items.some((item) => item.status === "unread") && (
          <form action={markAllNotificationsRead}>
            <button className="btn secondary">
              Alle als gelesen markieren
            </button>
          </form>
        )}
      </div>
      <section className="notification-list">
        {items.length ? (
          items.map((item) => (
            <article
              key={item.id}
              className={`notification-row ${item.status === "unread" ? "unread" : ""}`}
            >
              <span className={`notification-kind ${item.type}`} />
              <div>
                <div className="notification-title-line">
                  <strong>{item.title}</strong>
                  <small>
                    {formatDistanceToNow(item.createdAt, {
                      addSuffix: true,
                      locale: de,
                    })}
                  </small>
                </div>
                {item.body && <p>{item.body}</p>}
                <div className="notification-actions">
                  {item.href && <Link href={item.href}>Öffnen</Link>}
                  {item.status === "unread" && (
                    <form action={markNotificationRead.bind(null, item.id)}>
                      <button>Als gelesen markieren</button>
                    </form>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h2>Alles erledigt</h2>
            <p>Neue Fristen und Prüfanlässe erscheinen automatisch hier.</p>
          </div>
        )}
      </section>
      <p className="legal-note">
        Hinweise auf mögliche Mietanpassungen sind eine regelbasierte Vorprüfung
        und keine Rechtsberatung oder automatische Freigabe.
      </p>
    </AppShell>
  );
}
