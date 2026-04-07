"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PenLine } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { PhotoGrid } from "@/components/photo-grid";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

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
          <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
            Subgallery not found.
          </div>
        ) : (
          <div className="rounded-[2rem] border border-white/60 bg-white/70 px-6 py-12 text-center text-[color:var(--ink-soft)]">
            Loading subgallery...
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell accent="immersive">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Button asChild variant="ghost">
          <Link href={`/galleries/${gallery.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to scenes
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

      <section>
        <div className="rounded-[2.5rem] border border-white/60 bg-white/74 p-7 shadow-[0_22px_70px_rgba(34,49,71,0.1)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Inside {gallery.title}
          </p>
          <h1 className="mt-3 font-serif text-5xl text-[color:var(--ink)]">{subgallery.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[color:var(--ink-soft)]">
            {subgallery.location ? <span>{subgallery.location}</span> : null}
            {subgallery.location && subgallery.dateLabel ? (
              <span className="text-[color:var(--ink-faint)]">/</span>
            ) : null}
            {subgallery.dateLabel ? <span>{subgallery.dateLabel}</span> : null}
          </div>
          <p className="mt-6 text-base leading-8 text-[color:var(--ink-soft)]">
            {subgallery.description}
          </p>
        </div>
      </section>

      <section className="mt-8 space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Visual journal
          </p>
          <h2 className="mt-2 font-serif text-4xl text-[color:var(--ink)]">Photographs</h2>
        </div>
        <PhotoGrid photos={subgallery.photos} />
      </section>
    </AppShell>
  );
}
