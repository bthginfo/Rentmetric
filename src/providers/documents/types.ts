import { z } from "zod";

export const documentExtractionSchema = z.object({
  documentType: z.string(),
  fields: z.record(
    z.string(),
    z.object({
      value: z.unknown(),
      confidence: z.number().min(0).max(1),
      evidence: z.string().optional(),
    }),
  ),
  warnings: z.array(z.string()).default([]),
  provider: z.string(),
  model: z.string().optional(),
});

export type DocumentExtraction = z.infer<typeof documentExtractionSchema>;

export interface DocumentProcessor {
  readonly id: string;
  process(input: {
    bytes: Uint8Array;
    mimeType: string;
    filename: string;
  }): Promise<DocumentExtraction>;
}

export class LocalDocumentProcessor implements DocumentProcessor {
  readonly id = "local";
  async process(input: {
    bytes: Uint8Array;
    mimeType: string;
    filename: string;
  }): Promise<DocumentExtraction> {
    return {
      documentType: "unbekannt",
      fields: {},
      warnings: [`${input.filename} wartet auf manuelle Prüfung.`],
      provider: this.id,
    };
  }
}
