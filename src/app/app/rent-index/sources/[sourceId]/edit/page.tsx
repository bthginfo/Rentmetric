import { notFound } from "next/navigation";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { RentIndexSourceEditor } from "@/components/rent-index-source-editor";
import { PageHeader } from "@/components/ui";
import { getRentIndexSource } from "@/repositories/rent-index";

export default async function EditRentIndexSourcePage({ params }: { params: Promise<{ sourceId: string }> }) {
  const session = await requireSession();
  const { sourceId } = await params;
  const source = await getRentIndexSource(session.organizationId, sourceId);
  if (!source) notFound();
  return <AppShell active="/app/rent-index"><PageHeader eyebrow="Versionierte Regelquelle" title={`${source.municipality} ${source.version} bearbeiten`} description="Geltungsbereich, Status und extrahierte Regeln kontrolliert anpassen. Änderungen werden per Prüfsumme nachvollziehbar." /><RentIndexSourceEditor source={source} /></AppShell>;
}
