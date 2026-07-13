import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { utilityCostItems, utilityPeriods } from "@/db/schema";
import { listOrganizationProperties } from "@/repositories/portfolio";
import { addUtilityCost, createUtilityPeriod } from "./actions";
const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const date = new Intl.DateTimeFormat("de-DE");
export default async function UtilitiesPage() {
  const session = await requireSession();
  const [periods, costs, properties] = await Promise.all([
    getDb()
      .select()
      .from(utilityPeriods)
      .where(eq(utilityPeriods.organizationId, session.organizationId))
      .orderBy(desc(utilityPeriods.endsAt)),
    getDb()
      .select()
      .from(utilityCostItems)
      .where(eq(utilityCostItems.organizationId, session.organizationId)),
    listOrganizationProperties(session.organizationId),
  ]);
  const propertyNames = new Map(properties.map((item) => [item.id, item.name]));
  return (
    <AppShell active="/app/utilities">
      <PageHeader
        eyebrow="Abrechnung"
        title="Betriebskosten"
        description="Abrechnungsperioden und umlagefähige Kosten strukturiert vorbereiten; die Freigabe bleibt manuell."
      />
      <div className="dashboard-grid">
        <form action={createUtilityPeriod} className="form-sheet compact-form">
          <div className="form-section-heading">
            <span>01</span>
            <div>
              <h2>Abrechnungsperiode</h2>
            </div>
          </div>
          <div className="form-grid">
            <label className="field wide">
              <span>Objekt</span>
              <select name="propertyId" required>
                {properties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field wide">
              <span>Titel</span>
              <input name="title" required placeholder="Betriebskosten 2026" />
            </label>
            <label className="field">
              <span>Von</span>
              <input type="date" name="startsAt" required />
            </label>
            <label className="field">
              <span>Bis</span>
              <input type="date" name="endsAt" required />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn">Periode anlegen</button>
          </div>
        </form>
        <form action={addUtilityCost} className="form-sheet compact-form">
          <div className="form-section-heading">
            <span>02</span>
            <div>
              <h2>Kostenposition</h2>
            </div>
          </div>
          <div className="form-grid">
            <label className="field wide">
              <span>Periode</span>
              <select name="periodId" required>
                {periods.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field wide">
              <span>Bezeichnung</span>
              <input name="label" required />
            </label>
            <label className="field">
              <span>Betrag in €</span>
              <input type="number" step="0.01" name="amount" required />
            </label>
            <label className="field">
              <span>Verteilerschlüssel</span>
              <select name="allocationKey">
                <option value="area">Wohnfläche</option>
                <option value="units">Einheiten</option>
                <option value="consumption">Verbrauch</option>
                <option value="manual">Manuell</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button className="btn" disabled={!periods.length}>
              Kosten speichern
            </button>
          </div>
        </form>
      </div>
      <div className="section-heading dossier-section-title">
        <div>
          <span className="eyebrow">Abrechnungsjournal</span>
          <h2>{periods.length} Perioden</h2>
        </div>
      </div>
      {periods.map((period) => {
        const items = costs.filter((item) => item.periodId === period.id);
        return (
          <section className="detail-panel" key={period.id}>
            <div className="panel-title">
              <h2>
                {period.title} · {propertyNames.get(period.propertyId)}
              </h2>
              <Badge tone="warning">
                {period.status === "draft" ? "Entwurf" : period.status}
              </Badge>
            </div>
            <p className="muted">
              {date.format(period.startsAt)} – {date.format(period.endsAt)}
            </p>
            <dl className="detail-list">
              {items.map((item) => (
                <div key={item.id}>
                  <dt>
                    {item.label} · {item.allocationKey}
                  </dt>
                  <dd>{money.format(item.amountCents / 100)}</dd>
                </div>
              ))}
              <div>
                <dt>Summe</dt>
                <dd>
                  {money.format(
                    items.reduce((sum, item) => sum + item.amountCents, 0) /
                      100,
                  )}
                </dd>
              </div>
            </dl>
          </section>
        );
      })}
    </AppShell>
  );
}
