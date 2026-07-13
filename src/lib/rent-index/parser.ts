import "server-only";
import { fileTypeFromBuffer } from "file-type";
import { parse as parseCsv } from "csv-parse/sync";
import { extractText, getDocumentProxy } from "unpdf";
import ExcelJS from "exceljs";
import type { ExtractedRentIndexRow, RentIndexExtraction } from "./types";
import { addStructuredRentIndexData } from "./structured-parser";

const maxPreviewRows = 250;

function normalizeHeader(value: string) { return value.toLocaleLowerCase("de").normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "_"); }
function genericRules(rows: ExtractedRentIndexRow[]) {
  if (rows.length < 2) return;
  const headers = rows[0].values.map(normalizeHeader);
  const aliases: Record<string, string[]> = { yearFrom: ["baujahr_von", "jahr_von", "year_from"], yearTo: ["baujahr_bis", "jahr_bis", "year_to"], areaFrom: ["wohnflache_von", "flache_von", "area_from"], areaTo: ["wohnflache_bis", "flache_bis", "area_to"], district: ["viertel", "stadtteil", "district"], low: ["minimum", "untere_spanne", "von", "low"], reference: ["mittelwert", "referenz", "reference", "mid"], high: ["maximum", "obere_spanne", "bis", "high"] };
  const index = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, headers.findIndex((header) => names.includes(header))]));
  if ([index.areaFrom, index.areaTo, index.low, index.reference, index.high].some((value) => value < 0)) return;
  const value = (raw: string) => Number(raw.replaceAll(".", "").replace(",", ".").replace(/[^0-9.-]/g, ""));
  const parsed = rows.slice(1).map((row) => ({ yearFrom: index.yearFrom >= 0 && row.values[index.yearFrom] ? value(row.values[index.yearFrom]) : null, yearTo: index.yearTo >= 0 && row.values[index.yearTo] ? value(row.values[index.yearTo]) : null, areaFrom: value(row.values[index.areaFrom]), areaTo: value(row.values[index.areaTo]), district: index.district >= 0 ? row.values[index.district] || undefined : undefined, low: value(row.values[index.low]), reference: value(row.values[index.reference]), high: value(row.values[index.high]) })).filter((row) => [row.areaFrom, row.areaTo, row.low, row.reference, row.high].every(Number.isFinite) && row.low <= row.reference && row.reference <= row.high);
  if (!parsed.length) return;
  return { kind: "manual_ranges" as const, version: "Import", rows: parsed, applicability: { minArea: Math.min(...parsed.map((row) => row.areaFrom)), maxArea: Math.max(...parsed.map((row) => row.areaTo)), excluded: [] } };
}

function normalizeCell(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) return String(value.text);
  if (typeof value === "object" && "result" in value)
    return String(value.result ?? "");
  return String(value).trim();
}

function looksNumeric(values: string[]) {
  return values.some((value) =>
    /(?:^|\s)\d{1,4}(?:[.,]\d{1,2})?(?:\s*(?:€|eur|m²|qm|%))?(?:\s|$)/i.test(
      value,
    ),
  );
}

function rowsFromPdfPage(text: string, page: number): ExtractedRentIndexRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 4 && looksNumeric([line]))
    .map((line) => ({ source: `Seite ${page}`, values: [line] }));
}

async function parsePdf(buffer: Uint8Array): Promise<RentIndexExtraction> {
  const pdf = await getDocumentProxy(buffer);
  const { totalPages, text } = await extractText(pdf);
  const pages = text.map((pageText, index) => ({
    page: index + 1,
    text: pageText.slice(0, 20_000),
  }));
  const rows = text.flatMap((pageText, index) =>
    rowsFromPdfPage(pageText, index + 1),
  );
  const warnings = [
    "PDF-Inhalte wurden positionsunabhängig extrahiert. Tabellenzeilen und Zu-/Abschläge müssen vor der Freigabe geprüft werden.",
  ];
  if (rows.length === 0)
    warnings.push(
      "Keine belastbaren Zahlenzeilen erkannt. Das Dokument ist möglicherweise gescannt und benötigt später OCR.",
    );
  return addStructuredRentIndexData({
    format: "pdf",
    summary: { pages: totalPages, rows: rows.length, numericRows: rows.length },
    candidateRows: rows.slice(0, maxPreviewRows),
    textPreview: pages,
    warnings,
  }, text);
}

