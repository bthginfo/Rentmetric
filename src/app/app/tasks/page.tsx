import Link from "next/link";
import { Check, RotateCcw } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { ensureSmartTasks } from "@/lib/smart-tasks";
import { listOrganizationTasks, taskCounts } from "@/repositories/tasks";
import { setTaskStatus } from "./actions";

const date = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const tone = { urgent: "urgent", warning: "warning", info: "success" } as const;
const label = {
  urgent: "Dringend",
  warning: "Wichtig",
  info: "Hinweis",
} as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ zeitraum?: string; created?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const selected = query.zeitraum ?? "open";
  await ensureSmartTasks(session.organizationId);
  const [rows, counts] = await Promise.all([
    listOrganizationTasks(session.organizationId, selected),
    taskCounts(session.organizationId),
  ]);
  const automatic = rows.filter((task) => task.sourceType !== "manual").length;

  return (
    <AppShell active="/app/tasks">
      <PageHeader
        eyebrow="Aktionscenter"
        title="Aufgaben & Fristen"
        description="Automatisch erkannte Hinweise und eigene Aufgaben – nachvollziehbar aus Ihren Daten abgeleitet."
        action={
          <Link className="btn" href="/app/tasks/new">
            Aufgabe anlegen
          </Link>
        }
      />
      {query.created === "1" && (
        <div className="success-banner" role="status">
          Aufgabe wurde angelegt.
        </div>
      )}
      <div className="filter-row">
        <nav className="filter-tabs" aria-label="Aufgabenfilter">
          <Link
            className={`filter-tab ${selected === "open" ? "active" : ""}`}
            href="/app/tasks"
          >
            Offen ({counts.open})
          </Link>
          <Link
            className={`filter-tab ${selected === "today" ? "active" : ""}`}
            href="/app/tasks?zeitraum=today"
          >
            Heute ({counts.today})
          </Link>
          <Link
            className={`filter-tab ${selected === "upcoming" ? "active" : ""}`}
            href="/app/tasks?zeitraum=upcoming"
          >
            Demnächst ({counts.upcoming})
          </Link>
          <Link
            className={`filter-tab ${selected === "done" ? "active" : ""}`}
            href="/app/tasks?zeitraum=done"
          >
            Erledigt ({counts.done})
          </Link>
        </nav>
      </div>
      <div className="task-layout">
        {rows.length ? (
          <section className="task-list" aria-label="Aufgaben">
            {rows.map((task, index) => (
              <article className="task-item" key={task.id}>
                <span className="task-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="task-copy">
                  <h3>{task.title}</h3>
                  <p>{task.description || "Keine zusätzliche Beschreibung."}</p>
                  <p style={{ marginTop: 6 }}>
                    {task.sourceType === "manual"
                      ? "Manuell angelegt"
                      : `Automatisch · ${task.ruleId || "Datenregel"}`}
                  </p>
                </div>
                <div className="task-meta">
                  <time>
                    {task.dueAt ? date.format(task.dueAt) : "Ohne Frist"}
                  </time>
                  <Badge
                    tone={tone[task.severity as keyof typeof tone] || "success"}
                  >
                    {label[task.severity as keyof typeof label] || "Hinweis"}
                  </Badge>
                  <form action={setTaskStatus}>
                    <input type="hidden" name="id" value={task.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={task.status === "done" ? "open" : "done"}
                    />
                    <button
                      className="task-action"
                      title={
                        task.status === "done" ? "Wieder öffnen" : "Erledigen"
                      }
                    >
                      {task.status === "done" ? (
                        <RotateCcw size={14} />
                      ) : (
                        <Check size={14} />
                      )}
                      {task.status === "done" ? "Öffnen" : "Erledigt"}
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="feature-status">
            <span className="eyebrow">Alles im Blick</span>
            <h2>Keine Aufgaben in diesem Filter</h2>
            <p>
              Neue manuelle Aufgaben und automatisch erkannte Prüfanlässe
              erscheinen hier.
            </p>
          </section>
        )}
        <aside>
          <div className="notice">
            <strong>Wichtiger Hinweis</strong>
            <br />
            Rentmetric strukturiert Termine und Prüfanlässe, ersetzt aber keine
            Rechts- oder Steuerberatung.
          </div>
          <div className="auto-box">
            <h3>So entstehen smarte Hinweise</h3>
            <p>
              Vertragsdaten, offene Zahlungen, Dokumentlaufzeiten, Leerstände
              und Importprüfungen werden regelbasiert und idempotent
              ausgewertet.
            </p>
          </div>
          <div className="auto-box">
            <h3>Automatisch · {automatic}</h3>
            <p>
              Jeder Hinweis nennt Regel und Datengrundlage; rechtliche Maßnahmen
              bleiben manuell.
            </p>
          </div>
          <div className="auto-box">
            <h3>Manuell · {rows.length - automatic}</h3>
            <p>Von Ihnen oder dem Team angelegte Aufgaben.</p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
