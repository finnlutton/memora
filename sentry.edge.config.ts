import * as Sentry from "@sentry/nextjs";

// Edge runtime Sentry. Same fallback shape as the server config so a single
// NEXT_PUBLIC_SENTRY_DSN suffices in production.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: true,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  });
}
