import { z } from "zod";

export const billingIntervals = ["one_time", "month", "year"] as const;
export type BillingInterval = (typeof billingIntervals)[number];

export const billingIntervalLabels: Record<BillingInterval, string> = {
  one_time: "Einmalig",
  month: "Monatlich",
  year: "Jährlich",
};

export const supportedCurrencies = ["EUR", "CHF"] as const;

export const billingPlanInputSchema = z.object({
  code: z.string().trim().toLowerCase().min(2).max(48).regex(/^[a-z0-9_-]+$/),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  amountCents: z.coerce.number().int().min(0).max(100_000_000),
  currency: z.enum(supportedCurrencies),
  interval: z.enum(billingIntervals),
  active: z.coerce.boolean().default(false),
  public: z.coerce.boolean().default(false),
  maxProperties: z.union([z.literal(""), z.coerce.number().int().min(1).max(100_000)]).optional(),
  maxUsers: z.union([z.literal(""), z.coerce.number().int().min(1).max(10_000)]).optional(),
});

export function formatPlanPrice(amountCents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export function hasEntitlement(
  limits: Record<string, unknown> | null | undefined,
  key: string,
) {
  return limits?.[key] !== false;
}
