import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SubgalleryCarousel } from "@/components/subgallery-carousel";
import { Button } from "@/components/ui/button";
import { demoGalleries } from "@/lib/demo-data";

const previewGallery = demoGalleries[0];

export default function HomePage() {
  return (
    <AppShell accent="immersive">
      <section className="relative -mx-5 -mt-8 overflow-hidden px-5 pb-14 pt-12 md:-mx-8 md:px-8 md:pb-18 md:pt-18">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,225,237,0.9),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(235,226,212,0.76),transparent_24%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
              Memory composition, not photo storage
            </p>
            <h1 className="max-w-5xl font-serif text-6xl leading-[0.92] text-[color:var(--ink)] md:text-7xl xl:text-[6.4rem]">
              Step directly into a memory, and let each place unfold like a chapter.
            </h1>
          </div>
          <div className="lg:justify-self-end">
            <p className="max-w-md text-base leading-8 text-[color:var(--ink-soft)]">
              Memora is a quiet home for galleries with shape: one broad memory for the journey, and cinematic subgalleries for each scene, place, and feeling inside it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="px-5 py-3">
                <Link href="/galleries">
                  Enter the gallery
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="px-3 py-3">
                <Link href="/galleries/new">Compose your own</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-10 pb-8">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="relative min-h-[35rem] overflow-hidden rounded-[2.8rem] border border-white/35 shadow-[0_40px_120px_rgba(21,34,50,0.18)]">
            <Image
              src={previewGallery.coverImage}
              alt={previewGallery.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,13,22,0.84)] via-[rgba(7,13,22,0.24)] to-[rgba(7,13,22,0.04)]" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white md:p-10">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">
                Featured gallery
              </p>
              <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-tight md:text-6xl">
                {previewGallery.title}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/82 md:text-base md:leading-8">
                {previewGallery.description}
              </p>
            </div>
          </div>

          <div className="space-y-8 rounded-[2.5rem] border border-white/30 bg-[rgba(248,246,241,0.58)] p-7 shadow-[0_20px_70px_rgba(21,34,50,0.08)] backdrop-blur">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                The gallery has a spine
              </p>
              <p className="mt-4 font-serif text-3xl leading-tight text-[color:var(--ink)]">
                One broader memory, then smaller scenes with place, date, atmosphere, and story.
              </p>
            </div>
            <div className="space-y-5 text-[color:var(--ink-soft)]">
              <StoryLine
                title="Gallery"
                description="A whole trip, season, or chapter of life. The larger emotional frame that holds everything together."
              />
              <StoryLine
                title="Subgallery"
                description="A day, a town, a train ride, a sunset, a room, a feeling worth giving its own page."
              />
              <StoryLine
                title="Narrative"
                description="Descriptions matter, because revisiting a memory should feel like opening a keepsake rather than sorting files."
              />
            </div>
          </div>
        </div>

        <SubgalleryCarousel
          galleryId={previewGallery.id}
          subgalleries={previewGallery.subgalleries}
          eyebrow="Browse the Switzerland chapters"
          title="Each subgallery is treated like a scene you can return to."
          description="Drag, swipe, or scroll through the journey. The motion should feel like moving across a row of printed memories, with space to notice the place and the story."
        />
      </section>

      <section className="grid gap-6 py-10 lg:grid-cols-[0.86fr_1.14fr]">
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
            Why it feels different
          </p>
          <h2 className="font-serif text-4xl leading-tight text-[color:var(--ink)] md:text-5xl">
            This is a place for preservation, reflection, and return.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <QuietPanel
            title="Structured by memory"
            description="Trips, seasons, and life chapters stay legible instead of dissolving into one endless stream."
          />
          <QuietPanel
            title="Centered on place"
            description="Every subgallery keeps its own title, location, date, and narrative weight."
          />
          <QuietPanel
            title="Designed to revisit"
            description="The interface is calm, spacious, and emotional rather than administrative."
          />
        </div>
      </section>
    </AppShell>
  );
}

function StoryLine({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-l border-[color:var(--border-strong)] pl-4">
      <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-7">{description}</p>
    </div>
  );
}

function QuietPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/30 bg-[rgba(255,255,255,0.46)] p-6 backdrop-blur">
      <h3 className="font-serif text-3xl text-[color:var(--ink)]">{title}</h3>
      <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">{description}</p>
    </div>
  );
}
