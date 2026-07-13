import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bath,
  Building2,
  CarFront,
  DoorOpen,
  Gauge,
  MapPin,
  ReceiptText,
  Ruler,
  Sparkles,
} from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { PropertyImageUploader } from "@/components/property-image-uploader";
import { Badge } from "@/components/ui";
import { getOrganizationProperty } from "@/repositories/portfolio";
import {
  archiveProperty,
  deleteArchivedProperty,
  restoreProperty,
} from "../actions";

const status = {
  vacant: { label: "Frei", tone: "warning" },
  occupied: { label: "Vermietet", tone: "success" },
  owner_occupied: { label: "Eigennutzung", tone: "" },
  renovation: { label: "Sanierung", tone: "warning" },
} as const;
const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ unitCreated?: string; deleteBlocked?: string }>;
}) {
  const session = await requireSession();
  const { propertyId } = await params;
  const query = await searchParams;
  const property = await getOrganizationProperty(
    session.organizationId,
    propertyId,
  );
  if (!property) notFound();
  const totalArea = property.units.reduce(
    (sum, unit) => sum + (unit.areaSqm || 0),
    0,
  );
  const targetRent = property.units.reduce(
    (sum, unit) => sum + (unit.targetColdRentCents || 0),
    0,
  );
  const occupied = property.units.filter(
    (unit) => unit.status === "occupied",
  ).length;
  return (
    <AppShell active="/app/properties">
      <div className="dossier-breadcrumb">
        <Link href="/app/properties">Immobilien</Link>
        <span>/</span>
        <span>{property.name}</span>
      </div>
      {query.unitCreated === "1" && (
        <div className="success-banner" role="status">
          Die neue Einheit wurde angelegt.
        </div>
      )}
      {query.deleteBlocked === "1" && (
        <div className="error-banner" role="alert">
          Das Objekt kann nicht endgültig gelöscht werden, solange Einheiten,
          Dokumente, Vorgänge oder Betriebskosten darauf verweisen.
        </div>
      )}
      {property.archivedAt && (
        <div className="info-banner" role="status">
          Dieses Objekt ist seit {property.archivedAt.toLocaleDateString("de-DE")} archiviert.
        </div>
      )}
      <section className="property-dossier">
        <header className="dossier-header">
          <div>
            <span className="eyebrow">Objekt-Dossier</span>
            <h1>{property.name}</h1>
            <p>
              <MapPin size={14} /> {property.street} {property.houseNumber},{" "}
              {property.postalCode} {property.city}
            </p>
          </div>
          {!property.archivedAt && <div className="dossier-actions">
            <Link href={`/app/utilities?propertyId=${property.id}`} className="btn">
              <ReceiptText size={15} /> Betriebskosten starten
            </Link>
            <Link href={`/app/units/new?propertyId=${property.id}`} className="btn secondary">
              <DoorOpen size={15} /> Einheit anlegen
            </Link>
            <Link href={`/app/documents?propertyId=${property.id}#document-upload`} className="context-link">Dokument hochladen</Link>
          </div>}
        </header>
        <div
          className={`property-gallery ${property.images.length ? "populated" : "empty"}`}
        >
          {property.images.length ? (
            property.images.slice(0, 5).map((image, index) => (
              <div className={`gallery-tile tile-${index}`} key={image.id}>
                <Image
                  src={`/api/property-images/${image.id}`}
                  alt={
                    image.altText || `${property.name}, Objektfoto ${index + 1}`
                  }
                  fill
                  sizes={
                    index === 0 ? "(max-width: 800px) 100vw, 55vw" : "25vw"
                  }
                  unoptimized
                />
              </div>
            ))
          ) : (
            <div className="gallery-empty">
              <span>
                <Building2 size={29} />
              </span>
              <strong>Noch keine Objektfotos</strong>
              <small>
                Eine kompakte Galerie macht das Dossier auf einen Blick
                erkennbar.
              </small>
            </div>
          )}
          <PropertyImageUploader
            organizationId={session.organizationId}
            userId={session.userId}
            propertyId={property.id}
          />
        </div>
        <div className="dossier-stats">
          <div>
            <span>Einheiten</span>
            <strong>{property.units.length}</strong>
            <small>{occupied} vermietet</small>
          </div>
          <div>
            <span>Wohnfläche</span>
            <strong>
              {totalArea || "–"}
              {totalArea ? " m²" : ""}
            </strong>
            <small>laut Stammdaten</small>
          </div>
          <div>
            <span>Ziel-Kaltmiete</span>
            <strong>{targetRent ? money.format(targetRent / 100) : "–"}</strong>
            <small>pro Monat</small>
          </div>
          <div>
            <span>Baujahr</span>
            <strong>{property.yearBuilt || "–"}</strong>
            <small>{property.state || "Bundesland offen"}</small>
          </div>
        </div>
      </section>
      <div className="section-heading dossier-section-title">
        <div>
          <span className="eyebrow">Wohnungsbestand</span>
          <h2>Einheiten im Objekt</h2>
        </div>
        <span>{property.units.length} gesamt</span>
      </div>
      {property.units.length ? (
        <div className="unit-dossier-list">
          {property.units.map((unit) => {
            const unitStatus = status[unit.status];
            const features = [
              unit.hasBalcony && "Balkon",
              unit.hasFittedKitchen && "Einbauküche",
              unit.hasElevator && "Aufzug",
              unit.isAccessible && "barrierearm",
            ].filter(Boolean);
            return (
              <Link
                href={`/app/units/${unit.id}`}
                className="unit-dossier-card"
                key={unit.id}
              >
                <div className="unit-card-top">
                  <div>
                    <span className="unit-number">
                      <DoorOpen size={15} />
                    </span>
                    <span>
                      <strong>{unit.label}</strong>
                      <small>{unit.floor || "Etage nicht erfasst"}</small>
                    </span>
                  </div>
                  <Badge tone={unitStatus.tone}>{unitStatus.label}</Badge>
                </div>
                <div className="unit-scanline">
                  <span>
                    <Ruler size={14} />
                    <strong>{unit.areaSqm ? `${unit.areaSqm} m²` : "–"}</strong>
                    <small>
                      {unit.roomsTimesTen
                        ? `${unit.roomsTimesTen / 10} Zimmer`
                        : "Zimmer offen"}
                    </small>
                  </span>
                  <span>
                    <Gauge size={14} />
                    <strong>
                      {unit.targetColdRentCents
                        ? money.format(unit.targetColdRentCents / 100)
                        : "–"}
                    </strong>
                    <small>Ziel-Kaltmiete</small>
                  </span>
                  <span>
                    <Sparkles size={14} />
                    <strong>{unit.condition || "Nicht bewertet"}</strong>
                    <small>Zustand</small>
                  </span>
                </div>
                <div className="equipment-line">
                  {features.length ? (
                    features.map((feature) => (
                      <span key={String(feature)}>{feature}</span>
                    ))
                  ) : (
                    <span>Keine Ausstattungsmerkmale erfasst</span>
                  )}
                  {unit.bathroom && (
                    <span>
                      <Bath size={12} /> {unit.bathroom}
                    </span>
                  )}
                  {unit.parkingSpaces > 0 && (
                    <span>
                      <CarFront size={12} /> {unit.parkingSpaces} Stellplatz
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <section className="empty-state compact-empty">
          <span className="empty-icon">
            <DoorOpen size={24} />
          </span>
          <h2>Noch keine Wohnung angelegt</h2>
          <p>
            Erfassen Sie Wohnfläche, Miete und Ausstattung direkt in diesem
            Objekt.
          </p>
          <Link
            href={`/app/units/new?propertyId=${property.id}`}
            className="btn"
          >
            Erste Einheit anlegen
          </Link>
        </section>
      )}
      <section className={`lifecycle-panel ${property.archivedAt ? "danger-zone" : ""}`}>
        <div>
          <span className="eyebrow">Lebenszyklus</span>
          <h2>{property.archivedAt ? "Archiviertes Objekt" : "Objekt archivieren"}</h2>
          <p>
            {property.archivedAt
              ? "Sie können das Objekt wiederherstellen. Endgültiges Löschen ist nur ohne abhängige Datensätze möglich."
              : "Archivieren blendet das Objekt aus aktiven Übersichten aus, ohne Daten zu vernichten."}
          </p>
        </div>
        {property.archivedAt ? (
          <div className="lifecycle-actions">
            <form action={restoreProperty}>
              <input type="hidden" name="id" value={property.id} />
              <button className="btn secondary" type="submit">Objekt wiederherstellen</button>
            </form>
            <form action={deleteArchivedProperty} className="danger-confirmation-form">
              <input type="hidden" name="id" value={property.id} />
              <label className="field">
                <span>Zur Bestätigung „OBJEKT LÖSCHEN“ eingeben</span>
                <input name="confirmation" required autoComplete="off" />
              </label>
              <label className="checkbox-row">
                <input type="checkbox" name="irreversible" value="yes" required />
                <span>Ich verstehe, dass diese Aktion nicht rückgängig gemacht werden kann.</span>
              </label>
              <button className="btn danger" type="submit">Endgültig löschen</button>
            </form>
          </div>
        ) : (
          <form action={archiveProperty} className="lifecycle-actions">
            <input type="hidden" name="id" value={property.id} />
            <label className="field">
              <span>Zur Bestätigung „ARCHIVIEREN“ eingeben</span>
              <input name="confirmation" required autoComplete="off" />
            </label>
            <button className="btn secondary" type="submit">Objekt archivieren</button>
          </form>
        )}
      </section>
    </AppShell>
  );
}
