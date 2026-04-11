"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { GalleryCard } from "@/components/gallery-card";
import { JourneyCard } from "@/components/journey-card";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import {
  getJourneyStage,
  getJourneyLineModel,
  getJourneyStats,
  getJourneySupportCopy,
} from "@/lib/journey";
import { getMembershipPlan } from "@/lib/plans";

export default function GalleriesPage() {
  const { galleries, hydrated, onboarding } = useMemoraStore();
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
    const supportCopy = getJourneySupportCopy(stats);
    return { stats, stage, line, supportCopy };
  }, [sortedGalleries]);

  return (
    <AppShell>
      <section className="mb-6">
        <div className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,250,253,0.72))] px-1 py-1">
          <div className="pointer-events-none absolute left-0 top-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(210,222,236,0.34),transparent_68%)]" />
          <div className="relative px-4 py-4 md:px-6 md:py-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
              Dashboard
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-[0.95] text-[color:var(--ink)] md:text-[3.6rem]">
              My Galleries
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] md:text-[0.95rem]">
              Continue building your archive, return to the moments already preserved, and let each gallery sit within a more composed personal record.
            </p>
            <div className="mt-6 max-w-4xl border-t border-[rgba(38,58,83,0.08)] pt-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                Archive at a glance
              </p>
              <div className="mt-3 grid gap-4 md:grid-cols-3 md:gap-6">
                <DashboardPanel
                  label="Membership"
                  value={selectedPlan?.name ?? "No plan selected"}
                  detail={
                    selectedPlan
                      ? `${selectedPlan.galleryCount} gallery${selectedPlan.galleryCount === 1 ? "" : "ies"} included`
                      : "Choose a plan when you're ready"
                  }
                />
                <DashboardPanel
                  label="Archive usage"
                  value={usageLabel}
                  detail="A quieter measure of what is already taking shape."
                />
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
            </div>
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
        </div>
      </section>

      <section className="mb-6">
        <JourneyCard
          href="/galleries/journey"
          stage={journey.stage}
          stats={journey.stats}
          lineModel={journey.line}
          supportCopy={journey.supportCopy}
          showStats={false}
        />
      </section>

      {!hydrated ? (
        <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
          Loading your memories...
        </div>
      ) : sortedGalleries.length ? (
        <section className="space-y-3">
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
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="mt-1.5 font-serif text-[1.45rem] leading-tight text-[color:var(--ink)] md:text-[1.6rem]">
        {value}
      </p>
      <p className="mt-1.5 max-w-[24ch] text-[11px] leading-5 text-[color:var(--ink-soft)]">
        {detail}
      </p>
    </div>
  );
}
