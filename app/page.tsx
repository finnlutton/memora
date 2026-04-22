"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { HomeGalleryReveal } from "@/components/home-gallery-reveal";
import { HomeHero } from "@/components/home-hero";
import { HomeMemoryGlobe } from "@/components/home-memory-globe";
import { HomeShareDemo } from "@/components/home-share-demo";
import { HomeCloser } from "@/components/home-closer";
import { useMemoraStore } from "@/hooks/use-memora-store";

const HERO_IMAGE = "/demo/winter-olympics-2026/New_Hero.JPG";
const HERO_CAPTION = "Switzerland & Northern Italy, February 2026";

const CLOSER_IMAGE = "/demo/winter-olympics-2026/Bottom_Hero.JPG";
const CLOSER_CAPTION = "Livigno — snowboard cross gold medal, February 2026";

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
        className="mx-auto flex max-w-5xl flex-col items-end px-4 py-24 md:py-32"
      >
        <div className="max-w-[38rem] text-right">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">
            The intent
          </p>
          <p className="mt-5 font-serif text-[28px] leading-[1.18] text-[color:var(--ink)] md:text-[34px] md:leading-[1.14]">
            Our camera rolls are cluttered, lack our written voices, and make curated sharing impossible. Memora solves this by providing intuitive sharing to more personal memories.
          </p>
        </div>
      </section>

      <section
        id={REVEAL_TARGET_ID}
        className="mx-auto w-full max-w-7xl px-4 py-24 md:px-6 md:py-32"
      >
        <HomeGalleryReveal />
      </section>

      {/*
        Memory globe — marketing demo. Full-bleed dark section so the globe
        reads as a cinematic object rather than a UI widget. Intentionally
        distinct from the production map (components/WorldGlobe.tsx). Edges
        fade softly into the surrounding light page instead of being cut
        with hairlines, so the scroll feels like one continuous document.
      */}
      <section
        aria-label="Memora Map"
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,rgba(44,72,116,0.58)_0%,rgba(20,32,54,0.92)_52%,rgba(14,22,38,1)_100%)]"
      >
        {/* Soft lower wash so the edges don't crush to black */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(60,86,130,0.22)_0%,transparent_55%)]"
        />
        {/* Feathered top/bottom edges — a gentle handoff to the light
            sections above and below. No hairline rule. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[var(--gradient-end)]/14 to-transparent md:h-24"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--gradient-end)]/14 to-transparent md:h-24"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-24 md:px-6 md:py-32">
          <HomeMemoryGlobe />
        </div>
      </section>

      {/*
        Share demo — scripted interactive demonstration of the sharing flow.
      */}
      <section
        aria-label="Sharing a gallery"
        className="mx-auto w-full max-w-7xl px-4 py-24 md:px-6 md:py-32"
      >
        <HomeShareDemo />
      </section>

      {/*
        Creator's note — retained from the earlier draft, condensed and
        left-aligned under a quiet eyebrow. No centered stack, no card.
      */}
      <section
        id="about-product"
        aria-label="Creator's note"
        className="mx-auto max-w-3xl px-4 py-24 md:py-32"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">
          Creator&apos;s note
        </p>
        <h2 className="mt-5 font-serif text-[30px] leading-[1.08] text-[color:var(--ink)] md:text-[40px]">
          Why this exists.
        </h2>
        <div className="mt-7 space-y-5 text-[15px] leading-7 text-[color:var(--ink-soft)]">
          <p>
            Like many who have studied abroad, it&apos;s allowed me to travel far more than any period prior. Expecting this, I invested in a camera before leaving the U.S., hoping to separate photo taking from the distractions of my phone (highly recommended).
          </p>
          <p>
            However, I soon found it impossible to update each of my circles of friends — as well as my immediate family, grandparents, and extended family, by sifting through my camera roll and sd card just to send separate messages, with different photos, and lacking the personal detail I&apos;d like.
          </p>
          <p>
            While many look to social media for this outlet, I&apos;ve found it incredibly insufficient. Ads, algorithms, likes, and comments have drawn the authenticity from your experiences and have crumbled the intent of social media.
          </p>
          <p>
            Memora returns the authenticity, reflection, and meaning that your memories deserve.
          </p>
          <p>
            I can confidently say that as a platform we will grow with you, not stunt you.
          </p>
          <p>
            It&apos;s early stages for Memora, but so is it for you.
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
