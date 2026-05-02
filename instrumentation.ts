import * as Sentry from "@sentry/nextjs";

// Server-side registration hook. Loads the right Sentry config per runtime
// (Node.js vs Edge); the client bundle is wired separately via
// instrumentation-client.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures every unhandled error thrown from server-side request handling
// (route handlers, server components, server actions). Required for
// @sentry/nextjs to forward request errors automatically.
export const onRequestError = Sentry.captureRequestError;
