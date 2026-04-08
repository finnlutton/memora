const PRODUCTION_CANONICAL_ORIGIN = "https://memoragallery.com";

function normalizeOrigin(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    try {
      return new URL(`https://${trimmed}`).origin;
    } catch {
      return null;
    }
  }
}

export function getConfiguredSiteOrigin() {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeOrigin(process.env.SITE_URL) ??
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    null
  );
}

export function getCanonicalProductionOrigin() {
  return (
    getConfiguredSiteOrigin() ??
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    PRODUCTION_CANONICAL_ORIGIN
  );
}

export function getClientSiteOrigin() {
  const configuredOrigin = getConfiguredSiteOrigin();
  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (process.env.VERCEL_ENV === "production") {
    return getCanonicalProductionOrigin();
  }

  const previewOrigin = normalizeOrigin(process.env.VERCEL_URL);
  if (previewOrigin) {
    return previewOrigin;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return getCanonicalProductionOrigin();
}

export function getServerSiteOrigin(requestOrigin?: string | null) {
  if (process.env.VERCEL_ENV === "production") {
    return getCanonicalProductionOrigin();
  }

  return getConfiguredSiteOrigin() ?? normalizeOrigin(requestOrigin) ?? normalizeOrigin(process.env.VERCEL_URL) ?? getCanonicalProductionOrigin();
}

export function buildAbsoluteAppUrl(pathname: string, origin: string) {
  return new URL(pathname, origin).toString();
}
