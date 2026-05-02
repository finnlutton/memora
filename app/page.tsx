"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { HomeGalleryReveal } from "@/components/home-gallery-reveal";
import { HomeHero } from "@/components/home-hero";
import { HomeMemoryGlobe } from "@/components/home-memory-globe";
import { HomeShareDemo } from "@/components/home-share-demo";
import { HomeCloser } from "@/components/home-closer";
import { SiteFooter } from "@/components/site-footer";
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
          <p className="text-[11px] font-medium text-[color:var(--ink)] uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">
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
        Memory globe — stays on the site's normal paper. Section break is
        a faint radial glow behind the globe; no hairline rule, since the
        partial-width inset-x-4 line read as cropping the layout.
      */}
      <section
        aria-label="Memora Map"
        className="relative mx-auto w-full max-w-7xl px-4 py-24 md:px-6 md:py-32"
      >
        {/* Full-bleed so the radial fade dissolves into the page bg
            instead of clipping at the max-w-7xl right edge. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-full w-screen -translate-x-1/2 bg-[radial-gradient(ellipse_at_60%_50%,rgba(120,150,195,0.10)_0%,transparent_55%)]"
        />
        <HomeMemoryGlobe />
      </section>

      {/*
        Share demo — full-bleed flat navy surface. The inner demo is white,
        so the contrast reads as an editorial spread: the page body for the
        heading, a navy plate for the showpiece. Edges feather softly so
        the transition from the light globe section doesn't feel cut.
      */}
      <section
        aria-label="Sharing a gallery"
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden bg-[linear-gradient(180deg,#121c33_0%,#0f1930_55%,#0c1528_100%)]"
      >
        {/* Subtle cool highlight near the top to give the flat navy a
            faint atmospheric depth without competing with the demo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(ellipse_at_top,rgba(70,104,156,0.18)_0%,transparent_65%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/10 to-transparent md:h-24"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent md:h-24"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-24 md:px-6 md:py-32">
          <HomeShareDemo />
        </div>
      </section>

      {/*
        Creator's note — editorial two-column spread: a narrow title column
        on the left (eyebrow, heading, dateline), a letter-style body on
        the right with a drop cap, a centered pull quote that lands on the
        emotional pivot, and a set-apart italic closing line.
      */}
      <section
        id="about-product"
        aria-label="Creator's note"
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden bg-[color:var(--background)] px-4 py-24 md:py-32"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-[0.85fr_1.6fr] md:gap-16">
          <div className="md:pr-2">
            <p className="text-[11px] font-medium text-[color:var(--ink)] uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">
              Creator&apos;s note
            </p>
            <h2 className="mt-5 font-serif text-[32px] leading-[1.04] text-[color:var(--ink)] md:text-[46px]">
              Why this exists.
            </h2>
          </div>

          <div className="space-y-5 text-[15px] leading-7 text-[color:var(--ink-soft)]">
            <p className="first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-serif first-letter:text-[58px] first-letter:leading-[0.85] first-letter:text-[color:var(--ink)]">
              Like many who have studied abroad, it&apos;s allowed me to travel far more than ever before. Expecting this, I invested in a camera before leaving the U.S., hoping to separate photo taking from the distractions of my phone (highly recommended).
            </p>
            <p>
              However, I soon found it impossible to properly update the people I care about. For each trip, I&apos;d sift through my camera roll, sd card, and send separate messages via different apps, always lacking the personal detail I&apos;d like. Oftentimes, I wouldn&apos;t take the time to send anything at all.
            </p>
            <p>
              While many look to social media for this outlet, I&apos;ve found it insufficient. Ads, algorithms, likes, and comments have drawn the authenticity from your experiences and have crumbled its original intent.
            </p>
            <p>
              Memora provides much-needed solutions to these problems. It does this by providing a <span className="font-medium text-[color:var(--ink)]">quiet</span> space for you to organize your photos, add layers of written reflection, and share them with anyone <span className="font-medium text-[color:var(--ink)]">in less than a minute</span>. By encouraging thoughtfulness, we hope to fundamentally change how one organizes, shares, and remembers their experiences.
            </p>

            <p className="!mt-8 border-t border-[color:var(--border)] pt-6 font-serif text-[17px] italic leading-[1.5] text-[color:var(--ink)] md:text-[18px]">
              It&apos;s early stages for Memora, but so is it for you.
            </p>
          </div>
        </div>
      </section>

      <HomeCloser
        createHref={createHref}
        imageSrc={CLOSER_IMAGE}
        imageCaption={CLOSER_CAPTION}
      />

      <SiteFooter />
    </AppShell>
  );
}
