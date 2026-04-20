"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown } from "lucide-react";

type HomeHeroProps = {
  /** Where the primary CTA points — computed by AppShell based on auth state. */
  createHref: string;
  /** DOM id of the reveal section the secondary CTA scrolls to. */
  revealTargetId: string;
  /** Image src path — full-bleed background photograph. */
  imageSrc: string;
  /** Human-readable caption shown bottom-right as authenticity signal. */
  caption: string;
};

/**
 * Home hero — a single photograph carrying the page's emotional premise.
 *
 * Architectural notes:
 * - AppShell wraps home in a max-w-7xl padded <main>. To escape that clamp
 *   we use the classic full-bleed technique (100vw + centered negative margins)
 *   rather than refactoring AppShell, which is shared with many routes.
 * - No border, no card, no vignette ring. The photograph itself is the hero.
 * - Overlay type sits bottom-left with a bottom-up gradient scrim for legibility.
 *   Caption sits bottom-right so it never competes with the headline stack.
 * - Primary CTA commits (sign-up / workspace), secondary CTA scrolls to the
 *   live reveal demo so skeptical visitors can "see it" without signing up.
 */
export function HomeHero({
  createHref,
  revealTargetId,
  imageSrc,
  caption,
}: HomeHeroProps) {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden"
    >
      {/* Stage height: full viewport minus the sticky header (72 md / 56 mobile). */}
      <div className="relative h-[calc(100svh-56px)] min-h-[520px] w-full md:h-[calc(100svh-72px)] md:min-h-[640px]">
        <Image
          src={imageSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        {/* Bottom-weighted scrim — carries overlay type without darkening the sky. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,12,22,0)_0%,rgba(6,12,22,0)_38%,rgba(6,12,22,0.28)_62%,rgba(6,12,22,0.72)_100%)]"
        />

        {/* Overlay type — bottom-left, breathing room from edges. */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-10 md:px-12 md:pb-16 lg:px-16 lg:pb-20">
          <div className="max-w-[44rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70">
              An archive, not a feed
            </p>
            <h1
              id="home-hero-title"
              className="mt-4 font-serif text-[44px] leading-[0.94] text-white md:mt-5 md:text-[76px] lg:text-[88px]"
            >
              The trips you&apos;ll want to re&#8209;read.
            </h1>
            <p className="mt-5 max-w-[32rem] text-[14px] leading-6 text-white/82 md:mt-6 md:text-[15px] md:leading-7">
              Memora is a quiet place to organize, revisit, and share the memories
              worth keeping — like this one: Switzerland &amp; Northern Italy, February 2026.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3 md:mt-9 md:gap-4">
              <Link
                href={createHref}
                className="inline-flex h-11 items-center justify-center gap-1.5 bg-white px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)] md:h-12 md:px-6 md:text-[12px]"
              >
                Start your archive
              </Link>
              <a
                href={`#${revealTargetId}`}
                onClick={(event) => {
                  event.preventDefault();
                  const target = document.getElementById(revealTargetId);
                  if (!target) return;
                  target.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="inline-flex h-11 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/82 transition hover:text-white md:h-12 md:text-[12px]"
              >
                See a real gallery
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.8} />
              </a>
            </div>
          </div>
        </div>

        {/* Authenticity caption — bottom-right, quiet. */}
        <div className="pointer-events-none absolute bottom-6 right-5 hidden max-w-[14rem] text-right md:block md:bottom-8 md:right-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/62">
            Cover
          </p>
          <p className="mt-1 text-[11px] leading-snug text-white/78">{caption}</p>
        </div>
      </div>
    </section>
  );
}
