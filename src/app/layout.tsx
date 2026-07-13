import type { Metadata } from "next";
import { IBM_Plex_Sans, Newsreader } from "next/font/google";
import { productConfig } from "@/config/product";
import "./globals.css";

const sans = IBM_Plex_Sans({
  variable: "--font-sans-loaded",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const serif = Newsreader({
  variable: "--font-serif-loaded",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: productConfig.name, template: `%s · ${productConfig.name}` },
  description: productConfig.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
