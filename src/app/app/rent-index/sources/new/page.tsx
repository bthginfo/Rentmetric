import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { RentIndexSourceForm } from "@/components/rent-index-source-form";
import { PageHeader } from "@/components/ui";

export default async function NewRentIndexSourcePage() {
  await requireSession();
  return <AppShell active="/app/rent-index"><PageHeader eyebrow="Eigene Regelquelle" title="Mietspiegel manuell anlegen" description="Bereichswerte versioniert und optional quartiersgenau erfassen. Vor Aktivierung immer fachlich prüfen." /><RentIndexSourceForm /></AppShell>;
}
