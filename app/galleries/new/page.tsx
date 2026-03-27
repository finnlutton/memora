"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { GalleryForm } from "@/components/gallery-form";
import { OnboardingGuard } from "@/components/onboarding/onboarding-guard";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { getMembershipPlan } from "@/lib/plans";
import { createId } from "@/lib/utils";
import type { MemoryPhoto } from "@/types/memora";

function formatSubgalleryDateLabel(startDate: string, endDate: string): string {
  if (!startDate) return "Your journey";
  const start = new Date(startDate);
  const startStr = start.toLocaleDateString("en", { month: "short", day: "numeric" });
  if (!endDate || startDate === endDate) return startStr;
  const end = new Date(endDate);
  const endStr = end.toLocaleDateString("en", { month: "short", day: "numeric" });
  return start.getMonth() === end.getMonth()
    ? `${startStr.split(" ")[0]} ${start.getDate()}-${end.getDate()}`
    : `${startStr} - ${endStr}`;
}

export default function NewGalleryPage() {
  const router = useRouter();
  const { createGallery, createSubgallery, galleries, onboarding } = useMemoraStore();
  const selectedPlan = getMembershipPlan(onboarding.selectedPlanId);
  const hasReachedGalleryLimit = Boolean(
    onboarding.isAuthenticated &&
      selectedPlan &&
      galleries.length >= selectedPlan.galleryCount,
  );

  return (
    <OnboardingGuard>
      <AppShell>
        {hasReachedGalleryLimit ? (
          <section className="mx-auto max-w-3xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.82)] p-6 text-center md:p-8">
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Gallery limit reached
            </p>
            <h1 className="mt-3 font-serif text-4xl text-[color:var(--ink)] md:text-5xl">
              Your free plan includes 2 active galleries.
            </h1>
            <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">
              Upgrade your membership to continue creating new galleries without removing existing ones.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/pricing?source=gallery-limit">Upgrade membership</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/galleries">Back to dashboard</Link>
              </Button>
            </div>
          </section>
        ) : (
          <>
        <section className="mb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Create gallery
          </p>
          <h1 className="mt-3 font-serif text-5xl text-[color:var(--ink)]">Compose a new memory</h1>
        </section>
        <GalleryForm
          createLabel="Create gallery"
          onSubmit={async (value) => {
            const galleryId = await createGallery(value);
            const tempSubgalleryId = createId("temp-sub");
            const now = new Date().toISOString();
            const firstLocation = value.locations[0]?.trim() || "Your journey";
            const locationDisplay = value.locations.length > 1
              ? `${firstLocation} and ${value.locations.length - 1} more`
              : firstLocation;
            const coverPhoto: MemoryPhoto = {
              id: createId("photo"),
              subgalleryId: tempSubgalleryId,
              src: value.coverImage,
              caption: "",
              createdAt: now,
              order: 0,
            };
            await createSubgallery(galleryId, {
              title: value.title,
              coverImage: value.coverImage,
              location: locationDisplay,
              dateLabel: formatSubgalleryDateLabel(value.startDate, value.endDate),
              description: value.description,
              photos: [coverPhoto],
            });
            router.push("/galleries");
          }}
        />
          </>
        )}
      </AppShell>
    </OnboardingGuard>
  );
}
