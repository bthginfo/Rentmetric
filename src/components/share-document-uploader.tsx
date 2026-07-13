"use client";
import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, UploadCloud } from "lucide-react";

export function ShareDocumentUploader({ token }: { token: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setError("Bitte wählen Sie eine Datei aus.");
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await upload(
        `share-inbox/${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
        file,
        {
          access: "private",
          handleUploadUrl: "/api/uploads",
          multipart: file.size > 5 * 1024 * 1024,
          clientPayload: JSON.stringify({
            kind: "share-document",
            token,
            title: String(data.get("title") || ""),
            category: String(data.get("category") || "Nachweis"),
            originalFilename: file.name,
          }),
        },
      );
      setDone(true);
      setBusy(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Upload fehlgeschlagen.",
      );
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="upload-box">
        <CheckCircle2 size={24} />
        <strong>Dokument sicher eingereicht</strong>
        <p>Es ist erst nach Prüfung durch die Verwaltung sichtbar.</p>
      </div>
    );
  return (
    <form className="upload-box" onSubmit={submit}>
      <label className="field">
        <span>Titel</span>
        <input
          name="title"
          required
          placeholder="z. B. Versicherungsnachweis"
        />
      </label>
      <label className="field">
        <span>Kategorie</span>
        <select name="category">
          <option>Nachweis</option>
          <option>Übergabe</option>
          <option>Korrespondenz</option>
          <option>Sonstiges</option>
        </select>
      </label>
      <button
        type="button"
        className="file-drop"
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
            <CheckCircle2 size={22} />
            <strong>{file.name}</strong>
          </>
        ) : (
          <>
            <UploadCloud size={22} />
            <strong>Datei auswählen</strong>
          </>
        )}
      </button>
      {error && <p className="form-error">{error}</p>}
      <button className="btn" disabled={busy}>
        {busy ? (
          <>
            <LoaderCircle className="spin" size={15} /> Wird übertragen …
          </>
        ) : (
          "Sicher einreichen"
        )}
      </button>
    </form>
  );
}
