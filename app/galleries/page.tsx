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
      <section className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            My galleries
          </p>
          <h1 className="mt-2 font-serif text-2xl text-[color:var(--ink)] md:text-3xl">Memory collections</h1>
          <p className="mt-2 max-w-xl text-xs leading-6 text-[color:var(--ink-soft)]">
            Organize life into meaningful galleries and browse them like a shelf of keepsakes, not a bucket of uploads.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/galleries/new">
              <Plus className="h-3 w-3" />
              New gallery
            </Link>
          </Button>
          <Button variant="secondary" onClick={resetDemo}>
            <RotateCcw className="h-3 w-3" />
            Reset demo
          </Button>
        </div>
      </section>

      {!hydrated ? (
        <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
          Loading your memories...
        </div>
      ) : sortedGalleries.length ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
