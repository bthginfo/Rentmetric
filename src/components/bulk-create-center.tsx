"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Download, FileSpreadsheet, Plus, Trash2, Upload, X } from "lucide-react";
import { commitBulkImport, previewBulkImport, type BulkCommitResult, type BulkPreview, type BulkRequest } from "@/app/app/bulk/actions";
import { bulkContracts, bulkEntityTypes, type BulkEntityType, type BulkRow, type BulkSource } from "@/domain/bulk-import";

type PropertyOption = { id: string; name: string; postalCode: string; city: string };
type UnitOption = { id: string; label: string; propertyName: string; propertyPostalCode: string };
type RenterOption = { id: string; firstName: string; lastName: string; email: string | null };

const labels: Record<string, string> = {
  name: "Objektname", strasse: "Straße", hausnummer: "Hausnr.", plz: "PLZ", ort: "Ort", bundesland: "Bundesland", baujahr: "Baujahr",
  objekt: "Objekt", objekt_plz: "Objekt-PLZ", bezeichnung: "Bezeichnung", etage: "Etage", flaeche_m2: "Fläche m²", zimmer: "Zimmer", status: "Status", ziel_kaltmiete_eur: "Ziel-Kaltmiete €", nebenkosten_eur: "Nebenkosten €", zustand: "Zustand", heizungsart: "Heizungsart", energietraeger: "Energieträger", bad: "Bad", boden: "Boden", stellplaetze: "Stellplätze", baujahr_mietspiegel: "Baujahr (Mietspiegel)", modernisierungsjahr: "Modernisiert", wohnlage: "Wohnlage", gebaeudetyp: "Gebäudetyp", wohnungstyp: "Wohnungstyp", balkonflaeche_m2: "Balkonfläche m²", badflaeche_m2: "Badfläche m²", balkon: "Balkon", einbaukueche: "Einbauküche", aufzug: "Aufzug", barrierearm: "Barrierearm", notizen: "Notizen",
  vorname: "Vorname", nachname: "Nachname", email: "E-Mail", telefon: "Telefon",
  einheit: "Einheit", mieter_email: "Mieter-E-Mail", beginn: "Beginn", ende: "Ende", kaltmiete_eur: "Kaltmiete €", kaution_eur: "Kaution €", mietfaellig_am: "Fällig am", verwendungszweck: "Verwendungszweck",
};

const descriptions: Record<BulkEntityType, string> = {
  properties: "Adressen und Gebäudedaten gesammelt erfassen.",
  units: "Mehrere Wohnungen einem vorhandenen Objekt zuordnen.",
  renters: "Kontakte vorbereiten, bevor Verträge angelegt werden.",
  tenancies: "Einheiten und Mieter:innen zu laufenden oder historischen Verträgen verbinden.",
};

const guide: Record<BulkEntityType, string[]> = {
  properties: ["Pflicht: Name, Straße, Hausnummer, PLZ und Ort", "Baujahr: ganze Zahl, z. B. 1988", "Adressen werden exakt auf Duplikate geprüft"],
  units: ["Objekt wird über exakten Namen und PLZ gefunden", "Dezimal: 78,5 oder 78.5 · Boolean: ja/nein", "Status: leer, vermietet, Eigennutzung oder Renovierung"],
  renters: ["Pflicht: Vorname und Nachname", "E-Mail ist optional, aber für eine sichere Zuordnung empfohlen", "Doppelte E-Mail-Adressen werden nicht importiert"],
  tenancies: ["Einheit: exakter Objektname, PLZ und Bezeichnung", "Mieter:in bevorzugt über eindeutige E-Mail", "Datum: JJJJ-MM-TT · Zeiträume dürfen sich nicht überschneiden"],
};

function emptyRows() { return Array.from({ length: 3 }, () => ({} as BulkRow)); }

