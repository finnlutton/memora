/**
 * Security headers applied to every HTML response by middleware.
 *
 * Goals:
 *  - HSTS to lock in HTTPS for browsers that have visited once.
 *  - Defense-in-depth CSP that limits script + style + connect surface to the
 *    origins we actually use (Supabase, Google Maps, Stripe, Sentry).
 *  - Frame-ancestors 'none' + X-Frame-Options DENY so the app can't be
 *    iframed (clickjacking + share-page snooping).
 *  - X-Content-Type-Options nosniff and a tight Referrer-Policy.
 *
 * The CSP is INTENTIONALLY permissive on `'unsafe-inline'` for scripts and
 * styles for now — Next.js + the synchronous theme-init script in
 * `app/layout.tsx` need it. Tightening to nonce-based CSP is a follow-up
 * that requires threading a nonce through the layout's manual <script> and
 * Next.js's per-request response. Today this still blocks the most common
 * attack shapes (foreign-origin scripts, Flash/object embeds, framing,
 * MIME-sniff XSS).
 */

function safeHostname(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return null;
  }
}

function buildContentSecurityPolicy(): string {
  const supabaseHost = safeHostname(process.env.NEXT_PUBLIC_SUPABASE_URL);

  // Connect surface: Supabase REST + auth + storage + realtime (wss),
  // Google Maps Places, Stripe API, Sentry ingest (in case the /monitoring
  // tunnel is unreachable for any reason).
  const connectSrc = [
    "'self'",
    "https://maps.googleapis.com",
    "https://*.googleapis.com",
    "https://api.stripe.com",
    "https://*.ingest.sentry.io",
    "https://*.ingest.us.sentry.io",
    "https://*.sentry.io",
  ];
  if (supabaseHost) {
    connectSrc.push(`https://${supabaseHost}`);
    connectSrc.push(`wss://${supabaseHost}`);
  }
  // Wildcards for any *.supabase.co project (handles preview/branch DBs).
  connectSrc.push("https://*.supabase.co", "wss://*.supabase.co");

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-inline' covers both Next.js's hydration scripts and the
    // synchronous theme-init script in app/layout.tsx. 'unsafe-eval' is
    // required by Next.js dev-mode HMR; production bundles do not rely
    // on it but the directive applies in both modes here for simplicity.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://maps.googleapis.com",
      "https://maps.gstatic.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      // App displays user uploads from Supabase storage and arbitrary
      // remote thumbnails for shared galleries; allow https globally for
      // images only (no script/style/etc. surface).
      "https:",
    ],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": connectSrc,
    // Stripe Checkout is a redirect, not embedded — but allow the iframe
    // origins in case any future flow needs them.
    "frame-src": ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
    "manifest-src": ["'self'"],
    "media-src": ["'self'", "blob:", "data:"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", "https://checkout.stripe.com"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([key, values]) => (values.length ? `${key} ${values.join(" ")}` : key))
    .join("; ");
}

const CACHED_HEADERS: Array<[string, string]> = [
  // Two years, includeSubDomains, preload — the values browsers need to
  // accept the apex into the HSTS preload list.
  [
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  ],
  ["X-Frame-Options", "DENY"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  // Origin isolation — turn off legacy ambient permissions the app does
  // not use. `payment=*` is left implicit-deny (no allowlist) since we
  // redirect to Stripe rather than embed Payment Request.
  [
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  ],
  ["Content-Security-Policy", buildContentSecurityPolicy()],
];

export function applySecurityHeaders(response: { headers: Headers }): void {
  for (const [name, value] of CACHED_HEADERS) {
    response.headers.set(name, value);
  }
}
