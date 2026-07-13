import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { FileText } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { DocumentUploader } from "@/components/document-uploader";
import { Badge, PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { documents } from "@/db/schema";
import { listOrganizationTenancies } from "@/repositories/tenancies";
import { setDocumentTrash, toggleDocumentVisibility } from "./actions";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string; view?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const [items, tenancies] = await Promise.all([
    getDb()
      .select()
      .from(documents)
      .where(and(eq(documents.organizationId, session.organizationId), query.view === "trash" ? isNotNull(documents.deletedAt) : isNull(documents.deletedAt)))
      .orderBy(desc(documents.createdAt)),
    listOrganizationTenancies(session.organizationId),
  ]);
  const tenancyLabels = new Map(
    tenancies.map((item) => [
      item.id,
      `${item.propertyName} · ${item.unitLabel} · ${item.renterFirstName} ${item.renterLastName}`,
    ]),
  );
  return (
    <AppShell active="/app/documents">
      <PageHeader
        eyebrow="Dokumentenablage"
        title="Dokumente"
        description="Private Dateien sicher speichern, Mietverhältnissen zuordnen und gezielt für Mieter freigeben."
      />
      {query.uploaded === "1" && (
        <div className="success-banner">Dokument wurde sicher gespeichert.</div>
      )}
      <section className="import-panel">
        <div className="import-panel-intro">
          <span className="import-icon">
            <FileText size={22} />
          </span>
          <div>
            <h2>Dokument hochladen</h2>
            <p>
              Uploads sind privat. Eine Mieterfreigabe erfolgt immer separat und
              widerrufbar.
            </p>
          </div>
        </div>
        <DocumentUploader
          organizationId={session.organizationId}
          userId={session.userId}
          tenancies={tenancies.map((item) => ({
            id: item.id,
            label: tenancyLabels.get(item.id)!,
          }))}
        />
      </section>
      <div className="section-heading dossier-section-title">
        <div>
          <span className="eyebrow">Dokumentenjournal</span>
          <h2>Gespeicherte Dateien</h2>
        </div>
        <span>{items.length} Dokumente · <a className="table-link" href={query.view === "trash" ? "/app/documents" : "/app/documents?view=trash"}>{query.view === "trash" ? "Ablage" : "Papierkorb"}</a></span>
      </div>
      {items.length ? (
        <ul className="document-list">
          {items.map((item) => (
            <li key={item.id}>
              <div>
                <strong>
                  <a
                    className="table-link"
                    href={`/api/documents/${item.id}`}
                    target="_blank"
                  >
                    {item.title}
                  </a>
                </strong>
                <small>
                  {item.category} · {item.originalFilename || "Datei"} ·{" "}
                  {(item.sizeBytes / 1024 / 1024).toFixed(1)} MB ·{" "}
                  {tenancyLabels.get(item.tenancyId || "") || "Allgemein"}
                </small>
              </div>
              <Badge
                tone={
                  item.uploadedByRenter && !item.approvedAt
                    ? "warning"
                    : "success"
                }
              >
                {item.uploadedByRenter && !item.approvedAt
                  ? "Prüfung offen"
                  : "Geprüft"}
              </Badge>
              {item.tenancyId && (
                <form action={toggleDocumentVisibility}>
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    type="hidden"
                    name="visible"
                    value={item.visibleToRenter ? "false" : "true"}
                  />
                  <button className="text-button">
                    {item.visibleToRenter
                      ? "Freigabe entziehen"
                      : "Für Mieter freigeben"}
                  </button>
                </form>
              )}
              <form action={setDocumentTrash}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="trash" value={query.view === "trash" ? "false" : "true"}/><button className="text-button">{query.view === "trash" ? "Wiederherstellen" : "In Papierkorb"}</button></form>
            </li>
          ))}
        </ul>
      ) : (
        <section className="feature-status">
          <h2>Noch keine Dokumente</h2>
          <p>Nutzen Sie den sicheren Upload, um die erste Datei abzulegen.</p>
        </section>
      )}
    </AppShell>
  );
}
