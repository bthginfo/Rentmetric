import { fileTypeFromBuffer } from "file-type";

export type UploadSecurityKind =
  | "property-image"
  | "document"
  | "utility-document"
  | "share-document"
  | "rent-index";

const allowedExtensions: Record<UploadSecurityKind, Set<string>> = {
  "property-image": new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]),
  document: new Set(["pdf", "jpg", "jpeg", "png", "webp", "txt"]),
  "utility-document": new Set(["pdf", "jpg", "jpeg", "png", "webp", "txt"]),
  "share-document": new Set(["pdf", "jpg", "jpeg", "png", "webp", "txt"]),
  "rent-index": new Set(["pdf", "xlsx", "xls", "csv", "tsv", "txt"]),
};

const allowedDetectedMimeTypes: Record<UploadSecurityKind, Set<string>> = {
  "property-image": new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ]),
  document: new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  "utility-document": new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]),
  "share-document": new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]),
  "rent-index": new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/x-cfb",
  ]),
};

const textMimeTypes = new Set([
  "text/plain",
  "text/csv",
  "text/tab-separated-values",
]);

export function assertSafeUploadFilename(
  kind: UploadSecurityKind,
  filename: string,
) {
  if (
    !filename ||
    filename.length > 180 ||
    /[\\/\0\r\n]/.test(filename) ||
    filename === "." ||
    filename === ".."
  )
    throw new Error("Ungültiger Dateiname.");
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions[kind].has(extension))
    throw new Error("Dieser Dateityp ist nicht erlaubt.");
}

function looksLikeText(sample: Uint8Array) {
  if (!sample.length || sample.includes(0)) return false;
  let suspiciousControls = 0;
  for (const byte of sample) {
    if (byte < 32 && ![9, 10, 12, 13].includes(byte)) suspiciousControls += 1;
  }
  return suspiciousControls / sample.length < 0.01;
}

export async function validateUploadSample(
  kind: UploadSecurityKind,
  declaredMimeType: string,
  sample: Uint8Array,
) {
  const declared = declaredMimeType.toLowerCase().split(";")[0].trim();
  const detected = await fileTypeFromBuffer(sample).catch(() => undefined);

  if (textMimeTypes.has(declared)) {
    if (detected || !looksLikeText(sample))
      throw new Error("Der Dateiinhalt passt nicht zum angegebenen Textformat.");
    return;
  }

  if (!detected || !allowedDetectedMimeTypes[kind].has(detected.mime))
    throw new Error("Der Dateiinhalt entspricht keinem erlaubten Format.");

  const compatible =
    detected.mime === declared ||
    (declared === "application/vnd.ms-excel" && detected.mime === "application/x-cfb") ||
    (declared === "image/heic" && detected.mime === "image/heif") ||
    (declared === "image/heic" && detected.mime === "image/heic");
  if (!compatible)
    throw new Error("Dateiendung, MIME-Typ und Dateiinhalt stimmen nicht überein.");
}
