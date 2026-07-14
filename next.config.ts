import type { NextConfig } from "next";

const production = process.env.NODE_ENV === "production";
const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ...(production
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: baseSecurityHeaders },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
          },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      ...["/app/:path*", "/admin/:path*", "/share/:path*"].map(
        (source) => ({
          source,
          headers: [
            { key: "Cache-Control", value: "private, no-store" },
            { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          ],
        }),
      ),
      {
        source: "/share/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
