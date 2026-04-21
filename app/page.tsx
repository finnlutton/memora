"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { HomeGalleryReveal } from "@/components/home-gallery-reveal";
import { HomeHero } from "@/components/home-hero";
import { HomeCloser } from "@/components/home-closer";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { demoGalleries } from "@/lib/demo-data";

const previewGallery = demoGalleries[0];

const HERO_IMAGE = "/demo/winter-olympics-2026/cover-2026.jpg";
const HERO_CAPTION = "Switzerland & Northern Italy, February 2026";

const CLOSER_IMAGE = "/demo/winter-olympics-2026/lake-como.png";
const CLOSER_CAPTION = "Lake Como, final afternoon";

const REVEAL_TARGET_ID = "home-gallery-demo";

/**
 * Home page.
 *
 * Reading sequence (intentional, each beat answers a different question):
 *   1. Hero photograph       — what does a memory in Memora feel like?
 *   2. Editorial promise     — what makes it different from a camera roll?
 *   3. Live gallery reveal   — what does it actually do?
 *   4. Creator's note        — why does it exist?
 *   5. Closer photograph     — invitation.
 *
 * The primary CTA ("Start your archive") resolves to the sign-up flow for
 * unauthenticated users and to the workspace for authenticated ones; see
 * AppShell for the exact computation, mirrored via createHref.
 */
export default function HomePage() {
  const router = useRouter();
  const { hydrated, onboarding, getNextOnboardingRoute } = useMemoraStore();

  useEffect(() => {
    if (!hydrated || !onboarding.isAuthenticated) {
      return;
    }
    router.replace(getNextOnboardingRoute());
  }, [getNextOnboardingRoute, hydrated, onboarding.isAuthenticated, router]);

  useEffect(() => {
    if (!hydrated || onboarding.isAuthenticated) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [hydrated, onboarding.isAuthenticated]);

  if (hydrated && onboarding.isAuthenticated) {
    return null;
  }

  const createHref = onboarding.isAuthenticated
    ? onboarding.onboardingComplete
      ? "/galleries/new"
      : getNextOnboardingRoute()
    : "/auth?mode=signup";

  return (
    <AppShell accent="immersive">
      <HomeHero
        createHref={createHref}
        revealTargetId={REVEAL_TARGET_ID}
        imageSrc={HERO_IMAGE}
        caption={HERO_CAPTION}
      />

      {/*
        Editorial promise — single sentence, right-aligned asymmetry so it
        doesn't read as a banner. Positive framing of what Memora IS:
        storage, organization, private sharing — done intentionally.
      */}
      <section
        aria-label="What Memora is for"
        className="mx-auto flex max-w-5xl flex-col items-end px-4 py-20 md:py-28"
      >
        <div className="max-w-[38rem] text-right">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">
            The intent
          </p>
          <p className="mt-5 font-serif text-[28px] leading-[1.18] text-[color:var(--ink)] md:text-[34px] md:leading-[1.14]">
            The camera roll holds everything. The feed holds what performs. Memora is where you keep what matters — in your own words, for the handful of people you&apos;d read it out loud to.
          </p>
        </div>
      </section>

      <section id={REVEAL_TARGET_ID} className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <HomeGalleryReveal gallery={previewGallery} />
      </section>

      {/*
        Creator's note — retained from the earlier draft, condensed and
        left-aligned under a quiet eyebrow. No centered stack, no card.
      */}
      <section
        id="about-product"
        aria-label="Creator's note"
        className="mx-auto max-w-3xl px-4 py-20 md:py-28"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">
          Creator&apos;s note
        </p>
        <h2 className="mt-5 font-serif text-[30px] leading-[1.08] text-[color:var(--ink)] md:text-[40px]">
          Why this exists.
        </h2>
        <div className="mt-7 space-y-5 text-[15px] leading-7 text-[color:var(--ink-soft)]">
          <p>
            After months abroad, my camera roll had everything and nothing — thousands of photographs, no order, no words, no way to hand a friend a trip and say &ldquo;here, read it.&rdquo;
          </p>
          <p>
            The pictures deserved more than a scroll. The trips deserved more than a post. What I wanted was somewhere to store them properly — paired with what actually happened, organized by the places they passed through, and shared only with the people who were there.
          </p>
          <p>
            Memora is that place. A quieter, more intentional home for the memories worth keeping, built so you&apos;ll still want to open them in ten years.
          </p>
        </div>
      </section>

      <HomeCloser
        createHref={createHref}
        imageSrc={CLOSER_IMAGE}
        imageCaption={CLOSER_CAPTION}
      />
    </AppShell>
  );
}
