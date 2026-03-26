"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { HomeGalleryReveal } from "@/components/home-gallery-reveal";
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
      <section className="relative flex min-h-[calc(100svh-72px)] items-center border-b border-[color:var(--border)] py-10 md:py-12">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center">
          <p className="text-center text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-faint)] sm:text-xs">
            Curated galleries, meaningful descriptions
          </p>
          <h1 className="mt-4 max-w-[24ch] text-center font-serif text-[2rem] leading-[0.95] text-[color:var(--ink)] sm:text-[2.45rem] md:max-w-[22ch] md:text-[3rem] lg:max-w-[21ch] lg:text-[3.55rem]">
            An intentional platform to organize, revisit, and share your experiences
          </h1>
          <p className="mt-5 max-w-2xl text-center text-sm leading-7 text-[color:var(--ink-soft)] md:text-[15px]">
            Memora brings structure, place, and story back to the memories worth preserving.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild>
              <Link href="/demo/create">
                Explore demo
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="mt-12 grid w-full grid-cols-1 gap-5 md:mt-16 md:grid-cols-3 md:gap-0">
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
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,rgba(238,243,248,0.7))]" />
        <div className="pointer-events-none absolute bottom-5 left-1/2 h-8 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(140,154,171,0),rgba(140,154,171,0.52),rgba(140,154,171,0))]" />
      </section>

      <section className="bg-[linear-gradient(180deg,rgba(241,246,251,0.44),rgba(244,248,252,0.9))]">
        <HomeGalleryReveal gallery={previewGallery} />
      </section>

      <section className="bg-[linear-gradient(180deg,rgba(244,248,252,0.9),rgba(245,248,252,1))] py-10 md:py-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Creators Note
          </p>
          <h2 className="mt-3 text-center font-serif text-2xl leading-[1.08] text-[color:var(--ink)] sm:text-3xl md:text-[2.5rem]">
            About the product
          </h2>
          <div className="mt-7 space-y-5 text-[15px] leading-7 text-[color:var(--ink-soft)] md:text-[15px] md:leading-7">
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
