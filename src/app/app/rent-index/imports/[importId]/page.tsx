import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { requireSession } from "@/auth/session";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui";
import { getRentIndexImport } from "@/repositories/rent-index";
import { approveRentIndexImport, retryRentIndexImport } from "../../actions";

const labels = {
  uploaded: ["Hochgeladen", ""],
  processing: ["Wird ausgewertet", ""],
  needs_review: ["Prüfung offen", "warning"],
  approved: ["Extraktion bestätigt", "success"],
  failed: ["Fehlgeschlagen", "urgent"],
} as const;
export default async function ImportReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ importId: string }>;
  searchParams: Promise<{ approved?: string; error?: string }>;
}) {
  const session = await requireSession();
  const { importId } = await params;
  const query = await searchParams;
  const item = await getRentIndexImport(session.organizationId, importId);
  if (!item) notFound();
  const [status, tone] = labels[item.status];
  const extraction = item.extraction;
  return (
    <AppShell active="/app/rent-index">
      <div className="dossier-breadcrumb">
        <Link href="/app/rent-index">Mietspiegel</Link>
        <span>/</span>
        <span>{item.title}</span>
      </div>
      {query.approved === "1" && (
        <div className="success-banner">
          Die sichtbare Extraktion wurde bestätigt.
        </div>
      )}
      {query.error && (
        <div className="error-banner">
          Dieser Import kann in seinem aktuellen Status nicht bestätigt werden.
        </div>
      )}
      <header className="import-review-header">
        <div className="import-file-icon">
          {extraction?.format === "pdf" ? (
            <FileText size={25} />
          ) : (
            <FileSpreadsheet size={25} />
          )}
        </div>
        <div>
          <span className="eyebrow">Extraktionsprotokoll</span>
          <h1>{item.title}</h1>
          <p>
            {item.municipality} · {item.originalFilename}
          </p>
        </div>
        <Badge tone={tone}>{status}</Badge>
      </header>
      <section className="source-metadata">
        <div>
          <span>Erkanntes Format</span>
          <strong>{item.detectedFormat?.toUpperCase() || "Ausstehend"}</strong>
        </div>
        <div>
          <span>Dateigröße</span>
          <strong>{(item.sizeBytes / 1024 / 1024).toFixed(2)} MB</strong>
        </div>
        <div>
          <span>Importiert</span>
          <strong>{new Date(item.createdAt).toLocaleString("de-DE")}</strong>
        </div>
        <div>
          <span>Quelle</span>
          <strong>
            {item.sourceType === "manual_upload"
              ? "Eigener Upload"
              : item.sourceType}
          </strong>
        </div>
      </section>
      {item.status === "failed" && (
        <section className="import-error-panel">
          <AlertTriangle size={20} />
          <div>
            <strong>Auswertung fehlgeschlagen</strong>
            <p>{item.error || "Die Datei konnte nicht verarbeitet werden."}</p>
          </div>
          <form action={retryRentIndexImport.bind(null, item.id)}>
            <button className="btn secondary">
              <RotateCcw size={14} /> Erneut versuchen
            </button>
          </form>
        </section>
      )}
      {item.warningList.length > 0 && (
        <section className="warning-ledger">
          <header>
            <AlertTriangle size={17} />
            <h2>Hinweise zur Prüfung</h2>
          </header>
          <ul>
            {item.warningList.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}
      {extraction && (
        <>
          <section className="extraction-summary">
            <div>
              <span>Seiten</span>
              <strong>{extraction.summary.pages ?? "–"}</strong>
            </div>
            <div>
              <span>Tabellenblätter</span>
              <strong>{extraction.summary.sheets ?? "–"}</strong>
            </div>
            <div>
              <span>Zeilen erkannt</span>
              <strong>{extraction.summary.rows}</strong>
            </div>
            <div>
              <span>Numerische Zeilen</span>
              <strong>{extraction.summary.numericRows}</strong>
            </div>
          </section>
          {extraction.textPreview?.length ? (
            <section className="evidence-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">PDF-Herkunft</span>
                  <h2>Seitenvorschau</h2>
                </div>
                <span>Textauszug, keine visuelle PDF-Vorschau</span>
              </div>
              <div className="page-previews">
                {extraction.textPreview.map((page) => (
                  <article key={page.page}>
                    <span>Seite {page.page}</span>
                    <p>{page.text}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          <section className="evidence-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Evidence Ledger</span>
                <h2>Kandidatenzeilen mit Herkunft</h2>
              </div>
              <span>{extraction.candidateRows.length} Zeilen</span>
            </div>
            {extraction.sheetNames?.length ? (
              <div className="sheet-chips">
                {extraction.sheetNames.map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
            ) : null}
            <div className="candidate-table-wrap">
              <table className="candidate-table">
                <thead>
                  <tr>
                    <th>Herkunft</th>
                    <th>Extrahierte Werte</th>
                  </tr>
                </thead>
                <tbody>
                  {extraction.candidateRows.length ? (
                    extraction.candidateRows.map((row, index) => (
                      <tr key={`${row.source}-${index}`}>
                        <td>
                          <code>{row.source}</code>
                        </td>
                        <td>
                          {row.values.map((value, valueIndex) => (
                            <span key={`${value}-${valueIndex}`}>{value}</span>
                          ))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2}>
                        Keine Tabellenkandidaten erkannt. Prüfen Sie die
                        Seitenvorschau.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      <section className="approval-panel">
        <ShieldCheck size={23} />
        <div>
          <h2>Was die Bestätigung bedeutet</h2>
          <p>
            Sie bestätigen nur, dass die oben sichtbaren Inhalte plausibel aus
            der Datei extrahiert wurden. Eine Berechnung wird dadurch{" "}
            <strong>nicht</strong> aktiviert. Dafür folgt später eine separate
            Regelzuordnung mit erneuter fachlicher Freigabe.
          </p>
        </div>
        {item.status === "needs_review" && (
          <form action={approveRentIndexImport.bind(null, item.id)}>
            <button className="btn">
              <CheckCircle2 size={15} /> Extraktion bestätigen
            </button>
          </form>
        )}
      </section>
    </AppShell>
  );
}
