import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { productConfig } from "@/config/product";
import "./globals.css";
import "./spatial-refresh.css";

export const metadata: Metadata = {
  title: {
    default: productConfig.name,
    template: `%s · ${productConfig.name}`,
  },
  description: productConfig.description,
  icons: {
    icon: [{ url: "/logo-rm.png", type: "image/png" }],
    apple: [{ url: "/logo-rm.png", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        {children}
        <Script id="rentmetric-theme" strategy="beforeInteractive" nonce={nonce}>
          {`(() => {
            try {
              const stored = localStorage.getItem("rentmetric-theme");
              const preference = ["system", "light", "dark"].includes(stored) ? stored : "system";
              const dark = preference === "dark" || (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
              document.documentElement.dataset.theme = dark ? "dark" : "light";
              document.documentElement.dataset.themePreference = preference;
              document.documentElement.style.colorScheme = dark ? "dark" : "light";
            } catch (_) {}
          })();`}
        </Script>
      </body>
    </html>
  );
}
