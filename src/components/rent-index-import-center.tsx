"use client";

import { upload } from "@vercel/blob/client";
import {
  CheckCircle2,
  DatabaseZap,
  Download,
  ExternalLink,
  FileSearch,
  FileSpreadsheet,
  LoaderCircle,
  Search,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Dataset = {
  id: string;
  title: string;
  description: string;
  modifiedAt: string | null;
  license: string | null;
  source?: "official" | "govdata";
  publisher?: string;
  year?: number | null;
  resources: Array<{
    id: string;
    name: string;
    description: string | null;
    format: string;
    declaredMimeType: string | null;
    url: string;
  }>;
};

export function RentIndexImportCenter({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const [tab, setTab] = useState<"finder" | "upload">("finder");
  return (
    <div className="import-center">
      <div
        className="import-tabs"
        role="tablist"
        aria-label="Mietspiegel importieren"
      >
        <button
          role="tab"
          aria-selected={tab === "finder"}
          onClick={() => setTab("finder")}
        >
          <DatabaseZap size={16} /> GovData Finder
        </button>
        <button
          role="tab"
          aria-selected={tab === "upload"}
          onClick={() => setTab("upload")}
        >
          <UploadCloud size={16} /> Eigene Datei
        </button>
      </div>
      {tab === "finder" ? (
        <GovDataFinder onUse={() => setTab("upload")} />
      ) : (
        <RentIndexUploader organizationId={organizationId} userId={userId} />
      )}
    </div>
  );
}

function GovDataFinder({ onUse }: { onUse: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Dataset[]>([]);
  const [count, setCount] = useState(0);
  const [historicalFiltered, setHistoricalFiltered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function runSearch() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/govdata/search?q=${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(12_000) },
      );
      const data = (await response.json()) as {
        count?: number;
        historicalFiltered?: number;
        results?: Dataset[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Suche fehlgeschlagen.");
      setResults(data.results || []);
      setCount(data.count || 0);
      setHistoricalFiltered(Math.max(0, data.historicalFiltered || 0));
    } catch (cause) {
      const timedOut =
        cause instanceof DOMException && cause.name === "TimeoutError";
      setError(
        timedOut
          ? "GovData antwortet zu langsam. Bitte erneut versuchen."
          : cause instanceof Error
            ? cause.message
            : "GovData ist nicht erreichbar.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function search(event: React.FormEvent) {
    event.preventDefault();
    await runSearch();
  }
  return (
    <section className="import-panel" role="tabpanel">
      <div className="import-panel-intro">
        <span className="import-icon">
          <FileSearch size={22} />
        </span>
        <div>
          <h2>Aktuelle offizielle Mietspiegel finden</h2>
          <p>
            Rentmetric kombiniert kommunale Originalquellen mit GovData und
            blendet historische Fassungen standardmäßig aus. Laden Sie die
            aktuelle Ressource herunter und geben Sie sie danach zur lokalen
            Auswertung in den Upload.
          </p>
        </div>
      </div>
      <form className="gov-search" onSubmit={search}>
        <label>
          <span>Stadt oder Gemeinde</span>
          <div>
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="z. B. München, Köln oder Hamburg"
            />
            <button className="btn" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={16} /> : "Suchen"}
            </button>
          </div>
        </label>
      </form>
      <div className="catalog-note">
        <ShieldCheck size={15} />
        <span>
          <strong>Aktualität vor Archiv:</strong> Alte Jahrgänge werden
          ausgeblendet. Katalog-Formate können ungenau sein; Rentmetric erkennt
          den Dateiinhalt beim Upload neu und verlangt Ihre Prüfung.
        </span>
      </div>
      {loading && (
        <div className="gov-search-state" role="status">
          <LoaderCircle className="spin" size={17} />
          <span>
            <strong>Offizielle Quellen werden durchsucht</strong>
            <small>
              Kommunale Direktquellen und GovData werden zusammengeführt.
            </small>
          </span>
        </div>
      )}
      {error && (
        <div className="gov-search-state error" role="alert">
          <span>
            <strong>Suche nicht abgeschlossen</strong>
            <small>{error}</small>
          </span>
          <button type="button" onClick={runSearch}>
            Erneut versuchen
          </button>
        </div>
      )}
      {count > 0 && (
        <p className="result-count">
          {count.toLocaleString("de-DE")} aktuelle Treffer
          {historicalFiltered > 0
            ? ` · ${historicalFiltered} historische Treffer ausgeblendet`
            : ""}
        </p>
      )}
      <div className="gov-results">
        {results.map((dataset) => (
          <article className="gov-dataset" key={dataset.id}>
            <header>
              <div>
                <span className="eyebrow">
                  {dataset.source === "official"
                    ? "Kommunale Originalquelle"
                    : "GovData-Datensatz"}
                </span>
                <h3>{dataset.title}</h3>
                {dataset.publisher && <small>{dataset.publisher}</small>}
              </div>
              {dataset.year ? (
                <span className="format-badge">{dataset.year}</span>
              ) : (
                dataset.modifiedAt && (
                  <time>
                    {new Date(dataset.modifiedAt).toLocaleDateString("de-DE")}
                  </time>
                )
              )}
            </header>
            <p>{dataset.description}</p>
            <div className="resource-list">
              {dataset.resources.length ? (
                dataset.resources.map((resource) => (
                  <div className="resource-row" key={resource.id}>
                    <span className="format-badge">{resource.format}</span>
                    <span>
                      <strong>{resource.name}</strong>
                      <small>
                        {resource.description ||
                          resource.declaredMimeType ||
                          "Download-Ressource"}
                      </small>
                    </span>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${resource.name} öffnen`}
                    >
                      <Download size={15} /> Öffnen <ExternalLink size={12} />
                    </a>
                  </div>
                ))
              ) : (
                <div className="resource-empty">
                  Keine direkt nutzbare HTTPS-Ressource gefunden.
                </div>
              )}
            </div>
            {dataset.resources.some(
              (resource) => resource.format !== "HTML",
            ) && (
              <button className="text-button" onClick={onUse}>
                Datei heruntergeladen? Zum sicheren Upload →
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function RentIndexUploader({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const municipality = String(form.get("municipality") || "").trim();
    const title = String(form.get("title") || "").trim();
    setError("");
    if (!file) return setError("Bitte wählen Sie eine Datei aus.");
    if (file.size > 30 * 1024 * 1024)
      return setError("Die Datei darf maximal 30 MB groß sein.");
    setBusy(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      await upload(
        `organizations/${organizationId}/rent-index/${safeName}`,
        file,
        {
          access: "private",
          handleUploadUrl: "/api/uploads",
          multipart: file.size > 5 * 1024 * 1024,
          clientPayload: JSON.stringify({
            kind: "rent-index",
            organizationId,
            userId,
            municipality,
            title,
            originalFilename: file.name,
          }),
          onUploadProgress: ({ percentage }) =>
            setProgress(Math.round(percentage)),
        },
      );
      setProgress(100);
      router.push("/app/rent-index?uploaded=1");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Datei konnte nicht hochgeladen werden.",
      );
      setBusy(false);
    }
  }
  return (
    <section className="import-panel" role="tabpanel">
      <div className="import-panel-intro">
        <span className="import-icon">
          <FileSpreadsheet size={22} />
        </span>
        <div>
          <h2>Mietspiegel auswerten lassen</h2>
          <p>
            PDF-Broschüren, XLSX-, XLS-, CSV- und TSV-Dateien werden
            deterministisch ausgelesen. Seiten, Tabellenzeilen und Warnungen
            bleiben als Herkunftsnachweis erhalten.
          </p>
        </div>
      </div>
      <form className="rent-upload-form" onSubmit={submit}>
        <div className="form-grid">
          <label className="field">
            <span>Stadt / Gemeinde</span>
            <input name="municipality" required placeholder="z. B. Köln" />
          </label>
          <label className="field">
            <span>Interner Titel</span>
            <input
              name="title"
              required
              placeholder="z. B. Mietspiegel Köln 2025"
            />
          </label>
        </div>
        <button
          type="button"
          className={`file-drop ${file ? "selected" : ""}`}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            hidden
            accept=".pdf,.xlsx,.xls,.csv,.tsv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values"
            onChange={(event) => setFile(event.target.files?.[0])}
          />
          {file ? (
            <>
              <CheckCircle2 size={27} />
              <strong>{file.name}</strong>
              <small>
                {(file.size / 1024 / 1024).toFixed(1)} MB · zum Ändern klicken
              </small>
            </>
          ) : (
            <>
              <UploadCloud size={28} />
              <strong>Datei auswählen</strong>
              <small>PDF, Excel, CSV oder TSV · maximal 30 MB</small>
            </>
          )}
        </button>
        {busy && (
          <div className="upload-meter">
            <span>
              <LoaderCircle className="spin" size={15} /> Verschlüsselte
              Übertragung
            </span>
            <strong>{progress} %</strong>
            <i>
              <b style={{ width: `${progress}%` }} />
            </i>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="import-submit">
          <p>
            <ShieldCheck size={14} /> Privat gespeichert; keine Datei wird
            automatisch als Berechnungsquelle aktiviert.
          </p>
          <button className="btn" disabled={busy}>
            {busy ? "Wird hochgeladen …" : "Upload & Auswertung starten"}
          </button>
        </div>
      </form>
    </section>
  );
}
