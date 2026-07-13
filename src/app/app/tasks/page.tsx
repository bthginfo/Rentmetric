import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { tasks } from "@/lib/demo-data";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ zeitraum?: string }> }) {
  const selected = (await searchParams).zeitraum ?? "open";
  const rows = selected === "today" ? tasks.filter((task) => task.date === "Heute") : selected === "upcoming" ? tasks.filter((task) => task.date !== "Heute") : selected === "done" ? [] : tasks;

  return <AppShell active="/app/tasks">
    <PageHeader eyebrow="Aktionscenter" title="Aufgaben & Fristen" description="Automatisch erkannte Hinweise und eigene Aufgaben — nach Handlungsbedarf sortiert, nicht nach Lautstärke." action={<span className="availability-note">Eigene Aufgaben können im nächsten Ausbau erfasst werden.</span>} />
    <div className="filter-row"><nav className="filter-tabs" aria-label="Aufgabenfilter"><Link className={`filter-tab ${selected === "open" ? "active" : ""}`} href="/app/tasks">Offen (5)</Link><Link className={`filter-tab ${selected === "today" ? "active" : ""}`} href="/app/tasks?zeitraum=today">Heute (2)</Link><Link className={`filter-tab ${selected === "upcoming" ? "active" : ""}`} href="/app/tasks?zeitraum=upcoming">Demnächst (3)</Link><Link className={`filter-tab ${selected === "done" ? "active" : ""}`} href="/app/tasks?zeitraum=done">Erledigt</Link></nav></div>
    <div className="task-layout">{rows.length ? <section className="task-list" aria-label="Offene Aufgaben">{rows.map((task, index) => <article className="task-item" key={task.title}><span className="task-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div className="task-copy"><h3>{task.title}</h3><p>{task.detail}</p><p style={{ marginTop: 6 }}>{task.origin} erkannt</p></div><div className="task-meta"><time>{task.date}</time><Badge tone={task.tone}>{task.tag}</Badge></div></article>)}</section> : <section className="feature-status"><span className="eyebrow">Alles erledigt</span><h2>Keine erledigten Aufgaben im Demo-Zeitraum</h2><p>Abgeschlossene Hinweise erscheinen hier mit Abschlussdatum und nachvollziehbarer Herkunft.</p></section>}<aside><div className="notice"><strong>Wichtiger Hinweis</strong><br />Rentmetric strukturiert Termine und Prüfanlässe, ersetzt aber keine Rechts- oder Steuerberatung. Bitte bewerten Sie rechtliche Maßnahmen fachlich.</div><div className="auto-box"><h3>So entstehen smarte Hinweise</h3><p>Regelbasierte Prüfungen vergleichen Vertragsdaten, Zahlungen, Dokumentlaufzeiten und bekannte Fristen. Jeder Hinweis bleibt auf seine Datengrundlage zurückführbar.</p></div><div className="auto-box"><h3>Automatisch · 4</h3><p>Aus Zahlungsstatus, Mietbeginn, letzter Anpassung und Dokumentdaten abgeleitet.</p></div><div className="auto-box"><h3>Manuell · 1</h3><p>Von Ihnen oder einem Teammitglied angelegte Aufgabe.</p></div></aside></div>
  </AppShell>;
}
