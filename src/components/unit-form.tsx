"use client";

import { useActionState } from "react";
import { createUnit, type UnitFormState } from "@/app/app/units/actions";

export function UnitForm({ properties }: { properties: Array<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState<UnitFormState, FormData>(createUnit, undefined);
  return <form action={action} className="form-sheet"><div className="form-section-heading"><span>01</span><div><h2>Einheit zuordnen</h2><p>Die Einheit bleibt automatisch im selben Arbeitsbereich wie das Objekt.</p></div></div><div className="form-grid"><label className="field wide"><span>Objekt</span><select name="propertyId" required defaultValue=""><option value="" disabled>Objekt auswählen</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select>{state?.fieldErrors?.propertyId?.map((error) => <small key={error} className="form-error">{error}</small>)}</label><Field name="label" label="Bezeichnung" placeholder="z. B. EG links" errors={state?.fieldErrors?.label} /><Field name="floor" label="Etage (optional)" placeholder="Erdgeschoss" errors={state?.fieldErrors?.floor} /><Field name="areaSqm" label="Wohnfläche m² (optional)" type="number" inputMode="numeric" placeholder="82" errors={state?.fieldErrors?.areaSqm} /><Field name="rooms" label="Zimmer (optional)" type="number" inputMode="decimal" step="0.5" placeholder="3.5" errors={state?.fieldErrors?.rooms} /></div>{state?.error && <p className="form-error" role="alert">{state.error}</p>}<div className="form-actions"><a href="/app/units" className="btn secondary">Abbrechen</a><button className="btn" disabled={pending}>{pending ? "Wird gespeichert …" : "Einheit anlegen"}</button></div></form>;
}
function Field({ name, label, errors, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { name: string; label: string; errors?: string[] }) { return <label className="field"><span>{label}</span><input name={name} required={name === "label"} {...input} />{errors?.map((error) => <small key={error} className="form-error">{error}</small>)}</label>; }

