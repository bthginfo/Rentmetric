import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

export type InvoiceExtraction = { status: "proposed" | "manual_required"; invoiceDate?: string; invoiceNumber?: string; totalGross?: number; supplier?: string; textPreview?: string; warnings: string[] };

export async function extractInvoiceProposal(buffer: Uint8Array, mimeType: string): Promise<InvoiceExtraction> {
  if (!mimeType.includes("pdf")) return { status: "manual_required", warnings: ["Bildbelege benötigen OCR; Beträge bitte manuell erfassen."] };
  const pdf = await getDocumentProxy(buffer);
  const { text } = await extractText(pdf);
  const content = text.join("\n").replace(/\s+/g, " ").trim();
  if (!content) return { status: "manual_required", warnings: ["Das PDF enthält keinen maschinenlesbaren Text."] };
  const date = content.match(/(?:Rechnungsdatum|Datum)\s*:?\s*(\d{1,2}[.]\d{1,2}[.]\d{4})/i)?.[1];
  const invoiceNumber = content.match(/(?:Rechnungs(?:nummer|nr\.?))\s*:?\s*([A-Z0-9_./-]+)/i)?.[1];
  const amountMatches = [...content.matchAll(/(?:Gesamtbetrag|Rechnungsbetrag|Bruttobetrag|zu zahlen)\s*:?\s*(\d{1,3}(?:[.]\d{3})*,\d{2})\s*€?/gi)];
  const rawAmount = amountMatches.at(-1)?.[1];
  const totalGross = rawAmount ? Number(rawAmount.replaceAll(".", "").replace(",", ".")) : undefined;
  const supplier = content.slice(0, 120).split(/(?:Rechnung|Invoice)/i)[0].trim().slice(0, 100) || undefined;
  const warnings = ["Automatisch erkannte Belegdaten sind Vorschläge und müssen bestätigt werden."];
  if (!totalGross) warnings.push("Kein eindeutiger Gesamtbetrag erkannt.");
  return { status: "proposed", invoiceDate: date, invoiceNumber, totalGross, supplier, textPreview: content.slice(0, 1500), warnings };
}
