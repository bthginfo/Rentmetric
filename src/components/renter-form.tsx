"use client";

import { useActionState } from "react";
import { createRenter, type RenterFormState } from "@/app/app/renters/actions";

export function RenterForm() {
  const [state, action, pending] = useActionState<RenterFormState, FormData>(
    createRenter,
    undefined,
  );
  return (
    <form action={action} className="form-sheet">
      <div className="form-section-heading">
        <span>01</span>
        <div>
          <h2>Kontakt</h2>
          <p>
            Nur Daten speichern, die für das Mietverhältnis tatsächlich benötigt
            werden.
          </p>
        </div>
      </div>
      <div className="form-grid">
        <Field
          name="firstName"
          label="Vorname"
          autoComplete="given-name"
          errors={state?.fieldErrors?.firstName}
        />
        <Field
          name="lastName"
          label="Nachname"
          autoComplete="family-name"
          errors={state?.fieldErrors?.lastName}
        />
        <Field
          name="email"
          label="E-Mail (optional)"
          type="email"
          autoComplete="email"
          errors={state?.fieldErrors?.email}
        />
        <Field
          name="phone"
          label="Telefon (optional)"
          type="tel"
          autoComplete="tel"
          errors={state?.fieldErrors?.phone}
        />
      </div>
      <p className="privacy-hint">
        Kontaktdaten sind ausschließlich im aktuellen Arbeitsbereich sichtbar.
        Weitere sensible Angaben werden bewusst nicht abgefragt.
      </p>
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="form-actions">
        <a href="/app/renters" className="btn secondary">
          Abbrechen
        </a>
        <button className="btn" disabled={pending}>
          {pending ? "Wird gespeichert …" : "Mieter anlegen"}
        </button>
      </div>
    </form>
  );
}
function Field({
  name,
  label,
  errors,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  errors?: string[];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        required={name === "firstName" || name === "lastName"}
        {...input}
      />
      {errors?.map((error) => (
        <small key={error} className="form-error">
          {error}
        </small>
      ))}
    </label>
  );
}
