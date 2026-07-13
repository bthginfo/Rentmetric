import "server-only";
import { fileTypeFromBuffer } from "file-type";
import { parse as parseCsv } from "csv-parse/sync";
import { extractText, getDocumentProxy } from "unpdf";
import ExcelJS from "exceljs";
import type { ExtractedRentIndexRow, RentIndexExtraction } from "./types";

const maxPreviewRows = 250;

function normalizeCell(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) return String(value.text);
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  return String(value).trim();
}

function looksNumeric(values: string[]) {
  return values.some((value) => /(?:^|\s)\d{1,4}(?:[.,]\d{1,2})?(?:\s*(?:€|eur|m²|qm|%))?(?:\s|$)/i.test(value));
}

function rowsFromPdfPage(text: string, page: number): ExtractedRentIndexRow[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length >= 4 && looksNumeric([line])).map((line) => ({ source: `Seite ${page}`, values: [line] }));
}

async function parsePdf(buffer: Uint8Array): Promise<RentIndexExtraction> {
  const pdf = await getDocumentProxy(buffer);
  const { totalPages, text } = await extractText(pdf);
  const pages = text.map((pageText, index) => ({ page: index + 1, text: pageText.slice(0, 4_000) }));
  const rows = text.flatMap((pageText, index) => rowsFromPdfPage(pageText, index + 1));
  const warnings = ["PDF-Inhalte wurden positionsunabhängig extrahiert. Tabellenzeilen und Zu-/Abschläge müssen vor der Freigabe geprüft werden."];
  if (rows.length === 0) warnings.push("Keine belastbaren Zahlenzeilen erkannt. Das Dokument ist möglicherweise gescannt und benötigt später OCR.");
  return { format: "pdf", summary: { pages: totalPages, rows: rows.length, numericRows: rows.length }, candidateRows: rows.slice(0, maxPreviewRows), textPreview: pages.slice(0, 12), warnings };
}

async function parseWorkbook(buffer: Uint8Array): Promise<RentIndexExtraction> {
  const workbook = new ExcelJS.Workbook();
  const workbookData = Buffer.from(buffer) as unknown as Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(workbookData);
  const rows: ExtractedRentIndexRow[] = [];
  let totalRows = 0;
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row, rowNumber) => {
      totalRows += 1;
      const cells = Array.isArray(row.values) ? row.values.slice(1) : Object.values(row.values);
      const values = cells.map(normalizeCell);
      if (values.some(Boolean)) rows.push({ source: `${sheet.name}, Zeile ${rowNumber}`, values });
    });
  });
  const numericRows = rows.filter((row) => looksNumeric(row.values)).length;
  return { format: "xlsx", summary: { sheets: workbook.worksheets.length, rows: totalRows, numericRows }, candidateRows: rows.slice(0, maxPreviewRows), sheetNames: workbook.worksheets.map((sheet) => sheet.name), warnings: rows.length > maxPreviewRows ? [`Vorschau auf ${maxPreviewRows} Zeilen begrenzt.`] : [] };
}

function parseDelimited(buffer: Uint8Array): RentIndexExtraction {
  const content = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const sample = content.split(/\r?\n/).slice(0, 8).join("\n");
  const scores = ([";", "\t", ","] as const).map((delimiter) => ({ delimiter, count: sample.split(delimiter).length - 1 }));
  const delimiter = scores.sort((a, b) => b.count - a.count)[0].delimiter;
  const records = parseCsv(content, { bom: true, relax_column_count: true, skip_empty_lines: true, delimiter }) as unknown[][];
  const rows = records.map((values, index) => ({ source: `Zeile ${index + 1}`, values: values.map(normalizeCell) }));
  const numericRows = rows.filter((row) => looksNumeric(row.values)).length;
  const warnings = rows.length > maxPreviewRows ? [`Vorschau auf ${maxPreviewRows} Zeilen begrenzt.`] : [];
  if (content.includes("�")) warnings.push("Die Zeichenkodierung ist nicht eindeutig; Umlaute bitte in der Prüfansicht kontrollieren.");
  return { format: "csv", summary: { rows: rows.length, numericRows }, candidateRows: rows.slice(0, maxPreviewRows), warnings };
}

export async function parseRentIndexFile(buffer: Uint8Array, filename: string, declaredMimeType?: string): Promise<RentIndexExtraction> {
  const detected = await fileTypeFromBuffer(buffer);
  const extension = filename.toLowerCase().split(".").pop();
  const mime = detected?.mime || declaredMimeType || "";
  if (detected?.ext === "pdf" || mime.includes("pdf") || extension === "pdf") return parsePdf(buffer);
  if (detected?.ext === "xlsx" || mime.includes("spreadsheetml") || extension === "xlsx") return parseWorkbook(buffer);
  if (mime.includes("csv") || mime.startsWith("text/") || extension === "csv" || extension === "tsv") return parseDelimited(buffer);
  if (extension === "xls") return { format: "unknown", summary: { rows: 0, numericRows: 0 }, candidateRows: [], warnings: ["Das alte XLS-Format kann noch nicht sicher verarbeitet werden. Bitte als XLSX oder CSV speichern und erneut hochladen."] };
  return { format: "unknown", summary: { rows: 0, numericRows: 0 }, candidateRows: [], warnings: ["Dateiformat nicht erkannt. Unterstützt werden PDF, XLSX, CSV und TSV."] };
}
