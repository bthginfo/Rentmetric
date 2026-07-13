import type { Metadata } from "next";
import { productConfig } from "@/config/product";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: productConfig.name, template: `%s · ${productConfig.name}` },
  description: productConfig.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
