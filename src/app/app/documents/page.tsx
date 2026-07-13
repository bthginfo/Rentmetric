import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { FileText } from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { DocumentUploader } from "@/components/document-uploader";
import { Badge, PageHeader } from "@/components/ui";
import { getDb } from "@/db/client";
import { documents } from "@/db/schema";
import { listOrganizationTenancies } from "@/repositories/tenancies";
import { listOrganizationProperties, listOrganizationRenters, listOrganizationUnits } from "@/repositories/portfolio";
import { setDocumentTrash, toggleDocumentVisibility } from "./actions";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string; view?: string; category?: string; context?: string; status?: string; q?: string; propertyId?: string; unitId?: string; renterId?: string; tenancyId?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const [allItems, tenancies, properties, units, renters] = await Promise.all([
    getDb()
      .select()
      .from(documents)
      .where(and(eq(documents.organizationId, session.organizationId), query.view === "trash" ? isNotNull(documents.deletedAt) : isNull(documents.deletedAt)))
      .orderBy(desc(documents.createdAt)),
    listOrganizationTenancies(session.organizationId),
    listOrganizationProperties(session.organizationId),
    listOrganizationUnits(session.organizationId),
    listOrganizationRenters(session.organizationId),
  ]);
  const tenancyLabels = new Map(
    tenancies.map((item) => [
      item.id,
      `${item.propertyName} · ${item.unitLabel} · ${item.renterFirstName} ${item.renterLastName}`,
    ]),
  );
  const contexts = [
    ...properties.map((item) => ({ key: `property:${item.id}`, group: "Objekte", label: item.name })),
    ...units.map((item) => ({ key: `unit:${item.id}`, group: "Einheiten", label: `${item.propertyName} · ${item.label}` })),
    ...renters.map((item) => ({ key: `renter:${item.id}`, group: "Mieter:innen", label: `${item.firstName} ${item.lastName}` })),
    ...tenancies.map((item) => ({ key: `tenancy:${item.id}`, group: "Mietverhältnisse", label: tenancyLabels.get(item.id)! })),
  ];
  const requestedContext = query.propertyId ? `property:${query.propertyId}` : query.unitId ? `unit:${query.unitId}` : query.renterId ? `renter:${query.renterId}` : query.tenancyId ? `tenancy:${query.tenancyId}` : undefined;
  const defaultContextKey = contexts.some((item) => item.key === requestedContext) ? requestedContext : undefined;
  const relationKey = (item: (typeof allItems)[number]) => item.propertyId ? `property:${item.propertyId}` : item.unitId ? `unit:${item.unitId}` : item.renterId ? `renter:${item.renterId}` : item.tenancyId ? `tenancy:${item.tenancyId}` : "";
  const relationLabels = new Map(contexts.map((item) => [item.key, item.label]));
  const normalizedQuery = query.q?.trim().toLocaleLowerCase("de") || "";
  const documentStatus = (item: (typeof allItems)[number]) => item.uploadedByRenter && !item.approvedAt ? "review" : item.processingStatus;
  const items = allItems.filter((item) => (!query.category || item.category === query.category) && (!query.context || relationKey(item) === query.context) && (!query.status || documentStatus(item) === query.status) && (!normalizedQuery || `${item.title} ${item.originalFilename || ""}`.toLocaleLowerCase("de").includes(normalizedQuery)));
  const categories = [...new Set(allItems.map((item) => item.category))].sort();
  const statuses = [...new Set(allItems.map(documentStatus))].sort();
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
      <section className="import-panel" id="document-upload">
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
          contexts={contexts}
          defaultContextKey={defaultContextKey}
        />
      </section>
      <form className="document-filters" method="get">
        {query.view && <input type="hidden" name="view" value={query.view} />}
        <label className="field"><span>Suche</span><input name="q" defaultValue={query.q || ""} placeholder="Titel oder Dateiname" /></label>
        <label className="field"><span>Kategorie</span><select name="category" defaultValue={query.category || ""}><option value="">Alle Kategorien</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="field"><span>Zuordnung</span><select name="context" defaultValue={query.context || ""}><option value="">Alle Zuordnungen</option>{contexts.map((context) => <option key={context.key} value={context.key}>{context.group}: {context.label}</option>)}</select></label>
        <label className="field"><span>Prüfstatus</span><select name="status" defaultValue={query.status || ""}><option value="">Alle Status</option>{statuses.map((status) => <option key={status} value={status}>{status === "review" ? "Prüfung offen" : status === "confirmed" ? "Geprüft" : status === "processing" ? "In Verarbeitung" : status === "failed" ? "Fehlgeschlagen" : status}</option>)}</select></label>
        <button className="btn secondary">Filtern</button>
      </form>
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
                  {relationLabels.get(relationKey(item)) || "Allgemein"}
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
