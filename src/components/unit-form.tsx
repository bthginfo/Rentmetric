"use client";

import { useActionState } from "react";
import { createUnit, type UnitFormState } from "@/app/app/units/actions";

type UnitDefaults = {
  propertyId?: string;
  label?: string;
  floor?: string | null;
  areaSqm?: number | null;
  roomsTimesTen?: number | null;
  status?: "vacant" | "occupied" | "owner_occupied" | "renovation";
  targetColdRentCents?: number | null;
  utilityEstimateCents?: number | null;
  condition?: string | null;
  heatingType?: string | null;
  energySource?: string | null;
  bathroom?: string | null;
  flooring?: string | null;
  parkingSpaces?: number | null;
  hasBalcony?: boolean;
  hasFittedKitchen?: boolean;
  hasElevator?: boolean;
  isAccessible?: boolean;
  notes?: string | null;
};

export function UnitForm({ properties, defaultPropertyId, defaults, action = createUnit, submitLabel = "Einheit anlegen", cancelHref = "/app/units" }: {
  properties: Array<{ id: string; name: string }>;
  defaultPropertyId?: string;
  defaults?: UnitDefaults;
  action?: (state: UnitFormState, data: FormData) => Promise<UnitFormState>;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState<UnitFormState, FormData>(action, undefined);
  const selectedProperty = defaults?.propertyId || defaultPropertyId || "";
  return <form action={formAction} className="form-sheet unit-form">
    <div className="form-section-heading"><span>01</span><div><h2>Einheit &amp; Nutzung</h2><p>Zuordnung, Lage und aktueller Nutzungsstatus.</p></div></div>
    <div className="form-grid">
      <label className="field wide"><span>Objekt</span><select name="propertyId" required defaultValue={selectedProperty}><option value="" disabled>Objekt auswählen</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select><Errors items={state?.fieldErrors?.propertyId} /></label>
      <Field name="label" label="Bezeichnung" placeholder="z. B. EG links" defaultValue={defaults?.label} errors={state?.fieldErrors?.label} />
      <Field name="floor" label="Etage" placeholder="Erdgeschoss" defaultValue={defaults?.floor || ""} errors={state?.fieldErrors?.floor} />
      <Field name="areaSqm" label="Wohnfläche m²" type="number" inputMode="numeric" placeholder="82" defaultValue={defaults?.areaSqm ?? ""} errors={state?.fieldErrors?.areaSqm} />
      <Field name="rooms" label="Zimmer" type="number" inputMode="decimal" step="0.5" placeholder="3.5" defaultValue={defaults?.roomsTimesTen ? defaults.roomsTimesTen / 10 : ""} errors={state?.fieldErrors?.rooms} />
      <label className="field wide"><span>Status</span><select name="status" defaultValue={defaults?.status || "vacant"}><option value="vacant">Frei</option><option value="occupied">Vermietet</option><option value="owner_occupied">Eigennutzung</option><option value="renovation">In Sanierung</option></select><Errors items={state?.fieldErrors?.status} /></label>
    </div>

    <div className="form-section-heading"><span>02</span><div><h2>Miete &amp; Zielwerte</h2><p>Monatliche Beträge als Planwerte; laufende Vertragsmieten bleiben im Mietverhältnis.</p></div></div>
    <div className="form-grid">
      <Field name="targetColdRent" label="Ziel-Kaltmiete €" type="number" inputMode="decimal" step="0.01" min="0" placeholder="1040,00" defaultValue={defaults?.targetColdRentCents != null ? defaults.targetColdRentCents / 100 : ""} errors={state?.fieldErrors?.targetColdRent} />
      <Field name="utilityEstimate" label="Nebenkosten-Schätzung €" type="number" inputMode="decimal" step="0.01" min="0" placeholder="245,00" defaultValue={defaults?.utilityEstimateCents != null ? defaults.utilityEstimateCents / 100 : ""} errors={state?.fieldErrors?.utilityEstimate} />
    </div>

    <div className="form-section-heading"><span>03</span><div><h2>Ausstattung</h2><p>Merkmale für Exposé, Mietspiegel-Zuordnung und Instandhaltung.</p></div></div>
    <div className="form-grid">
      <Field name="condition" label="Zustand" placeholder="z. B. modernisiert" defaultValue={defaults?.condition || ""} errors={state?.fieldErrors?.condition} />
      <Field name="heatingType" label="Heizungsart" placeholder="z. B. Zentralheizung" defaultValue={defaults?.heatingType || ""} errors={state?.fieldErrors?.heatingType} />
      <Field name="energySource" label="Energieträger" placeholder="z. B. Fernwärme" defaultValue={defaults?.energySource || ""} errors={state?.fieldErrors?.energySource} />
      <Field name="bathroom" label="Bad" placeholder="z. B. Tageslichtbad, Dusche" defaultValue={defaults?.bathroom || ""} errors={state?.fieldErrors?.bathroom} />
      <Field name="flooring" label="Bodenbeläge" placeholder="z. B. Parkett, Fliesen" defaultValue={defaults?.flooring || ""} errors={state?.fieldErrors?.flooring} />
      <Field name="parkingSpaces" label="Stellplätze" type="number" min="0" max="20" defaultValue={defaults?.parkingSpaces ?? 0} errors={state?.fieldErrors?.parkingSpaces} />
      <fieldset className="feature-checks wide"><legend>Weitere Merkmale</legend><Check name="hasBalcony" label="Balkon / Terrasse" checked={defaults?.hasBalcony} /><Check name="hasFittedKitchen" label="Einbauküche" checked={defaults?.hasFittedKitchen} /><Check name="hasElevator" label="Aufzug" checked={defaults?.hasElevator} /><Check name="isAccessible" label="Barrierearm" checked={defaults?.isAccessible} /></fieldset>
      <label className="field wide"><span>Notizen</span><textarea name="notes" rows={5} defaultValue={defaults?.notes || ""} placeholder="Besonderheiten, letzte Modernisierung, offene Arbeiten …" /><Errors items={state?.fieldErrors?.notes} /></label>
    </div>
    {state?.error && <p className="form-error" role="alert">{state.error}</p>}
    <div className="form-actions"><a href={cancelHref} className="btn secondary">Abbrechen</a><button className="btn" disabled={pending}>{pending ? "Wird gespeichert …" : submitLabel}</button></div>
  </form>;
}

function Field({ name, label, errors, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { name: string; label: string; errors?: string[] }) {
  return <label className="field"><span>{label}</span><input name={name} required={name === "label"} {...input} /><Errors items={errors} /></label>;
}

function Check({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return <label className="feature-check"><input type="checkbox" name={name} defaultChecked={checked} /><span><i aria-hidden="true" />{label}</span></label>;
}

function Errors({ items }: { items?: string[] }) {
  return items?.map((error) => <small key={error} className="form-error">{error}</small>) || null;
}
