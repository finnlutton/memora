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
      <section className="mb-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="border border-[color:var(--border)] bg-[rgba(255,255,255,0.86)] p-5 md:p-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Dashboard
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[color:var(--ink)] md:text-4xl">
            My Galleries
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)]">
            Open existing galleries, continue building new ones, and keep your archive organized in your personal dashboard.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
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

        <div className="grid gap-px border border-[color:var(--border)] bg-[color:var(--border)] md:grid-cols-3 xl:grid-cols-1">
          <DashboardPanel label="Membership" value={selectedPlan?.name ?? "No plan selected"} />
          <DashboardPanel label="Archive usage" value={usageLabel} />
          <DashboardPanel
            label="Next step"
            value={sortedGalleries.length ? "Open a gallery" : "Create your first gallery"}
          />
        </div>
      </section>

      {pendingCelebration ? (
        <section className="mb-6">
          <JourneyCelebration
            title={pendingCelebration.title}
            supportingText={pendingCelebration.supportingText}
            onDismiss={dismissCelebration}
          />
        </section>
      ) : null}

      <section className="mb-6">
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

function DashboardPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[rgba(245,248,252,0.96)] p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="mt-3 font-serif text-2xl leading-tight text-[color:var(--ink)]">{value}</p>
    </div>
  );
}
