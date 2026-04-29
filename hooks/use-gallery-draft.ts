"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Per-user persistence for an in-progress new gallery. Survives
 * browser close + page reload on the same device. Cross-device sync
 * would need a Supabase table — out of scope for this hook.
 *
 * Scoping: keyed by Supabase user id when signed in; falls back to
 * the "anon" bucket otherwise. Switching accounts on the same
 * browser does not leak one user's draft to another.
 *
 * Storage discipline: text-only. Cover image, people, mood tags, and
 * privacy are deliberately NOT persisted — covers are large blobs we
 * keep out of localStorage, and people / mood / visibility were
 * removed from the form. Only one in-progress draft per user; a new
 * gallery either resumes the existing draft or, after a successful
 * submit, starts clean.
 */

const STORAGE_KEY_PREFIX = "memora::gallery-draft";
const MAX_PERSISTED_BYTES = 32 * 1024;
const MAX_TEXT_CHARS = 8192;

export type GalleryDraft = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  locationLat: number | null;
  locationLng: number | null;
  updatedAt: string;
};

const EMPTY_DRAFT: GalleryDraft = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  location: "",
  locationLat: null,
  locationLng: null,
  updatedAt: "",
};

export function isDraftMeaningful(draft: GalleryDraft | null): boolean {
  if (!draft) return false;
  return Boolean(
    draft.title.trim() ||
      draft.description.trim() ||
      draft.startDate ||
      draft.endDate ||
      draft.location.trim(),
  );
}

function buildKey(userId: string | null | undefined): string {
  return `${STORAGE_KEY_PREFIX}:${userId || "anon"}`;
}

function clamp(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.slice(0, MAX_TEXT_CHARS);
}

function clampNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function sanitize(raw: unknown): GalleryDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<GalleryDraft>;
  const draft: GalleryDraft = {
    title: clamp(candidate.title),
    description: clamp(candidate.description),
    startDate: clamp(candidate.startDate),
    endDate: clamp(candidate.endDate),
    location: clamp(candidate.location),
    locationLat: clampNumber(candidate.locationLat),
    locationLng: clampNumber(candidate.locationLng),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
  };
  return isDraftMeaningful(draft) ? draft : null;
}

function read(userId: string | null | undefined): GalleryDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(buildKey(userId));
    if (raw === null) return null;
    return sanitize(JSON.parse(raw));
  } catch {
    return null;
  }
}

function write(userId: string | null | undefined, draft: GalleryDraft) {
  if (typeof window === "undefined") return;
  try {
    if (!isDraftMeaningful(draft)) {
      window.localStorage.removeItem(buildKey(userId));
      return;
    }
    const json = JSON.stringify({ ...draft, updatedAt: new Date().toISOString() });
    if (json.length > MAX_PERSISTED_BYTES) return;
    window.localStorage.setItem(buildKey(userId), json);
  } catch {
    // Storage failures are non-fatal — the draft remains in React state.
  }
}

function remove(userId: string | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(buildKey(userId));
  } catch {
    // ignored
  }
}

/**
 * Live read of the stored draft (re-reads when `userId` changes). For
 * surfaces that just want to display the draft and don't write to it,
 * e.g. the workspace's "Drafts" section.
 */
export function useGalleryDraftSnapshot(
  userId: string | null | undefined,
): { draft: GalleryDraft | null; clear: () => void; refresh: () => void } {
  const [draft, setDraft] = useState<GalleryDraft | null>(() => read(userId));

  const refresh = useCallback(() => {
    setDraft(read(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for cross-tab writes so the workspace Drafts section
  // updates when the user finishes typing in another tab.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === buildKey(userId)) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId, refresh]);

  const clear = useCallback(() => {
    remove(userId);
    setDraft(null);
  }, [userId]);

  return { draft, clear, refresh };
}

/**
 * Used inside the gallery form when creating a new gallery. Hydrates
 * initial state from any persisted draft and exposes a debounced
 * `save` for the form to call on every change. `clear` runs after a
 * successful submit so the next visit starts clean.
 */
export function useGalleryDraftWriter(
  userId: string | null | undefined,
  enabled: boolean,
): {
  initialDraft: GalleryDraft;
  save: (next: GalleryDraft) => void;
  clear: () => void;
} {
  // Snapshot the very first draft we see, so the form can use it as
  // its `useState` initializer. Subsequent writes flow through `save`.
  const initialRef = useRef<GalleryDraft | null>(null);
  if (initialRef.current === null) {
    initialRef.current = enabled ? read(userId) ?? EMPTY_DRAFT : EMPTY_DRAFT;
  }

  const writeTimerRef = useRef<number | null>(null);
  const lastSerializedRef = useRef<string>("");

  const save = useCallback(
    (next: GalleryDraft) => {
      if (!enabled) return;
      const serialized = JSON.stringify(next);
      if (serialized === lastSerializedRef.current) return;
      lastSerializedRef.current = serialized;
      if (writeTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(writeTimerRef.current);
      }
      if (typeof window === "undefined") return;
      writeTimerRef.current = window.setTimeout(() => {
        write(userId, next);
        writeTimerRef.current = null;
      }, 250);
    },
    [enabled, userId],
  );

  const clear = useCallback(() => {
    if (writeTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    }
    lastSerializedRef.current = "";
    remove(userId);
  }, [userId]);

  // Cancel any pending write when the writer unmounts so we don't
  // race against a clear() called immediately before navigation.
  useEffect(() => {
    return () => {
      if (writeTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
    };
  }, []);

  return { initialDraft: initialRef.current, save, clear };
}
