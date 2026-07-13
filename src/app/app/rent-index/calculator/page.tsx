import Link from "next/link";
import { Calculator, CheckCircle2 } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { evaluateRentIndex } from "@/domain/rent-index-engine";
import type { StructuredRentIndexRules } from "@/lib/rent-index/types";
import { listOrganizationUnits } from "@/repositories/portfolio";
import { listActiveRentIndexSources } from "@/repositories/rent-index";

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export default async function RentIndexCalculatorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const query = await searchParams;
  const [units, sources] = await Promise.all([listOrganizationUnits(session.organizationId), listActiveRentIndexSources(session.organizationId)]);
  const unit = units.find((item) => item.id === query.unitId);
  const source = sources.find((item) => item.id === query.sourceId) ?? sources[0];
  const rules = source?.rules as StructuredRentIndexRules | undefined;
  const area = Number(query.area || unit?.areaSqm || 0);
  const year = Number(query.year || unit?.effectiveConstructionYear || unit?.yearBuilt || 0);
  const location = String(query.location || unit?.locationCategory || "average");
  const automaticAdjustments = unit ? [unit.hasBalcony && (unit.outdoorAreaTimesTen || 0) >= 10 ? "outdoor_space" : "", unit.rentIndexFeatures.hasOpenKitchen ? "open_kitchen" : "", unit.rentIndexFeatures.hasCeramicHob ? "ceramic_hob" : "", unit.rentIndexFeatures.hasFridge ? "fridge" : "", unit.rentIndexFeatures.hasDishwasher ? "dishwasher" : "", unit.rentIndexFeatures.hasUnderfloorHeating ? "underfloor_heating" : "", unit.rentIndexFeatures.hasIncompleteHeating ? "incomplete_heating" : "", unit.rentIndexFeatures.hasWalkInShower ? "walk_in_shower" : "", unit.rentIndexFeatures.hasTowelRadiator ? "towel_radiator" : "", unit.rentIndexFeatures.hasSecondBathroom || (unit.bathroomAreaTimesTen || 0) >= 60 ? "large_or_second_bath" : "", unit.rentIndexFeatures.hasModernWindows ? "modern_windows" : "", unit.rentIndexFeatures.hasModernFlooring ? "modern_flooring" : "", unit.rentIndexFeatures.hasElectricShutters || unit.rentIndexFeatures.hasVideoIntercom ? "special_equipment" : ""].filter(Boolean) as string[] : [];
  const adjustments = query.adjustment ? (Array.isArray(query.adjustment) ? query.adjustment : [query.adjustment]).map(String) : automaticAdjustments;
  let outcome: ReturnType<typeof evaluateRentIndex> | null = null;
  let error = "";
  if (query.calculate && rules && area && year) try { outcome = evaluateRentIndex(rules, { area, constructionYear: year, location, region: String(query.region || ""), equipmentClass: Number(query.equipmentClass || 2), adjustmentKeys: adjustments }); } catch (cause) { error = cause instanceof Error ? cause.message : "Berechnung nicht möglich."; }
  return <AppShell active="/app/rent-index">
    <PageHeader eyebrow="Nachvollziehbare Szenariorechnung" title="Mietspiegel-Rechner" description="Geprüfte Quelle und Wohnung zuordnen; Rechenschritte mit Seitenbeleg nachvollziehen." action={<Link className="btn secondary" href="/app/rent-index">Quellen verwalten</Link>} />
    {!sources.length ? <section className="empty-state"><Calculator size={28} /><h2>Noch keine aktive Regelquelle</h2><p>Mietspiegel hochladen und prüfen oder eine eigene Quelle anlegen.</p><Link className="btn" href="/app/rent-index/sources/new">Quelle anlegen</Link></section> : <form className="form-sheet" method="get">
      <div className="form-grid">
        <label className="field"><span>Quelle</span><select name="sourceId" defaultValue={source?.id}>{sources.map((item) => <option key={item.id} value={item.id}>{item.municipality} {item.version}</option>)}</select></label>
        <label className="field"><span>Einheit</span><select name="unitId" defaultValue={unit?.id || ""}><option value="">Manuelle Eingabe</option>{units.map((item) => <option key={item.id} value={item.id}>{item.propertyName} · {item.label}</option>)}</select></label>
        <label className="field"><span>Wohnfläche m²</span><input required name="area" type="number" step="0.1" min="1" defaultValue={area || ""} /></label>
        <label className="field"><span>Mietspiegel-Baujahr</span><input required name="year" type="number" min="1700" max="2100" defaultValue={year || ""} /></label>
        <label className="field"><span>Wohnlage / Viertel</span>{rules?.kind === "manual_ranges" ? <input name="location" defaultValue={location === "average" ? "" : location} placeholder="z. B. Ehrenfeld" /> : <select name="location" defaultValue={location}><option value="simple">Einfach</option><option value="average">Durchschnittlich / mittel</option><option value="good">Gut</option><option value="best">Sehr gut / beste</option>{rules?.kind === "munich_regression" && <><option value="central_average">Zentral durchschnittlich</option><option value="central_good">Zentral gut</option><option value="central_best">Zentral beste</option></>}</select>}</label>
        {rules?.kind === "cologne_ranges" && <label className="field"><span>Ausstattungsklasse</span><select name="equipmentClass" defaultValue={String(query.equipmentClass || 2)}>{Object.entries(rules.equipmentClasses).map(([key, label]) => <option key={key} value={key}>{key} · {label}</option>)}</select></label>}
        {rules?.kind === "berlin_ranges" && <label className="field"><span>Gebiet (bei Baujahr 1973–1990)</span><select name="region" defaultValue={String(query.region || "west")}><option value="west">West</option><option value="east">Ost</option></select></label>}
      </div>
      {rules?.kind === "munich_regression" && <fieldset className="feature-checks"><legend><strong>Anwendbare Zu-/Abschläge</strong><small>Nur auswählen, wenn die Originaldefinition vollständig erfüllt ist.</small></legend><div className="feature-group-options">{rules.adjustments.map((item) => <label className="feature-check" key={item.key}><input type="checkbox" name="adjustment" value={item.key} defaultChecked={adjustments.includes(item.key)} /><span><i />{item.label} ({item.amount > 0 ? "+" : ""}{item.amount.toFixed(2)} €/m²)</span></label>)}</div></fieldset>}
      <div className="form-actions"><button className="btn" name="calculate" value="1"><Calculator size={15} /> Berechnen</button></div>
    </form>}
    {error && <div className="error-banner">{error}</div>}
    {outcome && <section className="approval-panel"><CheckCircle2 size={23} /><div><h2>{euro.format(outcome.referenceMonthly)} Referenzmiete pro Monat</h2><p>Spanne {euro.format(outcome.lowMonthly)} bis {euro.format(outcome.highMonthly)} · {outcome.lowPerSqm.toFixed(2)} bis {outcome.highPerSqm.toFixed(2)} €/m²</p><ul>{outcome.breakdown.map((item) => <li key={`${item.label}-${item.page}`}>{item.label}: {item.amount > 0 ? "+" : ""}{item.amount.toFixed(2)} €/m² {item.page ? `(Seite ${item.page})` : ""}</li>)}</ul>{outcome.warnings.map((warning) => <p key={warning} className="form-error">{warning}</p>)}</div></section>}
    <p className="legal-note">Keine automatische Mieterhöhungsfreigabe. Lage, Kappungsgrenze, Sperrfristen und Begründung vor Verwendung prüfen.</p>
  </AppShell>;
}
