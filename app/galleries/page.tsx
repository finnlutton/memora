"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { GalleryCard } from "@/components/gallery-card";
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
  const usageLabel = selectedPlan
    ? `${sortedGalleries.length} of ${selectedPlan.galleryCount} active galleries`
    : `${sortedGalleries.length} galleries in archive`;

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
            <Button asChild>
              <Link href="/galleries/new">
                <Plus className="h-3 w-3" />
                Create gallery
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-px border border-[color:var(--border)] bg-[color:var(--border)] md:grid-cols-3 xl:grid-cols-1">
          <DashboardPanel label="Membership" value={selectedPlan?.name ?? "Preview mode"} />
          <DashboardPanel label="Archive usage" value={usageLabel} />
          <DashboardPanel
            label="Next step"
            value={sortedGalleries.length ? "Open a gallery" : "Create your first gallery"}
          />
        </div>
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
