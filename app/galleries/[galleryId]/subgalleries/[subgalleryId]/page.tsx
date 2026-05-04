"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
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
  const [actionsOpen, setActionsOpen] = useState(false);

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
      {/* Quiet chrome row — back breadcrumb on the left, edit/delete
          tucked into a kebab menu on the right. Keeps the focal point
          on the title section below instead of a heavy action bar. */}
      <div className="mb-4 flex items-center justify-between gap-2 md:mb-6">
        <Link
          href={`/galleries/${gallery.id}`}
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
                  href={`/galleries/${gallery.id}/subgalleries/${subgallery.id}/edit`}
                  onClick={() => setActionsOpen(false)}
                  className="flex h-12 items-center rounded-lg px-3 text-[14px] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)] md:h-auto md:py-2 md:text-sm"
                >
                  Edit subgallery
                </Link>
                <div className="px-1 py-1.5">
                  <ConfirmDeleteDialog
                    title="Delete this subgallery?"
                    description="This removes the chapter and every photo inside it from local storage."
                    triggerLabel="Delete subgallery"
                    onConfirm={() => {
                      setActionsOpen(false);
                      void deleteSubgallery(gallery.id, subgallery.id).then(() => {
                        router.push(`/galleries/${gallery.id}`);
                      });
                    }}
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <section className="border-b border-[color:var(--border)] pb-5 md:pb-8">
        <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Inside {gallery.title}
        </p>
        <h1 className="mt-1.5 font-serif text-[26px] leading-[1.05] text-[color:var(--ink)] md:mt-3 md:text-5xl md:leading-[1]">{subgallery.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-soft)] md:mt-4 md:gap-x-4 md:text-[11px]">
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
          <CollapsibleEntry text={subgallery.description} className="mt-4 md:mt-7" />
        ) : null}
      </section>

      <section className="mt-5 md:mt-8">
        <PhotoGrid photos={subgallery.photos} />
      </section>
    </AppShell>
  );
}
