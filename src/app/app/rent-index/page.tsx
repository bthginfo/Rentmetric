import Link from "next/link";
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  FileSearch,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
} from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge, PageHeader } from "@/components/ui";
import { listRentIndexImports, listRentIndexSources } from "@/repositories/rent-index";

const status = {
  uploaded: ["Hochgeladen", "", UploadCloud],
  processing: ["Wird ausgewertet", "", LoaderCircle],
  needs_review: ["Prüfung offen", "warning", FileSearch],
  approved: ["Extraktion bestätigt", "success", CheckCircle2],
  failed: ["Fehlgeschlagen", "urgent", AlertCircle],
} as const;
export default async function RentIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const [imports, sources] = await Promise.all([listRentIndexImports(session.organizationId), listRentIndexSources(session.organizationId)]);
  return (
    <AppShell active="/app/rent-index">
      <PageHeader
        eyebrow="Mietspiegel-Labor"
        title="Mietspiegel & Quellen"
        description="Öffentliche Quellen finden, private Dateien auslesen und jede Extraktion mit Herkunftsnachweis prüfen."
        action={<div className="header-actions"><Link className="btn secondary" href="/app/rent-index/sources/new">Quelle anlegen</Link><Link className="btn secondary" href="/app/rent-index/calculator"><Calculator size={15} /> Rechner</Link><Link className="btn" href="/app/rent-index/import"><UploadCloud size={15} /> Mietspiegel importieren</Link></div>}
      />
      {query.uploaded === "1" && (
        <div className="success-banner" role="status">
          Upload abgeschlossen. Die Auswertung läuft; der Status aktualisiert
          sich nach einem Neuladen.
        </div>
      )}
      <section className="rent-index-explainer">
        <div>
          <FileSearch size={20} />
          <span>
            <strong>Import &amp; Regelzuordnung</strong>
            <small>PDF, XLSX, CSV und manuelle Quellen</small>
          </span>
        </div>
        <span className="flow-line">
          Finden <b>→</b> Hochladen <b>→</b> Prüfen <b>→</b> Regeln zuordnen
        </span>
      </section>
      <div className="section-heading dossier-section-title"><div><span className="eyebrow">Regelquellen</span><h2>Aktiv und in Prüfung</h2></div><span>{sources.length} Quellen</span></div>
      {sources.length ? <div className="import-list">{sources.map((source) => {
        const scope = source.geographicScope as { level?: string; districts?: string[] };
        return <Link href={`/app/rent-index/sources/${source.id}/edit`} className="import-row" key={source.id}><span className={`import-status-icon ${source.status === "active" ? "success" : "warning"}`}><CheckCircle2 size={18} /></span><span><strong>{source.municipality} · {source.version}</strong><small>{scope.districts?.length ? scope.districts.join(", ") : "Stadtweit"}</small></span><span><strong>{source.providerType === "manual" ? "Manuell" : "Importiert"}</strong><small>gültig ab {new Date(source.effectiveFrom).toLocaleDateString("de-DE")}</small></span><Badge tone={source.status === "active" ? "success" : "warning"}>{source.status === "active" ? "Aktiv" : "Prüfung"}</Badge><b>›</b></Link>;
      })}</div> : <p className="legal-note">Noch keine strukturierte Regelquelle vorhanden.</p>}
      <div className="section-heading dossier-section-title">
        <div>
          <span className="eyebrow">Importjournal</span>
          <h2>Ihre Mietspiegel-Dateien</h2>
        </div>
        <span>{imports.length} Importe</span>
      </div>
      {imports.length ? (
        <div className="import-list">
          {imports.map((item) => {
            const [label, tone, Icon] = status[item.status];
            return (
              <Link
                href={`/app/rent-index/imports/${item.id}`}
                className="import-row"
                key={item.id}
              >
                <span className={`import-status-icon ${tone}`}>
                  <Icon
                    size={18}
                    className={item.status === "processing" ? "spin" : ""}
                  />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.municipality} · {item.originalFilename}
                  </small>
                </span>
                <span>
                  <strong>
                    {item.detectedFormat?.toUpperCase() || "Format offen"}
                  </strong>
                  <small>
                    {(item.sizeBytes / 1024 / 1024).toFixed(1)} MB ·{" "}
                    {new Date(item.createdAt).toLocaleDateString("de-DE")}
                  </small>
                </span>
                <Badge tone={tone}>{label}</Badge>
                <b>›</b>
              </Link>
            );
          })}
        </div>
      ) : (
        <section className="empty-state compact-empty">
          <span className="empty-icon">
            <FileSpreadsheet size={25} />
          </span>
          <h2>Noch keine Quelle importiert</h2>
          <p>
            Suchen Sie zuerst in GovData oder laden Sie eine eigene
            Mietspiegel-Broschüre bzw. Tabelle hoch.
          </p>
          <Link href="/app/rent-index/import" className="btn">
            Finder & Upload öffnen
          </Link>
        </section>
      )}
    </AppShell>
  );
}
