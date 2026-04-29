"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Pencil, Plus, Share2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { GalleryCard } from "@/components/gallery-card";
import { GalleryCardSkeletonGrid } from "@/components/gallery-card-skeleton";
import { CreateSharePanel } from "@/components/share/create-share-panel";
import { WorkspaceTopbar } from "@/components/workspace-topbar";
import { Button } from "@/components/ui/button";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useGalleryDraftSnapshot } from "@/hooks/use-gallery-draft";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { useRecipientGroups } from "@/hooks/use-recipient-groups";
import { getMembershipPlan } from "@/lib/plans";

export default function GalleriesPage() {
  const { galleries, hydrated, onboarding } = useMemoraStore();
  const [shareMode, setShareMode] = useState(false);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  // Custom share message is drafted so a user typing a long note who
  // tabs away mid-sentence still has their text on return. Scoped per
  // user; cleared after a successful share-link creation.
  const [customMessage, setCustomMessage, clearCustomMessageDraft] =
    useFormDraft({
      scope: `${onboarding.user?.id ?? "anon"}:share`,
      field: "customMessage",
      initialValue: "",
    });
  const [recipientGroups, setRecipientGroups] = useRecipientGroups(
    onboarding.user?.id ?? null,
  );
  // In-progress gallery draft (single slot per user). Surfaced as a
  // Drafts strip above the gallery grid so a user who left mid-create
  // can pick up where they left off without being thrown back into
  // the form unprompted.
  const { draft: galleryDraft, clear: clearGalleryDraft } =
    useGalleryDraftSnapshot(onboarding.user?.id ?? null);
  const [shareUsage, setShareUsage] = useState<{
    current: number;
    limit: number | null;
    period: "lifetime" | "monthly" | null;
  } | null>(null);
  const sortedGalleries = useMemo(
    () =>
      [...galleries].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      ),
    [galleries],
  );
  const selectedPlan = getMembershipPlan(onboarding.selectedPlanId);
  const hasReachedGalleryLimit = Boolean(
    onboarding.isAuthenticated &&
      selectedPlan &&
      sortedGalleries.length >= selectedPlan.galleryCount,
  );
  const usageLabel = selectedPlan
    ? Number.isFinite(selectedPlan.galleryCount)
      ? `${sortedGalleries.length} of ${selectedPlan.galleryCount} active galleries`
      : `${sortedGalleries.length} active galleries`
    : `${sortedGalleries.length} galleries in archive`;
  // Mobile-only compact form: 'Archive usage' label already conveys what
  // the value is, so 'X of Y active galleries' is redundant on small
  // screens. Keep just the count(s).
  const usageLabelCompact = selectedPlan
    ? Number.isFinite(selectedPlan.galleryCount)
      ? `${sortedGalleries.length} of ${selectedPlan.galleryCount}`
      : `${sortedGalleries.length}`
    : `${sortedGalleries.length}`;
  const shareUsageSuffix = shareUsage?.period === "monthly"
    ? "private share links this month"
    : "private share links";
  const shareUsageLabel =
    shareUsage && Number.isFinite(shareUsage.limit)
      ? `${shareUsage.current} / ${shareUsage.limit} ${shareUsageSuffix}`
      : shareUsage
        ? `${shareUsage.current} ${shareUsageSuffix}`
        : "Share usage unavailable";
  const shareUsageLabelCompact =
    shareUsage && Number.isFinite(shareUsage.limit)
      ? `${shareUsage.current} / ${shareUsage.limit}`
      : shareUsage
        ? `${shareUsage.current}`
        : "—";
  const shareLimitReached =
    shareUsage != null && Number.isFinite(shareUsage.limit) && shareUsage.current >= (shareUsage.limit ?? 0);
  const selectedCount = selectedGalleryIds.length;

  useEffect(() => {
    let cancelled = false;
    const loadShareUsage = async () => {
      try {
        const response = await fetch("/api/plan-limits/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resource: "shares" }),
        });
        const payload = (await response.json()) as {
          currentUsage?: number;
          limit?: number | null;
          sharePeriod?: "lifetime" | "monthly";
        };
        if (!response.ok || cancelled) return;
        setShareUsage({
          current: payload.currentUsage ?? 0,
          limit: payload.limit ?? null,
          period: payload.sharePeriod ?? null,
        });
      } catch {
        if (!cancelled) setShareUsage(null);
      }
    };
    void loadShareUsage();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <WorkspaceTopbar
        eyebrow="Workspace"
        title="My Galleries"
        subtitle="Curate, preserve, and share your experiences here."
        hideTitleOnMobile
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              className="h-8 gap-1 whitespace-nowrap px-2 py-1 text-[9px] tracking-[0.06em] text-[color:var(--ink)] md:h-auto md:gap-1.5 md:px-3 md:py-2 md:text-xs md:tracking-[0.14em]"
              disabled={shareLimitReached}
              onClick={() => {
                setShareMode(true);
                setSharePanelOpen(false);
                setSelectedGalleryIds([]);
                setSelectedGroupIds([]);
                setCustomMessage("");
                clearCustomMessageDraft();
              }}
            >
              <Share2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span className="md:hidden">Share</span>
              <span className="hidden md:inline">Share Galleries</span>
            </Button>
            {hasReachedGalleryLimit ? (
              <Button
                asChild
                variant="secondary"
                className="h-8 gap-1 whitespace-nowrap px-2 py-1 text-[9px] tracking-[0.06em] md:h-auto md:gap-1.5 md:px-3 md:py-2 md:text-xs md:tracking-[0.14em]"
              >
                <Link href="/galleries/settings/membership?source=gallery-limit">
                  <span className="md:hidden">Upgrade</span>
                  <span className="hidden md:inline">Upgrade plan</span>
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                className="h-8 gap-1 whitespace-nowrap px-2 py-1 text-[9px] tracking-[0.06em] md:h-auto md:gap-1.5 md:px-3 md:py-2 md:text-xs md:tracking-[0.14em]"
              >
                <Link href="/galleries/new">
                  <Plus className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  <span className="md:hidden">Create</span>
                  <span className="hidden md:inline">Create gallery</span>
                </Link>
              </Button>
            )}
          </>
        }
      />

      <section className="mb-3 grid grid-cols-3 gap-2 md:mb-4 md:gap-6">
        {/*
          Membership stat doubles as the dashboard's plan affordance — a
          single small link to Settings → Membership. Keeps the dashboard
          clean (no banners, no extra cards) while still giving users a
          one-click path to manage their plan.
        */}
        <Link
          href="/galleries/settings/membership"
          className="group block py-0.5"
          aria-label="Manage membership"
        >
          <p className="text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)] md:text-[10px] md:tracking-[0.22em]">
            Membership
          </p>
          <p className="mt-1 text-[12.5px] leading-[1.35] text-[color:var(--ink)] underline decoration-transparent underline-offset-[5px] transition group-hover:decoration-[color:var(--ink-faint)] md:mt-2 md:text-[15px] md:leading-6">
            {selectedPlan?.name ?? "No plan selected"}
          </p>
        </Link>
        <QuickStat
          label="Archive usage"
          value={usageLabel}
          mobileValue={usageLabelCompact}
        />
        <QuickStat
          label="Sharing usage"
          value={shareUsageLabel}
          mobileValue={shareUsageLabelCompact}
        />
      </section>
      {shareLimitReached ? (
        <p className="mb-3 rounded-sm border border-[rgba(34,52,79,0.12)] bg-white/70 px-3 py-2 text-sm text-[color:var(--ink-soft)]">
          You&apos;ve reached the share-link limit on the {selectedPlan?.name ?? "current"} plan.{" "}
          <Link href="/galleries/settings/membership" className="text-[color:var(--ink)] underline underline-offset-2">
            Upgrade to create more share links.
          </Link>
        </p>
      ) : null}

      {galleryDraft ? (
        <DraftsStrip draft={galleryDraft} onDiscard={clearGalleryDraft} />
      ) : null}

      {!hydrated ? (
        <section className="mt-5 md:mt-7">
          <GalleryCardSkeletonGrid count={2} />
        </section>
      ) : sortedGalleries.length ? (
        <section className="mt-5 space-y-3 md:mt-7 md:space-y-4">
          {shareMode ? (
            <div className="flex items-center justify-between rounded-xl bg-[rgba(255,255,255,0.64)] px-2.5 py-1.5 text-xs text-[color:var(--ink-soft)] md:px-3 md:py-2 md:text-sm">
              <span>
                Share mode active. Select one or more galleries.
              </span>
              <span className="text-[color:var(--ink)]">{selectedCount} selected</span>
            </div>
          ) : null}
          {/*
            Editorial grid rhythm: 1-col on mobile/tablet so each photograph
            reads as a photograph, 2-col at lg+ with generous horizontal gap
            and larger vertical gap to create a considered rows-of-entries
            cadence (archive, not catalog). No xl:grid-cols-3 — a single
            decisive layout is the curated choice.
          */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:gap-x-8 md:gap-y-14 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-16">
          {sortedGalleries.map((gallery) => (
            <GalleryCard
              key={gallery.id}
              gallery={gallery}
              shareSelectable={shareMode}
              selected={selectedGalleryIds.includes(gallery.id)}
              onToggleSelected={(galleryId) =>
                setSelectedGalleryIds((current) =>
                  current.includes(galleryId)
                    ? current.filter((entry) => entry !== galleryId)
                    : [...current, galleryId],
                )
              }
            />
          ))}
          </div>
        </section>
      ) : onboarding.isAuthenticated ? (
        <section className="px-6 py-20 text-center md:px-10">
          <p className="font-serif text-3xl leading-tight text-[color:var(--ink-faint)] md:text-4xl">
            No galleries yet.
          </p>
          <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">
            Create your first gallery to start building your archive.
          </p>
          <Link
            href="/galleries/new"
            className="mt-6 inline-block border border-[color:var(--border-strong)] bg-[color:var(--paper)] px-5 py-2.5 text-sm text-[color:var(--ink)] hover:bg-[rgba(0,0,0,0.03)]"
          >
            Create your first gallery
          </Link>
        </section>
      ) : (
        <EmptyState
          title="No galleries yet"
          description="Start with a trip, a season, or a chapter of life. Memora works best when each gallery has a clear emotional frame."
          actionHref="/galleries/new"
          actionLabel="Create your first gallery"
        />
      )}
      <CreateSharePanel
        open={sharePanelOpen}
        onOpenChange={(next) => {
          setSharePanelOpen(next);
          if (!next) {
            setShareMode(false);
            setSelectedGalleryIds([]);
            setSelectedGroupIds([]);
            setCustomMessage("");
          }
        }}
        selectedGalleryCount={selectedGalleryIds.length}
        selectedGalleryIds={selectedGalleryIds}
        groups={recipientGroups}
        selectedGroupIds={selectedGroupIds}
        customMessage={customMessage}
        onToggleGroup={(groupId) =>
          setSelectedGroupIds((current) =>
            current.includes(groupId)
              ? current.filter((entry) => entry !== groupId)
              : [...current, groupId],
          )
        }
        onCustomMessageChange={setCustomMessage}
        onGroupsChange={setRecipientGroups}
        onCreateShare={async (input) => {
          const response = await fetch("/api/shares", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(input),
          });
          const payload = (await response.json()) as {
            error?: string;
            code?: string;
            resource?: string;
            currentPlan?: string;
            limit?: number;
            currentUsage?: number;
            shareUrl?: string;
          };
          if (!response.ok || !payload.shareUrl) {
            if (payload.code === "PLAN_LIMIT_REACHED" && payload.resource === "shares") {
              throw new Error(
                `You've reached the share-link limit on the ${payload.currentPlan ?? "current"} plan. Upgrade to create more links.`,
              );
            }
            throw new Error(payload.error ?? "Unable to create share link.");
          }
          setShareUsage((current) =>
            current ? { ...current, current: current.current + 1 } : current,
          );
          return { shareUrl: payload.shareUrl };
        }}
      />
      <AnimatePresence>
        {shareMode && !sharePanelOpen ? (
          <motion.div
            key="share-floating-bar"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-[8px] border border-[rgba(34,52,79,0.12)] bg-[rgba(251,253,255,0.97)] p-2 shadow-[0_16px_40px_rgba(16,24,38,0.18)] md:bottom-7 md:right-7"
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShareMode(false);
                setSelectedGalleryIds([]);
                setSelectedGroupIds([]);
                setCustomMessage("");
                clearCustomMessageDraft();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selectedGalleryIds.length === 0 || shareLimitReached}
              onClick={() => setSharePanelOpen(true)}
            >
              {selectedGalleryIds.length === 0
                ? "Select galleries"
                : `Share ${selectedGalleryIds.length} ${selectedGalleryIds.length === 1 ? "gallery" : "galleries"}`}
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}

