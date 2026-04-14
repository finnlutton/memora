"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SubgalleryForm } from "@/components/subgallery-form";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { canCreate, getMembershipPlan } from "@/lib/plans";

export default function NewSubgalleryPage() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  const { createSubgallery, getGallery, hydrated, onboarding } = useMemoraStore();
  const gallery = getGallery(params.galleryId);
  const selectedPlan = getMembershipPlan(onboarding.selectedPlanId);
  const reachedSubgalleryLimit = Boolean(
    onboarding.isAuthenticated &&
      selectedPlan &&
      gallery &&
      !canCreate("subgalleries", gallery.subgalleries.length, selectedPlan).allowed,
  );

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

  if (reachedSubgalleryLimit) {
    return (
      <AppShell>
        <section className="mx-auto max-w-3xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.82)] p-4 text-center md:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Subgallery limit reached</p>
          <h1 className="mt-2 font-serif text-3xl text-[color:var(--ink)] md:mt-3 md:text-5xl">
            You&apos;ve reached the subgallery limit on the {selectedPlan?.name ?? "current"} plan.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)] md:mt-4 md:leading-7">
            Upgrade to create more scenes in this gallery.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/galleries/settings/membership">Choose membership</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/galleries/${params.galleryId}`}>Back to gallery</Link>
            </Button>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mb-4 md:mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Add subgallery
        </p>
        <h1 className="mt-2 font-serif text-3xl text-[color:var(--ink)] md:mt-3 md:text-5xl">
          Add a new scene
        </h1>
      </section>
      <SubgalleryForm
        galleryId={params.galleryId}
        photoLimit={selectedPlan?.photosPerSubgallery ?? null}
        onSubmit={async (value) => {
          const subgalleryId = await createSubgallery(params.galleryId, value);
          router.push(`/galleries/${params.galleryId}/subgalleries/${subgalleryId}`);
        }}
      />
    </AppShell>
  );
}
