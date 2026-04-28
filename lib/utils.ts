import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Next.js `Image` does not optimize data/blob URLs; pass `unoptimized` to avoid runtime errors. */
export function nextImageUnoptimizedForSrc(src: string) {
  return src.startsWith("data:") || src.startsWith("blob:");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateRange(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return "Date to be remembered";
  }

  if (startDate && !endDate) {
    return new Date(startDate).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (!startDate && endDate) {
    return new Date(endDate).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const formattedStart = new Date(startDate as string).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedEnd = new Date(endDate as string).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return formattedStart === formattedEnd
    ? formattedStart
    : `${formattedStart} - ${formattedEnd}`;
}

/**
 * Compact variant of formatDateRange. When start and end fall in the
 * same year, the year is dropped from the start so the range reads
 * "Apr 22 - Apr 26, 2026" instead of "Apr 22, 2026 - Apr 26, 2026".
 * Single-date inputs and cross-year ranges fall back to the standard
 * formatDateRange output.
 */
export function formatDateRangeCompact(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) {
    return formatDateRange(startDate, endDate);
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return formatDateRange(startDate, endDate);
  }
  if (start.getFullYear() !== end.getFullYear()) {
    return formatDateRange(startDate, endDate);
  }
  const startLabel = start.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  // Same-day range collapses to one date with year (matches formatDateRange).
  if (startLabel === endLabel.replace(/,\s*\d{4}$/, "")) {
    return endLabel;
  }
  return `${startLabel} - ${endLabel}`;
}

export function formatUpdatedLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Trim a location string into something compact enough for a gallery card.
 *
 *   "Del Mar, CA 92014, USA"            -> "Del Mar, CA"
 *   "Munich, Germany"                   -> "Munich, Germany"
 *   "Livigno, Province of Sondrio, IT"  -> "Livigno, IT"
 *   "Stavanger"                         -> "Stavanger"
 *
 * Strategy: drop ZIP/postal codes (any 4+ digit run), then show
 *   - city + state (drop trailing "USA" / "United States") for US locations,
 *   - city + country otherwise. Single-part inputs pass through.
 *
 * Postal codes mixed into a part (e.g. "CA 92014") are stripped in place,
 * so "CA 92014" becomes "CA". Empty parts after stripping are dropped.
 */
export function formatLocationForCard(location?: string | null) {
  if (!location) return "";
  const parts = location
    .split(",")
    .map((part) =>
      part.replace(/\b\d{4,}(-\d{4})?\b/g, "").replace(/\s+/g, " ").trim(),
    )
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const isUS = /^(usa|u\.?s\.?a?\.?|united states(?: of america)?)$/i.test(
    last,
  );
  if (isUS && parts.length >= 3) {
    // city, state — drop "USA" suffix for the more useful state pair.
    return `${parts[0]}, ${parts[parts.length - 2]}`;
  }
  // city, country (skip any middle administrative regions).
  return `${parts[0]}, ${last}`;
}

export function splitCommaSeparated(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function reorderList<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function countPhotos(photoGroups: { photos: unknown[] }[]) {
  return photoGroups.reduce((sum, group) => sum + group.photos.length, 0);
}
