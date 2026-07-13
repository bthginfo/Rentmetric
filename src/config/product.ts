export const productConfig = {
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME || "Rentmetric",
  legalName: "Rentmetric",
  description: "Immobilien, Mieten und Fristen verlässlich im Blick.",
  locale: "de-DE",
  currency: "EUR",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hallo@rentmetric.de",
} as const;
