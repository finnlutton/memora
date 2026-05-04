"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatDateRangeCompact, nextImageUnoptimizedForSrc } from "@/lib/utils";

type GalleryEntry = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  isOnPublicProfile: boolean;
};

type State =
  | { kind: "loading" }
  | { kind: "ready"; galleries: GalleryEntry[] }
  | { kind: "error"; message: string };

// Galleries picker — primary affordance for "which galleries appear on
// my public page". Rendered below the Public Memora page form in
// Settings. Each row is a single click toggle; the in-context Sharing
// dialog on the gallery detail page still flips the same flag.
export function PublicProfileGalleriesPicker() {
  const { addToast } = useToast();
  const [state, setState] = useState<State>({ kind: "loading" });
  // Per-row in-flight flag so a slow PATCH disables that row's toggle
  // without freezing the whole list.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/public-profile/galleries");
        const data = (await response.json()) as
          | { galleries: GalleryEntry[] }
          | { error: string };
        if (cancelled) return;
        if (!response.ok) {
          throw new Error(
            (data as { error: string }).error ?? "Could not load galleries.",
          );
        }
        setState({
          kind: "ready",
          galleries: (data as { galleries: GalleryEntry[] }).galleries,
        });
      } catch (caught) {
        if (cancelled) return;
        setState({
          kind: "error",
          message:
            caught instanceof Error ? caught.message : "Could not load galleries.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePublic = useCallback(
    async (galleryId: string, next: boolean) => {
      if (state.kind !== "ready") return;

      // Optimistic update; revert on error.
      const previous = state.galleries;
      setState({
        kind: "ready",
        galleries: previous.map((g) =>
          g.id === galleryId ? { ...g, isOnPublicProfile: next } : g,
        ),
      });
      setPendingIds((current) => new Set(current).add(galleryId));

      try {
        const response = await fetch(
          `/api/galleries/${galleryId}/public-visibility`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ onPublicProfile: next }),
          },
        );
        const data = (await response.json()) as
          | { onPublicProfile: boolean }
          | { error: string };
        if (!response.ok) {
          throw new Error(
            (data as { error: string }).error ?? "Could not save change.",
          );
        }
      } catch (caught) {
        // Revert.
        setState({ kind: "ready", galleries: previous });
        addToast(
          caught instanceof Error ? caught.message : "Could not save change.",
          "error",
        );
      } finally {
        setPendingIds((current) => {
          const nextSet = new Set(current);
          nextSet.delete(galleryId);
          return nextSet;
        });
      }
    },
    [state, addToast],
  );

  if (state.kind === "loading") {
    return (
      <div className="mt-4 inline-flex items-center gap-2 text-[12.5px] text-[color:var(--ink-soft)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading your galleries…
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <p className="mt-4 rounded-sm border border-[color:var(--error-border)] bg-[color:var(--error-bg)] px-3 py-2 text-sm text-[color:var(--error-text)]">
        {state.message}
      </p>
    );
  }

  if (state.galleries.length === 0) {
    return (
      <p className="mt-4 text-[12.5px] leading-6 text-[color:var(--ink-soft)]">
        You don&apos;t have any galleries yet. Once you create one, it will appear
        here so you can choose to show it on your public page.
      </p>
    );
  }

  const onCount = state.galleries.filter((g) => g.isOnPublicProfile).length;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
          Galleries on this page
        </p>
        <p className="text-[11px] text-[color:var(--ink-faint)]">
          {onCount} of {state.galleries.length} selected
        </p>
      </div>
      <ul className="divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
        {state.galleries.map((gallery) => {
          const dateRange = formatDateRangeCompact(
            gallery.startDate ?? undefined,
            gallery.endDate ?? undefined,
          );
          const pending = pendingIds.has(gallery.id);
          const isOn = gallery.isOnPublicProfile;
          return (
            <li key={gallery.id}>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                disabled={pending}
                onClick={() => void togglePublic(gallery.id, !isOn)}
                className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition hover:bg-[color:var(--paper)] disabled:opacity-60"
              >
                {/* Cover thumbnail. Square 40px on mobile, 48px on md+,
                    matches the rhythm of the form fields above. */}
                <span
                  aria-hidden
                  className="relative h-10 w-10 shrink-0 overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)] md:h-12 md:w-12"
                >
                  {gallery.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gallery.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      // Same caveat as gallery-card: signed URLs are remote
                      // but data: URLs aren't optimizable.
                      data-unoptimized={nextImageUnoptimizedForSrc(
                        gallery.coverImageUrl,
                      )}
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-[color:var(--ink)] md:text-sm">
                    {gallery.title}
                  </span>
                  {dateRange ? (
                    <span className="block truncate font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)]">
                      {dateRange}
                    </span>
                  ) : null}
                </span>
                <span
                  aria-hidden
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                    isOn
                      ? "border-[color:var(--accent-strong)] bg-[color:var(--accent-strong)] text-white"
                      : "border-[color:var(--border-strong)] text-transparent"
                  }`}
                >
                  <Check className="h-3 w-3" strokeWidth={2.4} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] leading-5 text-[color:var(--ink-faint)]">
        Tap a row to add or remove that gallery from your public page.
      </p>
    </div>
  );
}
