"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { demoGalleries } from "@/lib/demo-data";
import {
  type AuthUserLike,
  createMembershipState,
  getNextAuthenticatedRoute,
} from "@/lib/onboarding";
import {
  ensureProfileRow,
  loadProfileState,
  sanitizeDisplayName,
  setDisplayName,
  setHasSeenWelcome,
  setSelectedPlan,
} from "@/lib/profile-state";
import {
  canCreate,
  getMembershipPlan,
  translatePlanLimitError,
  type MembershipPlanId,
  type PlanResource,
} from "@/lib/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createId } from "@/lib/utils";
import type {
  Gallery,
  GalleryDivider,
  GalleryInput,
  MemoryPhoto,
  Subgallery,
  SubgalleryInput,
} from "@/types/memora";

const LEGACY_STORAGE_KEY = "memora::galleries:v1";
const DEMO_STORAGE_KEY = "memora::demo-galleries:v1";
const USER_STORAGE_KEY = "memora::user-galleries:v1";
const STORAGE_BUCKET = "gallery-images";

/**
 * Soft byte threshold for the persisted gallery snapshot. The hard cap
 * varies by browser (~5–10 MB) but a single key approaching this size
 * is already a sign that we're persisting something we shouldn't (e.g.
 * an in-flight `data:` image src). Used by `safeWriteJson` to surface
 * an early console warning before the QuotaExceededError fires.
 */
const STORAGE_QUOTA_WARN_BYTES = 2_000_000;

type StorageQuotaInfo = { key: string; bytes: number };

/**
 * Replace any `data:` URL with the empty string. Storage URLs and other
 * forms (http/https/blob/relative paths) pass through untouched. This is
 * the single rule that lets us cheaply persist galleries without ever
 * shipping inlined image data into localStorage.
 */
function stripDataUrlSrc(src: string | null | undefined): string {
  if (!src) return "";
  return typeof src === "string" && src.startsWith("data:") ? "" : src;
}

/**
 * Walk a gallery → subgalleries/scenes → photos and return a deep-ish
 * copy where every `data:` src/coverImage has been replaced with "".
 * Every other field (ids, captions, dates, ordering, locations, remote
 * storage URLs) is preserved by reference.
 *
 * The original in-memory gallery is never mutated — this is invoked only
 * when preparing a snapshot for `localStorage.setItem`.
 */
function sanitizeGalleryForPersist(gallery: Gallery): Gallery {
  return {
    ...gallery,
    coverImage: stripDataUrlSrc(gallery.coverImage),
    subgalleries: gallery.subgalleries.map((sub) => ({
      ...sub,
      coverImage: stripDataUrlSrc(sub.coverImage),
      photos: sub.photos.map((photo) => ({
        ...photo,
        src: stripDataUrlSrc(photo.src),
      })),
    })),
    directPhotos: gallery.directPhotos.map((photo) => ({
      ...photo,
      src: stripDataUrlSrc(photo.src),
    })),
  };
}

function sanitizeCollectionForPersist(collection: Gallery[]): Gallery[] {
  return collection.map(sanitizeGalleryForPersist);
}

/**
 * Race a promise against a timeout. Tab-backgrounding can leave
 * Supabase round-trips waiting indefinitely on a throttled tab; if
 * the network call doesn't resolve in `ms` we throw a TimeoutError so
 * the caller can recover (typically: log, show "reconnecting", and
 * fall back to whatever cached state it already has).
 */
class StoreTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`Memora: ${label} timed out after ${ms}ms`);
    this.name = "StoreTimeoutError";
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(() => {
      reject(new StoreTimeoutError(label, ms));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(id);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(id);
        reject(error);
      },
    );
  });
}

function isQuotaExceededError(error: unknown): boolean {
  const domErr = error instanceof DOMException ? error : null;
  return (
    domErr?.name === "QuotaExceededError" ||
    domErr?.code === 22 ||
    domErr?.code === 1014
  );
}

/**
 * Wrap `localStorage.setItem` with size logging and quota detection.
 * Re-throws on QuotaExceededError so the caller can flag the quota
 * state in the store; non-quota errors also re-throw so they surface
 * normally. The optional `onQuotaExceeded` callback receives the key
 * and byte size for surfacing in the UI without changing log behavior.
 */
function safeWriteJson(
  key: string,
  json: string,
  onQuotaExceeded?: (info: StorageQuotaInfo) => void,
): number {
  const bytes = new Blob([json]).size;
  if (bytes > STORAGE_QUOTA_WARN_BYTES) {
    console.warn(`[memora:storage] ${key} approaching quota`, {
      bytes,
      kb: Math.round(bytes / 1024),
    });
  }
  try {
    window.localStorage.setItem(key, json);
    return bytes;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.error(`[memora:storage] quota exceeded writing ${key}`, {
        bytes,
        kb: Math.round(bytes / 1024),
      });
      onQuotaExceeded?.({ key, bytes });
    }
    throw error;
  }
}

type OnboardingState = {
  isAuthenticated: boolean;
  selectedPlanId: MembershipPlanId | null;
  onboardingComplete: boolean;
  welcomeStepCompleted: boolean;
  /**
   * The user's chosen display name (first name or nickname). Null
   * until they finish the welcome step. Surfaced in the dashboard
   * heading, editable from Settings → Account.
   */
  displayName: string | null;
  user: {
    id: string;
    email: string;
  } | null;
};

type MemoraStore = {
  galleries: Gallery[];
  hydrated: boolean;
  storageQuotaExceeded: boolean;
  /**
   * Diagnostic for the most recent QuotaExceededError. Surfaces the
   * offending storage key and approximate byte size so it can appear
   * in logs / dev panels without expanding the user-facing banner.
   */
  storageQuotaInfo: StorageQuotaInfo | null;
  dismissStorageQuotaWarning: () => void;
  /**
   * True while the store is recovering from a tab-return — soft session
   * verification or a bounded gallery refresh is in flight. Renders a
   * subtle 'Reconnecting…' banner; never blocks the UI or unmounts
   * forms.
   */
  reconnecting: boolean;
  /**
   * Manually trigger a soft recovery pass. Verifies the Supabase
   * session is still live and re-runs gallery hydration with a
   * timeout. Safe to call from the visibility/focus hook on tab
   * return; no-op if no user is signed in.
   */
  recoverFromBackground: () => Promise<void>;
  onboarding: OnboardingState;
  createGallery: (input: GalleryInput) => Promise<string>;
  updateGallery: (galleryId: string, input: GalleryInput) => Promise<void>;
  deleteGallery: (galleryId: string) => Promise<void>;
  createSubgallery: (galleryId: string, input: SubgalleryInput) => Promise<string>;
  updateSubgallery: (
    galleryId: string,
    subgalleryId: string,
    input: SubgalleryInput,
  ) => Promise<void>;
  deleteSubgallery: (galleryId: string, subgalleryId: string) => Promise<void>;
  /**
   * Persist a new ordering of subgalleries within a gallery.
   * `orderedIds` is the desired top-to-bottom order. Updates
   * `display_order` for each row in parallel and reflects the change
   * in local state immediately.
   */
  reorderSubgalleries: (galleryId: string, orderedIds: string[]) => Promise<void>;
  // Direct gallery photos (no subgallery wrapper) and date dividers.
  addGalleryPhotos: (galleryId: string, photos: MemoryPhoto[]) => Promise<void>;
  updateGalleryPhoto: (
    galleryId: string,
    photoId: string,
    fields: {
      caption?: string;
      location?: string | null;
      locationLat?: number | null;
      locationLng?: number | null;
    },
  ) => Promise<void>;
  removeGalleryPhoto: (galleryId: string, photoId: string) => Promise<void>;
  addDivider: (galleryId: string, label: string) => Promise<string>;
  updateDivider: (galleryId: string, dividerId: string, label: string) => Promise<void>;
  removeDivider: (galleryId: string, dividerId: string) => Promise<void>;
  reorderGalleryItems: (
    galleryId: string,
    items: Array<{ type: "photo" | "divider"; id: string }>,
  ) => Promise<void>;
  getGallery: (galleryId: string) => Gallery | undefined;
  getSubgallery: (galleryId: string, subgalleryId: string) => Subgallery | undefined;
  /**
   * Clear all client-side persistence (USER_STORAGE_KEY,
   * DEMO_STORAGE_KEY, LEGACY_STORAGE_KEY) and re-seed the demo
   * galleries. Intended as the recovery action surfaced after a
   * storage-quota warning. Does not touch Supabase Storage or any
   * authenticated user's row data; only the local cache.
   */
  clearLocalCache: () => void;
  signOut: () => void;
  syncOnboardingFromUser: (
    user: AuthUserLike,
    profileState?: {
      hasSeenWelcome: boolean;
      selectedPlanId: MembershipPlanId | null;
      displayName?: string | null;
    },
  ) => void;
  completeCheckout: (planId: MembershipPlanId) => Promise<void>;
  /**
   * Save the user's chosen display name and mark the welcome step
   * complete. Called from the /welcome page after the user submits
   * their first name or nickname.
   */
  completeWelcomeStep: (displayName: string) => Promise<void>;
  /**
   * Update the user's display name without re-triggering the
   * welcome flow. Used by Settings → Account.
   */
  updateDisplayName: (nextName: string) => Promise<void>;
  resetOnboarding: () => void;
  getNextOnboardingRoute: () => string;
  scanOrphanedStorageObjects: () => Promise<{
    totalObjects: number;
    referencedObjects: number;
    orphanedObjects: string[];
  }>;
  deleteOrphanedStorageObjects: (paths: string[]) => Promise<{ deleted: number }>;
};

type GalleryRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  locations?: string[] | null;
  people?: string[] | null;
  mood_tags?: string[] | null;
  privacy?: "private" | "public" | null;
};

type SubgalleryRow = {
  id: string;
  gallery_id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  start_date: string | null;
  end_date: string | null;
  date_label?: string | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
};

type PhotoRow = {
  id: string;
  user_id: string;
  gallery_id: string | null;
  subgallery_id: string | null;
  storage_path: string;
  caption: string | null;
  display_order: number | null;
  taken_at: string | null;
  created_at: string;
  location?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
};

