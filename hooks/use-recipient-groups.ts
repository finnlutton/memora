"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createId } from "@/lib/utils";
import type { RecipientGroup, RecipientMember } from "@/types/share";

/**
 * Per-user persistence for the recipient groups shown in the share
 * panel. Backed by localStorage so groups survive browser close +
 * page reload on the same device. Cross-device sync would need a
 * Supabase table — out of scope for this hook.
 *
 * Scoping: keyed by Supabase user id when signed in; falls back to
 * the "anon" bucket otherwise. Switching accounts on the same
 * browser therefore does not leak one user's groups to another.
 *
 * Defaults: when storage is empty for a given scope, we seed three
 * starter groups so new users see something instead of an empty
 * picker. The seeded groups behave identically to user-created ones
 * once they land in storage — they are not "magic" defaults.
 */

const STORAGE_KEY_PREFIX = "memora::recipient-groups";
const MAX_PERSISTED_BYTES = 64 * 1024; // 64 KB cap, far above typical use.
const MAX_GROUPS = 100;
const MAX_MEMBERS_PER_GROUP = 100;
const MAX_NAME_CHARS = 120;
const MAX_LABEL_CHARS = 120;

function buildKey(userId: string | null | undefined): string {
  return `${STORAGE_KEY_PREFIX}:${userId || "anon"}`;
}

function buildSeedGroups(): RecipientGroup[] {
  const now = new Date().toISOString();
  return [
    {
      id: createId("group"),
      name: "Parents",
      members: [{ id: createId("member"), label: "Mom & Dad" }],
      updatedAt: now,
    },
    {
      id: createId("group"),
      name: "Grandparents",
      members: [{ id: createId("member"), label: "Grandma & Grandpa" }],
      updatedAt: now,
    },
    {
      id: createId("group"),
      name: "Close Friends",
      members: [{ id: createId("member"), label: "Core group" }],
      updatedAt: now,
    },
  ];
}

function sanitizeMember(raw: unknown): RecipientMember | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<RecipientMember>;
  const id = typeof candidate.id === "string" && candidate.id ? candidate.id : createId("member");
  const label = typeof candidate.label === "string" ? candidate.label.slice(0, MAX_LABEL_CHARS) : "";
  if (!label) return null;
  return { id, label };
}

function sanitizeGroup(raw: unknown): RecipientGroup | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<RecipientGroup>;
  const id = typeof candidate.id === "string" && candidate.id ? candidate.id : createId("group");
  const name = typeof candidate.name === "string" ? candidate.name.slice(0, MAX_NAME_CHARS) : "";
  if (!name) return null;
  const members = Array.isArray(candidate.members)
    ? candidate.members.map(sanitizeMember).filter((m): m is RecipientMember => m !== null).slice(0, MAX_MEMBERS_PER_GROUP)
    : [];
  const updatedAt =
    typeof candidate.updatedAt === "string" && candidate.updatedAt
      ? candidate.updatedAt
      : new Date().toISOString();
  return { id, name, members, updatedAt };
}

function readGroups(userId: string | null | undefined): RecipientGroup[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(buildKey(userId));
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map(sanitizeGroup).filter((g): g is RecipientGroup => g !== null).slice(0, MAX_GROUPS);
  } catch {
    return null;
  }
}

function writeGroups(userId: string | null | undefined, groups: RecipientGroup[]) {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(groups.slice(0, MAX_GROUPS));
    if (json.length > MAX_PERSISTED_BYTES) return;
    window.localStorage.setItem(buildKey(userId), json);
  } catch {
    // Storage failures are non-fatal — groups remain in React state.
  }
}

/**
 * `useRecipientGroups` is `useState<RecipientGroup[]>` plus localStorage
 * persistence keyed by user id. Setter signature is intentionally
 * compatible with what the share panel previously passed to plain
 * `useState`, so callers can swap it in directly.
 */
export function useRecipientGroups(
  userId: string | null | undefined,
): readonly [RecipientGroup[], (next: RecipientGroup[]) => void] {
  // Start with whatever is already in storage on the client; on the
  // server (and on the very first paint) fall back to the seed list
  // so SSR markup is stable and the picker is never momentarily empty.
  const [groups, setGroupsState] = useState<RecipientGroup[]>(() => {
    if (typeof window === "undefined") return buildSeedGroups();
    return readGroups(userId) ?? buildSeedGroups();
  });

  // After mount + when user id resolves, re-read for the correct
  // scope. If nothing is stored yet, seed the bucket so the user's
  // first edits replace defaults rather than appending to them.
  const lastReadScopeRef = useRef<string | null>(null);
  useEffect(() => {
    const scope = userId || "anon";
    if (lastReadScopeRef.current === scope) return;
    lastReadScopeRef.current = scope;
    const stored = readGroups(userId);
    if (stored) {
      setGroupsState(stored);
    } else {
      const seed = buildSeedGroups();
      setGroupsState(seed);
      writeGroups(userId, seed);
    }
  }, [userId]);

  const setGroups = useCallback(
    (next: RecipientGroup[]) => {
      setGroupsState(next);
      writeGroups(userId, next);
    },
    [userId],
  );

  return [groups, setGroups] as const;
}
