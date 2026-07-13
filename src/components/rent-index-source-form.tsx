"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveManualRentIndexSource } from "@/app/app/rent-index/actions";

type RangeRow = { yearFrom: string; yearTo: string; areaFrom: string; areaTo: string; district: string; low: string; reference: string; high: string; note: string };
const emptyRow = (): RangeRow => ({ yearFrom: "", yearTo: "", areaFrom: "", areaTo: "", district: "", low: "", reference: "", high: "", note: "" });

export function RentIndexSourceForm() {
  const [state, action, pending] = useActionState(saveManualRentIndexSource, undefined);
  const [rows, setRows] = useState<RangeRow[]>([emptyRow()]);
  const update = (index: number, key: keyof RangeRow, value: string) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  const serialized = JSON.stringify(rows.map((row) => ({ yearFrom: row.yearFrom ? Number(row.yearFrom) : null, yearTo: row.yearTo ? Number(row.yearTo) : null, areaFrom: Number(row.areaFrom), areaTo: Number(row.areaTo), district: row.district || undefined, low: Number(row.low), reference: Number(row.reference), high: Number(row.high), note: row.note || undefined })));

  return <form action={action} className="form-sheet guided-source-form">
    <div className="form-section-heading"><span>1</span><div><h2>Wo gilt der Mietspiegel?</h2><p>Stadt und Zeitraum festlegen. Viertel sind optional.</p></div></div>
    <div className="form-grid"><label className="field"><span>Stadt / Gemeinde</span><input name="municipality" required placeholder="z. B. Köln" /></label><label className="field"><span>Bezeichnung</span><input name="version" required placeholder="z. B. Mietspiegel 2025" /></label><label className="field"><span>Gültig ab</span><input name="effectiveFrom" type="date" required /></label><label className="field"><span>Gültig bis <small>optional</small></span><input name="validUntil" type="date" /></label><label className="field wide"><span>Viertel / Stadtteile <small>optional</small></span><input name="districts" placeholder="Ehrenfeld, Nippes, Lindenthal" /></label><label className="field wide"><span>Postleitzahlen <small>optional</small></span><input name="postalCodes" placeholder="50823, 50825" /></label></div>
    <div className="form-section-heading"><span>2</span><div><h2>Mietbereiche eintragen</h2><p>Eine Zeile beschreibt eine Wohnungsgruppe. Weitere Bereiche kannst du jederzeit hinzufügen.</p></div></div>
    <input type="hidden" name="rowsJson" value={serialized} />
    <div className="range-card-list">{rows.map((row, index) => <article className="range-card" key={index}><header><strong>Bereich {index + 1}</strong>{rows.length > 1 && <button className="icon-button" type="button" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label={`Bereich ${index + 1} entfernen`}><Trash2 size={15} /></button>}</header><div className="range-grid"><label className="field"><span>Baujahr von</span><input type="number" min="1800" max="2200" value={row.yearFrom} onChange={(event) => update(index, "yearFrom", event.target.value)} placeholder="z. B. 1900" /></label><label className="field"><span>Baujahr bis</span><input type="number" min="1800" max="2200" value={row.yearTo} onChange={(event) => update(index, "yearTo", event.target.value)} placeholder="z. B. 1960" /></label><label className="field"><span>Wohnfläche von m²</span><input type="number" min="0" step="0.1" required value={row.areaFrom} onChange={(event) => update(index, "areaFrom", event.target.value)} /></label><label className="field"><span>Wohnfläche bis m²</span><input type="number" min="0.1" step="0.1" required value={row.areaTo} onChange={(event) => update(index, "areaTo", event.target.value)} /></label><label className="field"><span>Untere Spanne €/m²</span><input type="number" min="0" step="0.01" required value={row.low} onChange={(event) => update(index, "low", event.target.value)} /></label><label className="field"><span>Vergleichswert €/m²</span><input type="number" min="0" step="0.01" required value={row.reference} onChange={(event) => update(index, "reference", event.target.value)} /></label><label className="field"><span>Obere Spanne €/m²</span><input type="number" min="0" step="0.01" required value={row.high} onChange={(event) => update(index, "high", event.target.value)} /></label><label className="field"><span>Viertel <small>optional</small></span><input value={row.district} onChange={(event) => update(index, "district", event.target.value)} /></label><label className="field wide"><span>Hinweis <small>optional</small></span><input value={row.note} onChange={(event) => update(index, "note", event.target.value)} placeholder="z. B. Altbau" /></label></div></article>)}</div>
    <button className="btn secondary add-range-button" type="button" onClick={() => setRows((current) => [...current, emptyRow()])}><Plus size={15} /> Weiteren Bereich hinzufügen</button>
    <label className="field wide"><span>Interne Notizen <small>optional</small></span><textarea name="notes" rows={3} /></label>
    <label className="feature-check"><input type="checkbox" name="activate" /><span><i />Nach dem Speichern direkt aktivieren</span></label>
    {state?.error && <p className="form-error">{state.error}</p>}
    <div className="form-actions"><a className="btn secondary" href="/app/rent-index">Abbrechen</a><button className="btn" disabled={pending}>{pending ? "Speichert …" : "Mietspiegel speichern"}</button></div>
  </form>;
}
