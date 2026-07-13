"use client";
import { useActionState } from "react";
import { createTask, type TaskFormState } from "@/app/app/tasks/actions";

export function TaskForm() {
  const [state, action, pending] = useActionState<TaskFormState, FormData>(
    createTask,
    undefined,
  );
  return (
    <form action={action} className="form-sheet">
      <div className="form-section-heading">
        <span>01</span>
        <div>
          <h2>Eigene Aufgabe</h2>
          <p>
            Manuelle Aufgaben erscheinen gemeinsam mit regelbasierten Hinweisen
            im Aktionscenter.
          </p>
        </div>
      </div>
      <div className="form-grid">
        <label className="field wide">
          <span>Titel</span>
          <input name="title" required maxLength={160} />
          {state?.fieldErrors?.title?.map((error) => (
            <small className="form-error" key={error}>
              {error}
            </small>
          ))}
        </label>
        <label className="field">
          <span>Fällig am</span>
          <input name="dueAt" type="date" />
        </label>
        <label className="field">
          <span>Priorität</span>
          <select name="severity" defaultValue="info">
            <option value="info">Normal</option>
            <option value="warning">Wichtig</option>
            <option value="urgent">Dringend</option>
          </select>
        </label>
        <label className="field wide">
          <span>Beschreibung</span>
          <textarea name="description" rows={4} maxLength={1000} />
        </label>
      </div>
      {state?.error && <p className="form-error">{state.error}</p>}
      <div className="form-actions">
        <a className="btn secondary" href="/app/tasks">
          Abbrechen
        </a>
        <button className="btn" disabled={pending}>
          {pending ? "Wird gespeichert …" : "Aufgabe anlegen"}
        </button>
      </div>
    </form>
  );
}
