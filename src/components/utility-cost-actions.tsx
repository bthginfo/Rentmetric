"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import {
  deleteUtilityCost,
  updateUtilityCost,
} from "@/app/app/utilities/actions";

type CostItem = {
  id: string;
  label: string;
  amountCents: number;
  allocationKey: string;
  vendor: string | null;
  invoiceDate: Date | null;
  notes: string | null;
  isRecoverable: boolean;
};

export function UtilityCostActions({
  periodId,
  item,
}: {
  periodId: string;
  item: CostItem;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) requestAnimationFrame(() => closeButton.current?.focus());
  }, [open]);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  return (
    <div className="utility-row-actions">
      <button
        ref={trigger}
        type="button"
        className="text-button utility-action-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Pencil size={14} /> {item.label} bearbeiten
      </button>
      {open && (
        <section
          id={panelId}
          className="utility-row-menu"
          aria-label={`Aktionen für ${item.label}`}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <div className="panel-title">
            <h3>Kostenposition bearbeiten</h3>
            <button
              ref={closeButton}
              className="icon-button"
              type="button"
              aria-label="Aktionsbereich schließen"
              onClick={close}
            >
              <X size={15} />
            </button>
          </div>
          <form action={updateUtilityCost} className="compact-form">
            <input type="hidden" name="periodId" value={periodId} />
            <input type="hidden" name="costItemId" value={item.id} />
            <div className="form-grid">
              <label className="field wide">
                <span>Kostenart</span>
                <input name="label" defaultValue={item.label} required />
              </label>
              <label className="field">
                <span>Betrag €</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  name="amount"
                  defaultValue={item.amountCents / 100}
                  required
                />
              </label>
              <label className="field">
                <span>Verteilung</span>
                <select name="allocationKey" defaultValue={item.allocationKey}>
                  <option value="area">Nach Wohnfläche</option>
                  <option value="units">Gleich je Einheit</option>
                  <option value="consumption">Nach Verbrauch</option>
                  <option value="manual">Manuell</option>
                </select>
              </label>
              <label className="field">
                <span>Lieferant</span>
                <input name="vendor" defaultValue={item.vendor || ""} />
              </label>
              <label className="field">
                <span>Rechnungsdatum</span>
                <input
                  type="date"
                  name="invoiceDate"
                  defaultValue={item.invoiceDate?.toISOString().slice(0, 10)}
                />
              </label>
              <label className="field wide">
                <span>Notiz</span>
                <input name="notes" defaultValue={item.notes || ""} />
              </label>
            </div>
            <input type="hidden" name="isRecoverable" value="false" />
            <label className="feature-check">
              <input
                type="checkbox"
                name="isRecoverable"
                value="true"
                defaultChecked={item.isRecoverable}
              />
              <span>
                <i />
                Umlagefähig
              </span>
            </label>
            <button className="btn secondary">Änderung speichern</button>
          </form>
          <details className="danger-zone">
            <summary>Position löschen</summary>
            <p>
              Die Kostenposition und ihre Verteilungen werden endgültig
              gelöscht.
            </p>
            <form action={deleteUtilityCost}>
              <input type="hidden" name="periodId" value={periodId} />
              <input type="hidden" name="costItemId" value={item.id} />
              <label className="field">
                <span>„KOSTEN LÖSCHEN“ eingeben</span>
                <input name="confirmation" pattern="KOSTEN LÖSCHEN" required />
              </label>
              <button className="btn danger">
                <Trash2 size={15} /> Löschen
              </button>
            </form>
          </details>
        </section>
      )}
    </div>
  );
}
