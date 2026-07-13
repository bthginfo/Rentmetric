export type ExtractedRentIndexRow = {
  source: string;
  values: string[];
};

export type RentIndexExtraction = {
  format: "pdf" | "xlsx" | "csv" | "unknown";
  summary: {
    pages?: number;
    sheets?: number;
    rows: number;
    numericRows: number;
  };
  candidateRows: ExtractedRentIndexRow[];
  textPreview?: Array<{ page: number; text: string }>;
  sheetNames?: string[];
  warnings: string[];
};
