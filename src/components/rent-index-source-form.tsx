"use client";
import { useActionState } from "react";
import { saveManualRentIndexSource } from "@/app/app/rent-index/actions";

export function RentIndexSourceForm() {
  const [state, action, pending] = useActionState(saveManualRentIndexSource, undefined);
  return <form action={action} className="form-sheet">
    <div className="form-section-heading"><span>01</span><div><h2>Quelle & Geltungsbereich</h2><p>Eine Stadtquelle kann optional auf Viertel und Postleitzahlen begrenzt werden.</p></div></div>
    <div className="form-grid">
      <label className="field"><span>Stadt / Gemeinde</span><input name="municipality" required placeholder="z. B. Köln" /></label>
      <label className="field"><span>Version</span><input name="version" required placeholder="z. B. 2025 – Eigene Tabelle" /></label>
      <label className="field"><span>Gültig ab</span><input name="effectiveFrom" type="date" required /></label>
      <label className="field"><span>Gültig bis (optional)</span><input name="validUntil" type="date" /></label>
      <label className="field wide"><span>Viertel / Stadtteile (kommagetrennt)</span><input name="districts" placeholder="Ehrenfeld, Nippes, Lindenthal" /></label>
      <label className="field wide"><span>Postleitzahlen (kommagetrennt)</span><input name="postalCodes" placeholder="50823, 50825" /></label>
    </div>
    <div className="form-section-heading"><span>02</span><div><h2>Bereichsregeln</h2><p>Eine Zeile je Baujahr-, Flächen- und Gebietsgruppe.</p></div></div>
    <label className="field wide"><span>Von Baujahr; bis Baujahr; von m²; bis m²; Viertel; Minimum; Referenz; Maximum; Hinweis</span><textarea name="rows" rows={10} required placeholder={"1900;1960;30;49,9;Ehrenfeld;8,50;10,20;12,00;Altbau\n1961;1990;50;69,9;;9,00;11,00;13,00;stadtweit"} /></label>
    <label className="field wide"><span>Interne Notizen</span><textarea name="notes" rows={3} /></label>
    <label className="feature-check"><input type="checkbox" name="activate" /><span><i />Direkt als aktive Quelle verwenden</span></label>
    {state?.error && <p className="form-error">{state.error}</p>}
    <div className="form-actions"><a className="btn secondary" href="/app/rent-index">Abbrechen</a><button className="btn" disabled={pending}>{pending ? "Speichert …" : "Quelle speichern"}</button></div>
  </form>;
}