export function BulkCreateCenter({ properties, units, renters, initialType }: { properties: PropertyOption[]; units: UnitOption[]; renters: RenterOption[]; initialType: BulkEntityType }) {
  const router = useRouter();
  const [type, setType] = useState<BulkEntityType>(initialType);
  const [source, setSource] = useState<BulkSource>("manual");
  const [rows, setRows] = useState<BulkRow[]>(emptyRows);
  const [details, setDetails] = useState(false);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [success, setSuccess] = useState<BulkCommitResult | null>(null);
  const [pending, setPending] = useState(false);
  const [fileError, setFileError] = useState("");
  const [operationError, setOperationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const contract = bulkContracts[type];
  const optional = contract.headers.filter((field) => !contract.core.includes(field));
  const issuesByRow = useMemo(() => new Map(rows.map((_, index) => [index + 1, preview?.issues.filter((issue) => issue.row === index + 1) ?? []])), [preview, rows]);

  const reset = (nextType = type, nextSource = source) => {
    setType(nextType); setSource(nextSource); setRows(emptyRows()); setCsv(""); setFileName(""); setPreview(null); setSuccess(null); setFileError(""); setOperationError(""); setDetails(false);
    router.replace(`/app/bulk?type=${nextType}`, { scroll: false });
  };
  const updateRow = (index: number, field: string, value: string) => {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    setPreview(null); setSuccess(null); setOperationError("");
  };
  const chooseProperty = (index: number, id: string) => {
    const item = properties.find((property) => property.id === id);
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, _propertyId: id, objekt: item?.name ?? "", objekt_plz: item?.postalCode ?? "" } : row));
    setPreview(null);
  };
  const chooseUnit = (index: number, id: string) => {
    const item = units.find((unit) => unit.id === id);
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, _unitId: id, objekt: item?.propertyName ?? "", objekt_plz: item?.propertyPostalCode ?? "", einheit: item?.label ?? "" } : row));
    setPreview(null);
  };
  const chooseRenter = (index: number, id: string) => {
    const item = renters.find((renter) => renter.id === id);
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, _renterId: id, mieter_email: item?.email ?? "", vorname: item?.firstName ?? "", nachname: item?.lastName ?? "" } : row));
    setPreview(null);
  };

  const payload = (overrideCsv?: string): BulkRequest => ({ type, source, rows: source === "manual" ? rows.filter((row) => contract.headers.some((field) => row[field]?.trim())) : undefined, csv: source === "csv" ? overrideCsv ?? csv : undefined });
  const runPreview = (overrideCsv?: string) => {
    setPending(true); setSuccess(null); setOperationError("");
    startTransition(async () => { try { setPreview(await previewBulkImport(payload(overrideCsv))); } catch { setOperationError("Die Prüfung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut."); } finally { setPending(false); } });
  };
  const runCommit = () => {
    setPending(true); setOperationError("");
    startTransition(async () => { try { const result = await commitBulkImport(payload()); setPreview(result); if (result.createdCount) setSuccess(result); } catch { setOperationError("Der Import konnte nicht gespeichert werden. Ihre Daten wurden nicht verändert."); } finally { setPending(false); } });
  };
  const acceptFile = async (file?: File) => {
    setFileError(""); setOperationError(""); setPreview(null); setSuccess(null);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setFileError("Die CSV darf höchstens 2 MB groß sein."); return; }
    if (!file.name.toLowerCase().endsWith(".csv")) { setFileError("Bitte eine CSV-Datei auswählen."); return; }
    const text = await file.text(); setCsv(text); setFileName(file.name); runPreview(text);
  };
  const nextType: Record<BulkEntityType, BulkEntityType | null> = { properties: "units", units: "renters", renters: "tenancies", tenancies: null };
  const listHref: Record<BulkEntityType, string> = { properties: "/app/properties", units: "/app/units", renters: "/app/renters", tenancies: "/app/tenancies" };

  if (success?.createdCount) return <section className="bulk-success" role="status"><span><Check size={22} /></span><p className="eyebrow">Import abgeschlossen</p><h2>{success.createdCount} {success.createdCount === 1 ? contract.singular : contract.label} angelegt</h2><p>Alle Datensätze wurden gemeinsam geprüft und gespeichert.</p><div><Link className="btn" href={listHref[type]}>Ergebnis öffnen</Link>{nextType[type] && <button className="btn secondary" onClick={() => reset(nextType[type]!)}>Weiter mit {bulkContracts[nextType[type]!].label}</button>}<button className="text-button" onClick={() => reset()}>Weiteren Import starten</button></div></section>;

  return <div className="bulk-center">
    <ol className="bulk-steps" aria-label="Importfortschritt">
      {["Datentyp", "Daten erfassen", "Prüfen", "Importieren"].map((label, index) => <li key={label} className={preview ? index <= 2 ? "active" : "" : index <= 1 ? "active" : ""}><span>{index + 1}</span>{label}</li>)}
    </ol>
    <section className="bulk-type-panel" aria-labelledby="bulk-type-title"><header><p className="eyebrow">Datentyp</p><h2 id="bulk-type-title">Was möchten Sie anlegen?</h2></header><div className="bulk-type-grid">{bulkEntityTypes.map((item) => <button key={item} className={item === type ? "active" : ""} onClick={() => reset(item, source)}><strong>{bulkContracts[item].label}</strong><small>{descriptions[item]}</small></button>)}</div><p className="bulk-sequence">Neuer Bestand? Am besten in dieser Reihenfolge: <b>Objekte → Einheiten → Mieter:innen → Mietverhältnisse</b></p></section>
    <section className="bulk-workspace">
      <header className="bulk-workspace-head"><div><p className="eyebrow">{contract.label}</p><h2>Daten erfassen</h2></div><div className="bulk-mode-switch" role="group" aria-label="Eingabemethode"><button className={source === "manual" ? "active" : ""} onClick={() => reset(type, "manual")}>Mehrere manuell</button><button className={source === "csv" ? "active" : ""} onClick={() => reset(type, "csv")}>CSV importieren</button></div></header>
      {operationError && <div className="error-banner bulk-operation-error" role="alert">{operationError}</div>}
      {source === "manual" ? <>
        <div className={`bulk-manual-grid bulk-${type}`}>
          {rows.map((row, index) => <article className={issuesByRow.get(index + 1)?.length ? "has-error" : ""} key={index}><header><strong>Zeile {index + 1}</strong>{rows.length > 1 && <button type="button" onClick={() => { setRows((current) => current.filter((_, i) => i !== index)); setPreview(null); }} aria-label={`Zeile ${index + 1} entfernen`}><Trash2 size={15} /></button>}</header><div className="bulk-fields">
            {type === "units" && <label><span>Objekt *</span><select value={row._propertyId ?? ""} onChange={(event) => chooseProperty(index, event.target.value)}><option value="">Objekt auswählen</option>{properties.map((property) => <option value={property.id} key={property.id}>{property.name} · {property.postalCode} {property.city}</option>)}</select></label>}
            {type === "tenancies" && <><label><span>Einheit *</span><select value={row._unitId ?? ""} onChange={(event) => chooseUnit(index, event.target.value)}><option value="">Einheit auswählen</option>{units.map((unit) => <option value={unit.id} key={unit.id}>{unit.propertyName} · {unit.label}</option>)}</select></label><label><span>Mieter:in *</span><select value={row._renterId ?? ""} onChange={(event) => chooseRenter(index, event.target.value)}><option value="">Mieter:in auswählen</option>{renters.map((renter) => <option value={renter.id} key={renter.id}>{renter.firstName} {renter.lastName}{renter.email ? ` · ${renter.email}` : ""}</option>)}</select></label></>}
            {contract.core.filter((field) => !(type === "units" && ["objekt", "objekt_plz"].includes(field)) && !(type === "tenancies" && ["objekt", "einheit", "mieter_email"].includes(field))).map((field) => <Field key={field} field={field} value={row[field] ?? ""} required={contract.required.includes(field)} onChange={(value) => updateRow(index, field, value)} />)}
            {details && optional.filter((field) => !(type === "tenancies" && ["vorname", "nachname"].includes(field))).map((field) => <Field key={field} field={field} value={row[field] ?? ""} required={false} onChange={(value) => updateRow(index, field, value)} />)}
          </div>{issuesByRow.get(index + 1)?.length ? <ul className="bulk-row-errors">{issuesByRow.get(index + 1)!.map((issue, issueIndex) => <li key={`${issue.field}-${issueIndex}`}><b>{labels[issue.field] ?? issue.field}:</b> {issue.message}</li>)}</ul> : null}</article>)}
        </div>
        <div className="bulk-row-actions"><button className="btn secondary" disabled={rows.length >= 100} onClick={() => { setRows((current) => [...current, {}]); setPreview(null); }}><Plus size={16} /> Zeile hinzufügen</button>{optional.length > 0 && <button className="text-button" onClick={() => setDetails((value) => !value)}>{details ? "Optionale Felder ausblenden" : `${optional.length} optionale Felder anzeigen`} <ChevronDown size={14} /></button>}<span>{rows.length} / 100 Zeilen</span></div>
      </> : <div className="bulk-csv-layout"><div><input ref={inputRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => acceptFile(event.target.files?.[0])} />{fileName ? <div className="bulk-file-selected"><FileSpreadsheet size={25} /><span><strong>{fileName}</strong><small>CSV ausgewählt und geprüft</small></span><div className="bulk-file-actions"><button className="text-button" onClick={() => inputRef.current?.click()}>Ersetzen</button><button onClick={() => { setCsv(""); setFileName(""); setPreview(null); setOperationError(""); if (inputRef.current) inputRef.current.value = ""; }} aria-label="Datei entfernen"><X size={17} /></button></div></div> : <button className="bulk-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptFile(event.dataTransfer.files[0]); }}><Upload size={26} /><strong>CSV hier ablegen</strong><span>oder Datei auswählen · maximal 2 MB</span></button>}{fileError && <p className="field-error" role="alert">{fileError}</p>}</div><aside className="bulk-template-guide"><h3>Passende Vorlage</h3><div><a className="btn secondary" href={`/api/bulk-template?type=${type}&variant=blank`}><Download size={15} /> Blanko-Vorlage</a><a className="text-button" href={`/api/bulk-template?type=${type}&variant=example`}>Beispieldatei laden</a></div><ul>{guide[type].map((item) => <li key={item}>{item}</li>)}</ul></aside></div>}
    </section>
    {preview && <section className={`bulk-preview ${preview.ok ? "is-valid" : "has-errors"}`} aria-live="polite"><header><div><p className="eyebrow">Prüfergebnis</p><h2>{preview.ok ? "Bereit zum Import" : "Bitte Angaben korrigieren"}</h2></div><div className="bulk-summary"><span><b>{preview.rowCount}</b> Gesamt</span><span className="valid"><b>{preview.validCount}</b> Gültig</span><span className={preview.conflictCount ? "invalid" : ""}><b>{preview.conflictCount}</b> Fehler</span></div></header>{preview.issues.some((issue) => issue.row === 0) && <ul className="bulk-global-errors">{preview.issues.filter((issue) => issue.row === 0).map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>}{source === "csv" && preview.rows.length > 0 && <div className="bulk-csv-preview"><table><thead><tr><th>Zeile</th>{contract.core.slice(0, 5).map((field) => <th key={field}>{labels[field] ?? field}</th>)}</tr></thead><tbody>{preview.rows.slice(0, 8).map((row, index) => <tr className={preview.issues.some((issue) => issue.row === index + 1) ? "invalid" : ""} key={index}><td>{index + 1}</td>{contract.core.slice(0, 5).map((field) => <td key={field}>{row[field] || "–"}</td>)}</tr>)}</tbody></table>{preview.rows.length > 8 && <p>Weitere {preview.rows.length - 8} Zeilen werden ebenfalls importiert.</p>}</div>}{source === "csv" && preview.issues.filter((issue) => issue.row > 0).length > 0 && <ul className="bulk-row-errors bulk-csv-errors">{preview.issues.filter((issue) => issue.row > 0).slice(0, 30).map((issue, index) => <li key={index}><b>Zeile {issue.row} · {labels[issue.field] ?? issue.field}:</b> {issue.message}</li>)}</ul>}</section>}
    <footer className="bulk-footer"><span>{pending ? "Daten werden sicher geprüft …" : preview?.ok ? "Alle Zeilen sind gültig. Der Import erfolgt vollständig oder gar nicht." : "Vor dem Import werden alle Zeilen geprüft."}</span><div>{preview?.ok && <button className="text-button" disabled={pending} onClick={() => setPreview(null)}>Angaben ändern</button>}<button className="btn" disabled={pending || (source === "csv" && !csv) || (preview ? !preview.ok : false)} onClick={() => preview?.ok ? runCommit() : runPreview()}>{pending ? "Bitte warten …" : preview?.ok ? `${preview.rowCount} ${contract.label} importieren` : "Daten prüfen"}</button></div></footer>
  </div>;
}

function Field({ field, value, required, onChange }: { field: string; value: string; required: boolean; onChange: (value: string) => void }) {
  if (["balkon", "einbaukueche", "aufzug", "barrierearm"].includes(field)) return <label><span>{labels[field]}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">–</option><option value="ja">Ja</option><option value="nein">Nein</option></select></label>;
  if (field === "status") return <label><span>{labels[field]}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="leer">Leer</option><option value="vermietet">Vermietet</option><option value="eigennutzung">Eigennutzung</option><option value="renovierung">Renovierung</option></select></label>;
  const inputType = ["beginn", "ende"].includes(field) ? "date" : ["baujahr", "flaeche_m2", "zimmer", "ziel_kaltmiete_eur", "nebenkosten_eur", "stellplaetze", "baujahr_mietspiegel", "modernisierungsjahr", "balkonflaeche_m2", "badflaeche_m2", "kaltmiete_eur", "kaution_eur", "mietfaellig_am"].includes(field) ? "number" : field.includes("email") ? "email" : "text";
  return <label className={field === "notizen" ? "wide" : ""}><span>{labels[field] ?? field}{required ? " *" : ""}</span>{field === "notizen" ? <textarea value={value} onChange={(event) => onChange(event.target.value)} /> : <input type={inputType} value={value} required={required} step={["zimmer", "ziel_kaltmiete_eur", "nebenkosten_eur", "balkonflaeche_m2", "badflaeche_m2", "kaltmiete_eur", "kaution_eur"].includes(field) ? "0.01" : undefined} onChange={(event) => onChange(event.target.value)} />}</label>;
}
