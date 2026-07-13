"use client";
import { upload } from "@vercel/blob/client";
import { FileUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UtilityDocumentUploader({ organizationId, userId, periodId }: { organizationId: string; userId: string; periodId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setError("Bitte eine Datei auswählen.");
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      await upload(`organizations/${organizationId}/documents/${safe}`, file, { access: "private", handleUploadUrl: "/api/uploads", multipart: file.size > 5 * 1024 * 1024, clientPayload: JSON.stringify({ kind: "utility-document", organizationId, userId, utilityPeriodId: periodId, title: String(data.get("title") || file.name), originalFilename: file.name }) });
      router.refresh(); setFile(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen."); setBusy(false); }
  }
  return <form className="form-sheet compact-form utility-upload-form" onSubmit={submit}><div className="form-section-heading"><span><FileUp size={16} /></span><div><h2>Beleg hochladen</h2><p>PDF oder Scan sicher ablegen und automatisch auslesen.</p></div></div><div className="form-grid"><label className="field wide"><span>Belegtitel</span><input name="title" required placeholder="z. B. Wasserrechnung 2026" /></label><label className="field wide"><span>PDF oder Scan</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label></div>{error && <p className="form-error">{error}</p>}<div className="form-actions"><button className="btn" disabled={busy || !file}>{busy ? <><LoaderCircle className="spin" size={15} /> Wird ausgelesen …</> : <><FileUp size={15} /> Beleg hochladen</>}</button></div></form>;
}
