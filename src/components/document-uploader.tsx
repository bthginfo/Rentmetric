"use client";
import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, UploadCloud } from "lucide-react";

export function DocumentUploader({
  organizationId,
  userId,
  tenancies,
}: {
  organizationId: string;
  userId: string;
  tenancies: Array<{ id: string; label: string }>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setError("Bitte wählen Sie eine Datei aus.");
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      await upload(`organizations/${organizationId}/documents/${safe}`, file, {
        access: "private",
        handleUploadUrl: "/api/uploads",
        multipart: file.size > 5 * 1024 * 1024,
        clientPayload: JSON.stringify({
          kind: "document",
          organizationId,
          userId,
          tenancyId: data.get("tenancyId") || null,
          title: String(data.get("title") || ""),
          category: String(data.get("category") || "Sonstiges"),
          originalFilename: file.name,
        }),
        onUploadProgress: ({ percentage }) =>
          setProgress(Math.round(percentage)),
      });
      router.push("/app/documents?uploaded=1");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Upload fehlgeschlagen.",
      );
      setBusy(false);
    }
  }
  return (
    <form className="rent-upload-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="field">
          <span>Titel</span>
          <input name="title" required placeholder="z. B. Mietvertrag" />
        </label>
        <label className="field">
          <span>Kategorie</span>
          <select name="category" defaultValue="Vertrag">
            <option>Vertrag</option>
            <option>Abrechnung</option>
            <option>Nachweis</option>
            <option>Korrespondenz</option>
            <option>Sonstiges</option>
          </select>
        </label>
        <label className="field wide">
          <span>Mietverhältnis (optional)</span>
          <select name="tenancyId" defaultValue="">
            <option value="">Allgemeines Dokument</option>
            {tenancies.map((tenancy) => (
              <option key={tenancy.id} value={tenancy.id}>
                {tenancy.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        className={`file-drop ${file ? "selected" : ""}`}
        onClick={() => input.current?.click()}
      >
        <input
          ref={input}
          hidden
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        {file ? (
          <>
            <CheckCircle2 size={27} />
            <strong>{file.name}</strong>
            <small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
          </>
        ) : (
          <>
            <UploadCloud size={28} />
            <strong>Datei auswählen</strong>
            <small>PDF, Bild oder Text · maximal 20 MB</small>
          </>
        )}
      </button>
      {busy && (
        <div className="upload-meter">
          <span>
            <LoaderCircle className="spin" size={15} /> Private Übertragung
          </span>
          <strong>{progress} %</strong>
          <i>
            <b style={{ width: `${progress}%` }} />
          </i>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="import-submit">
        <button className="btn" disabled={busy}>
          {busy ? "Wird hochgeladen …" : "Dokument hochladen"}
        </button>
      </div>
    </form>
  );
}
