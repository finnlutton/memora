import * as Sentry from "@sentry/nextjs";

// Client-side Sentry. Only initialises if NEXT_PUBLIC_SENTRY_DSN is set so
// local dev runs cleanly without a Sentry project. In Vercel set the DSN
// (and optionally tune the sample rates) before turning the deploy live.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    // Send IPs and headers along with events so issues are easier to triage.
    sendDefaultPii: true,

    // 100% in dev so every action is traced; 10% in production to control cost.
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

    // Session Replay: 10% of all sessions, 100% of sessions with errors.
    // Replay itself is added below, after the page goes idle, so its ~70 KB
    // chunk doesn't ship in the initial bundle and block FCP/LCP on cold
    // ad-click visitors.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  // Defer Replay until well after first paint. lazyLoadIntegration fetches
  // the integration from Sentry's CDN on demand, so its ~70 KB chunk never
  // ships in the initial bundle and never competes with hydration or LCP.
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      Sentry.lazyLoadIntegration("replayIntegration")
        .then((replayIntegration) => {
          Sentry.addIntegration(replayIntegration());
        })
        .catch(() => {
          // Network / CDN failure is non-fatal — error reporting still works.
        });
    }, 2500);
  }
}

// Hook into App Router navigation transitions so client-side route changes
// show up as spans. Must always be exported even if Sentry is uninitialised
// — the SDK handles the no-op case internally.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
