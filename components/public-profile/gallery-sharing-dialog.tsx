"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Globe, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type VisibilityResponse = {
  galleryId: string;
  onPublicProfile: boolean;
  profile: {
    handle: string | null;
    enabled: boolean;
  };
};

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: VisibilityResponse }
  | { kind: "error"; message: string };

// Per-gallery sharing dialog. Surfaces TWO independent flows:
//
//   1. "Share by private link" — points to the existing /galleries
//      multi-select share flow. We don't recreate that here; the
//      tokenized share system is set-based, not per-gallery.
//
//   2. "Show on public page" — toggles `galleries.is_on_public_profile`
//      via /api/galleries/:id/public-visibility. If the user's public
//      page itself is disabled or unhandled, we show a hint pointing
//      to Settings rather than silently doing nothing.
//
// The dialog is opened from the gallery detail kebab; it does NOT
// touch the existing private-share UI, satisfying the "Keep the
// existing private share-link flow unchanged" requirement.
export function GallerySharingDialog({
  open,
  onOpenChange,
  galleryId,
  galleryTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  galleryId: string;
  galleryTitle: string;
}) {
  const { addToast } = useToast();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState({ kind: "loading" });
    (async () => {
      try {
        const response = await fetch(
          `/api/galleries/${galleryId}/public-visibility`,
        );
        const data = (await response.json()) as
          | VisibilityResponse
          | { error: string };
        if (cancelled) return;
        if (!response.ok) {
          throw new Error(
            (data as { error: string }).error ?? "Could not load sharing.",
          );
        }
        setState({ kind: "ready", data: data as VisibilityResponse });
      } catch (caught) {
        if (cancelled) return;
        setState({
          kind: "error",
          message:
            caught instanceof Error
              ? caught.message
              : "Could not load sharing.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, galleryId]);

  const togglePublic = async (next: boolean) => {
    if (state.kind !== "ready") return;
    setBusy(true);
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
        | { galleryId: string; onPublicProfile: boolean }
        | { error: string };
      if (!response.ok) {
        throw new Error(
          (data as { error: string }).error ?? "Could not save change.",
        );
      }
      setState({
        kind: "ready",
        data: {
          ...state.data,
          onPublicProfile: (data as { onPublicProfile: boolean })
            .onPublicProfile,
        },
      });
      addToast(
        next ? "Added to your public page." : "Removed from your public page.",
        "success",
      );
    } catch (caught) {
      addToast(
        caught instanceof Error ? caught.message : "Could not save change.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(18,24,32,0.45)] backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/50 bg-[color:var(--background)] p-5 shadow-[0_24px_70px_rgba(18,24,32,0.24)] md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Sharing
              </p>
              <Dialog.Title className="mt-1 truncate font-serif text-2xl text-[color:var(--ink)]">
                {galleryTitle}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[color:var(--ink-soft)] transition hover:bg-[rgba(22,35,56,0.06)] hover:text-[color:var(--ink)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Private-link section — pointer to the existing multi-share
              flow, not a re-implementation. We don't show usage / theme
              picker / recipient groups here; that lives on /galleries. */}
          <section className="mt-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] p-4">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--ink-soft)]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[color:var(--ink)]">
                  Share by private link
                </p>
                <p className="mt-1 text-[12.5px] leading-5 text-[color:var(--ink-soft)]">
                  Send a private, themed link to specific people. They&apos;ll see
                  this gallery (and any others you choose) without an account.
                </p>
                <Button asChild variant="ghost" className="mt-2 px-0 text-[11px] tracking-[0.16em]">
                  <Link href="/galleries?share=1">
                    Open share flow →
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Public-page section. */}
          <section className="mt-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] p-4">
            <div className="flex items-start gap-3">
              <Globe className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--ink-soft)]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[color:var(--ink)]">
                  Show on public page
                </p>
                {state.kind === "loading" ? (
                  <p className="mt-1 text-[12.5px] leading-5 text-[color:var(--ink-soft)]">
                    Loading…
                  </p>
                ) : state.kind === "error" ? (
                  <p className="mt-1 text-[12.5px] leading-5 text-[color:var(--accent-strong)]">
                    {state.message}
                  </p>
                ) : (
                  <PublicSection
                    data={state.data}
                    busy={busy}
                    onToggle={togglePublic}
                  />
                )}
              </div>
            </div>
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PublicSection({
  data,
  busy,
  onToggle,
}: {
  data: VisibilityResponse;
  busy: boolean;
  onToggle: (next: boolean) => void;
}) {
  const { onPublicProfile, profile } = data;
  const profileReady = profile.enabled && Boolean(profile.handle);

  return (
    <>
      <p className="mt-1 text-[12.5px] leading-5 text-[color:var(--ink-soft)]">
        {onPublicProfile
          ? profileReady
            ? `Currently showing on /@${profile.handle}.`
            : "Marked for your public page — not visible until you turn the page on in Settings."
          : "Hidden from your public page."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {onPublicProfile ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => onToggle(false)}
          >
            <EyeOff className="h-3.5 w-3.5" />
            Remove from public page
          </Button>
        ) : (
          <Button
            type="button"
            disabled={busy}
            onClick={() => onToggle(true)}
          >
            <Eye className="h-3.5 w-3.5" />
            Add to public page
          </Button>
        )}
        {!profileReady ? (
          <Link
            href="/galleries/settings"
            className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)] underline-offset-4 transition hover:text-[color:var(--ink)] hover:underline"
          >
            Set up your public page →
          </Link>
        ) : null}
      </div>
    </>
  );
}
