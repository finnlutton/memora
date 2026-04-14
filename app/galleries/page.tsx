"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { GalleryCard } from "@/components/gallery-card";
import { WorkspaceTopbar } from "@/components/workspace-topbar";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
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
  return (
    <AppShell>
      <WorkspaceTopbar
        eyebrow="Workspace"
        title="My Galleries"
        subtitle="Curate, preserve, and share your experiences here."
        actions={
          hasReachedGalleryLimit ? (
            <Button asChild variant="secondary">
              <Link href="/pricing?source=gallery-limit">Upgrade membership</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/galleries/new">
                <Plus className="h-3 w-3" />
                Create gallery
              </Link>
            </Button>
          )
        }
      />

      <section className="mb-4 grid gap-4 md:grid-cols-3 md:gap-6">
        <QuickStat label="Membership" value={selectedPlan?.name ?? "No plan selected"} />
        <QuickStat label="Archive usage" value={usageLabel} />
        <QuickStat
          label="Next step"
          value={sortedGalleries.length ? "Open a gallery to continue" : "Create your first gallery"}
        />
      </section>

      {!hydrated ? (
        <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
          Loading your memories...
        </div>
      ) : sortedGalleries.length ? (
        <section className="mt-7 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
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

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative px-1 py-0.5 md:pl-4">
      <span className="absolute left-0 top-1 hidden h-10 w-px bg-[rgba(36,58,88,0.14)] md:block" />
      <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="mt-1.5 text-[15px] leading-6 text-[color:var(--ink)]">{value}</p>
    </div>
  );
}
