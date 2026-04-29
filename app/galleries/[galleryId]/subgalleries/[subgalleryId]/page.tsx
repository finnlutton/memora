"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PenLine } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CollapsibleEntry } from "@/components/collapsible-entry";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { PhotoGrid } from "@/components/photo-grid";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { formatLocationForCard } from "@/lib/utils";

export default function SubgalleryDetailPage() {
  const params = useParams<{ galleryId: string; subgalleryId: string }>();
  const router = useRouter();
  const { getGallery, getSubgallery, deleteSubgallery, hydrated } = useMemoraStore();
  const gallery = getGallery(params.galleryId);
  const subgallery = getSubgallery(params.galleryId, params.subgalleryId);

  if (!gallery || !subgallery) {
    return (
      <AppShell>
        {hydrated ? (
          <div className="border-y border-[color:var(--border)] bg-[color:var(--paper)] px-6 py-12 text-center text-[color:var(--ink-soft)]">
            Subgallery not found.
          </div>
        ) : (
          <div className="border-y border-[color:var(--border)] bg-[color:var(--paper)] px-6 py-12 text-center text-[color:var(--ink-soft)]">
            Loading subgallery...
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell accent="immersive">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5 md:mb-6 md:gap-4">
        <Button asChild variant="ghost">
          <Link href={`/galleries/${gallery.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to subgalleries
          </Link>
        </Button>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href={`/galleries/${gallery.id}/subgalleries/${subgallery.id}/edit`}>
              <PenLine className="h-4 w-4" />
              Edit subgallery
            </Link>
          </Button>
          <ConfirmDeleteDialog
            title="Delete this subgallery?"
            description="This removes the chapter and every photo inside it from local storage."
            triggerLabel="Delete subgallery"
            onConfirm={() => {
              void deleteSubgallery(gallery.id, subgallery.id).then(() => {
                router.push(`/galleries/${gallery.id}`);
              });
            }}
          />
        </div>
      </div>

      <section className="border-t border-b border-[color:var(--border)] py-7 md:py-10">
        <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Inside {gallery.title}
        </p>
        <h1 className="mt-2 font-serif text-3xl text-[color:var(--ink)] md:mt-3 md:text-5xl">{subgallery.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)] md:mt-4 md:gap-x-4">
          {(() => {
            const formatted = formatLocationForCard(subgallery.location);
            return formatted ? <span>{formatted}</span> : null;
          })()}
          {subgallery.location && subgallery.dateLabel ? (
            <span className="text-[color:var(--ink-faint)]">/</span>
          ) : null}
          {subgallery.dateLabel ? <span>{subgallery.dateLabel}</span> : null}
        </div>
        {subgallery.description ? (
          <CollapsibleEntry text={subgallery.description} className="mt-5 md:mt-7" />
        ) : null}
      </section>

      <section className="mt-6 space-y-4 md:mt-8 md:space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Visual journal
          </p>
          <h2 className="mt-1.5 font-serif text-3xl text-[color:var(--ink)] md:mt-2 md:text-4xl">Photographs</h2>
        </div>
        <PhotoGrid photos={subgallery.photos} />
      </section>
    </AppShell>
  );
}
