export type ExtractedRentIndexRow = {
  source: string;
  values: string[];
};

export type RentRange = { low: number; high: number };

export type MunichBaseRow = {
  areaFrom: number;
  areaTo: number;
  values: number[];
  page: number;
};

export type MunichRentIndexRules = {
  kind: "munich_regression";
  version: "2025";
  yearBands: Array<{ from: number | null; to: number; label: string }>;
  baseRows: MunichBaseRow[];
  adjustments: Array<{
    key: string;
    label: string;
    amount: number;
    group: string;
    page: number;
  }>;
  spreads: {
    nonCentral: RentRange;
    central: RentRange;
  };
  applicability: { minArea: number; maxArea: number; excluded: string[] };
};

export type CologneRangeRow = {
  constructionGroup: number;
  areaCode: string;
  areaFrom: number;
  areaTo: number;
  equipmentClass: number | null;
  ranges: {
    simple?: RentRange;
    medium?: RentRange;
    veryGood?: RentRange;
  };
  page: number;
};

export type CologneRentIndexRules = {
  kind: "cologne_ranges";
  version: "2025";
  constructionGroups: Array<{ group: number; from: number | null; to: number | null }>;
  rows: CologneRangeRow[];
  equipmentClasses: Record<string, string>;
  applicability: { minArea: number; maxArea: number; excluded: string[] };
};

export type ManualRangeRules = {
  kind: "manual_ranges";
  version: string;
  rows: Array<{
    yearFrom: number | null;
    yearTo: number | null;
    areaFrom: number;
    areaTo: number;
    district?: string;
    low: number;
    reference: number;
    high: number;
  }>;
  applicability: { minArea: number; maxArea: number; excluded: string[] };
};

export type BerlinRangeRules = {
  kind: "berlin_ranges";
  version: "2026";
  rows: Array<{ row: number; yearFrom: number | null; yearTo: number | null; region?: "east" | "west"; areaFrom: number; areaTo: number | null; location: "simple" | "average" | "good"; low: number; reference: number; high: number; page: 1 }>;
  applicability: { minArea: number; maxArea: number; excluded: string[] };
};

export type StructuredRentIndexRules =
  | MunichRentIndexRules
  | CologneRentIndexRules
  | BerlinRangeRules
  | ManualRangeRules;

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
  detectedDocument?: {
    municipality: string;
    version: string;
    confidence: number;
    model: "regression" | "range_table";
  };
  structuredRules?: StructuredRentIndexRules;
};
