import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { RenterForm } from "@/components/renter-form";
import { PageHeader } from "@/components/ui";
import { getOrganizationRenter } from "@/repositories/portfolio";
import { updateRenter } from "../../actions";

export default async function EditRenterPage({ params }: { params: Promise<{ renterId: string }> }) {
  const session = await requireSession();
  const { renterId } = await params;
  const result = await getOrganizationRenter(session.organizationId, renterId);
  if (!result) notFound();
  const { renter } = result;
  return (
    <AppShell active="/app/properties">
      <Link className="dossier-breadcrumb" href={`/app/renters/${renter.id}`}>← Mieter-Dossier</Link>
      <PageHeader eyebrow="Kontaktdaten" title={`${renter.firstName} ${renter.lastName} bearbeiten`} description="Personenstammdaten aktualisieren; Vertragsdaten bleiben unverändert." />
      <RenterForm
        defaults={renter}
        action={updateRenter.bind(null, renter.id)}
        submitLabel="Änderungen speichern"
        cancelHref={`/app/renters/${renter.id}`}
      />
    </AppShell>
  );
}
