"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { GalleryCard } from "@/components/gallery-card";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function GalleriesPage() {
  const { galleries, hydrated, resetDemo } = useMemoraStore();
  const sortedGalleries = useMemo(
    () =>
      [...galleries].sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      ),
    [galleries],
  );

  return (
    <AppShell>
      <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            My galleries
          </p>
          <h1 className="mt-3 font-serif text-5xl text-[color:var(--ink)]">Memory collections</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[color:var(--ink-soft)]">
            Organize life into meaningful galleries and browse them like a shelf of keepsakes, not a bucket of uploads.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/galleries/new">
              <Plus className="h-4 w-4" />
              New gallery
            </Link>
          </Button>
          <Button variant="secondary" onClick={resetDemo}>
            <RotateCcw className="h-4 w-4" />
            Reset demo
          </Button>
        </div>
      </section>

      {!hydrated ? (
        <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
          Loading your memories...
        </div>
      ) : sortedGalleries.length ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sortedGalleries.map((gallery, index) => (
            <GalleryCard key={gallery.id} gallery={gallery} index={index} />
          ))}
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
