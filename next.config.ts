import type { NextConfig } from "next";

/**
 * The Content Security Policy. Partial Prerendering serves static shells,
 * which cannot carry per-request nonces, so inline scripts are allowed
 * (as in the Next.js "without nonces" guide); everything else is strict:
 * the browser talks only to this app and to the project's Supabase.
 */
export function contentSecurityPolicy({
  supabaseUrl,
  development,
}: {
  supabaseUrl: string | undefined;
  development: boolean;
}): string {
  let supabase = "";
  let realtime = "";
  if (supabaseUrl) {
    const origin = new URL(supabaseUrl).origin;
    supabase = ` ${origin}`;
    realtime = ` ${origin.replace(/^http/, "ws")}`;
  }
  const secure = supabaseUrl?.startsWith("https://") ?? false;
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // Photos come from Supabase Storage through signed URLs.
    `img-src 'self' blob: data:${supabase}`,
    "font-src 'self'",
    `connect-src 'self'${supabase}${realtime}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(secure ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      development: process.env.NODE_ENV === "development",
    }),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Devices must always fetch the latest service worker.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
