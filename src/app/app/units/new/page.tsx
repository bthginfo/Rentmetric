import Link from "next/link";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { UnitForm } from "@/components/unit-form";
import { listOrganizationProperties } from "@/repositories/portfolio";

export default async function NewUnitPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const properties = await listOrganizationProperties(session.organizationId);
  const defaultPropertyId = properties.some((property) => property.id === query.propertyId)
    ? query.propertyId
    : undefined;
  return (
    <AppShell active="/app/properties">
      <div className="page-title-row">
        <div>
          <Link
            href={
              defaultPropertyId
                ? `/app/properties/${defaultPropertyId}`
                : "/app/units"
            }
            className="back-link"
          >
            ← Zurück
          </Link>
          <h1>Neue Einheit</h1>
          <p>Wohnfläche, Planmiete und Ausstattung vollständig erfassen.</p>
        </div>
      </div>
      {properties.length ? (
        <UnitForm
          properties={properties.map(({ id, name }) => ({ id, name }))}
          defaultPropertyId={defaultPropertyId}
        />
      ) : (
        <section className="empty-state">
          <h2>Zuerst ein Objekt anlegen</h2>
          <p>Jede Einheit benötigt ein organisationsgebundenes Objekt.</p>
          <Link href="/app/properties/new" className="btn">
            Objekt anlegen
          </Link>
        </section>
      )}
    </AppShell>
  );
}