type GalleryDividerRow = {
  id: string;
  user_id: string;
  gallery_id: string;
  label: string;
  display_order: number | null;
  created_at: string;
};

function isLikelyStoragePath(path: string) {
  return !path.startsWith("data:") && !path.startsWith("blob:") && !path.startsWith("/") && !path.startsWith("http");
}

function storagePathFromSupabaseObjectUrl(url: string) {
  if (!url.startsWith("http")) return null;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    const bucket = match[1];
    const path = match[2];
    if (bucket !== STORAGE_BUCKET) return null;
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

function normalizeToStoragePath(value: string) {
  if (!value) return value;
  return storagePathFromSupabaseObjectUrl(value) ?? value;
}

function isSupabaseObjectUrl(value: string) {
  return Boolean(storagePathFromSupabaseObjectUrl(value));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

type PlanLimitErrorPayload = {
  code?: string;
  resource?: PlanResource;
  currentPlan?: string;
  limit?: number;
  currentUsage?: number;
};

async function enforcePlanLimitOnServer(
  resource: PlanResource,
  payload: { galleryId?: string; subgalleryId?: string; desiredUsage?: number } = {},
) {
  const response = await fetch("/api/plan-limits/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource, ...payload }),
  });
  const data = (await response.json()) as PlanLimitErrorPayload & { error?: string };
  if (response.ok) return;
  if (data.code === "PLAN_LIMIT_REACHED" && data.resource) {
    const resourceLabel =
      data.resource === "galleries"
        ? "galleries"
        : data.resource === "subgalleries"
          ? "subgalleries"
          : data.resource === "photos"
            ? "photos"
            : "share links";
    const planLabel = data.currentPlan ? `${data.currentPlan} plan` : "current plan";
    throw new Error(`You've reached the ${resourceLabel} limit on the ${planLabel}. Upgrade to create more.`);
  }
  throw new Error(data.error ?? "Unable to validate plan limits.");
}

function parseDateLabelToRange(dateLabel: string): { startDate: string | null; endDate: string | null } {
  const value = dateLabel.trim();
  if (!value) return { startDate: null, endDate: null };
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { startDate: value, endDate: value };
  }
  return { startDate: null, endDate: null };
}

/**
 * Subgallery dates can come from two places: the new precise
 * `startDate` / `endDate` pair the form now collects, or the legacy
 * free-form `dateLabel` string. Prefer the precise pair when either
 * end is set; otherwise parse `dateLabel` for any back-compat input.
 */
function resolveSubgalleryDateRange(input: SubgalleryInput): {
  startDate: string | null;
  endDate: string | null;
  dateLabel: string;
} {
  const start = input.startDate?.trim() ?? "";
  const end = input.endDate?.trim() ?? "";
  if (start || end) {
    return {
      startDate: start || end || null,
      endDate: end || start || null,
      // Form now drives display via start/end on the viewer side; we
      // null out the legacy free-form label so it doesn't shadow the
      // newer precise dates.
      dateLabel: "",
    };
  }
  const fallback = input.dateLabel?.trim() ?? "";
  if (!fallback) return { startDate: null, endDate: null, dateLabel: "" };
  const parsed = parseDateLabelToRange(fallback);
  return { startDate: parsed.startDate, endDate: parsed.endDate, dateLabel: fallback };
}

function dateLabelFromRange(startDate: string | null, endDate: string | null, fallback?: string | null) {
  if (fallback?.trim()) return fallback;
  if (!startDate) return "";
  if (!endDate || endDate === startDate) return startDate;
  return `${startDate} - ${endDate}`;
}

async function sourceToBlob(source: string) {
  if (source.startsWith("data:")) {
    const [header, payload] = source.split(",", 2);
    if (!header || payload === undefined) {
      throw new Error("Invalid data URL.");
    }

    const mimeMatch = header.match(/^data:([^;]+)(;base64)?$/);
    const mimeType = mimeMatch?.[1] ?? "application/octet-stream";
    const isBase64 = header.includes(";base64");

    if (isBase64) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return new Blob([bytes], { type: mimeType });
    }

    return new Blob([decodeURIComponent(payload)], { type: mimeType });
  }

  const response = await fetch(source);
  return response.blob();
}

