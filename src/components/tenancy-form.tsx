"use client";
import { useActionState } from "react";
import {
  createTenancy,
  type TenancyFormState,
} from "@/app/app/tenancies/actions";

export function TenancyForm({
  units,
  renters,
}: {
  units: Array<{ id: string; label: string; propertyName: string }>;
  renters: Array<{ id: string; firstName: string; lastName: string }>;
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
          <p>
            Die Einheit und der Mieter werden mandantensicher aus Ihrem Bestand
            gewählt.
          </p>
        </div>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Einheit</span>
          <select name="unitId" required defaultValue="">
            <option value="" disabled>
              Einheit auswählen
            </option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.propertyName} · {unit.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Mieter:in</span>
          <select name="renterId" required defaultValue="">
            <option value="" disabled>
              Mieter:in auswählen
            </option>
            {renters.map((renter) => (
              <option key={renter.id} value={renter.id}>
                {renter.firstName} {renter.lastName}
              </option>
            ))}
          </select>
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
        <a className="btn secondary" href="/app/tenancies">
          Abbrechen
        </a>
        <button className="btn" disabled={pending}>
          {pending ? "Wird gespeichert …" : "Mietverhältnis anlegen"}
        </button>
      </div>
    </form>
  );
}
