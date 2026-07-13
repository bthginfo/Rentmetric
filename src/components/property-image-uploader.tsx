"use client";

import { upload } from "@vercel/blob/client";
import { ImagePlus, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function PropertyImageUploader({
  organizationId,
  userId,
  propertyId,
}: {
  organizationId: string;
  userId: string;
  propertyId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 12 * 1024 * 1024)
      return setError("Das Bild darf maximal 12 MB groß sein.");
    setBusy(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      await upload(
        `organizations/${organizationId}/properties/${propertyId}/${safeName}`,
        file,
        {
          access: "private",
          handleUploadUrl: "/api/uploads",
          clientPayload: JSON.stringify({
            kind: "property-image",
            organizationId,
            userId,
            propertyId,
            originalFilename: file.name,
          }),
          onUploadProgress: ({ percentage }) =>
            setProgress(Math.round(percentage)),
        },
      );
      setProgress(100);
      router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Bild konnte nicht hochgeladen werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="image-upload-control">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={(event) => onFile(event.target.files?.[0])}
        hidden
      />
      <button
        type="button"
        className="btn secondary compact"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? (
          <LoaderCircle size={15} className="spin" />
        ) : (
          <ImagePlus size={15} />
        )}
        {busy ? `${progress} %` : "Foto hinzufügen"}
      </button>
      <span className="upload-privacy">
        <ShieldCheck size={13} /> Privat gespeichert
      </span>
      {busy && (
        <span
          className="upload-progress"
          aria-label={`Upload ${progress} Prozent`}
        >
          <i style={{ width: `${progress}%` }} />
        </span>
      )}
      {error && (
        <small className="form-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
