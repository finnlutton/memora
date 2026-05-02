import * as Sentry from "@sentry/nextjs";

// Server-side Sentry. Falls back to NEXT_PUBLIC_SENTRY_DSN so a single env
// var works for both runtimes; set SENTRY_DSN separately if you want
// different DSNs per runtime.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    sendDefaultPii: true,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

    // Capture local variables in stack frames so server crashes are easier
    // to diagnose without redeploying with extra logging.
    includeLocalVariables: true,
  });
}
