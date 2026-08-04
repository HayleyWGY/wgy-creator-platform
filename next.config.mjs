/** @type {import('next').NextConfig} */

// Content-Security-Policy now lives in middleware.ts, which generates a
// per-request script nonce (removing script-src 'unsafe-inline'). It can't be
// a static header here because the nonce varies per request. The remaining
// static security headers stay below.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

import { withSentryConfig } from "@sentry/nextjs";

// Sentry build wrapping. Source-map upload only runs when SENTRY_AUTH_TOKEN
// is present (set at launch); without it the build still succeeds and the
// SDK simply monitors errors without symbolicated stack traces.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  // Route Sentry's browser requests through our own domain so ad-blockers
  // don't drop them (and it stays within our CSP)
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
