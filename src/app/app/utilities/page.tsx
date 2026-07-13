import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, CalendarClock, CircleDollarSign, FileCheck2, Plus } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { utilityCostItems, utilityPeriods } from "@/db/schema";
import { listOrganizationProperties } from "@/repositories/portfolio";
import { createUtilityPeriod } from "./actions";
const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
export default async function UtilitiesPage() {
  const session = await requireSession();
  const [periods, costs, properties] = await Promise.all([getDb().select().from(utilityPeriods).where(eq(utilityPeriods.organizationId, session.organizationId)).orderBy(desc(utilityPeriods.endsAt)), getDb().select().from(utilityCostItems).where(eq(utilityCostItems.organizationId, session.organizationId)), listOrganizationProperties(session.organizationId)]);
  const names = new Map(properties.map((item) => [item.id, item.name]));
  const total = costs.reduce((sum, item) => sum + item.amountCents, 0);
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 90);
  const dueSoon = periods.filter((item) => item.status !== "final" && new Date(item.endsAt.getTime() + 365 * 86400000) <= deadline).length;
  return <AppShell active="/app/utilities">
    <PageHeader eyebrow="Abrechnungszentrum" title="Betriebskosten" description="Kosten, Belege, Umlage und Vorauszahlungen je Abrechnungsperiode." />
    <section className="kpi-grid"><article><CircleDollarSign size={19} /><span>Erfasste Kosten</span><strong>{money.format(total / 100)}</strong><small>über alle Perioden</small></article><article><FileCheck2 size={19} /><span>Abgeschlossen</span><strong>{periods.filter((item) => item.status === "final").length}</strong><small>von {periods.length} Perioden</small></article><article><CalendarClock size={19} /><span>Frist in 90 Tagen</span><strong>{dueSoon}</strong><small>noch nicht abgeschlossen</small></article></section>
    <div className="dashboard-grid"><form action={createUtilityPeriod} className="form-sheet compact-form"><div className="form-section-heading"><span><Plus size={16} /></span><div><h2>Neue Periode</h2><p>Objekt und Abrechnungszeitraum festlegen.</p></div></div><div className="form-grid"><label className="field wide"><span>Objekt</span><select name="propertyId" required>{properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field wide"><span>Titel</span><input name="title" required placeholder="Betriebskosten 2026" /></label><label className="field"><span>Von</span><input type="date" name="startsAt" required /></label><label className="field"><span>Bis</span><input type="date" name="endsAt" required /></label></div><div className="form-actions"><button className="btn">Periode anlegen</button></div></form>
      <section className="detail-panel"><div className="panel-title"><h2>Abrechnungsablauf</h2></div><ol className="workflow-list"><li><b>1</b><span><strong>Belege & Kosten</strong><small>Rechnungen hochladen, Daten prüfen, Kostenart wählen.</small></span></li><li><b>2</b><span><strong>Umlage & Nutzerwechsel</strong><small>Fläche, Einheiten, Verbrauch und Mietzeiträume berücksichtigen.</small></span></li><li><b>3</b><span><strong>Prüfen & abschließen</strong><small>Vorauszahlungen, Saldo und Belegeinsicht kontrollieren.</small></span></li></ol></section></div>
    <div className="section-heading dossier-section-title"><div><span className="eyebrow">Perioden</span><h2>Abrechnungen</h2></div><span>{periods.length}</span></div>
    <div className="import-list">{periods.map((period) => { const items = costs.filter((item) => item.periodId === period.id); const sum = items.reduce((value, item) => value + item.amountCents, 0); return <Link href={`/app/utilities/${period.id}`} className="import-row" key={period.id}><span className={`import-status-icon ${period.status === "final" ? "success" : "warning"}`}><FileCheck2 size={18} /></span><span><strong>{period.title}</strong><small>{names.get(period.propertyId)}</small></span><span><strong>{money.format(sum / 100)}</strong><small>{items.length} Kostenpositionen</small></span><Badge tone={period.status === "final" ? "success" : "warning"}>{period.status === "final" ? "Abgeschlossen" : period.status === "review" ? "Prüfung" : "Entwurf"}</Badge><ArrowRight size={16} /></Link>; })}</div>
  </AppShell>;
}
