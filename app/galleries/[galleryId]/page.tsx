"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CollapsibleEntry } from "@/components/collapsible-entry";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { GalleryDirectPhotos } from "@/components/gallery-direct-photos";
import { OverLimitBanner } from "@/components/over-limit-banner";
import { GallerySharingDialog } from "@/components/public-profile/gallery-sharing-dialog";
import { SubgalleryCarousel } from "@/components/subgallery-carousel";
import { WorkspaceTopbar } from "@/components/workspace-topbar";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { computeOverLimit } from "@/lib/over-limit";
import { getMembershipPlan } from "@/lib/plans";

export default function GalleryDetailPage() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  const { galleries, getGallery, deleteGallery, hydrated, onboarding } =
    useMemoraStore();
  const gallery = getGallery(params.galleryId);
  const [activeSubgalleryIndex, setActiveSubgalleryIndex] = useState(0);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(false);
  const selectedPlan = getMembershipPlan(onboarding.selectedPlanId);
  const overLimitReport = computeOverLimit(galleries, selectedPlan ?? null);

  if (!gallery) {
    return (
      <AppShell accent="immersive">
        {hydrated ? (
          <div className="border-y border-[color:var(--border)] bg-[color:var(--paper)] px-4 py-8 text-center text-sm text-[color:var(--ink-soft)]">
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
      {/* Quiet chrome row — back breadcrumb on the left, kebab on the
          right. Pinned to the very top of the workspace at all sizes so
          the title section directly below remains the focal point. */}
      <div className="mb-3 flex items-center justify-between gap-2 md:mb-4">
        <Link
          href="/galleries"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Link>
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setActionsOpen((value) => !value)}
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {actionsOpen ? (
            <>
              <div
                aria-hidden
                onClick={() => setActionsOpen(false)}
                className="fixed inset-0 z-30 bg-[rgba(9,14,22,0.32)] backdrop-blur-[1px] md:hidden"
              />
              <div
                role="menu"
                style={{
                  paddingBottom:
                    "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
                }}
                className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-1 border-t border-[color:var(--border-strong)] bg-[color:var(--chrome-strong)] p-3 shadow-[0_-14px_34px_rgba(0,0,0,0.18)] md:absolute md:inset-auto md:right-0 md:top-[calc(100%+0.45rem)] md:w-48 md:rounded-xl md:border md:p-2 md:pb-2"
              >
                <Link
                  href={`/galleries/${gallery.id}/subgalleries/new`}
                  onClick={() => setActionsOpen(false)}
                  className="flex h-12 items-center rounded-lg px-3 text-[14px] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)] md:h-auto md:py-2 md:text-sm"
                >
                  Add subgallery
                </Link>
                {gallery.subgalleries.length > 0 ? (
                  <Link
                    href={`/galleries/${gallery.id}/subgalleries/${gallery.subgalleries[activeSubgalleryIndex].id}/edit`}
                    onClick={() => setActionsOpen(false)}
                    className="flex h-12 items-center rounded-lg px-3 text-[14px] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)] md:h-auto md:py-2 md:text-sm"
                  >
                    Edit subgallery
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false);
                    setSharingOpen(true);
                  }}
                  className="flex h-12 items-center rounded-lg px-3 text-left text-[14px] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)] md:h-auto md:py-2 md:text-sm"
                >
                  Sharing
                </button>
                <Link
                  href={`/galleries/${gallery.id}/edit`}
                  onClick={() => setActionsOpen(false)}
                  className="flex h-12 items-center rounded-lg px-3 text-[14px] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)] md:h-auto md:py-2 md:text-sm"
                >
                  Edit gallery
                </Link>
                <div className="px-1 py-1.5">
                  <ConfirmDeleteDialog
                    title="Delete this gallery?"
                    description="This removes the gallery and every subgallery inside it from local storage."
                    triggerLabel="Delete gallery"
                    onConfirm={() => {
                      setActionsOpen(false);
                      void deleteGallery(gallery.id).then(() => {
                        router.push("/galleries");
                      });
                    }}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <WorkspaceTopbar
        eyebrow="Gallery workspace"
        title={gallery.title}
      />
      {hydrated && onboarding.isAuthenticated && overLimitReport.hasOverLimit && selectedPlan ? (
        <OverLimitBanner
          report={overLimitReport}
          planName={selectedPlan.name}
          scope="gallery"
          galleryId={gallery.id}
        />
      ) : null}
      {gallery.description ? (
        <CollapsibleEntry text={gallery.description} className="mb-6 md:mb-8" />
      ) : null}
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
      <GallerySharingDialog
        open={sharingOpen}
        onOpenChange={setSharingOpen}
        galleryId={gallery.id}
        galleryTitle={gallery.title}
      />
    </AppShell>
  );
}
