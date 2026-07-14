import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { getOrganizationProperty } from "@/repositories/portfolio";
import { updateProperty } from "../../actions";

export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { propertyId } = await params;
  const query = await searchParams;
  const property = await getOrganizationProperty(
    session.organizationId,
    propertyId,
  );
  if (!property || property.archivedAt) notFound();
  return (
    <AppShell active="/app/properties">
      <PageHeader
        eyebrow="Objektstammdaten"
        title={`${property.name} bearbeiten`}
        description="Adresse und Gebäudedaten aktualisieren."
      />
      {query.error === "invalid" && (
        <div className="error-banner" role="alert">
          Bitte prüfe die eingegebenen Stammdaten.
        </div>
      )}
      <form action={updateProperty} className="form-sheet">
        <input type="hidden" name="id" value={property.id} />
        <div className="form-grid">
          <label className="field wide">
            <span>Interner Objektname</span>
            <input name="name" defaultValue={property.name} required />
          </label>
          <label className="field">
            <span>Straße</span>
            <input name="street" defaultValue={property.street} required />
          </label>
          <label className="field">
            <span>Hausnummer</span>
            <input
              name="houseNumber"
              defaultValue={property.houseNumber}
              required
            />
          </label>
          <label className="field">
            <span>Postleitzahl</span>
            <input
              name="postalCode"
              defaultValue={property.postalCode}
              required
              pattern="[0-9]{5}"
            />
          </label>
          <label className="field">
            <span>Ort</span>
            <input name="city" defaultValue={property.city} required />
          </label>
          <label className="field">
            <span>Bundesland</span>
            <input name="state" defaultValue={property.state || ""} />
          </label>
          <label className="field">
            <span>Baujahr</span>
            <input
              name="yearBuilt"
              type="number"
              min="1600"
              max={new Date().getFullYear() + 2}
              defaultValue={property.yearBuilt || ""}
            />
          </label>
        </div>
        <div className="form-actions">
          <Link
            className="btn secondary"
            href={`/app/properties/${property.id}`}
          >
            Abbrechen
          </Link>
          <button className="btn">Änderungen speichern</button>
        </div>
      </form>
    </AppShell>
  );
}
