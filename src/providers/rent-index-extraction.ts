import "server-only";
import type { RentIndexExtraction } from "@/lib/rent-index/types";
import { parseRentIndexFile } from "@/lib/rent-index/parser";

export type RentIndexExtractionInput = { buffer: Uint8Array; filename: string; mimeType?: string };

export interface RentIndexExtractionProvider {
  readonly id: string;
  extract(input: RentIndexExtractionInput): Promise<RentIndexExtraction>;
}

export const deterministicRentIndexExtractionProvider: RentIndexExtractionProvider = {
  id: "deterministic-v1",
  extract: ({ buffer, filename, mimeType }) => parseRentIndexFile(buffer, filename, mimeType),
};

export function getRentIndexExtractionProvider(): RentIndexExtractionProvider {
  // A document-AI provider can later be selected here without changing upload,
  // review, provenance, or persistence contracts. It remains deliberately off.
  return deterministicRentIndexExtractionProvider;
}
