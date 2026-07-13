"use client";
import { useActionState } from "react";
import Link from "next/link";
import {
  createTenancy,
  type TenancyFormState,
} from "@/app/app/tenancies/actions";

export function TenancyForm({
  units,
  renters,
  defaultUnitId,
  defaultRenterId,
}: {
  units: Array<{ id: string; label: string; propertyName: string }>;
  renters: Array<{ id: string; firstName: string; lastName: string }>;
  defaultUnitId?: string;
  defaultRenterId?: string;
}) {
  const [state, action, pending] = useActionState<TenancyFormState, FormData>(
    createTenancy,
    undefined,
  );
  return (
    <form action={action} className="form-sheet">
      <div className="form-section-heading">
        <span>01</span>
        <div>
          <h2>Vertrag &amp; Parteien</h2>
        </div>
      </div>
      <div className="form-grid">
        <label className="field">
          <span className="field-label-with-action">Einheit <Link href="/app/units/new" target="_blank" rel="noreferrer">Neu anlegen ↗</Link></span>
          <select name="unitId" required defaultValue={defaultUnitId || ""}>
            <option value="" disabled>
              Einheit auswählen
            </option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.propertyName} · {unit.label}
              </option>
            ))}
          </select>
          {!units.length && <small className="relation-hint">Noch keine Einheit vorhanden. Der Link öffnet die Anlage in einem neuen Tab, damit diese Eingaben erhalten bleiben.</small>}
        </label>
        <label className="field">
          <span className="field-label-with-action">Mieter:in <Link href="/app/renters/new" target="_blank" rel="noreferrer">Neu anlegen ↗</Link></span>
          <select name="renterId" required defaultValue={defaultRenterId || ""}>
            <option value="" disabled>
              Mieter:in auswählen
            </option>
            {renters.map((renter) => (
              <option key={renter.id} value={renter.id}>
                {renter.firstName} {renter.lastName}
              </option>
            ))}
          </select>
          {!renters.length && <small className="relation-hint">Noch keine Mieter:in vorhanden. Nach der Anlage diese Seite neu laden.</small>}
        </label>
        <label className="field">
          <span>Beginn</span>
          <input type="date" name="startsAt" required />
        </label>
        <label className="field">
          <span>Ende (optional)</span>
          <input type="date" name="endsAt" />
        </label>
        <label className="field">
          <span>Kaltmiete in €</span>
          <input
            type="number"
            name="coldRent"
            min="0.01"
            step="0.01"
            required
          />
        </label>
        <label className="field">
          <span>Nebenkostenvorauszahlung in €</span>
          <input
            type="number"
            name="utilityAdvance"
            min="0"
            step="0.01"
            defaultValue="0"
            required
          />
        </label>
        <label className="field">
          <span>Kaution in €</span>
          <input
            type="number"
            name="deposit"
            min="0"
            step="0.01"
            defaultValue="0"
            required
          />
        </label>
      </div>
      {state?.fieldErrors && (
        <p className="form-error">
          Bitte prüfen Sie die markierten Vertragsangaben.
        </p>
      )}
      {state?.error && <p className="form-error">{state.error}</p>}
      <div className="form-actions">
        <Link className="btn secondary" href="/app/tenancies">
          Abbrechen
        </Link>
        <button className="btn" disabled={pending}>
          {pending ? "Wird gespeichert …" : "Mietverhältnis anlegen"}
        </button>
      </div>
    </form>
  );
}
