"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight, text-only draft preservation for form inputs.
 *
 * Stores a single string under `memora::draft:<scope>:<field>` in
 * sessionStorage so a user who tabs away and comes back hasn't lost
 * what they were typing. Drafts vanish when the tab closes; that is
 * intentional. They are also wiped explicitly by `clearDraft()` once
 * the form is successfully submitted.
 *
 * Hard rules (matched to the storage discipline established by the
 * recent localStorage quota fix):
 *   - sessionStorage only — never localStorage.
 *   - Strings only. The hook silently coerces non-strings to "" and
 *     refuses to persist values longer than `MAX_DRAFT_CHARS`. Image
 *     data, base64, blobs, file objects, and anything resembling a
 *     `data:` URL never enter draft storage.
 *   - Scope keys by user id + entity id so drafts don't leak across
 *     accounts or galleries.
 */

const MAX_DRAFT_CHARS = 32_768; // 32 KB ceiling per draft field.

function isPlausibleTextDraft(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length > MAX_DRAFT_CHARS) return false;
  // Defence in depth — a `data:` URL has no business in a text draft.
  if (value.startsWith("data:")) return false;
  return true;
}

function buildKey(scope: string, field: string) {
  return `memora::draft:${scope}:${field}`;
}

function read(scope: string, field: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(buildKey(scope, field));
    if (raw === null) return null;
    return isPlausibleTextDraft(raw) ? raw : null;
  } catch {
    return null;
  }
}

function write(scope: string, field: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    if (!isPlausibleTextDraft(value) || value === "") {
      window.sessionStorage.removeItem(buildKey(scope, field));
      return;
    }
    window.sessionStorage.setItem(buildKey(scope, field), value);
  } catch {
    // sessionStorage failures are non-fatal — drafts are a convenience.
  }
}

function remove(scope: string, field: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(buildKey(scope, field));
  } catch {
    // ignored
  }
}

/**
 * `useFormDraft` is `useState<string>` plus debounced sessionStorage
 * persistence. Behaves exactly like `useState` from the caller's
 * perspective — same setter signature, same initial value.
 *
 * On mount, if a saved draft exists for the same scope+field, the
 * draft value wins over `initialValue` so a tab-return restores
 * what the user was typing. Pass `enabled = false` to opt out at
 * runtime (e.g. while the page is still hydrating user identity).
 */
export function useFormDraft(options: {
  scope: string;
  field: string;
  initialValue: string;
  enabled?: boolean;
  /** Debounce in ms before writing to sessionStorage. Default 200. */
  debounceMs?: number;
}): readonly [string, (next: string) => void, () => void] {
  const {
    scope,
    field,
    initialValue,
    enabled = true,
    debounceMs = 200,
  } = options;

  // Initial value: prefer a saved draft if we have one and the hook
  // is enabled. SSR returns the prop value to keep markup stable.
  const [value, setValueState] = useState<string>(() => {
    if (typeof window === "undefined" || !enabled) return initialValue;
    const stored = read(scope, field);
    return stored ?? initialValue;
  });

  // After mount, if storage produced a different value than the SSR
  // pass, hydrate to it. (No-op on the client-only path above.)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (!enabled) return;
    const stored = read(scope, field);
    if (stored !== null && stored !== value) {
      setValueState(stored);
    }
    // We deliberately do not include `value` — this only runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, field, enabled]);

  // Debounced persistence. A 200ms debounce keeps sessionStorage
  // writes off the keystroke critical path without losing more than
  // a fraction of a second of typing on tab close.
  const writeTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (writeTimerRef.current !== null) {
      window.clearTimeout(writeTimerRef.current);
    }
    writeTimerRef.current = window.setTimeout(() => {
      write(scope, field, value);
      writeTimerRef.current = null;
    }, debounceMs);
    return () => {
      if (writeTimerRef.current !== null) {
        window.clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
    };
  }, [scope, field, value, enabled, debounceMs]);

  const setValue = useCallback((next: string) => {
    // Defence in depth — never let non-string or oversized values
    // settle into state, even if a caller passes something odd.
    if (typeof next !== "string") return;
    if (next.length > MAX_DRAFT_CHARS) {
      setValueState(next.slice(0, MAX_DRAFT_CHARS));
      return;
    }
    setValueState(next);
  }, []);

  const clearDraft = useCallback(() => {
    if (writeTimerRef.current !== null) {
      window.clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    }
    remove(scope, field);
  }, [scope, field]);

  return [value, setValue, clearDraft] as const;
}
