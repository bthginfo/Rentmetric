"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createProperty, type PropertyFormState } from "@/app/app/properties/actions";

export function PropertyForm() {
  const [state, action, pending] = useActionState<PropertyFormState, FormData>(createProperty, undefined);
  return <form action={action} className="form-sheet">
    <div className="form-section-heading"><span>01</span><div><h2>Objektadresse</h2><p>Die Basis für Einheiten, Mietverhältnisse und regionale Mietspiegel.</p></div></div>
    <div className="form-grid">
      <Field name="name" label="Interner Objektname" placeholder="z. B. Kastanienhof" errors={state?.fieldErrors?.name} wide />
      <Field name="street" label="Straße" placeholder="Berrenrather Straße" errors={state?.fieldErrors?.street} />
      <Field name="houseNumber" label="Hausnummer" placeholder="214" errors={state?.fieldErrors?.houseNumber} />
      <Field name="postalCode" label="Postleitzahl" inputMode="numeric" placeholder="50937" errors={state?.fieldErrors?.postalCode} />
      <Field name="city" label="Ort" placeholder="Köln" errors={state?.fieldErrors?.city} />
      <Field name="state" label="Bundesland (optional)" placeholder="Nordrhein-Westfalen" errors={state?.fieldErrors?.state} wide />
    </div>
    <div className="form-section-heading"><span>02</span><div><h2>Gebäude & Einheiten</h2><p>Einheiten werden direkt als bearbeitbare Platzhalter angelegt.</p></div></div>
    <div className="form-grid">
      <Field name="yearBuilt" label="Baujahr (optional)" type="number" inputMode="numeric" placeholder="1998" errors={state?.fieldErrors?.yearBuilt} />
      <Field name="unitCount" label="Anzahl Einheiten" type="number" inputMode="numeric" defaultValue="1" errors={state?.fieldErrors?.unitCount} />
    </div>
    {state?.error && <p className="form-error" role="alert">{state.error}</p>}
    <div className="form-actions"><Link href="/app/properties" className="btn secondary">Abbrechen</Link><button className="btn" disabled={pending}>{pending ? "Wird gespeichert …" : "Objekt anlegen"}</button></div>
  </form>;
}

function Field({ name, label, errors, wide, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { name: string; label: string; errors?: string[]; wide?: boolean }) {
  return <label className={`field ${wide ? "wide" : ""}`}><span>{label}</span><input name={name} required={name !== "state" && name !== "yearBuilt"} {...input} />{errors?.map((error) => <small key={error} className="form-error">{error}</small>)}</label>;
}