function QuickStat({
  label,
  value,
  mobileValue,
}: {
  label: string;
  value: string;
  /**
   * Optional shorter value used on mobile only. Useful when the desktop
   * value is descriptive prose ('4 of 10 active galleries') but mobile
   * cells are too narrow for the full string.
   */
  mobileValue?: string;
}) {
  // Editorial caption treatment — not a dashboard metric.
  // - No vertical divider rule (was Harbor-blue hardcoded, read too grid-y).
  // - On desktop, value drops to regular weight in --ink-soft so it reads
  //   like prose, not a number you stare at.
  // - On mobile, the small text gets washed out at --ink-soft, so we bump
  //   the value to full --ink with font-medium and the label to --ink-soft
  //   so the dashboard stats actually read at a glance.
  return (
    <div className="py-0.5">
      <p className="text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)] md:text-[10px] md:tracking-[0.22em]">
        {label}
      </p>
      <p className="mt-1 text-[12.5px] leading-[1.35] text-[color:var(--ink)] md:mt-2 md:text-[15px] md:leading-6">
        {mobileValue ? (
          <>
            <span className="md:hidden">{mobileValue}</span>
            <span className="hidden md:inline">{value}</span>
          </>
        ) : (
          value
        )}
      </p>
    </div>
  );
}