async function parseWorkbook(buffer: Uint8Array): Promise<RentIndexExtraction> {
  const workbook = new ExcelJS.Workbook();
  const workbookData = Buffer.from(buffer) as unknown as Parameters<
    typeof workbook.xlsx.load
  >[0];
  await workbook.xlsx.load(workbookData);
  const rows: ExtractedRentIndexRow[] = [];
  let totalRows = 0;
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row, rowNumber) => {
      totalRows += 1;
      const cells = Array.isArray(row.values)
        ? row.values.slice(1)
        : Object.values(row.values);
      const values = cells.map(normalizeCell);
      if (values.some(Boolean))
        rows.push({ source: `${sheet.name}, Zeile ${rowNumber}`, values });
    });
  });
  const numericRows = rows.filter((row) => looksNumeric(row.values)).length;
  return {
    format: "xlsx",
    summary: {
      sheets: workbook.worksheets.length,
      rows: totalRows,
      numericRows,
    },
    candidateRows: rows.slice(0, maxPreviewRows),
    sheetNames: workbook.worksheets.map((sheet) => sheet.name),
    warnings:
      rows.length > maxPreviewRows
        ? [`Vorschau auf ${maxPreviewRows} Zeilen begrenzt.`]
        : [],
    structuredRules: genericRules(rows),
  };
}

function parseDelimited(buffer: Uint8Array): RentIndexExtraction {
  const content = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const sample = content.split(/\r?\n/).slice(0, 8).join("\n");
  const scores = ([";", "\t", ","] as const).map((delimiter) => ({
    delimiter,
    count: sample.split(delimiter).length - 1,
  }));
  const delimiter = scores.sort((a, b) => b.count - a.count)[0].delimiter;
  const records = parseCsv(content, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
    delimiter,
  }) as unknown[][];
  const rows = records.map((values, index) => ({
    source: `Zeile ${index + 1}`,
    values: values.map(normalizeCell),
  }));
  const numericRows = rows.filter((row) => looksNumeric(row.values)).length;
  const warnings =
    rows.length > maxPreviewRows
      ? [`Vorschau auf ${maxPreviewRows} Zeilen begrenzt.`]
      : [];
  if (content.includes("�"))
    warnings.push(
      "Die Zeichenkodierung ist nicht eindeutig; Umlaute bitte in der Prüfansicht kontrollieren.",
    );
  return {
    format: "csv",
    summary: { rows: rows.length, numericRows },
    candidateRows: rows.slice(0, maxPreviewRows),
    warnings,
    structuredRules: genericRules(rows),
  };
}

export async function parseRentIndexFile(
  buffer: Uint8Array,
  filename: string,
  declaredMimeType?: string,
): Promise<RentIndexExtraction> {
  const detected = await fileTypeFromBuffer(buffer);
  const extension = filename.toLowerCase().split(".").pop();
  const mime = detected?.mime || declaredMimeType || "";
  if (detected?.ext === "pdf" || mime.includes("pdf") || extension === "pdf")
    return parsePdf(buffer);
  if (
    detected?.ext === "xlsx" ||
    mime.includes("spreadsheetml") ||
    extension === "xlsx"
  )
    return parseWorkbook(buffer);
  if (
    mime.includes("csv") ||
    mime.startsWith("text/") ||
    extension === "csv" ||
    extension === "tsv"
  )
    return parseDelimited(buffer);
  if (extension === "xls")
    return {
      format: "unknown",
      summary: { rows: 0, numericRows: 0 },
      candidateRows: [],
      warnings: [
        "Das alte XLS-Format kann noch nicht sicher verarbeitet werden. Bitte als XLSX oder CSV speichern und erneut hochladen.",
      ],
    };
  return {
    format: "unknown",
    summary: { rows: 0, numericRows: 0 },
    candidateRows: [],
    warnings: [
      "Dateiformat nicht erkannt. Unterstützt werden PDF, XLSX, CSV und TSV.",
    ],
  };
}
