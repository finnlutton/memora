"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { GalleryCard } from "@/components/gallery-card";
import { JourneyCard } from "@/components/journey-card";
import { JourneyCelebration } from "@/components/journey-celebration";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import {
  getJourneyStage,
  getJourneyLineModel,
  getJourneyStats,
  getJourneySupportCopy,
  getLatestCelebratedMilestone,
  getNextJourneyMilestone,
  getResolvedJourneyMilestones,
} from "@/lib/journey";
import { getMembershipPlan } from "@/lib/plans";

export default function GalleriesPage() {
  const { galleries, hydrated, onboarding } = useMemoraStore();
  const [shownMilestoneIds, setShownMilestoneIds] = useState<string[]>([]);
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
    ? `${sortedGalleries.length} of ${selectedPlan.galleryCount} active galleries`
    : `${sortedGalleries.length} galleries in archive`;
  const journey = useMemo(() => {
    const stats = getJourneyStats(sortedGalleries);
    const stage = getJourneyStage(stats.galleryCount);
    const line = getJourneyLineModel(stats.galleryCount);
    const nextMilestone = getNextJourneyMilestone(stats);
    const supportCopy = getJourneySupportCopy(stats);
    const milestones = getResolvedJourneyMilestones(stats);
    return { stats, stage, line, nextMilestone, supportCopy, milestones };
  }, [sortedGalleries]);
  const storageKey = onboarding.user?.id ? `memora::journey-celebrations:v1:${onboarding.user.id}` : null;

  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) {
      queueMicrotask(() => setShownMilestoneIds([]));
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      queueMicrotask(() =>
        setShownMilestoneIds(raw ? (JSON.parse(raw) as string[]) : []),
      );
    } catch {
      queueMicrotask(() => setShownMilestoneIds([]));
    }
  }, [storageKey]);

  const pendingCelebration = useMemo(
    () => getLatestCelebratedMilestone(journey.milestones, shownMilestoneIds),
    [journey.milestones, shownMilestoneIds],
  );

  const dismissCelebration = () => {
    if (!pendingCelebration) return;
    const nextShownIds = Array.from(new Set([...shownMilestoneIds, pendingCelebration.id]));
    setShownMilestoneIds(nextShownIds);
    if (typeof window !== "undefined" && storageKey) {
      window.localStorage.setItem(storageKey, JSON.stringify(nextShownIds));
    }
  };

  return (
    <AppShell>
      <section className="mb-8 grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)] xl:items-start">
        <div className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,250,253,0.72))] px-1 py-1">
          <div className="pointer-events-none absolute left-0 top-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(210,222,236,0.34),transparent_68%)]" />
          <div className="relative px-4 py-5 md:px-6 md:py-6">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
              Dashboard
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-[0.95] text-[color:var(--ink)] md:text-[3.6rem]">
              My Galleries
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] md:text-[0.95rem]">
              Continue building your archive, return to the moments already preserved, and let each gallery sit within a more composed personal record.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {hasReachedGalleryLimit ? (
                <Button asChild variant="secondary">
                  <Link href="/pricing?source=gallery-limit">
                    Upgrade membership to continue
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/galleries/new">
                    <Plus className="h-3 w-3" />
                    Create gallery
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside className="bg-[linear-gradient(180deg,rgba(247,250,253,0.88),rgba(255,255,255,0.7))] px-4 py-5 md:px-5 md:py-6">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            Archive at a glance
          </p>
          <div className="mt-4 space-y-4">
            <DashboardPanel
              label="Membership"
              value={selectedPlan?.name ?? "No plan selected"}
              detail={
                selectedPlan
                  ? `${selectedPlan.galleryCount} gallery${selectedPlan.galleryCount === 1 ? "" : "ies"} included`
                  : "Choose a plan when you're ready"
              }
            />
            <DashboardPanel label="Archive usage" value={usageLabel} detail="A quieter measure of what is already taking shape." />
            <DashboardPanel
              label="Next step"
              value={sortedGalleries.length ? "Open a gallery" : "Create your first gallery"}
              detail={
                sortedGalleries.length
                  ? "Return to a chapter and continue arranging its scenes."
                  : "Begin with one chapter and let the archive grow from there."
              }
            />
          </div>
        </aside>
      </section>

      {pendingCelebration ? (
        <section className="mb-8">
          <JourneyCelebration
            title={pendingCelebration.title}
            supportingText={pendingCelebration.supportingText}
            onDismiss={dismissCelebration}
          />
        </section>
      ) : null}

      <section className="mb-8">
        <JourneyCard
          href="/galleries/journey"
          stage={journey.stage}
          stats={journey.stats}
          lineModel={journey.line}
          supportCopy={journey.supportCopy}
        />
      </section>

      {!hydrated ? (
        <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
          Loading your memories...
        </div>
      ) : sortedGalleries.length ? (
        <section className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Active archive
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sortedGalleries.map((gallery, index) => (
            <GalleryCard key={gallery.id} gallery={gallery} index={index} />
          ))}
          </div>
        </section>
      ) : onboarding.isAuthenticated ? (
        <section className="px-6 py-20 text-center md:px-10">
          <p className="font-serif text-3xl leading-tight text-[color:var(--ink-faint)] md:text-4xl">
            One gallery at a time...
          </p>
        </section>
      ) : (
        <EmptyState
          title="No galleries yet"
          description="Start with a trip, a season, or a chapter of life. Memora works best when each gallery has a clear emotional frame."
          actionHref="/galleries/new"
          actionLabel="Create your first gallery"
        />
      )}
    </AppShell>
  );
}

function DashboardPanel({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border-b border-[rgba(38,58,83,0.08)] pb-4 last:border-b-0 last:pb-0">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="mt-2 font-serif text-[1.9rem] leading-tight text-[color:var(--ink)]">
        {value}
      </p>
      <p className="mt-2 max-w-[26ch] text-xs leading-6 text-[color:var(--ink-soft)]">
        {detail}
      </p>
    </div>
  );
}
