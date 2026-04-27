"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { GalleryDirectPhotos } from "@/components/gallery-direct-photos";
import { SubgalleryCarousel } from "@/components/subgallery-carousel";
import { WorkspaceTopbar } from "@/components/workspace-topbar";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function GalleryDetailPage() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  const { getGallery, deleteGallery, hydrated } = useMemoraStore();
  const gallery = getGallery(params.galleryId);
  const [activeSubgalleryIndex, setActiveSubgalleryIndex] = useState(0);
  const [actionsOpen, setActionsOpen] = useState(false);

  if (!gallery) {
    return (
      <AppShell accent="immersive">
        {hydrated ? (
          <div className="rounded-[1.25rem] border border-white/60 bg-white/70 px-4 py-8 text-center text-sm text-[color:var(--ink-soft)]">
            Gallery not found.
          </div>
        ) : (
          // While the store hydrates, paint a soft skeleton matching the
          // detail page rhythm — eyebrow, title, action row — so layout
          // doesn't shift when real data arrives.
          <div aria-hidden className="space-y-6">
            <div className="space-y-3">
              <div className="memora-shimmer h-3 w-32 rounded-sm" />
              <div className="memora-shimmer h-10 w-2/3 rounded-sm md:h-14" />
              <div className="memora-shimmer h-4 w-3/4 max-w-2xl rounded-sm" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="memora-shimmer aspect-[4/5] rounded-sm"
                />
              ))}
            </div>
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell accent="immersive">
      <div className="flex min-h-[calc(100vh-9rem)] flex-col">
      <WorkspaceTopbar
        eyebrow="Gallery workspace"
        title={gallery.title}
        subtitle={gallery.description}
        actions={
          <>
            <Button asChild variant="ghost">
              <Link href="/galleries">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/galleries/${gallery.id}/subgalleries/new`}>Add subgallery</Link>
            </Button>
            <div className="relative">
              <Button type="button" variant="secondary" onClick={() => setActionsOpen((value) => !value)}>
                <MoreHorizontal className="h-4 w-4" />
                More
              </Button>
              {actionsOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.45rem)] z-20 w-[min(16rem,calc(100vw-2rem))] rounded-xl border border-[rgba(28,46,72,0.12)] bg-white/95 p-2 shadow-[0_14px_34px_rgba(16,24,38,0.12)] md:w-48">
                  {gallery.subgalleries.length > 0 ? (
                    <Link
                      href={`/galleries/${gallery.id}/subgalleries/${gallery.subgalleries[activeSubgalleryIndex].id}/edit`}
                      className="block rounded-lg px-3 py-2 text-sm text-[color:var(--ink)] transition hover:bg-[color:var(--paper)]"
                    >
                      Edit subgallery
                    </Link>
                  ) : null}
                  <Link
                    href={`/galleries/${gallery.id}/edit`}
                    className="block rounded-lg px-3 py-2 text-sm text-[color:var(--ink)] transition hover:bg-[color:var(--paper)]"
                  >
                    Edit gallery
                  </Link>
                  <div className="px-1 py-1.5">
                    <ConfirmDeleteDialog
                      title="Delete this gallery?"
                      description="This removes the gallery and every subgallery inside it from local storage."
                      triggerLabel="Delete gallery"
                      onConfirm={() => {
                        void deleteGallery(gallery.id).then(() => {
                          router.push("/galleries");
                        });
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </>
        }
      />
      {gallery.subgalleries.length ? (
        <section>
          <SubgalleryCarousel
            galleryId={gallery.id}
            subgalleries={gallery.subgalleries}
            theme="light"
            onActiveIndexChange={setActiveSubgalleryIndex}
          />
        </section>
      ) : null}

      <GalleryDirectPhotos gallery={gallery} />
      </div>
    </AppShell>
  );
}
