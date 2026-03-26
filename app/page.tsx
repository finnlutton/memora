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
      <section className="border-b border-[color:var(--border)] pt-7 pb-7 md:pt-10 md:pb-8">
        <div className="max-w-[66rem]">
          <p className="text-center text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-faint)] sm:text-xs">
            Curated galleries, meaningful descriptions
          </p>
          <h1 className="mt-3 w-full text-center font-serif text-[2rem] leading-[0.96] text-[color:var(--ink)] sm:text-[2.35rem] md:text-[2.8rem] lg:text-[3.25rem]">
            An intentional platform to share and revisit your memories
          </h1>
          <div className="mt-5 flex justify-center">
            <Button asChild>
              <Link href="/demo/create">
                Explore demo
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-7 md:py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-0">
          <StatementCard
            index={0}
            title="Not superficial"
            description="Memora hopes to restore authenticity and maturity to modern social media."
          />
          <StatementCard
            index={1}
            title="Not generic storage"
            description="The point is not to dump photos, it's to allow you and the people you care about to follow your journeys."
          />
          <StatementCard
            index={2}
            title="Built to last"
            description="Enjoy a timeless organizational structure for your favorite moments."
          />
        </div>
      </section>

      <section className="grid gap-8 py-6 xl:grid-cols-[minmax(15rem,0.54fr)_minmax(0,1.46fr)] xl:items-start xl:gap-10">
        <div className="max-w-md pt-2 xl:pt-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Creators Note
          </p>
          <h2 className="mt-2 font-serif text-xl leading-[1.12] text-[color:var(--ink)] sm:text-2xl md:text-[2rem]">
            About the product
          </h2>
          <div className="mt-5 space-y-5 text-[15px] leading-7 text-[color:var(--ink-soft)] md:text-[15px] md:leading-7">
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

        <div className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(244,248,253,0.78),rgba(239,245,251,0.56))] px-1 py-4 md:px-2 md:py-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(22,35,56,0.14),transparent)]" />
          <div className="pointer-events-none absolute inset-y-6 left-0 w-px bg-[linear-gradient(180deg,transparent,rgba(22,35,56,0.08),transparent)] xl:left-2" />
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
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`min-w-0 py-2 md:px-6 md:py-0 ${
        index > 0 ? "md:border-l md:border-[color:var(--border)]" : ""
      }`}
    >
      <p className="text-balance break-words font-serif text-base leading-[1.12] text-[color:var(--ink)] md:text-[1.18rem]">
        {title}
      </p>
      <p className="mt-2 max-w-xs text-[13px] leading-5 text-[color:var(--ink-soft)] md:text-sm md:leading-6">
        {description}
      </p>
    </div>
  );
}
