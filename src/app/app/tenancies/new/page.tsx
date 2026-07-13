import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { TenancyForm } from "@/components/tenancy-form";
import { PageHeader } from "@/components/ui";
import {
  listOrganizationRenters,
  listOrganizationUnits,
} from "@/repositories/portfolio";
export default async function NewTenancyPage() {
  const session = await requireSession();
  const [units, renters] = await Promise.all([
    listOrganizationUnits(session.organizationId),
    listOrganizationRenters(session.organizationId),
  ]);
  return (
    <AppShell active="/app/tenancies">
      <PageHeader
        eyebrow="Bestand"
        title="Mietverhältnis anlegen"
        description="Vertrag, Miethöhe und Laufzeit nachvollziehbar erfassen."
      />
      <TenancyForm
        units={units.map((unit) => ({
          id: unit.id,
          label: unit.label,
          propertyName: unit.propertyName,
        }))}
        renters={renters}
      />
    </AppShell>
  );
}
