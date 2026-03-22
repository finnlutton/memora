import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function formatUpdatedLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
