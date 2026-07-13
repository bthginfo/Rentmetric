import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { UnitForm } from "@/components/unit-form";
import {
  getOrganizationUnit,
  listOrganizationProperties,
} from "@/repositories/portfolio";
import { updateUnit } from "../../actions";

export default async function EditUnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const session = await requireSession();
  const { unitId } = await params;
  const [result, properties] = await Promise.all([
    getOrganizationUnit(session.organizationId, unitId),
    listOrganizationProperties(session.organizationId),
  ]);
  if (!result) notFound();
  return (
    <AppShell active="/app/properties">
      <div className="page-title-row">
        <div>
          <Link href={`/app/units/${unitId}`} className="back-link">
            ← {result.unit.label}
          </Link>
          <h1>Einheit bearbeiten</h1>
          <p>Miete, Zustand und Ausstattung zentral aktuell halten.</p>
        </div>
      </div>
      <UnitForm
        properties={properties.map(({ id, name }) => ({ id, name }))}
        defaults={result.unit}
        action={updateUnit.bind(null, unitId)}
        submitLabel="Änderungen speichern"
        cancelHref={`/app/units/${unitId}`}
      />
    </AppShell>
  );
}
