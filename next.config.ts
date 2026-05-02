import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    qualities: [75, 95],
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
