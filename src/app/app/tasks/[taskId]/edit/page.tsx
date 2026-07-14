import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { tasks } from "@/db/schema";
import { deleteManualTask, updateManualTask } from "../../actions";

export default async function EditTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { taskId } = await params;
  const query = await searchParams;
  const [task] = await getDb()
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.organizationId, session.organizationId),
        eq(tasks.sourceType, "manual"),
      ),
    )
    .limit(1);
  if (!task) notFound();
  return (
    <AppShell active="/app/tasks">
      <PageHeader
        eyebrow="Manuelle Aufgabe"
        title="Aufgabe bearbeiten"
        description={task.title}
      />
      {query.error && (
        <div className="error-banner" role="alert">
          Bitte prüfe Eingaben und Bestätigung.
        </div>
      )}
      <form action={updateManualTask} className="form-sheet">
        <input type="hidden" name="id" value={task.id} />
        <div className="form-grid">
          <label className="field wide">
            <span>Titel</span>
            <input name="title" defaultValue={task.title} required />
          </label>
          <label className="field">
            <span>Fällig am</span>
            <input
              type="date"
              name="dueAt"
              defaultValue={task.dueAt?.toISOString().slice(0, 10)}
            />
          </label>
          <label className="field">
            <span>Priorität</span>
            <select name="severity" defaultValue={task.severity}>
              <option value="info">Normal</option>
              <option value="warning">Wichtig</option>
              <option value="urgent">Dringend</option>
            </select>
          </label>
          <label className="field wide">
            <span>Beschreibung</span>
            <textarea
              name="description"
              rows={4}
              defaultValue={task.description || ""}
            />
          </label>
        </div>
        <div className="form-actions">
          <Link className="btn secondary" href="/app/tasks">
            Abbrechen
          </Link>
          <button className="btn">Änderungen speichern</button>
        </div>
      </form>
      <details className="danger-zone">
        <summary>Aufgabe löschen</summary>
        <p>Die manuelle Aufgabe wird endgültig gelöscht.</p>
        <form action={deleteManualTask}>
          <input type="hidden" name="id" value={task.id} />
          <label className="field">
            <span>„AUFGABE LÖSCHEN“ eingeben</span>
            <input name="confirmation" pattern="AUFGABE LÖSCHEN" required />
          </label>
          <button className="btn danger">Endgültig löschen</button>
        </form>
      </details>
    </AppShell>
  );
}
