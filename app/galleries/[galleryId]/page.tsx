"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { GalleryHero } from "@/components/gallery-hero";
import { SubgalleryCarousel } from "@/components/subgallery-carousel";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function GalleryDetailPage() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  const { getGallery, deleteGallery, hydrated } = useMemoraStore();
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
    <AppShell accent="immersive">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button asChild variant="ghost">
          <Link href="/galleries">
            <ArrowLeft className="h-4 w-4" />
            Back to galleries
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
      <GalleryHero gallery={gallery} />
      <section className="mt-8">
        {gallery.subgalleries.length ? (
          <SubgalleryCarousel galleryId={gallery.id} subgalleries={gallery.subgalleries} />
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