function formatDraftTimestamp(iso: string): string {
  if (!iso) return "Just now";
  const updatedAt = new Date(iso);
  if (Number.isNaN(updatedAt.getTime())) return "Just now";
  const now = Date.now();
  const diffMinutes = Math.round((now - updatedAt.getTime()) / 60_000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  return updatedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      updatedAt.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function DraftsStrip({
  draft,
  onDiscard,
}: {
  draft: import("@/hooks/use-gallery-draft").GalleryDraft;
  onDiscard: () => void;
}) {
  const title = draft.title.trim() || "Untitled draft";
  const timestamp = formatDraftTimestamp(draft.updatedAt);
  return (
    <section className="mb-4 md:mb-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
        Drafts
      </p>
      <div className="mt-2 flex items-stretch gap-2 overflow-x-auto pb-1 md:gap-3">
        <Link
          href="/galleries/new"
          className="group flex min-w-[16rem] flex-1 items-center justify-between gap-3 border border-[color:var(--border)] bg-white/80 px-3.5 py-2.5 transition hover:border-[color:var(--border-strong)] hover:bg-white md:min-w-[20rem]"
        >
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
              <Pencil className="h-3 w-3" />
              In progress · {timestamp}
            </p>
            <p className="mt-1 truncate font-serif text-[18px] leading-tight text-[color:var(--ink)] md:text-[20px]">
              {title}
            </p>
            {draft.location ? (
              <p className="mt-0.5 truncate text-[12px] text-[color:var(--ink-soft)]">
                {draft.location}
              </p>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1.5 self-center text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)] transition group-hover:text-[color:var(--ink)]">
            Continue
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
        <ConfirmDeleteDialog
          title="Discard this draft?"
          description="Your in-progress gallery will be removed. This can't be undone."
          confirmLabel="Discard"
          onConfirm={onDiscard}
          trigger={
            <button
              type="button"
              aria-label="Discard draft"
              className="inline-flex shrink-0 items-center justify-center border border-[color:var(--border)] bg-white/80 px-2.5 text-[color:var(--ink-soft)] transition hover:border-[color:var(--border-strong)] hover:bg-white hover:text-[color:var(--ink)]"
            >
              <X className="h-4 w-4" />
            </button>
          }
        />
      </div>
    </section>
  );
}
