import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SubgalleryCarousel } from "@/components/subgallery-carousel";
import { Button } from "@/components/ui/button";
import { demoGalleries } from "@/lib/demo-data";

const previewGallery = demoGalleries[0];

export default function HomePage() {
  return (
    <AppShell accent="immersive">
      <section className="grid gap-6 border-b border-[color:var(--border)] pb-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:pb-10">
        <div className="flex flex-col justify-between gap-10 border border-[color:var(--border)] bg-[rgba(255,255,255,0.76)] p-6 md:p-8">
          <div className="space-y-6">
            <p className="text-[11px] uppercase tracking-[0.34em] text-[color:var(--ink-faint)]">
              Structured Memory System
            </p>
            <h1 className="max-w-4xl font-serif text-4xl leading-[0.94] text-[color:var(--ink)] sm:text-5xl md:text-6xl xl:text-[5.6rem]">
              A precise way to compose memories with scenes, place, and narrative.
            </h1>
            <p className="max-w-xl text-base leading-8 text-[color:var(--ink-soft)]">
              Memora is not a camera roll. It is a modern archive for moments that deserve a sharper structure: one gallery for the whole chapter, then subgalleries for the scenes inside it.
            </p>
          </div>

          <div className="grid gap-5 border-t border-[color:var(--border)] pt-6 md:grid-cols-[1fr_auto] md:items-end">
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Gallery" value={previewGallery.title} />
              <Metric label="Scenes" value={`${previewGallery.subgalleries.length}`} />
              <Metric label="Locations" value={previewGallery.locations.join(" / ")} />
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button asChild>
                <Link href="/galleries">
                  Explore demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/galleries/new">Create gallery</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
          <div className="relative min-h-[24rem] overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)] sm:min-h-[31rem]">
            <Image
              src={previewGallery.coverImage}
              alt={previewGallery.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 42vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,15,26,0.88)] via-[rgba(7,15,26,0.28)] to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 grid gap-4 border-t border-white/14 bg-[rgba(7,15,26,0.36)] p-5 backdrop-blur-sm md:grid-cols-[1fr_auto] md:items-end md:p-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/56">
                  Featured gallery
                </p>
                <h2 className="mt-3 font-serif text-3xl leading-tight text-white sm:text-4xl md:text-5xl">
                  {previewGallery.title}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78">
                  {previewGallery.description}
                </p>
              </div>
              <Link
                href="/galleries"
                className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
              >
                Open archive
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <aside className="grid gap-px border border-[color:var(--border)] bg-[color:var(--border)]">
            <InfoPanel
              label="Core model"
              value="Gallery > subgallery > photographs"
              description="Designed around hierarchy, not endless feed logic."
            />
            <InfoPanel
              label="Subgalleries"
              value="Each scene keeps title, place, date, and text."
              description="Memories remain legible because every part has its own frame."
            />
            <InfoPanel
              label="Tone"
              value="Modern, controlled, archival."
              description="Closer to a premium digital gallery than a journaling app."
            />
          </aside>
        </div>
      </section>

      <section className="grid gap-6 py-10 xl:grid-cols-[minmax(20rem,0.72fr)_minmax(0,1.28fr)]">
        <div className="flex flex-col justify-between gap-8 border border-[color:var(--border)] bg-[rgba(246,249,252,0.72)] p-6 md:p-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-[color:var(--ink-faint)]">
              Primary interaction
            </p>
            <h2 className="mt-4 font-serif text-3xl leading-tight text-[color:var(--ink)] sm:text-4xl md:text-5xl">
              Browse scenes horizontally, like a controlled visual sequence.
            </h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-[color:var(--ink-soft)]">
            <p>
              The subgallery system is the core of Memora. It gives a trip or life chapter internal structure, so each place carries its own image, location, date, and story.
            </p>
            <p>
              The motion is meant to feel direct and premium: drag on desktop, swipe on mobile, and move through the memory with a strong sense of order.
            </p>
          </div>
        </div>

        <div className="overflow-hidden bg-[rgba(8,16,28,0.98)] p-4 md:p-6">
          <SubgalleryCarousel
            galleryId={previewGallery.id}
            subgalleries={previewGallery.subgalleries}
            eyebrow="Switzerland & Northern Italy"
            title="Subgalleries"
            description="Large scene cards with immediate visual weight and clear place-based metadata."
          />
        </div>
      </section>

      <section className="grid gap-6 border-t border-[color:var(--border)] py-10 lg:grid-cols-3">
        <StatementCard
          title="Not a feed"
          description="Memora avoids the flattening effect of continuous photo streams by giving each memory chapter a defined structure."
        />
        <StatementCard
          title="Not generic storage"
          description="The point is not to upload assets. The point is to compose a revisitable archive with visual and narrative clarity."
        />
        <StatementCard
          title="Built to feel expensive"
          description="Sharper geometry, colder contrast, stronger type, and a more architectural layout make the product feel deliberate from the first screen."
        />
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-[11px] uppercase tracking-[0.26em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="break-words text-sm leading-6 text-[color:var(--ink)]">{value}</p>
    </div>
  );
}

function InfoPanel({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="min-w-0 bg-[rgba(245,248,252,0.96)] p-6">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="mt-4 text-balance break-words font-serif text-2xl leading-tight text-[color:var(--ink)] md:text-3xl">
        {value}
      </p>
      <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">{description}</p>
    </div>
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
    <div className="border border-[color:var(--border)] bg-[rgba(255,255,255,0.78)] p-6">
      <h3 className="font-serif text-3xl text-[color:var(--ink)]">{title}</h3>
      <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">{description}</p>
    </div>
  );
}
