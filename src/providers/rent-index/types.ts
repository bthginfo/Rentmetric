import { z } from "zod";

export const normalizedRentIndexSchema = z.object({
  municipality: z.string().min(2),
  version: z.string().min(1),
  effectiveFrom: z.coerce.date(),
  sourceUrl: z.string().url().optional(),
  checksum: z.string().min(16),
  status: z.enum(["pending_review", "active"]),
  brackets: z.array(
    z.object({
      yearFrom: z.number().int(),
      yearTo: z.number().int(),
      areaFromSqm: z.number().positive(),
      areaToSqm: z.number().positive(),
      lowCentsPerSqm: z.number().int().positive(),
      midCentsPerSqm: z.number().int().positive(),
      highCentsPerSqm: z.number().int().positive(),
    }),
  ),
});

export type NormalizedRentIndex = z.infer<typeof normalizedRentIndexSchema>;

export interface RentIndexProvider {
  readonly id: string;
  supports(municipality: string): Promise<boolean>;
  discoverVersions(): Promise<
    Array<{ version: string; effectiveFrom: Date; sourceUrl?: string }>
  >;
  importVersion(version: string): Promise<NormalizedRentIndex>;
}
