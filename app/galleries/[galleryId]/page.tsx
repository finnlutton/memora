"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { SubgalleryCarousel } from "@/components/subgallery-carousel";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function GalleryDetailPage() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  const { getGallery, deleteGallery, hydrated } = useMemoraStore();
  const gallery = getGallery(params.galleryId);
  const [activeSubgalleryIndex, setActiveSubgalleryIndex] = useState(0);

  if (!gallery) {
    return (
      <AppShell>
        {hydrated ? (
          <div className="rounded-[1.25rem] border border-white/60 bg-white/70 px-4 py-8 text-center text-sm text-[color:var(--ink-soft)]">
            Gallery not found.
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-white/60 bg-white/70 px-4 py-8 text-center text-sm text-[color:var(--ink-soft)]">
            Loading gallery...
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell accent="immersive">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" className="text-[color:var(--ink)]">
          <Link href="/galleries">
            <ArrowLeft className="h-3 w-3" />
            Back to galleries
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href={`/galleries/${gallery.id}/subgalleries/new`}>
              Add Subgallery
            </Link>
          </Button>
          {gallery.subgalleries.length > 0 && (
            <Button asChild variant="secondary">
              <Link
                href={`/galleries/${gallery.id}/subgalleries/${gallery.subgalleries[activeSubgalleryIndex].id}/edit`}
              >
                Edit Subgallery
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link href={`/galleries/${gallery.id}/edit`}>
              Edit Gallery
            </Link>
          </Button>
          <ConfirmDeleteDialog
            title="Delete this gallery?"
            description="This removes the gallery and every subgallery inside it from local storage."
            triggerLabel="Delete gallery"
            onConfirm={() => {
              deleteGallery(gallery.id);
              router.push("/galleries");
            }}
          />
        </div>
      </div>
      <section>
        {gallery.subgalleries.length ? (
          <SubgalleryCarousel
            galleryId={gallery.id}
            subgalleries={gallery.subgalleries}
            theme="light"
            onActiveIndexChange={setActiveSubgalleryIndex}
          />
        ) : (
          <EmptyState
            title="No subgalleries yet"
            description="Break the larger memory into places, moments, or days. This is where Memora starts to feel alive."
            actionHref={`/galleries/${gallery.id}/subgalleries/new`}
            actionLabel="Add the first subgallery"
          />
        )}
      </section>
    </AppShell>
  );
}
