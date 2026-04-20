"use client";

import Image from "next/image";
import Link from "next/link";

type HomeCloserProps = {
  createHref: string;
  imageSrc: string;
  imageCaption: string;
};

/**
 * End-of-page mood beat.
 *
 * Replaces the previous ContactUsBox footer. A single photograph, a one-line
 * caption, and a pair of quiet links (primary CTA + contact email). The page
 * closes on feeling, not a form — consistent with the editorial direction.
 *
 * Full-bleed via the same 100vw trick used in HomeHero so the image escapes
 * the shared max-w-7xl main wrapper in AppShell.
 */
export function HomeCloser({ createHref, imageSrc, imageCaption }: HomeCloserProps) {
  return (
    <section
      aria-labelledby="home-closer-title"
      className="relative left-1/2 right-1/2 mt-16 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden md:mt-24"
    >
      <div className="relative h-[68svh] min-h-[420px] w-full md:h-[78svh] md:min-h-[560px]">
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,12,22,0)_0%,rgba(6,12,22,0)_42%,rgba(6,12,22,0.32)_72%,rgba(6,12,22,0.74)_100%)]"
        />

        <div className="absolute inset-x-0 bottom-0 px-5 pb-10 md:px-12 md:pb-16 lg:px-16 lg:pb-20">
          <div className="max-w-[40rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70">
              Begin
            </p>
            <h2
              id="home-closer-title"
              className="mt-4 font-serif text-[34px] leading-[0.98] text-white md:mt-5 md:text-[52px]"
            >
              Your next one is waiting to be remembered.
            </h2>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 md:mt-8">
              <Link
                href={createHref}
                className="inline-flex h-11 items-center justify-center bg-white px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)] md:h-12 md:px-6 md:text-[12px]"
              >
                Start your archive
              </Link>
              <a
                href="mailto:hello@memora.app"
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/82 underline decoration-white/30 underline-offset-[6px] transition hover:text-white hover:decoration-white/70 md:text-[12px]"
              >
                hello@memora.app
              </a>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-6 right-5 hidden max-w-[14rem] text-right md:block md:bottom-8 md:right-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/62">
            Scene
          </p>
          <p className="mt-1 text-[11px] leading-snug text-white/78">{imageCaption}</p>
        </div>
      </div>
    </section>
  );
}
