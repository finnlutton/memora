"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SubgalleryCarousel } from "@/components/subgallery-carousel";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { demoGalleries } from "@/lib/demo-data";

const previewGallery = demoGalleries[0];

export default function HomePage() {
  const router = useRouter();
  const { hydrated, onboarding, getNextOnboardingRoute } = useMemoraStore();

  useEffect(() => {
    if (!hydrated || !onboarding.isAuthenticated) {
      return;
    }

    router.replace(onboarding.onboardingComplete ? "/galleries" : getNextOnboardingRoute());
  }, [
    getNextOnboardingRoute,
    hydrated,
    onboarding.isAuthenticated,
    onboarding.onboardingComplete,
    router,
  ]);

  useEffect(() => {
    if (!hydrated || onboarding.isAuthenticated) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [hydrated, onboarding.isAuthenticated]);

  if (hydrated && onboarding.isAuthenticated) {
    return null;
  }

  return (
    <AppShell accent="immersive">
      <section className="flex flex-col gap-4 border-b border-[color:var(--border)] pt-4 pb-5 lg:pt-5 lg:pb-6">
        <div className="w-full border border-[color:var(--border)] bg-[rgba(255,255,255,0.76)] p-4 transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-lg md:py-[1.125rem]">
          <div className="mx-auto w-full max-w-5xl md:px-5">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-faint)] sm:text-xs">
              Curated galleries, meaningful descriptions
            </p>
            <h1 className="mt-2 w-full font-serif text-2xl leading-[0.98] text-[color:var(--ink)] sm:text-3xl md:text-3xl lg:text-4xl">
              An intentional platform to share and revisit your memories
            </h1>
            <div className="mt-4">
              <Button asChild>
                <Link href="/demo/create">
                  Explore demo
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatementCard
            title="Not superficial"
            description="Memora hopes to restore authenticity and maturity to modern social media."
          />
          <StatementCard
            title="Not generic storage"
            description="The point is not to dump photos, it's to allow you and the people you care about to follow your journeys."
          />
          <StatementCard
            title="Built to last"
            description="Enjoy a timeless organizational structure for your favorite moments."
          />
        </div>
      </section>

      <section className="grid gap-4 py-6 xl:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)] xl:items-stretch">
        <div className="flex flex-col border border-[color:var(--border)] bg-[rgba(246,249,252,0.72)] p-5 transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-lg md:p-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Creators Note
          </p>
          <h2 className="mt-2 font-serif text-xl leading-[1.12] text-[color:var(--ink)] sm:text-2xl md:text-3xl">
            About the product
          </h2>
          <div className="mt-5 space-y-5 text-[15px] leading-7 text-[color:var(--ink-soft)] md:text-[16px] md:leading-8">
            <p>
              As many who have been fortunate enough to study abroad, I&apos;ve increasingly desired a better system to share and store my photos.
            </p>
            <p>
              My camera roll is cluttered; lacking organization as well as a way to pair photos with written descriptions.
            </p>
            <p>
              Additionally, sharing experiences authentically (Instagram doesn&apos;t fulfill this) with such a wide array of communication methods with friends and family is very challenging.
            </p>
            <p>
              Memora takes this thoroughly into account, and promises to deliver a superior sharing / memory storage system.
            </p>
          </div>
        </div>

        <div className="overflow-hidden border border-[color:var(--border)] bg-[rgba(246,249,252,0.72)] p-4 md:p-6">
          <SubgalleryCarousel
            galleryId={previewGallery.id}
            subgalleries={previewGallery.subgalleries}
            eyebrow="Winter Olympics 2026"
            title="Demo Gallery"
            theme="light"
            clickable={false}
          />
        </div>
      </section>
    </AppShell>
  );
}

function StatementCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-w-0 border border-[color:var(--border)] bg-[rgba(245,248,252,0.96)] p-4 transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-lg sm:p-5">
      <p className="text-balance break-words font-serif text-lg leading-[1.12] text-[color:var(--ink)] md:text-xl">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
        {description}
      </p>
    </div>
  );
}
