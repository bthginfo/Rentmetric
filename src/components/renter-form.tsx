"use client";

import { useActionState } from "react";
import { createRenter, type RenterFormState } from "@/app/app/renters/actions";

type RenterDefaults = {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
};

export function RenterForm({
  defaults,
  action: submitAction = createRenter,
  submitLabel = "Mieter anlegen",
  cancelHref = "/app/renters",
}: {
  defaults?: RenterDefaults;
  action?: (state: RenterFormState, data: FormData) => Promise<RenterFormState>;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState<RenterFormState, FormData>(
    submitAction,
    undefined,
  );
  return (
    <form action={formAction} className="form-sheet">
      <div className="form-section-heading">
        <span>01</span>
        <div>
          <h2>Kontakt</h2>
        </div>
      </div>
      <div className="form-grid">
        <Field
          name="firstName"
          label="Vorname"
          autoComplete="given-name"
          defaultValue={defaults?.firstName}
          errors={state?.fieldErrors?.firstName}
        />
        <Field
          name="lastName"
          label="Nachname"
          autoComplete="family-name"
          defaultValue={defaults?.lastName}
          errors={state?.fieldErrors?.lastName}
        />
        <Field
          name="email"
          label="E-Mail (optional)"
          type="email"
          autoComplete="email"
          defaultValue={defaults?.email || ""}
          errors={state?.fieldErrors?.email}
        />
        <Field
          name="phone"
          label="Telefon (optional)"
          type="tel"
          autoComplete="tel"
          defaultValue={defaults?.phone || ""}
          errors={state?.fieldErrors?.phone}
        />
      </div>
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="form-actions">
        <a href={cancelHref} className="btn secondary">
          Abbrechen
        </a>
        <button className="btn" disabled={pending}>
          {pending ? "Wird gespeichert …" : submitLabel}
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
