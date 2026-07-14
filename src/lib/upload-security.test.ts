import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  assertSafeUploadFilename,
  validateUploadSample,
} from "./upload-security";

describe("upload security", () => {
  it("accepts only allow-listed extensions and rejects path-like names", () => {
    expect(() => assertSafeUploadFilename("document", "Vertrag.pdf")).not.toThrow();
    expect(() => assertSafeUploadFilename("document", "payload.html")).toThrow();
    expect(() => assertSafeUploadFilename("document", "../Vertrag.pdf")).toThrow();
    expect(() => assertSafeUploadFilename("rent-index", "Mietspiegel.exe")).toThrow();
  });

  it("accepts genuine PDF and plain-text content", async () => {
    await expect(
      validateUploadSample(
        "document",
        "application/pdf",
        new TextEncoder().encode("%PDF-1.7\n1 0 obj\n"),
      ),
    ).resolves.toBeUndefined();
    await expect(
      validateUploadSample(
        "rent-index",
        "text/csv",
        new TextEncoder().encode("stadt;jahr;wert\nKöln;2025;12,50"),
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects disguised binary files and MIME mismatches", async () => {
    const executable = Uint8Array.from([0x4d, 0x5a, ...new Array(100).fill(0)]);
    await expect(
      validateUploadSample("document", "text/plain", executable),
    ).rejects.toThrow();
    await expect(
      validateUploadSample(
        "document",
        "text/plain",
        new TextEncoder().encode("%PDF-1.7\n"),
      ),
    ).rejects.toThrow();
  });

  it("accepts a genuine XLSX workbook", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Mietspiegel").addRow(["Stadt", "Jahr", "Wert"]);
    const buffer = await workbook.xlsx.writeBuffer();
    await expect(
      validateUploadSample(
        "rent-index",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        new Uint8Array(buffer).slice(0, 64 * 1024),
      ),
    ).resolves.toBeUndefined();
  });
});
