import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bath,
  CalendarDays,
  CarFront,
  ChefHat,
  DoorOpen,
  History,
  Layers3,
  Mail,
  Pencil,
  Phone,
  Ruler,
  ThermometerSun,
  UserRound,
  Wind,
} from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui";
import { getOrganizationUnit } from "@/repositories/portfolio";

const status = {
  vacant: ["Frei", "warning"],
  occupied: ["Vermietet", "success"],
  owner_occupied: ["Eigennutzung", ""],
  renovation: ["In Sanierung", "warning"],
} as const;
const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const date = new Intl.DateTimeFormat("de-DE");

export default async function UnitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const session = await requireSession();
  const { unitId } = await params;
  const query = await searchParams;
  const result = await getOrganizationUnit(session.organizationId, unitId);
  if (!result) notFound();
  const { unit, property, currentTenancy, tenancyHistory } = result;
  const rentFeatures = unit.rentIndexFeatures || {};

  return (
    <AppShell active="/app/properties">
      <div className="dossier-breadcrumb">
        <Link href="/app/properties">Immobilien</Link>
        <span>/</span>
        <Link href={`/app/properties/${property.id}`}>{property.name}</Link>
        <span>/</span>
        <span>{unit.label}</span>
      </div>
      {query.updated === "1" && (
        <div className="success-banner" role="status">
          Die Stammdaten wurden aktualisiert.
        </div>
      )}
      <header className="unit-detail-header">
        <div className="unit-detail-icon">
          <DoorOpen size={28} />
        </div>
        <div>
          <span className="eyebrow">Wohnungs-Dossier</span>
          <h1>{unit.label}</h1>
          <p>
            {property.name} · {property.street} {property.houseNumber},{" "}
            {property.city}
          </p>
        </div>
        <Badge tone={status[unit.status][1]}>{status[unit.status][0]}</Badge>
        <Link className="btn secondary" href={`/app/units/${unit.id}/edit`}>
          <Pencil size={14} /> Bearbeiten
        </Link>
      </header>
      <section className="unit-rent-strip">
        <div>
          <span>Ziel-Kaltmiete</span>
          <strong>
            {unit.targetColdRentCents != null
              ? money.format(unit.targetColdRentCents / 100)
              : "–"}
          </strong>
          <small>monatlicher Planwert</small>
        </div>
        <div>
          <span>Nebenkosten-Schätzung</span>
          <strong>
            {unit.utilityEstimateCents != null
              ? money.format(unit.utilityEstimateCents / 100)
              : "–"}
          </strong>
          <small>kein Vertragswert</small>
        </div>
        <div>
          <span>Wohnfläche</span>
          <strong>{unit.areaSqm ? `${unit.areaSqm} m²` : "–"}</strong>
          <small>
            {unit.roomsTimesTen
              ? `${unit.roomsTimesTen / 10} Zimmer`
              : "Zimmer nicht erfasst"}
          </small>
        </div>
        <div>
          <span>Lage</span>
          <strong>{unit.floor || "–"}</strong>
          <small>im Objekt</small>
        </div>
      </section>
      <div className="unit-detail-grid">
        <section className="detail-panel">
          <div className="panel-title">
            <UserRound size={17} />
            <h2>Aktuelles Mietverhältnis</h2>
          </div>
          {currentTenancy ? (
            <dl className="detail-list">
              <Row
                icon={<UserRound size={16} />}
                label="Mieter:in"
                value={`${currentTenancy.renterFirstName} ${currentTenancy.renterLastName}`}
              />
              <Row
                icon={<CalendarDays size={16} />}
                label="Vertragslaufzeit"
                value={`${date.format(currentTenancy.startsAt)} – ${currentTenancy.endsAt ? date.format(currentTenancy.endsAt) : "unbefristet"}`}
              />
              <Row
                icon={<Ruler size={16} />}
                label="Kaltmiete"
                value={money.format(currentTenancy.coldRentCents / 100)}
              />
              {currentTenancy.renterEmail && (
                <Row
                  icon={<Mail size={16} />}
                  label="E-Mail"
                  value={currentTenancy.renterEmail}
                />
              )}
              {currentTenancy.renterPhone && (
                <Row
                  icon={<Phone size={16} />}
                  label="Telefon"
                  value={currentTenancy.renterPhone}
                />
              )}
            </dl>
          ) : (
            <p className="panel-empty">
              Für diese Einheit ist derzeit kein aktives Mietverhältnis
              hinterlegt.
            </p>
          )}
        </section>
        <section className="detail-panel">
          <div className="panel-title">
            <History size={17} />
            <h2>Mieterhistorie</h2>
          </div>
          {tenancyHistory.length ? (
            <dl className="detail-list">
              {tenancyHistory.map((tenancy) => (
                <div key={tenancy.id}>
                  <dt>
                    <UserRound size={16} />
                    <span>
                      {tenancy.renterFirstName} {tenancy.renterLastName}
                    </span>
                  </dt>
                  <dd>
                    {date.format(tenancy.startsAt)} –{" "}
                    {tenancy.endsAt ? date.format(tenancy.endsAt) : "heute"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="panel-empty">Noch keine Mietverhältnisse erfasst.</p>
          )}
        </section>
        <section className="detail-panel">
          <div className="panel-title">
            <Layers3 size={17} />
            <h2>Ausstattung &amp; Zustand</h2>
          </div>
          <dl className="detail-list">
            <Row icon={<CalendarDays size={16} />} label="Mietspiegel-Baujahr" value={unit.effectiveConstructionYear ? String(unit.effectiveConstructionYear) : property.yearBuilt ? String(property.yearBuilt) : null} />
            <Row icon={<CalendarDays size={16} />} label="Kernmodernisierung" value={unit.modernizationYear ? String(unit.modernizationYear) : null} />
            <Row icon={<DoorOpen size={16} />} label="Wohnlage" value={unit.locationCategory} />
            <Row icon={<Layers3 size={16} />} label="Gebäude-/Wohnungstyp" value={[unit.buildingType, unit.unitType].filter(Boolean).join(" · ")} />
            <Row
              icon={<Wind size={16} />}
              label="Zustand"
              value={unit.condition}
            />
            <Row
              icon={<ThermometerSun size={16} />}
              label="Heizung"
              value={[unit.heatingType, unit.energySource]
                .filter(Boolean)
                .join(" · ")}
            />
            <Row icon={<Bath size={16} />} label="Bad" value={unit.bathroom} />
            <Row
              icon={<Ruler size={16} />}
              label="Bodenbeläge"
              value={unit.flooring}
            />
            <Row
              icon={<CarFront size={16} />}
              label="Stellplätze"
              value={String(unit.parkingSpaces || 0)}
            />
          </dl>
        </section>
        <section className="detail-panel">
          <div className="panel-title">
            <ChefHat size={17} />
            <h2>Merkmale</h2>
          </div>
          <div className="feature-status-grid">
            <Feature label="Balkon / Terrasse" enabled={unit.hasBalcony} />
            <Feature label="Einbauküche" enabled={unit.hasFittedKitchen} />
            <Feature label="Aufzug" enabled={unit.hasElevator} />
            <Feature label="Barrierearm" enabled={unit.isAccessible} />
            <Feature label="Offene Küche" enabled={Boolean(rentFeatures.hasOpenKitchen)} />
            <Feature label="Ceran / Induktion" enabled={Boolean(rentFeatures.hasCeramicHob)} />
            <Feature label="Kühlschrank" enabled={Boolean(rentFeatures.hasFridge)} />
            <Feature label="Geschirrspüler" enabled={Boolean(rentFeatures.hasDishwasher)} />
            <Feature label="Fußbodenheizung" enabled={Boolean(rentFeatures.hasUnderfloorHeating)} />
            <Feature label="Bodengleiche Dusche" enabled={Boolean(rentFeatures.hasWalkInShower)} />
            <Feature label="Handtuchheizkörper" enabled={Boolean(rentFeatures.hasTowelRadiator)} />
            <Feature label="Zweites Bad" enabled={Boolean(rentFeatures.hasSecondBathroom)} />
            <Feature label="Modernisierte Fenster" enabled={Boolean(rentFeatures.hasModernWindows)} />
            <Feature label="Modernisierter Boden" enabled={Boolean(rentFeatures.hasModernFlooring)} />
            <Feature label="Elektrische Rollläden" enabled={Boolean(rentFeatures.hasElectricShutters)} />
            <Feature label="Videogegensprechanlage" enabled={Boolean(rentFeatures.hasVideoIntercom)} />
            <Feature label="Möbliert" enabled={Boolean(rentFeatures.isFurnished)} />
            <Feature label="Untergeschoss" enabled={Boolean(rentFeatures.isBasement)} />
            <Feature label="Dachgeschoss" enabled={Boolean(rentFeatures.isAttic)} />
            <Feature label="Stuck" enabled={Boolean(rentFeatures.hasStuck)} />
          </div>
          {unit.notes && (
            <div className="unit-notes">
              <span>Interne Notiz</span>
              <p>{unit.notes}</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt>
        {icon}
        <span>{label}</span>
      </dt>
      <dd>{value || "Nicht erfasst"}</dd>
    </div>
  );
}
function Feature({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className={enabled ? "enabled" : ""}>
      <i>{enabled ? "✓" : "–"}</i>
      <span>{label}</span>
    </div>
  );
}
