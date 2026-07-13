"use client";
import { useActionState } from "react";
import { updateRentIndexSource } from "@/app/app/rent-index/actions";

export function RentIndexSourceEditor({ source }: { source: { id: string; municipality: string; version: string; status: string; notes: string | null; geographicScope: unknown; rules: unknown } }) {
  const [state, action, pending] = useActionState(updateRentIndexSource.bind(null, source.id), undefined);
  const scope = source.geographicScope as { districts?: string[]; postalCodes?: string[] };
  return <form className="form-sheet" action={action}>
    <div className="form-grid"><label className="field"><span>Stadt / Gemeinde</span><input name="municipality" required defaultValue={source.municipality} /></label><label className="field"><span>Version</span><input name="version" required defaultValue={source.version} /></label><label className="field wide"><span>Viertel / Stadtteile</span><input name="districts" defaultValue={scope.districts?.join(", ")} /></label><label className="field wide"><span>Postleitzahlen</span><input name="postalCodes" defaultValue={scope.postalCodes?.join(", ")} /></label></div>
    <label className="field wide"><span>Strukturierte Regeln (erweiterter Editor)</span><textarea name="rulesJson" rows={24} spellCheck={false} defaultValue={JSON.stringify(source.rules, null, 2)} /></label>
    <p className="legal-note">Jede Änderung erzeugt eine neue Prüfsumme. Seitenbelege in importierten Regeln sollten nicht entfernt werden.</p>
    <label className="field wide"><span>Notizen zur Prüfung</span><textarea name="notes" rows={3} defaultValue={source.notes || ""} /></label>
    <label className="feature-check"><input type="checkbox" name="activate" defaultChecked={source.status === "active"} /><span><i />Nach dem Speichern aktiv verwenden</span></label>
    {state?.error && <p className="form-error">{state.error}</p>}
    <div className="form-actions"><a className="btn secondary" href="/app/rent-index">Abbrechen</a><button className="btn" disabled={pending}>{pending ? "Speichert …" : "Änderungen speichern"}</button></div>
  </form>;
}
