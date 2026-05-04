// Public Memora page: handle validation, reserved-route list, and a
// couple of small helpers shared between the Settings UI, the API
// routes, and the /@handle page itself.
//
// The DB enforces the same rules in 20260504000100_public_profiles.sql;
// keep this file in sync with those CHECK constraints when adding new
// reserved names or changing the handle pattern.

export const PUBLIC_HANDLE_MIN_LENGTH = 3;
export const PUBLIC_HANDLE_MAX_LENGTH = 30;
export const PUBLIC_DISPLAY_NAME_MAX_LENGTH = 60;
export const PUBLIC_BIO_MAX_LENGTH = 280;

const HANDLE_PATTERN = /^[a-z0-9_-]+$/;

// Anything that collides with a real top-level route, an obvious system
// path, or a generic name we may want to reserve for future use. The
// equivalent SQL list lives in profiles_public_handle_reserved_chk.
export const RESERVED_HANDLES = new Set<string>([
  "admin",
  "administrator",
  "api",
  "app",
  "apps",
  "assets",
  "auth",
  "billing",
  "checkout",
  "dashboard",
  "demo",
  "docs",
  "email-confirmed",
  "error",
  "galleries",
  "gallery",
  "help",
  "home",
  "legal",
  "login",
  "logout",
  "onboarding",
  "pricing",
  "privacy",
  "public",
  "reset-password",
  "robots",
  "root",
  "share",
  "shares",
  "signin",
  "signup",
  "sitemap",
  "site",
  "static",
  "support",
  "settings",
  "system",
  "terms",
  "user",
  "users",
  "welcome",
  "www",
]);

export type HandleValidationError =
  | "empty"
  | "too_short"
  | "too_long"
  | "bad_chars"
  | "reserved";

export type HandleValidationResult =
  | { ok: true; handle: string }
  | { ok: false; reason: HandleValidationError; message: string };

// Normalize: trim, lowercase, strip a leading '@' if the user typed it.
// We never write the '@' to the DB — it's only in the URL.
export function normalizeHandleInput(input: unknown): string {
  if (typeof input !== "string") return "";
  let value = input.trim().toLowerCase();
  if (value.startsWith("@")) value = value.slice(1);
  return value;
}

export function validateHandle(input: unknown): HandleValidationResult {
  const handle = normalizeHandleInput(input);
  if (!handle) {
    return {
      ok: false,
      reason: "empty",
      message: "Pick a handle for your public Memora page.",
    };
  }
  if (handle.length < PUBLIC_HANDLE_MIN_LENGTH) {
    return {
      ok: false,
      reason: "too_short",
      message: `Handles need at least ${PUBLIC_HANDLE_MIN_LENGTH} characters.`,
    };
  }
  if (handle.length > PUBLIC_HANDLE_MAX_LENGTH) {
    return {
      ok: false,
      reason: "too_long",
      message: `Handles can be at most ${PUBLIC_HANDLE_MAX_LENGTH} characters.`,
    };
  }
  if (!HANDLE_PATTERN.test(handle)) {
    return {
      ok: false,
      reason: "bad_chars",
      message:
        "Use lowercase letters, numbers, underscores, or hyphens only.",
    };
  }
  if (RESERVED_HANDLES.has(handle)) {
    return {
      ok: false,
      reason: "reserved",
      message: "That handle is reserved. Pick another one.",
    };
  }
  return { ok: true, handle };
}

// The public URL for a given handle. Pure string formatting — callers
// pass the origin (resolved via lib/site-url.ts on the server, or
// window.location.origin on the client).
export function buildPublicProfileUrl(origin: string, handle: string) {
  const trimmedOrigin = origin.replace(/\/+$/, "");
  return `${trimmedOrigin}/@${handle}`;
}

// Sanitizers for the two free-text fields on a public profile. Trim
// whitespace, collapse multi-line bios to at most one blank line, and
// truncate to the same caps the DB enforces. Returning null means
// "unset this field" (the column is nullable).
export function sanitizePublicDisplayName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, PUBLIC_DISPLAY_NAME_MAX_LENGTH);
}

export function sanitizePublicBio(input: unknown): string | null {
  if (typeof input !== "string") return null;
  // Collapse runs of 3+ newlines to exactly two so the bio doesn't
  // turn into a vertical scroll.
  const trimmed = input.trim().replace(/\n{3,}/g, "\n\n");
  if (!trimmed) return null;
  return trimmed.slice(0, PUBLIC_BIO_MAX_LENGTH);
}
