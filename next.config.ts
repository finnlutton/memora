import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // Trim the optimizer fan-out. Default deviceSizes/imageSizes generate up to
    // ~16 widths per source; the layout only ever renders a handful, and each
    // unused width is one more transformation + one more cache write.
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [96, 200, 320, 448],
    qualities: [75, 80],
    // AVIF doubles transformations; the WebP saving over AVIF at our display
    // sizes isn't worth the extra cache pressure on Hobby.
    formats: ["image/webp"],
    // Keep optimized outputs cached for a week so repeat hits to the same
    // source URL don't re-transform.
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
          },
        ]
      : [],
  },
};

// Wrap with Sentry. All knobs are env-driven so this file works locally
// without a Sentry project — the SDK no-ops when DSN is unset and source
// map upload is skipped when SENTRY_AUTH_TOKEN is unset.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a wider set of client source files so production stack traces
  // resolve to readable code instead of minified output.
  widenClientFileUpload: true,

  // Proxy Sentry traffic through /monitoring to bypass ad blockers. The
  // middleware matcher already excludes this path so no change there.
  tunnelRoute: "/monitoring",

  // Suppress non-CI build output unless something actually fails.
  silent: !process.env.CI,
});