async function uploadImageSourceIfNeeded(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string,
  source: string,
  folder: "galleries" | "subgalleries" | "photos",
  id: string,
) {
  if (!source) return source;
  const normalized = normalizeToStoragePath(source);
  if (isLikelyStoragePath(normalized) || normalized.startsWith("/") || normalized.startsWith("http")) {
    return normalized;
  }

  const blob = await sourceToBlob(source);
  const extension = blob.type.includes("png") ? "png" : "jpg";
  const storagePath = `${userId}/${folder}/${id}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return storagePath;
}

async function resolveImageUrls(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  paths: string[],
) {
  const map = new Map<string, string>();
  const normalizedPaths = paths.map((path) => normalizeToStoragePath(path));
  const storagePaths = normalizedPaths.filter((path) => isLikelyStoragePath(path));
  const directPaths = normalizedPaths.filter((path) => !isLikelyStoragePath(path));

  directPaths.forEach((path) => map.set(path, path));

  if (storagePaths.length === 0) return map;

  const uniqueStoragePaths = Array.from(new Set(storagePaths));
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(uniqueStoragePaths, 60 * 60);

  if (error) {
    console.error("Memora: batch signed URL generation failed", {
      bucket: STORAGE_BUCKET,
      paths: uniqueStoragePaths,
      error,
    });

    await Promise.all(
      uniqueStoragePaths.map(async (path) => {
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(path, 60 * 60);

        if (fallbackError) {
          console.error("Memora: fallback signed URL generation failed", {
            bucket: STORAGE_BUCKET,
            path,
            error: fallbackError,
          });
          map.set(path, path);
          return;
        }

        map.set(path, fallbackData.signedUrl ?? path);
      }),
    );
    return map;
  }

  (data as Array<{ signedUrl?: string | null }>).forEach((entry, index) => {
    const originalPath = uniqueStoragePaths[index];
    if (!entry.signedUrl) {
      console.warn("Memora: signed URL missing for storage path", {
        bucket: STORAGE_BUCKET,
        path: originalPath,
        entry,
      });
    }
    map.set(originalPath, entry.signedUrl ?? originalPath);
  });

  return map;
}

async function resolveSingleImageUrl(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  path: string,
) {
  if (!path) return path;

  const normalizedPath = normalizeToStoragePath(path);
  const map = await resolveImageUrls(supabase, [normalizedPath]);
  return map.get(normalizedPath) ?? normalizedPath;
}

async function loadUserGalleriesFromSupabase(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string,
) {
  const { data: galleriesData, error: galleriesError } = await supabase
    .from("galleries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (galleriesError) throw galleriesError;

  const galleryRows = (galleriesData ?? []) as GalleryRow[];
  if (galleryRows.length === 0) return [] as Gallery[];

  const galleryIds = galleryRows.map((gallery) => gallery.id);

  // Subgalleries, photos, and dividers all depend only on the gallery
  // IDs we already have — fan them out in parallel. Previously this was
  // three sequential round-trips (3× the wait). Promise.all collapses
  // the slowest single query as the floor.
  const [
    { data: subgalleriesData, error: subgalleriesError },
    { data: photosData, error: photosError },
    { data: dividersData, error: dividersError },
  ] = await Promise.all([
    supabase
      .from("subgalleries")
      .select("*")
      .eq("user_id", userId)
      .in("gallery_id", galleryIds)
      .order("display_order", { ascending: true }),
    // Photos: fetch by gallery_id so we catch both subgallery-attached
    // and direct (subgallery_id is null) in one round trip.
    supabase
      .from("photos")
      .select("*")
      .eq("user_id", userId)
      .in("gallery_id", galleryIds)
      .order("display_order", { ascending: true }),
    // Dividers share the per-gallery display_order namespace with
    // direct photos.
    supabase
      .from("gallery_dividers")
      .select("*")
      .eq("user_id", userId)
      .in("gallery_id", galleryIds)
      .order("display_order", { ascending: true }),
  ]);
  if (subgalleriesError) throw subgalleriesError;
  if (photosError) throw photosError;
  if (dividersError) throw dividersError;

  const subgalleryRows = (subgalleriesData ?? []) as SubgalleryRow[];
  const photoRows = (photosData ?? []) as PhotoRow[];
  const dividerRows = (dividersData ?? []) as GalleryDividerRow[];

  // If older versions accidentally persisted signed/public object URLs into the DB, normalize and self-heal best-effort.
  const galleriesToHeal = galleryRows
    .map((gallery) => ({
      id: gallery.id,
      original: gallery.cover_image_path,
      normalized: gallery.cover_image_path ? normalizeToStoragePath(gallery.cover_image_path) : null,
    }))
    .filter((entry) => entry.original && entry.normalized && entry.original !== entry.normalized);

  const subgalleriesToHeal = subgalleryRows
    .map((subgallery) => ({
      id: subgallery.id,
      original: subgallery.cover_image_path,
      normalized: subgallery.cover_image_path ? normalizeToStoragePath(subgallery.cover_image_path) : null,
    }))
    .filter((entry) => entry.original && entry.normalized && entry.original !== entry.normalized);

  const photosToHeal = photoRows
    .map((photo) => ({
      id: photo.id,
      original: photo.storage_path,
      normalized: normalizeToStoragePath(photo.storage_path),
    }))
    .filter((entry) => entry.original && entry.normalized && entry.original !== entry.normalized);

  if (galleriesToHeal.length || subgalleriesToHeal.length || photosToHeal.length) {
    void (async () => {
      try {
        await Promise.all([
          ...galleriesToHeal.map((entry) =>
            supabase
              .from("galleries")
              .update({ cover_image_path: entry.normalized })
              .eq("id", entry.id)
              .eq("user_id", userId),
          ),
          ...subgalleriesToHeal.map((entry) =>
            supabase
              .from("subgalleries")
              .update({ cover_image_path: entry.normalized })
              .eq("id", entry.id)
              .eq("user_id", userId),
          ),
          ...photosToHeal.map((entry) =>
            supabase
              .from("photos")
              .update({ storage_path: entry.normalized })
              .eq("id", entry.id)
              .eq("user_id", userId),
          ),
        ]);
      } catch (error) {
        console.error("Memora: failed to heal storage paths", error);
      }
    })();
  }

  const allPaths = [
    ...galleryRows.map((gallery) => gallery.cover_image_path ?? "").filter(Boolean),
    ...subgalleryRows.map((subgallery) => subgallery.cover_image_path ?? "").filter(Boolean),
    ...photoRows.map((photo) => photo.storage_path).filter(Boolean),
  ];
  const resolvedImageMap = await resolveImageUrls(supabase, allPaths);
  const normalizeForLookup = (value: string) => normalizeToStoragePath(value);

  if (process.env.NODE_ENV !== "production" && galleryRows[0]) {
    const sampleGallery = galleryRows[0];
    const normalizedCover = normalizeForLookup(sampleGallery.cover_image_path ?? "");
    console.info("Memora: gallery cover pipeline", {
      galleryId: sampleGallery.id,
      cover_image_path: sampleGallery.cover_image_path,
      normalizedCover,
      signedUrl: resolvedImageMap.get(normalizedCover) ?? null,
    });
  }

  const photosBySubgallery = new Map<string, MemoryPhoto[]>();
  const directPhotosByGallery = new Map<string, MemoryPhoto[]>();
  photoRows.forEach((photo) => {
    const normalizedPath = normalizeForLookup(photo.storage_path);
    const entry: MemoryPhoto = {
      id: photo.id,
      galleryId: photo.gallery_id ?? null,
      subgalleryId: photo.subgallery_id,
      src: resolvedImageMap.get(normalizedPath) ?? normalizedPath,
      caption: photo.caption ?? "",
      location: photo.location ?? null,
      locationLat: photo.location_lat ?? null,
      locationLng: photo.location_lng ?? null,
      createdAt: photo.created_at,
      order: photo.display_order ?? 0,
    };
    if (photo.subgallery_id) {
      const current = photosBySubgallery.get(photo.subgallery_id) ?? [];
      photosBySubgallery.set(photo.subgallery_id, [...current, entry]);
    } else if (photo.gallery_id) {
      const current = directPhotosByGallery.get(photo.gallery_id) ?? [];
      directPhotosByGallery.set(photo.gallery_id, [...current, entry]);
    }
  });

  const dividersByGallery = new Map<string, GalleryDivider[]>();
  dividerRows.forEach((row) => {
    const entry: GalleryDivider = {
      id: row.id,
      galleryId: row.gallery_id,
      label: row.label,
      order: row.display_order ?? 0,
      createdAt: row.created_at,
    };
    const current = dividersByGallery.get(row.gallery_id) ?? [];
    dividersByGallery.set(row.gallery_id, [...current, entry]);
  });

  const subgalleriesByGallery = new Map<string, Subgallery[]>();
  subgalleryRows.forEach((subgallery) => {
    const normalizedCover = normalizeForLookup(subgallery.cover_image_path ?? "");
    const entry: Subgallery = {
      id: subgallery.id,
      galleryId: subgallery.gallery_id,
      title: subgallery.title,
      coverImage: resolvedImageMap.get(normalizedCover) ?? normalizedCover,
      location: subgallery.location ?? "",
      locationLat: subgallery.location_lat ?? null,
      locationLng: subgallery.location_lng ?? null,
      dateLabel: dateLabelFromRange(subgallery.start_date, subgallery.end_date, subgallery.date_label),
      startDate: subgallery.start_date ?? "",
      endDate: subgallery.end_date ?? "",
      description: subgallery.description ?? "",
      photos: sortPhotos(photosBySubgallery.get(subgallery.id) ?? []),
      createdAt: subgallery.created_at,
      updatedAt: subgallery.updated_at,
    };
    const current = subgalleriesByGallery.get(subgallery.gallery_id) ?? [];
    subgalleriesByGallery.set(subgallery.gallery_id, [...current, entry]);
  });

  return galleryRows.map((gallery) => {
    const normalizedCover = normalizeForLookup(gallery.cover_image_path ?? "");
    return {
      id: gallery.id,
      title: gallery.title,
      coverImage: resolvedImageMap.get(normalizedCover) ?? normalizedCover,
      description: gallery.description ?? "",
      startDate: gallery.start_date ?? "",
      endDate: gallery.end_date ?? "",
      locations: gallery.locations ?? (gallery.location ? [gallery.location] : []),
      locationLat: gallery.location_lat ?? null,
      locationLng: gallery.location_lng ?? null,
      people: gallery.people ?? [],
      moodTags: gallery.mood_tags ?? [],
      privacy: gallery.privacy ?? "private",
      createdAt: gallery.created_at,
      updatedAt: gallery.updated_at,
      subgalleries: subgalleriesByGallery.get(gallery.id) ?? [],
      directPhotos: (directPhotosByGallery.get(gallery.id) ?? [])
        .slice()
        .sort((a, b) => a.order - b.order),
      dividers: (dividersByGallery.get(gallery.id) ?? [])
        .slice()
        .sort((a, b) => a.order - b.order),
    };
  });
}

const MemoraContext = createContext<MemoraStore | null>(null);

const defaultOnboardingState: OnboardingState = {
  isAuthenticated: false,
  selectedPlanId: null,
  onboardingComplete: false,
  welcomeStepCompleted: false,
  displayName: null,
  user: null,
};

function sortPhotos<T extends { order: number }>(photos: T[]) {
  return [...photos].sort((left, right) => left.order - right.order);
}

function splitLegacyGalleries(galleries: Gallery[]) {
  return {
    demo: galleries.filter((gallery) => demoGalleries.some((demoGallery) => demoGallery.id === gallery.id)),
    user: galleries.filter((gallery) => !demoGalleries.some((demoGallery) => demoGallery.id === gallery.id)),
  };
}

function loadStoredGalleryCollections() {
  if (typeof window === "undefined") {
    return {
      demo: demoGalleries,
      user: [] as Gallery[],
    };
  }

  let demo: Gallery[] = demoGalleries;
  let user: Gallery[] = [];

  const demoValue = window.localStorage.getItem(DEMO_STORAGE_KEY);
  const userValue = window.localStorage.getItem(USER_STORAGE_KEY);
  if (demoValue || userValue) {
    try {
      demo = demoValue ? (JSON.parse(demoValue) as Gallery[]) : demoGalleries;
      user = userValue ? (JSON.parse(userValue) as Gallery[]) : [];
    } catch {
      demo = demoGalleries;
      user = [];
    }
  } else {
    const storedValue = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (storedValue) {
      try {
        const split = splitLegacyGalleries(
          JSON.parse(storedValue) as Gallery[],
        );
        demo = split.demo;
        user = split.user;
      } catch {
        demo = demoGalleries;
        user = [];
      }
    }
  }

  // One-time cleanup: rewrite localStorage with sanitized data so older
  // versions of Memora that wrote raw `data:` srcs don't keep eating
  // quota every render. The in-memory copies returned to React still
  // contain whatever `data:` URLs the snapshot held, so any in-flight
  // photo previews continue to render until their Supabase upload
  // completes and replaces the src with a remote URL. Defensive — never
  // throws; a write failure here is benign because the persist effect
  // will retry on the next state change.
  try {
    const sanitizedDemoJson = JSON.stringify(
      sanitizeCollectionForPersist(demo),
    );
    const sanitizedUserJson = JSON.stringify(
      sanitizeCollectionForPersist(user),
    );
    if (demoValue !== null && sanitizedDemoJson !== demoValue) {
      window.localStorage.setItem(DEMO_STORAGE_KEY, sanitizedDemoJson);
    }
    if (userValue !== null && sanitizedUserJson !== userValue) {
      window.localStorage.setItem(USER_STORAGE_KEY, sanitizedUserJson);
    }
    // Drop any lingering legacy snapshot now that we've migrated.
    if (window.localStorage.getItem(LEGACY_STORAGE_KEY) !== null) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    // best effort — never block hydration on a cleanup failure
  }

  return { demo, user };
}

function buildOnboardingStateFromUser(
  user: AuthUserLike,
  profileState: {
    hasSeenWelcome: boolean;
    selectedPlanId: MembershipPlanId | null;
    displayName?: string | null;
  } = { hasSeenWelcome: false, selectedPlanId: null, displayName: null },
): OnboardingState {
  const membershipState = createMembershipState(profileState.selectedPlanId);

  return {
    isAuthenticated: Boolean(user),
    selectedPlanId: membershipState.selectedPlanId,
    onboardingComplete: membershipState.onboardingComplete,
    welcomeStepCompleted: Boolean(user) ? profileState.hasSeenWelcome : false,
    displayName: Boolean(user) ? profileState.displayName ?? null : null,
    user: user?.id ? { id: user.id, email: user.email ?? "" } : null,
  };
}

async function deleteStorageObjectsSafe(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string,
  paths: Array<string | null | undefined>,
) {
  const toDelete = Array.from(
    new Set(
      paths
        .filter((path): path is string => Boolean(path && path.trim()))
        .map((path) => normalizeToStoragePath(path))
        .filter((path) => isLikelyStoragePath(path) && path.startsWith(`${userId}/`)),
    ),
  );

  if (toDelete.length === 0) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(toDelete);
  if (error) {
    console.error("Memora: failed to delete storage objects", error);
  }
}

type StorageListItem = {
  name: string;
  id?: string | null;
  metadata?: unknown | null;
};

async function listAllStorageObjectsUnderPrefix(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  prefix: string,
) {
  const files: string[] = [];
  const queue: string[] = [prefix];

  while (queue.length) {
    const folder = queue.shift()!;
    let offset = 0;

    // Page through results to avoid missing large folders.
    for (;;) {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      const items = (data ?? []) as StorageListItem[];
      if (items.length === 0) break;

      for (const item of items) {
        const isFolder = (item as StorageListItem).id == null && (item as StorageListItem).metadata == null;
        const nextPath = folder ? `${folder}/${item.name}` : item.name;
        if (isFolder) {
          queue.push(nextPath);
        } else {
          files.push(nextPath);
        }
      }

      if (items.length < 1000) break;
      offset += items.length;
    }
  }

  return files;
}

export function MemoraProvider({ children }: { children: React.ReactNode }) {
  // Same initial state on server and client so SSR markup matches the first client render.
  // Rehydrate from localStorage only after mount (client-only).
  const [demoGalleryCollection, setDemoGalleryCollection] = useState<Gallery[]>(demoGalleries);
  const [userGalleryCollection, setUserGalleryCollection] = useState<Gallery[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingState>(defaultOnboardingState);
  const [hydrated, setHydrated] = useState(false);
  const [storageQuotaExceeded, setStorageQuotaExceeded] = useState(false);
  const [storageQuotaInfo, setStorageQuotaInfo] =
    useState<StorageQuotaInfo | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  // Tracks the user id we already loaded galleries for. Prevents the
  // auth listener from running the full hydration chain again when
  // Supabase fires SIGNED_IN for the same user (which can happen on
  // tab-resume after a long background, after a token refresh, etc.).
  const lastLoadedUserIdRef = useRef<string | null>(null);
  // Coalesces concurrent recovery attempts so a fast double-fire of
  // visibilitychange + focus doesn't kick off two parallel hydrations.
  const recoveryInflightRef = useRef<Promise<void> | null>(null);
  // Soft-bound on every Supabase round-trip the store makes during a
  // visibility-driven recovery. Long enough for a normal cold network
  // resume, short enough that a stalled tab doesn't appear frozen.
  const RECOVERY_TIMEOUT_MS = 12_000;
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  const hasBootstrappedAuthRef = useRef(false);

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createSupabaseBrowserClient();
    }
    return supabaseRef.current;
  };

  useEffect(() => {
    if (hasBootstrappedAuthRef.current) {
      return;
    }
    hasBootstrappedAuthRef.current = true;

    const nextCollections = loadStoredGalleryCollections();
    let cancelled = false;

    const syncInitialState = async () => {
      try {
        const supabase = getSupabase();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Memora: failed to load auth session", {
            context: "store:initial-session",
            error: sessionError,
          });
        }
        if (cancelled) {
          return;
        }

        const nextUser = data.session?.user ?? null;

        if (nextUser) {
          await ensureProfileRow(
            supabase,
            {
              id: nextUser.id,
              email: nextUser.email ?? null,
            },
            "store:initial-sync:ensure-profile",
          );
        }
        const profileState = nextUser
          ? await loadProfileState(
              supabase,
              {
                id: nextUser.id,
                email: nextUser.email ?? null,
              },
              "store:initial-sync",
            )
          : { hasSeenWelcome: false, selectedPlanId: null, displayName: null };
        const persistedUserGalleries = nextUser
          ? await withTimeout(
              loadUserGalleriesFromSupabase(supabase, nextUser.id),
              RECOVERY_TIMEOUT_MS,
              "loadUserGalleriesFromSupabase:initial",
            ).catch((error) => {
              console.error(
                "Memora: initial gallery load failed",
                error,
              );
              return nextCollections.user;
            })
          : nextCollections.user;

        // Mark the user we just loaded so the auth state listener
        // can skip a redundant reload when SIGNED_IN fires for the
        // same id later (e.g. on tab return).
        lastLoadedUserIdRef.current = nextUser?.id ?? null;
        queueMicrotask(() => {
          setDemoGalleryCollection(nextCollections.demo);
          setUserGalleryCollection(persistedUserGalleries);
          setOnboarding(
            buildOnboardingStateFromUser(
              nextUser,
              profileState,
            ),
          );
          setHydrated(true);
        });
      } catch (error) {
        console.error("Memora: failed to load initial auth state", error);
        queueMicrotask(() => {
          setDemoGalleryCollection(nextCollections.demo);
          setUserGalleryCollection(nextCollections.user);
          setOnboarding(defaultOnboardingState);
          setHydrated(true);
        });
      }
    };

    void syncInitialState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    // Sanitize before persisting so we never ship a `data:` blob into
    // localStorage. The in-memory React state is untouched — only the
    // snapshot we serialize here has data URLs replaced with "".
    let lastQuotaHit: StorageQuotaInfo | null = null;
    const recordQuotaHit = (info: StorageQuotaInfo) => {
      lastQuotaHit = info;
    };
    try {
      const demoJson = JSON.stringify(
        sanitizeCollectionForPersist(demoGalleryCollection),
      );
      const userJson = JSON.stringify(
        sanitizeCollectionForPersist(userGalleryCollection),
      );
      safeWriteJson(DEMO_STORAGE_KEY, demoJson, recordQuotaHit);
      safeWriteJson(USER_STORAGE_KEY, userJson, recordQuotaHit);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      queueMicrotask(() => {
        setStorageQuotaExceeded(false);
        setStorageQuotaInfo(null);
      });
    } catch (error) {
      if (isQuotaExceededError(error)) {
        queueMicrotask(() => {
          setStorageQuotaExceeded(true);
          if (lastQuotaHit) setStorageQuotaInfo(lastQuotaHit);
        });
      } else {
        console.error("Memora: failed to save galleries", error);
      }
    }
  }, [demoGalleryCollection, hydrated, userGalleryCollection]);

  useEffect(() => {
    if (!hydrated) return;

    const supabase = getSupabase();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
      if (
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        return;
      }

      const user = session?.user ?? null;

      // SIGNED_IN can fire when the tab returns from background and
      // Supabase re-validates the session. If the user id hasn't
      // changed we already have their galleries loaded — skip the
      // heavy reload (which previously could appear to "freeze" the
      // tab on resume) and just keep the local state.
      if (
        event === "SIGNED_IN" &&
        user &&
        lastLoadedUserIdRef.current === user.id
      ) {
        return;
      }

      if (user) {
        try {
          await withTimeout(
            ensureProfileRow(
              supabase,
              { id: user.id, email: user.email ?? null },
              "store:auth-state-change:ensure-profile",
            ),
            RECOVERY_TIMEOUT_MS,
            "ensureProfileRow",
          );
        } catch (error) {
          console.error("Memora: ensureProfileRow failed", error);
        }
      }
      const profileState = user
        ? await withTimeout(
            loadProfileState(
              supabase,
              { id: user.id, email: user.email ?? null },
              "store:auth-state-change",
            ),
            RECOVERY_TIMEOUT_MS,
            "loadProfileState",
          ).catch((error) => {
            console.error("Memora: loadProfileState failed", error);
            return { hasSeenWelcome: false, selectedPlanId: null, displayName: null };
          })
        : { hasSeenWelcome: false, selectedPlanId: null, displayName: null };
      const nextUserGalleries = user
        ? await withTimeout(
            loadUserGalleriesFromSupabase(supabase, user.id),
            RECOVERY_TIMEOUT_MS,
            "loadUserGalleriesFromSupabase",
          ).catch((error) => {
            console.error("Memora: failed to load persisted galleries", error);
            return [] as Gallery[];
          })
        : [];

      lastLoadedUserIdRef.current = user?.id ?? null;
      queueMicrotask(() => {
        setOnboarding(buildOnboardingStateFromUser(user, profileState));
        setUserGalleryCollection(nextUserGalleries);
      });
      },
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [hydrated]);

  const value = useMemo<MemoraStore>(() => {
    const galleries = onboarding.isAuthenticated ? userGalleryCollection : demoGalleryCollection;
    const setActiveGalleries = onboarding.isAuthenticated
      ? setUserGalleryCollection
      : setDemoGalleryCollection;

    const recoverFromBackground = async (): Promise<void> => {
      if (recoveryInflightRef.current) {
        return recoveryInflightRef.current;
      }
      const run = async () => {
        const supabase = getSupabase();
        setReconnecting(true);
        try {
          // Soft session check first — quick, just confirms the
          // refresh token is still good. Supabase's own background
          // refresh has usually already done this; we're being
          // defensive about long-throttled tabs.
          const result = await withTimeout<
            Awaited<ReturnType<typeof supabase.auth.getSession>>
          >(
            supabase.auth.getSession(),
            RECOVERY_TIMEOUT_MS,
            "auth.getSession",
          );
          const data = result.data;
          const error = result.error;
          if (error) {
            console.error("Memora: session recovery getSession failed", error);
          }
          const user = data?.session?.user ?? null;
          // If the user id hasn't changed, no data refetch needed —
          // any new server-side changes will surface on the next
          // explicit user action. Avoiding the full reload here is
          // exactly what keeps tab-return from feeling like a freeze.
          if (!user || user.id === lastLoadedUserIdRef.current) {
            return;
          }
          const refreshedGalleries = await withTimeout(
            loadUserGalleriesFromSupabase(supabase, user.id),
            RECOVERY_TIMEOUT_MS,
            "loadUserGalleriesFromSupabase:recovery",
          ).catch((err) => {
            console.error("Memora: recovery gallery load failed", err);
            return null;
          });
          if (refreshedGalleries) {
            lastLoadedUserIdRef.current = user.id;
            setUserGalleryCollection(refreshedGalleries);
          }
        } catch (err) {
          console.error("Memora: recoverFromBackground failed", err);
        } finally {
          setReconnecting(false);
        }
      };
      const promise = run().finally(() => {
        recoveryInflightRef.current = null;
      });
      recoveryInflightRef.current = promise;
      return promise;
    };

    return {
      galleries,
      hydrated,
      storageQuotaExceeded,
      storageQuotaInfo,
      dismissStorageQuotaWarning: () => {
        setStorageQuotaExceeded(false);
        setStorageQuotaInfo(null);
      },
      reconnecting,
      recoverFromBackground,
      onboarding,
      async createGallery(input) {
        const selectedPlan = getMembershipPlan(onboarding.selectedPlanId);
        if (
          onboarding.isAuthenticated &&
          selectedPlan &&
          !canCreate("galleries", galleries.length, selectedPlan).allowed
        ) {
          throw new Error(`You've reached the gallery limit on the ${selectedPlan.name} plan. Upgrade to create more galleries.`);
        }

        const timestamp = new Date().toISOString();
        const nextGalleryId =
          onboarding.isAuthenticated && typeof crypto !== "undefined"
            ? crypto.randomUUID()
            : createId("gallery");
        let persistedCover = input.coverImage;

        if (onboarding.isAuthenticated) {
          await enforcePlanLimitOnServer("galleries");
          const supabase = createSupabaseBrowserClient();
          let userId = onboarding.user?.id ?? null;
          let authLookupError: unknown = null;

          if (!userId) {
            const { data, error } = await supabase.auth.getUser();
            userId = data.user?.id ?? null;
            authLookupError = error;
          }

          console.info("Memora: create gallery user resolved", {
            onboardingUserId: onboarding.user?.id ?? null,
            resolvedUserId: userId,
            authLookupError,
          });

          if (!userId) {
            throw new Error("Please sign in again to create a gallery.");
          }

          console.info("Memora: create gallery start", {
            userId,
            title: input.title,
            hasCoverImage: Boolean(input.coverImage),
          });

          persistedCover = await uploadImageSourceIfNeeded(
            supabase,
            userId,
            input.coverImage,
            "galleries",
            nextGalleryId,
          );

          console.info("Memora: create gallery upload complete", {
            galleryId: nextGalleryId,
            persistedCover,
          });

          const insertPayload = {
            id: nextGalleryId,
            user_id: userId,
            title: input.title,
            description: input.description || null,
            cover_image_path: persistedCover || null,
            location: input.location || null,
            location_lat: input.locationLat,
            location_lng: input.locationLng,
            start_date: input.startDate || null,
            end_date: input.endDate || null,
            locations: input.location ? [input.location] : [],
            people: input.people,
            mood_tags: input.moodTags,
            privacy: input.privacy,
          };

          console.info("Memora: create gallery insert attempt", {
            galleryId: nextGalleryId,
            userId,
            payload: insertPayload,
          });

          const { error } = await supabase.from("galleries").insert(insertPayload);
          if (error) {
            console.error("Memora: create gallery insert failed", {
              galleryId: nextGalleryId,
              userId,
              error,
            });
            throw translatePlanLimitError(error) ?? error;
          }

          console.info("Memora: create gallery insert success", {
            galleryId: nextGalleryId,
            userId,
          });

          try {
            persistedCover = await resolveSingleImageUrl(supabase, persistedCover);
            console.info("Memora: create gallery post-insert cover resolution success", {
              galleryId: nextGalleryId,
              userId,
            });
          } catch (resolutionError) {
            console.error("Memora: create gallery post-insert cover resolution failed", {
              galleryId: nextGalleryId,
              userId,
              error: resolutionError,
            });
            persistedCover = input.coverImage || persistedCover;
          }
        }

        const nextGallery: Gallery = {
          title: input.title,
          description: input.description,
          startDate: input.startDate,
          endDate: input.endDate,
          locations: input.location ? [input.location] : [],
          locationLat: input.locationLat,
          locationLng: input.locationLng,
          people: input.people,
          moodTags: input.moodTags,
          privacy: input.privacy,
          id: nextGalleryId,
          coverImage: persistedCover,
          createdAt: timestamp,
          updatedAt: timestamp,
          subgalleries: [],
          directPhotos: [],
          dividers: [],
        };
        setActiveGalleries((current) => [nextGallery, ...current]);
        console.info("Memora: create gallery local state update", {
          galleryId: nextGallery.id,
          authenticated: onboarding.isAuthenticated,
        });
        return nextGallery.id;
      },
      async updateGallery(galleryId, input) {
        let persistedCover = input.coverImage;
        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to update this gallery.");
          }

          const currentGallery = galleries.find((gallery) => gallery.id === galleryId);
          const previousCover = currentGallery?.coverImage ?? null;

          persistedCover = await uploadImageSourceIfNeeded(
            supabase,
            userId,
            input.coverImage,
            "galleries",
            galleryId,
          );
          const { error } = await supabase
            .from("galleries")
            .update({
              title: input.title,
              description: input.description || null,
              cover_image_path: persistedCover || null,
              location: input.location || null,
              location_lat: input.locationLat,
              location_lng: input.locationLng,
              start_date: input.startDate || null,
              end_date: input.endDate || null,
              locations: input.location ? [input.location] : [],
              people: input.people,
              mood_tags: input.moodTags,
              privacy: input.privacy,
              updated_at: new Date().toISOString(),
            })
            .eq("id", galleryId)
            .eq("user_id", userId);
          if (error) throw error;

          persistedCover = await resolveSingleImageUrl(supabase, persistedCover);

          if (
            previousCover &&
            normalizeToStoragePath(previousCover) !== normalizeToStoragePath(persistedCover) &&
            (isSupabaseObjectUrl(previousCover) || isLikelyStoragePath(previousCover))
          ) {
            await deleteStorageObjectsSafe(supabase, userId, [previousCover]);
          }
        }

        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? {
                  ...gallery,
                  title: input.title,
                  description: input.description,
                  startDate: input.startDate,
                  endDate: input.endDate,
                  locations: input.location ? [input.location] : [],
                  locationLat: input.locationLat,
                  locationLng: input.locationLng,
                  people: input.people,
                  moodTags: input.moodTags,
                  privacy: input.privacy,
                  coverImage: persistedCover,
                  updatedAt: new Date().toISOString(),
                }
              : gallery,
          ),
        );
      },
      async deleteGallery(galleryId) {
        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to delete this gallery.");
          }

          // Fetch associated storage paths before deleting rows.
          const { data: galleryRow } = await supabase
            .from("galleries")
            .select("cover_image_path")
            .eq("id", galleryId)
            .eq("user_id", userId)
            .maybeSingle();
          const { data: subRows } = await supabase
            .from("subgalleries")
            .select("id, cover_image_path")
            .eq("gallery_id", galleryId)
            .eq("user_id", userId);
          // All photos in this gallery — both subgallery-attached and
          // direct (subgallery_id is null) — are reachable via gallery_id,
          // which simplifies cleanup of storage objects.
          const { data: photoRows } = await supabase
            .from("photos")
            .select("storage_path")
            .eq("user_id", userId)
            .eq("gallery_id", galleryId);

          const { error } = await supabase
            .from("galleries")
            .delete()
            .eq("id", galleryId)
            .eq("user_id", userId);
          if (error) throw error;

          await deleteStorageObjectsSafe(supabase, userId, [
            galleryRow?.cover_image_path ?? null,
            ...(subRows ?? []).map((s: { cover_image_path: string | null }) => s.cover_image_path),
            ...(photoRows ?? []).map((p: { storage_path: string }) => p.storage_path),
          ]);
        }
        setActiveGalleries((current) => current.filter((gallery) => gallery.id !== galleryId));
      },
      async createSubgallery(galleryId, input) {
        const selectedPlan = getMembershipPlan(onboarding.selectedPlanId);
        const gallery = galleries.find((entry) => entry.id === galleryId);
        if (
          onboarding.isAuthenticated &&
          selectedPlan &&
          gallery &&
          !canCreate("subgalleries", gallery.subgalleries.length, selectedPlan).allowed
        ) {
          throw new Error(`You've reached the subgallery limit on the ${selectedPlan.name} plan. Upgrade to create more.`);
        }
        if (
          onboarding.isAuthenticated &&
          selectedPlan &&
          !canCreate("photos", input.photos.length - 1, selectedPlan).allowed
        ) {
          throw new Error(`You've reached the photo limit on the ${selectedPlan.name} plan. Upgrade to add more photos.`);
        }

        const timestamp = new Date().toISOString();
        const subgalleryId =
          onboarding.isAuthenticated && typeof crypto !== "undefined"
            ? crypto.randomUUID()
            : createId("subgallery");
        let persistedCover = input.coverImage;
        let persistedPhotos = sortPhotos(
          input.photos.map((photo, index) => ({
            ...photo,
            subgalleryId,
            order: index,
          })),
        );

        if (onboarding.isAuthenticated) {
          await enforcePlanLimitOnServer("subgalleries", { galleryId });
          await enforcePlanLimitOnServer("photos", { desiredUsage: input.photos.length });
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to create a subgallery.");
          }

          if (process.env.NODE_ENV !== "production") {
            console.info("Memora: create subgallery start", {
              galleryId,
              subgalleryId,
              userId,
              title: input.title,
              photoCount: input.photos.length,
            });
          }

          if (process.env.NODE_ENV !== "production") {
            console.info("Memora: create subgallery cover upload start", {
              galleryId,
              subgalleryId,
              coverSource: input.coverImage,
            });
          }

          persistedCover = await uploadImageSourceIfNeeded(
            supabase,
            userId,
            input.coverImage,
            "subgalleries",
            subgalleryId,
          );

          if (process.env.NODE_ENV !== "production") {
            console.info("Memora: create subgallery cover upload complete", {
              galleryId,
              subgalleryId,
              persistedCover,
            });
          }

          // Upload all subgallery photos in parallel. The previous
          // sequential for-loop blew up to N×latency on first creation;
          // Promise.all collapses that to ~1×latency for the user.
          const uploadedPhotos = await Promise.all(
            persistedPhotos.map(async (photo, index) => {
              const photoId =
                photo.id && isUuid(photo.id)
                  ? photo.id
                  : typeof crypto !== "undefined"
                    ? crypto.randomUUID()
                    : createId("photo");
              if (process.env.NODE_ENV !== "production") {
                console.info("Memora: create subgallery photo upload start", {
                  galleryId,
                  subgalleryId,
                  photoId,
                  index,
                });
              }
              const persistedSrc = await uploadImageSourceIfNeeded(
                supabase,
                userId,
                photo.src,
                "photos",
                photoId,
              );
              if (process.env.NODE_ENV !== "production") {
                console.info("Memora: create subgallery photo upload complete", {
                  galleryId,
                  subgalleryId,
                  photoId,
                  index,
                  persistedSrc,
                });
              }
              return {
                ...photo,
                id: photoId,
                src: persistedSrc,
                order: index,
              };
            }),
          );
          persistedPhotos = uploadedPhotos;

          const range = resolveSubgalleryDateRange(input);

          if (process.env.NODE_ENV !== "production") {
            console.info("Memora: create subgallery insert start", {
              galleryId,
              subgalleryId,
              userId,
              location: input.location,
              startDate: range.startDate,
              endDate: range.endDate,
            });
          }

          const { error: subgalleryError } = await supabase.from("subgalleries").insert({
            id: subgalleryId,
            gallery_id: galleryId,
            user_id: userId,
            title: input.title,
            description: input.description || null,
            cover_image_path: persistedCover || null,
            location: input.location || null,
            location_lat: input.locationLat,
            location_lng: input.locationLng,
            start_date: range.startDate,
            end_date: range.endDate,
            date_label: range.dateLabel || null,
            display_order: galleries
              .find((gallery) => gallery.id === galleryId)
              ?.subgalleries.length ?? 0,
          });
          if (subgalleryError) {
            console.error("Memora: create subgallery insert failed", {
              galleryId,
              subgalleryId,
              userId,
              error: subgalleryError,
            });
            throw translatePlanLimitError(subgalleryError) ?? subgalleryError;
          }

          if (process.env.NODE_ENV !== "production") {
            console.info("Memora: create subgallery insert complete", {
              galleryId,
              subgalleryId,
            });
          }

          if (persistedPhotos.length) {
            if (process.env.NODE_ENV !== "production") {
              console.info("Memora: create subgallery photos insert start", {
                galleryId,
                subgalleryId,
                count: persistedPhotos.length,
              });
            }

            const { error: photosError } = await supabase.from("photos").insert(
              persistedPhotos.map((photo, index) => ({
                id: photo.id,
                user_id: userId,
                gallery_id: galleryId,
                subgallery_id: subgalleryId,
                storage_path: photo.src,
                caption: photo.caption || null,
                display_order: index,
                taken_at: null,
              })),
            );
            if (photosError) {
              console.error("Memora: create subgallery photos insert failed", {
                galleryId,
                subgalleryId,
                userId,
                error: photosError,
              });
              throw translatePlanLimitError(photosError) ?? photosError;
            }

            if (process.env.NODE_ENV !== "production") {
              console.info("Memora: create subgallery photos insert complete", {
                galleryId,
                subgalleryId,
                count: persistedPhotos.length,
              });
            }
          }
        }

        const localPhotos = sortPhotos(
          persistedPhotos.map((photo, index) => ({
            ...photo,
            src: input.photos[index]?.src ?? photo.src,
            subgalleryId,
            order: index,
          })),
        );

        const localRange = resolveSubgalleryDateRange(input);
        const nextSubgallery: Subgallery = {
          ...input,
          coverImage: input.coverImage || persistedCover,
          photos: localPhotos,
          locationLat: input.locationLat,
          locationLng: input.locationLng,
          dateLabel: dateLabelFromRange(
            localRange.startDate,
            localRange.endDate,
            localRange.dateLabel,
          ),
          startDate: localRange.startDate ?? "",
          endDate: localRange.endDate ?? "",
          id: subgalleryId,
          galleryId,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        if (process.env.NODE_ENV !== "production") {
          console.info("Memora: create subgallery local state update", {
            galleryId,
            subgalleryId,
            coverImage: nextSubgallery.coverImage,
            photoCount: nextSubgallery.photos.length,
          });
        }

        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? {
                  ...gallery,
                  updatedAt: timestamp,
                  subgalleries: [...gallery.subgalleries, nextSubgallery],
                }
              : gallery,
          ),
        );
        return nextSubgallery.id;
      },
      async updateSubgallery(galleryId, subgalleryId, input) {
        const selectedPlan = getMembershipPlan(onboarding.selectedPlanId);
        if (
          onboarding.isAuthenticated &&
          selectedPlan &&
          !canCreate("photos", input.photos.length - 1, selectedPlan).allowed
        ) {
          throw new Error(`You've reached the photo limit on the ${selectedPlan.name} plan. Upgrade to add more photos.`);
        }
        const timestamp = new Date().toISOString();
        let persistedCover = input.coverImage;
        let persistedPhotos = sortPhotos(
          input.photos.map((photo, index) => ({
            ...photo,
            subgalleryId,
            order: index,
          })),
        );
        const range = resolveSubgalleryDateRange(input);

        if (onboarding.isAuthenticated) {
          await enforcePlanLimitOnServer("photos", { desiredUsage: input.photos.length });
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to update this subgallery.");
          }

          const { data: existingSub } = await supabase
            .from("subgalleries")
            .select("cover_image_path")
            .eq("id", subgalleryId)
            .eq("gallery_id", galleryId)
            .eq("user_id", userId)
            .maybeSingle();
          const previousCover = existingSub?.cover_image_path ?? null;
          const { data: existingPhotos } = await supabase
            .from("photos")
            .select("storage_path")
            .eq("subgallery_id", subgalleryId)
            .eq("user_id", userId);
          const previousPhotoPaths = (existingPhotos ?? []).map((p: { storage_path: string }) => p.storage_path);

          persistedCover = await uploadImageSourceIfNeeded(
            supabase,
            userId,
            input.coverImage,
            "subgalleries",
            subgalleryId,
          );
          persistedPhotos = await Promise.all(
            persistedPhotos.map(async (photo, index) => {
              const photoId =
                photo.id && isUuid(photo.id)
                  ? photo.id
                  : typeof crypto !== "undefined"
                    ? crypto.randomUUID()
                    : createId("photo");
              const persistedSrc = await uploadImageSourceIfNeeded(
                supabase,
                userId,
                photo.src,
                "photos",
                photoId,
              );
              return {
                ...photo,
                id: photoId,
                src: persistedSrc,
                order: index,
              };
            }),
          );

          const { error: subgalleryError } = await supabase
            .from("subgalleries")
            .update({
              title: input.title,
              description: input.description || null,
              cover_image_path: persistedCover || null,
              location: input.location || null,
              location_lat: input.locationLat,
              location_lng: input.locationLng,
              start_date: range.startDate,
              end_date: range.endDate,
              date_label: range.dateLabel || null,
              updated_at: timestamp,
            })
            .eq("id", subgalleryId)
            .eq("gallery_id", galleryId)
            .eq("user_id", userId);
          if (subgalleryError) throw subgalleryError;

          const { error: deletePhotosError } = await supabase
            .from("photos")
            .delete()
            .eq("subgallery_id", subgalleryId)
            .eq("user_id", userId);
          if (deletePhotosError) throw deletePhotosError;

          if (persistedPhotos.length) {
            const { error: photosError } = await supabase.from("photos").insert(
              persistedPhotos.map((photo, index) => ({
                id: photo.id,
                user_id: userId,
                gallery_id: galleryId,
                subgallery_id: subgalleryId,
                storage_path: normalizeToStoragePath(photo.src),
                caption: photo.caption || null,
                display_order: index,
                taken_at: null,
              })),
            );
            if (photosError) throw translatePlanLimitError(photosError) ?? photosError;
          }

          const nextPhotoPaths: string[] = persistedPhotos.map((photo) =>
            normalizeToStoragePath(photo.src),
          );
          const toDelete = previousPhotoPaths.filter(
            (path: string) => !nextPhotoPaths.includes(normalizeToStoragePath(path)),
          );
          await deleteStorageObjectsSafe(supabase, userId, toDelete);

          if (previousCover && normalizeToStoragePath(previousCover) !== normalizeToStoragePath(persistedCover)) {
            await deleteStorageObjectsSafe(supabase, userId, [previousCover]);
          }

          persistedCover = await resolveSingleImageUrl(supabase, persistedCover);
          persistedPhotos = await Promise.all(
            persistedPhotos.map(async (photo) => ({
              ...photo,
              src: await resolveSingleImageUrl(supabase, photo.src),
            })),
          );
        }

        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? {
                  ...gallery,
                  updatedAt: timestamp,
                  subgalleries: gallery.subgalleries.map((subgallery) =>
                    subgallery.id === subgalleryId
                      ? {
                          ...subgallery,
                          ...input,
                          coverImage: persistedCover,
                          photos: sortPhotos(
                            persistedPhotos.map((photo, index) => ({
                              ...photo,
                              subgalleryId,
                              order: index,
                            })),
                          ),
                          dateLabel: dateLabelFromRange(
                            range.startDate,
                            range.endDate,
                            range.dateLabel,
                          ),
                          startDate: range.startDate ?? "",
                          endDate: range.endDate ?? "",
                          updatedAt: timestamp,
                        }
                      : subgallery,
                  ),
                }
              : gallery,
          ),
        );
      },
      async deleteSubgallery(galleryId, subgalleryId) {
        const timestamp = new Date().toISOString();
        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to delete this subgallery.");
          }

          const { data: subRow } = await supabase
            .from("subgalleries")
            .select("cover_image_path")
            .eq("id", subgalleryId)
            .eq("gallery_id", galleryId)
            .eq("user_id", userId)
            .maybeSingle();
          const { data: photoRows } = await supabase
            .from("photos")
            .select("storage_path")
            .eq("subgallery_id", subgalleryId)
            .eq("user_id", userId);

          const { error } = await supabase
            .from("subgalleries")
            .delete()
            .eq("id", subgalleryId)
            .eq("gallery_id", galleryId)
            .eq("user_id", userId);
          if (error) throw error;

          await deleteStorageObjectsSafe(supabase, userId, [
            subRow?.cover_image_path ?? null,
            ...(photoRows ?? []).map((p: { storage_path: string }) => p.storage_path),
          ]);
        }
        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? {
                  ...gallery,
                  updatedAt: timestamp,
                  subgalleries: gallery.subgalleries.filter(
                    (subgallery) => subgallery.id !== subgalleryId,
                  ),
                }
              : gallery,
          ),
        );
      },

      async reorderSubgalleries(galleryId, orderedIds) {
        const gallery = galleries.find((entry) => entry.id === galleryId);
        if (!gallery) return;
        // Defensive: only reorder ids that actually belong to this
        // gallery, in the order provided. Anything missing keeps its
        // current relative position appended at the end so a stale
        // call can't drop subgalleries from local state.
        const knownIds = new Set(gallery.subgalleries.map((s) => s.id));
        const requested = orderedIds.filter((id) => knownIds.has(id));
        const missing = gallery.subgalleries
          .map((s) => s.id)
          .filter((id) => !requested.includes(id));
        const finalOrder = [...requested, ...missing];

        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to reorder subgalleries.");
          }
          await Promise.all(
            finalOrder.map((id, index) =>
              supabase
                .from("subgalleries")
                .update({ display_order: index })
                .eq("id", id)
                .eq("gallery_id", galleryId)
                .eq("user_id", userId),
            ),
          );
        }

        const subgalleryById = new Map(
          gallery.subgalleries.map((subgallery) => [subgallery.id, subgallery]),
        );
        const reordered = finalOrder
          .map((id) => subgalleryById.get(id))
          .filter((subgallery): subgallery is Subgallery => Boolean(subgallery));
        setActiveGalleries((current) =>
          current.map((entry) =>
            entry.id === galleryId
              ? {
                  ...entry,
                  subgalleries: reordered,
                  updatedAt: new Date().toISOString(),
                }
              : entry,
          ),
        );
      },

      // ── Direct gallery photos + date dividers ──────────────────────────
      //
      // Direct photos live in the same `photos` table as subgallery photos
      // but with `subgallery_id = null`. Their display_order shares a single
      // numeric space per gallery with `gallery_dividers.display_order` so
      // the two lists can be interleaved deterministically on render and
      // rearranged together by `reorderGalleryItems`.

      async addGalleryPhotos(galleryId, photos) {
        if (photos.length === 0) return;
        const gallery = galleries.find((entry) => entry.id === galleryId);
        if (!gallery) return;
        const selectedPlan = getMembershipPlan(onboarding.selectedPlanId);
        // Direct gallery photos use their own per-gallery limit
        // (directPhotos), not the per-subgallery photo limit.
        if (
          onboarding.isAuthenticated &&
          selectedPlan &&
          !canCreate(
            "directPhotos",
            gallery.directPhotos.length + photos.length - 1,
            selectedPlan,
          ).allowed
        ) {
          throw new Error(
            `You've reached the per-gallery photo limit on the ${selectedPlan.name} plan. Upgrade to add more photos.`,
          );
        }

        // Determine the next available order in the shared photo+divider
        // namespace for this gallery, so newly-added photos append after
        // every existing item.
        const baseOrder =
          Math.max(
            -1,
            ...gallery.directPhotos.map((p) => p.order),
            ...gallery.dividers.map((d) => d.order),
          ) + 1;

        let persistedPhotos: MemoryPhoto[] = photos.map((photo, index) => ({
          ...photo,
          galleryId,
          subgalleryId: null,
          order: baseOrder + index,
        }));

        if (onboarding.isAuthenticated) {
          // Server-side enforcement of the per-gallery direct photo
          // limit. Pass desiredUsage = (currently in DB) + (about to add)
          // so the server compares the post-upload total to the plan
          // ceiling without re-counting.
          await enforcePlanLimitOnServer("directPhotos", {
            galleryId,
            desiredUsage: gallery.directPhotos.length + photos.length,
          });
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to upload photos.");
          }

          // Upload in parallel — Supabase storage handles concurrency
          // fine and parallelism collapses N×latency to ~1×latency for
          // the user. Order is preserved via Promise.all index alignment.
          const uploaded = await Promise.all(
            persistedPhotos.map(async (photo) => {
              const photoId =
                photo.id && isUuid(photo.id)
                  ? photo.id
                  : typeof crypto !== "undefined"
                    ? crypto.randomUUID()
                    : createId("photo");
              const persistedSrc = await uploadImageSourceIfNeeded(
                supabase,
                userId,
                photo.src,
                "photos",
                photoId,
              );
              return { ...photo, id: photoId, src: persistedSrc };
            }),
          );
          persistedPhotos = uploaded;

          const { error } = await supabase.from("photos").insert(
            persistedPhotos.map((photo) => ({
              id: photo.id,
              user_id: userId,
              gallery_id: galleryId,
              subgallery_id: null,
              storage_path: photo.src,
              caption: photo.caption || null,
              location: photo.location || null,
              location_lat: photo.locationLat ?? null,
              location_lng: photo.locationLng ?? null,
              display_order: photo.order,
              taken_at: null,
            })),
          );
          if (error) {
            console.error("Memora: addGalleryPhotos insert failed", { galleryId, error });
            throw translatePlanLimitError(error) ?? error;
          }
        }

        // Use the original local data URL for immediate display so the
        // image renders right away. The storage path is what's persisted
        // in the DB and gets resolved to a signed URL on the next load.
        const localPhotos = persistedPhotos.map((photo, index) => ({
          ...photo,
          src: photos[index]?.src ?? photo.src,
        }));

        setActiveGalleries((current) =>
          current.map((g) =>
            g.id === galleryId
              ? {
                  ...g,
                  directPhotos: [...g.directPhotos, ...localPhotos].sort(
                    (a, b) => a.order - b.order,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : g,
          ),
        );
      },

      async updateGalleryPhoto(galleryId, photoId, fields) {
        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to update this photo.");
          }
          const update: Record<string, unknown> = {};
          if (fields.caption !== undefined) update.caption = fields.caption || null;
          if (fields.location !== undefined) update.location = fields.location || null;
          if (fields.locationLat !== undefined) update.location_lat = fields.locationLat;
          if (fields.locationLng !== undefined) update.location_lng = fields.locationLng;
          if (Object.keys(update).length > 0) {
            const { error } = await supabase
              .from("photos")
              .update(update)
              .eq("id", photoId)
              .eq("user_id", userId);
            if (error) throw error;
          }
        }

        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? {
                  ...gallery,
                  directPhotos: gallery.directPhotos.map((photo) =>
                    photo.id === photoId
                      ? {
                          ...photo,
                          ...(fields.caption !== undefined ? { caption: fields.caption } : {}),
                          ...(fields.location !== undefined ? { location: fields.location } : {}),
                          ...(fields.locationLat !== undefined
                            ? { locationLat: fields.locationLat }
                            : {}),
                          ...(fields.locationLng !== undefined
                            ? { locationLng: fields.locationLng }
                            : {}),
                        }
                      : photo,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : gallery,
          ),
        );
      },

      async removeGalleryPhoto(galleryId, photoId) {
        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to remove this photo.");
          }
          // Capture storage_path before delete so we can clean the object up.
          const { data: photoRow } = await supabase
            .from("photos")
            .select("storage_path")
            .eq("id", photoId)
            .eq("user_id", userId)
            .maybeSingle();
          const { error } = await supabase
            .from("photos")
            .delete()
            .eq("id", photoId)
            .eq("user_id", userId);
          if (error) throw error;
          await deleteStorageObjectsSafe(supabase, userId, [photoRow?.storage_path ?? null]);
        }

        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? {
                  ...gallery,
                  directPhotos: gallery.directPhotos.filter((p) => p.id !== photoId),
                  updatedAt: new Date().toISOString(),
                }
              : gallery,
          ),
        );
      },

      async addDivider(galleryId, label) {
        const gallery = galleries.find((entry) => entry.id === galleryId);
        if (!gallery) throw new Error("Gallery not found.");

        const baseOrder =
          Math.max(
            -1,
            ...gallery.directPhotos.map((p) => p.order),
            ...gallery.dividers.map((d) => d.order),
          ) + 1;

        const dividerId =
          onboarding.isAuthenticated && typeof crypto !== "undefined"
            ? crypto.randomUUID()
            : createId("divider");

        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to add a divider.");
          }
          const { error } = await supabase.from("gallery_dividers").insert({
            id: dividerId,
            user_id: userId,
            gallery_id: galleryId,
            label,
            display_order: baseOrder,
          });
          if (error) throw error;
        }

        const newDivider: GalleryDivider = {
          id: dividerId,
          galleryId,
          label,
          order: baseOrder,
          createdAt: new Date().toISOString(),
        };
        setActiveGalleries((current) =>
          current.map((g) =>
            g.id === galleryId
              ? {
                  ...g,
                  dividers: [...g.dividers, newDivider].sort((a, b) => a.order - b.order),
                  updatedAt: new Date().toISOString(),
                }
              : g,
          ),
        );
        return dividerId;
      },

      async updateDivider(galleryId, dividerId, label) {
        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to update this divider.");
          }
          const { error } = await supabase
            .from("gallery_dividers")
            .update({ label })
            .eq("id", dividerId)
            .eq("user_id", userId);
          if (error) throw error;
        }
        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? {
                  ...gallery,
                  dividers: gallery.dividers.map((divider) =>
                    divider.id === dividerId ? { ...divider, label } : divider,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : gallery,
          ),
        );
      },

      async removeDivider(galleryId, dividerId) {
        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to remove this divider.");
          }
          const { error } = await supabase
            .from("gallery_dividers")
            .delete()
            .eq("id", dividerId)
            .eq("user_id", userId);
          if (error) throw error;
        }
        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? {
                  ...gallery,
                  dividers: gallery.dividers.filter((d) => d.id !== dividerId),
                  updatedAt: new Date().toISOString(),
                }
              : gallery,
          ),
        );
      },

      async reorderGalleryItems(galleryId, items) {
        // `items` is the full desired order across direct photos and
        // dividers. We assign sequential integers (0..n-1) so the shared
        // namespace stays compact. Photos and dividers are written to
        // their respective tables in parallel.
        const photoUpdates: Array<{ id: string; order: number }> = [];
        const dividerUpdates: Array<{ id: string; order: number }> = [];
        items.forEach((item, index) => {
          if (item.type === "photo") photoUpdates.push({ id: item.id, order: index });
          else dividerUpdates.push({ id: item.id, order: index });
        });

        if (onboarding.isAuthenticated) {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase.auth.getUser();
          const userId = data.user?.id;
          if (!userId) {
            throw new Error("Please sign in again to reorder this gallery.");
          }
          await Promise.all([
            ...photoUpdates.map(({ id, order }) =>
              supabase
                .from("photos")
                .update({ display_order: order })
                .eq("id", id)
                .eq("user_id", userId),
            ),
            ...dividerUpdates.map(({ id, order }) =>
              supabase
                .from("gallery_dividers")
                .update({ display_order: order })
                .eq("id", id)
                .eq("user_id", userId),
            ),
          ]);
        }

        const photoOrderById = new Map(photoUpdates.map((p) => [p.id, p.order]));
        const dividerOrderById = new Map(dividerUpdates.map((d) => [d.id, d.order]));
        setActiveGalleries((current) =>
          current.map((gallery) =>
            gallery.id === galleryId
              ? {
                  ...gallery,
                  directPhotos: gallery.directPhotos
                    .map((photo) =>
                      photoOrderById.has(photo.id)
                        ? { ...photo, order: photoOrderById.get(photo.id)! }
                        : photo,
                    )
                    .sort((a, b) => a.order - b.order),
                  dividers: gallery.dividers
                    .map((divider) =>
                      dividerOrderById.has(divider.id)
                        ? { ...divider, order: dividerOrderById.get(divider.id)! }
                        : divider,
                    )
                    .sort((a, b) => a.order - b.order),
                  updatedAt: new Date().toISOString(),
                }
              : gallery,
          ),
        );
      },

      getGallery(galleryId) {
        return galleries.find((gallery) => gallery.id === galleryId);
      },
      getSubgallery(galleryId, subgalleryId) {
        const gallery = galleries.find((entry) => entry.id === galleryId);
        return gallery?.subgalleries.find((subgallery) => subgallery.id === subgalleryId);
      },
      clearLocalCache() {
        // Free local cache aggressively before re-seeding the demo so a
        // quota-stuck snapshot from a prior session can't survive into
        // the fresh state. Only client-side persistence is touched —
        // Supabase storage and DB rows are untouched.
        if (typeof window !== "undefined") {
          try {
            window.localStorage.removeItem(USER_STORAGE_KEY);
            window.localStorage.removeItem(DEMO_STORAGE_KEY);
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
          } catch {
            // best effort — never throw from a user-initiated reset
          }
        }
        setStorageQuotaExceeded(false);
        setStorageQuotaInfo(null);
        setDemoGalleryCollection(demoGalleries);
      },
      signOut() {
        setOnboarding(defaultOnboardingState);
      },
      syncOnboardingFromUser(
        user,
        profileState = { hasSeenWelcome: true, selectedPlanId: null },
      ) {
        setOnboarding(
          buildOnboardingStateFromUser(user, profileState),
        );
      },
      async completeCheckout(planId) {
        const supabase = getSupabase();
        let userId = onboarding.user?.id ?? null;
        const userEmail = onboarding.user?.email ?? null;

        console.info("Memora: pricing plan click fired", {
          planId,
          onboardingUserId: onboarding.user?.id ?? null,
        });

        if (!userId) {
          const { data, error } = await supabase.auth.getUser();
          console.info("Memora: pricing user lookup result", {
            planId,
            userId: data.user?.id ?? null,
            error,
          });
          userId = data.user?.id ?? null;
        }

        if (!userId) {
          throw new Error("Please sign in again before choosing a plan.");
        }

        const planWrite = await setSelectedPlan(
          supabase,
          {
            id: userId,
            email: userEmail,
          },
          planId,
          "store:complete-checkout",
        );

        if (!planWrite.ok) {
          console.error("Memora: selected_plan write failed", {
            context: "store:complete-checkout",
            userId,
            planId,
            error: planWrite.error,
          });
          throw planWrite.error ?? new Error("Unable to save your selected plan right now.");
        }

        console.info("Memora: pricing redirect attempted", {
          userId,
          planId,
          target: "/galleries",
        });

        setOnboarding((current) => ({
          ...current,
          selectedPlanId: planId,
          onboardingComplete: true,
          welcomeStepCompleted: true,
        }));
      },
      async completeWelcomeStep(rawDisplayName) {
        const supabase = getSupabase();
        const userId = onboarding.user?.id;
        const userEmail = onboarding.user?.email ?? null;

        if (!userId) {
          throw new Error("Please sign in again before continuing.");
        }

        const sanitized = sanitizeDisplayName(rawDisplayName);
        if (!sanitized) {
          throw new Error("Please enter a name we can call you by.");
        }

        const profileState = await loadProfileState(
          supabase,
          {
            id: userId,
            email: userEmail,
          },
          "store:complete-welcome-step:load-profile",
        );

        if (!profileState.exists) {
          const ensured = await ensureProfileRow(
            supabase,
            {
              id: userId,
              email: userEmail,
            },
            "store:complete-welcome-step:create-profile",
          );

          if (!ensured) {
            throw new Error("Unable to create your profile row right now.");
          }
        }

        const nameWrite = await setDisplayName(
          supabase,
          {
            id: userId,
            email: userEmail,
          },
          sanitized,
          "store:complete-welcome-step:display-name",
        );
        if (!nameWrite.ok) {
          throw nameWrite.error ?? new Error("Unable to save your name right now.");
        }

        const profileWrite = await setHasSeenWelcome(
          supabase,
          {
            id: userId,
            email: userEmail,
          },
          true,
          "store:complete-welcome-step",
        );

        if (!profileWrite.ok) {
          console.error("Memora: welcome status update failed", {
            context: "store:complete-welcome-step",
            userId,
            error: profileWrite.error,
          });
          throw profileWrite.error ?? new Error("Unable to update your welcome status.");
        }

        setOnboarding((current) => ({
          ...current,
          welcomeStepCompleted: true,
          displayName: sanitized,
        }));
      },
      async updateDisplayName(rawDisplayName) {
        const supabase = getSupabase();
        const userId = onboarding.user?.id;
        const userEmail = onboarding.user?.email ?? null;

        if (!userId) {
          throw new Error("Please sign in again before continuing.");
        }

        const sanitized = sanitizeDisplayName(rawDisplayName);
        if (!sanitized) {
          throw new Error("Please enter at least one non-blank character.");
        }

        const result = await setDisplayName(
          supabase,
          { id: userId, email: userEmail },
          sanitized,
          "store:update-display-name",
        );
        if (!result.ok) {
          throw result.error ?? new Error("Unable to save your name right now.");
        }
        setOnboarding((current) => ({
          ...current,
          displayName: sanitized,
        }));
      },
      resetOnboarding() {
        setOnboarding(defaultOnboardingState);
      },
      getNextOnboardingRoute() {
        if (!onboarding.isAuthenticated) {
          return "/auth";
        }
        return getNextAuthenticatedRoute({
          welcomeStepCompleted: onboarding.welcomeStepCompleted,
          displayName: onboarding.displayName,
          selectedPlanId: onboarding.selectedPlanId,
          onboardingComplete: onboarding.onboardingComplete,
        });
      },
      async scanOrphanedStorageObjects() {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const userId = data.user?.id;
        if (!userId) throw new Error("Please sign in again to scan storage.");

        const [galleryRowsResult, subgalleryRowsResult, photoRowsResult] = await Promise.all([
          supabase.from("galleries").select("cover_image_path").eq("user_id", userId),
          supabase.from("subgalleries").select("cover_image_path").eq("user_id", userId),
          supabase.from("photos").select("storage_path").eq("user_id", userId),
        ]);

        if (galleryRowsResult.error) throw galleryRowsResult.error;
        if (subgalleryRowsResult.error) throw subgalleryRowsResult.error;
        if (photoRowsResult.error) throw photoRowsResult.error;

        const galleryRows = (galleryRowsResult.data ?? []) as Array<{
          cover_image_path: string | null;
        }>;
        const subgalleryRows = (subgalleryRowsResult.data ?? []) as Array<{
          cover_image_path: string | null;
        }>;
        const photoRows = (photoRowsResult.data ?? []) as Array<{ storage_path: string }>;

        const referenced = new Set<string>();
        for (const row of galleryRows) {
          const p = row.cover_image_path ? normalizeToStoragePath(row.cover_image_path) : null;
          if (p && isLikelyStoragePath(p) && p.startsWith(`${userId}/`)) referenced.add(p);
        }
        for (const row of subgalleryRows) {
          const p = row.cover_image_path ? normalizeToStoragePath(row.cover_image_path) : null;
          if (p && isLikelyStoragePath(p) && p.startsWith(`${userId}/`)) referenced.add(p);
        }
        for (const row of photoRows) {
          const p = normalizeToStoragePath(row.storage_path);
          if (p && isLikelyStoragePath(p) && p.startsWith(`${userId}/`)) referenced.add(p);
        }

        const allObjects = await listAllStorageObjectsUnderPrefix(supabase, userId);
        const orphaned = allObjects
          .map((p) => normalizeToStoragePath(p))
          .filter((p) => p.startsWith(`${userId}/`) && !referenced.has(p));

        return {
          totalObjects: allObjects.length,
          referencedObjects: referenced.size,
          orphanedObjects: orphaned.sort(),
        };
      },
      async deleteOrphanedStorageObjects(paths) {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const userId = data.user?.id;
        if (!userId) throw new Error("Please sign in again to clean up storage.");

        const safePaths = Array.from(
          new Set(
            paths
              .map((p) => normalizeToStoragePath(p))
              .filter((p) => isLikelyStoragePath(p) && p.startsWith(`${userId}/`)),
          ),
        );
        if (safePaths.length === 0) return { deleted: 0 };
        const { error: removeError } = await supabase.storage.from(STORAGE_BUCKET).remove(safePaths);
        if (removeError) throw removeError;
        return { deleted: safePaths.length };
      },
    };
  }, [
    demoGalleryCollection,
    hydrated,
    onboarding,
    reconnecting,
    storageQuotaExceeded,
    storageQuotaInfo,
    userGalleryCollection,
  ]);

  return <MemoraContext.Provider value={value}>{children}</MemoraContext.Provider>;
}

export function useMemoraStore() {
  const context = useContext(MemoraContext);
  if (!context) {
    throw new Error("useMemoraStore must be used within a MemoraProvider");
  }
  return context;
}
