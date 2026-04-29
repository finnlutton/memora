"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GalleryForm } from "@/components/gallery-form";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { formatLocationForCard, nextImageUnoptimizedForSrc, reorderList } from "@/lib/utils";
import type { Subgallery } from "@/types/memora";

export default function EditGalleryPage() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  const { getGallery, updateGallery, reorderSubgalleries, hydrated } =
    useMemoraStore();
  const gallery = getGallery(params.galleryId);

  if (!gallery) {
    return (
      <AppShell>
        {hydrated ? (
          <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
            Gallery not found.
          </div>
        ) : (
          <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
            Loading gallery...
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Edit gallery
        </p>
        <h1 className="mt-3 font-serif text-5xl text-[color:var(--ink)]">{gallery.title}</h1>
      </section>
      <GalleryForm
        initialValue={gallery}
        onSubmit={async (value) => {
          await updateGallery(gallery.id, value);
          router.push(`/galleries/${gallery.id}`);
        }}
      />

      {gallery.subgalleries.length > 1 ? (
        <SubgalleryReorderSection
          subgalleries={gallery.subgalleries}
          onReorder={(orderedIds) => reorderSubgalleries(gallery.id, orderedIds)}
        />
      ) : null}
    </AppShell>
  );
}

function SubgalleryReorderSection({
  subgalleries,
  onReorder,
}: {
  subgalleries: Subgallery[];
  onReorder: (orderedIds: string[]) => Promise<void>;
}) {
  const move = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= subgalleries.length) return;
    const next = reorderList(subgalleries, fromIndex, toIndex);
    void onReorder(next.map((subgallery) => subgallery.id));
  };

  return (
    <section className="mt-8 overflow-hidden border border-[color:var(--border-strong)]/70 bg-[color:var(--background)] shadow-[0_6px_24px_rgba(14,22,34,0.06)]">
      <header className="flex flex-col gap-1.5 border-b border-[color:var(--border-strong)]/50 bg-[color:var(--paper)]/50 px-5 py-5 md:px-8 md:py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
          Subgalleries
        </p>
        <h2 className="font-serif text-[24px] leading-tight text-[color:var(--ink)] md:text-[28px]">
          Reorder scenes
        </h2>
        <p className="max-w-xl text-[13px] leading-6 text-[color:var(--ink-soft)]">
          Move subgalleries up or down to set how recipients see them inside this
          gallery. Changes save automatically.
        </p>
      </header>

      <ul className="divide-y divide-[color:var(--border-strong)]/40">
        {subgalleries.map((subgallery, index) => {
          const isFirst = index === 0;
          const isLast = index === subgalleries.length - 1;
          return (
            <li
              key={subgallery.id}
              data-testid="subgallery-reorder-row"
              className="flex items-center gap-3 px-5 py-3 md:px-8 md:py-4"
            >
              <span className="w-6 shrink-0 text-right text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
                {index + 1}
              </span>
              <div className="relative h-12 w-16 shrink-0 overflow-hidden border border-[color:var(--border-strong)]/40 bg-[color:var(--paper)] md:h-14 md:w-20">
                {subgallery.coverImage ? (
                  <Image
                    src={subgallery.coverImage}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized={nextImageUnoptimizedForSrc(subgallery.coverImage)}
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] text-[color:var(--ink)]">
                  {subgallery.title || "Untitled scene"}
                </p>
                {(() => {
                  const formatted = formatLocationForCard(subgallery.location);
                  return formatted ? (
                    <p className="truncate text-[12px] text-[color:var(--ink-soft)]">
                      {formatted}
                    </p>
                  ) : null;
                })()}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Move ${subgallery.title || "scene"} up`}
                  disabled={isFirst}
                  onClick={() => move(index, index - 1)}
                  className="rounded-sm border border-[color:var(--border-strong)]/70 p-1.5 text-[color:var(--ink-soft)] transition hover:border-[color:var(--ink-soft)] hover:text-[color:var(--ink)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${subgallery.title || "scene"} down`}
                  disabled={isLast}
                  onClick={() => move(index, index + 1)}
                  className="rounded-sm border border-[color:var(--border-strong)]/70 p-1.5 text-[color:var(--ink-soft)] transition hover:border-[color:var(--ink-soft)] hover:text-[color:var(--ink)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
