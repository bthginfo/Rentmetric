import { z } from "zod";

export const PRODUCT_TOUR_VERSION = 1;

export const productTourResultSchema = z.enum(["completed", "skipped"]);

export type ProductTourResult = z.infer<typeof productTourResultSchema>;

export function shouldStartProductTour(
  state: { tourVersion: number; tourStatus: string } | null | undefined,
) {
  return (
    !state ||
    state.tourVersion < PRODUCT_TOUR_VERSION ||
    state.tourStatus === "pending"
  );
}
