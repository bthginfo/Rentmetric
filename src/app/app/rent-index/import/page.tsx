import Link from "next/link";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { RentIndexImportCenter } from "@/components/rent-index-import-center";

export default async function RentIndexImportPage() {
  const session = await requireSession();
  return (
    <AppShell active="/app/rent-index">
      <div className="page-title-row wide-title">
        <div>
          <Link href="/app/rent-index" className="back-link">
            ← Mietspiegel
          </Link>
          <h1>Quelle finden & importieren</h1>
          <p>
            Offizielle Katalogdaten und Ihre eigene Datei in einem
            kontrollierten Arbeitsablauf.
          </p>
        </div>
      </div>
      <RentIndexImportCenter
        organizationId={session.organizationId}
        userId={session.userId}
      />
    </AppShell>
  );
}
