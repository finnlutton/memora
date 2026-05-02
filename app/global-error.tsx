"use client";

import { useEffect } from "react";

// Last-resort boundary — catches errors thrown from the root layout
// itself (e.g. AppProviders, ThemeRouteSync). Because this replaces the
// root layout when active, it MUST render its own <html> and <body> and
// can NOT rely on globals.css design tokens being available, since the
// root layout's styles may not have hydrated. Inline styles only.
export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Memora: root global-error boundary", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#f5f8fc",
          color: "#0f1823",
          fontFamily:
            "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "48px 16px",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#8c9aab",
            }}
          >
            Memora
          </p>
          <h1
            style={{
              marginTop: 12,
              fontFamily: "ui-serif, Georgia, serif",
              fontSize: 36,
              lineHeight: 1.15,
              fontWeight: 500,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              marginTop: 16,
              fontSize: 15,
              lineHeight: 1.6,
              color: "#4e6073",
            }}
          >
            We hit an unexpected error. You can try again, or refresh the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              background: "transparent",
              border: 0,
              padding: 0,
              fontSize: 14,
              color: "#0f1823",
              textDecoration: "underline",
              textUnderlineOffset: 4,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p
              style={{
                marginTop: 40,
                fontSize: 10.5,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#8c9aab",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
