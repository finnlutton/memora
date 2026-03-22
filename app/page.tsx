import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers3, LibraryBig, Sparkles, Waypoints } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { demoGalleries } from "@/lib/demo-data";

const previewGallery = demoGalleries[0];

export default function HomePage() {
  return (
    <AppShell accent="immersive">
      <section className="grid gap-10 pb-10 pt-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-7">
          <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
            A photo-memory atelier
          </p>
          <div className="space-y-5">
            <h1 className="max-w-3xl font-serif text-6xl leading-[0.92] text-[color:var(--ink)] md:text-7xl">
              Memora
            </h1>
            <p className="max-w-2xl text-xl leading-9 text-[color:var(--ink-soft)]">
              A more intentional home for the moments that matter.
            </p>
            <p className="max-w-2xl text-base leading-8 text-[color:var(--ink-soft)]">
              Build elegant galleries for a trip, season, event, or chapter of life. Then shape each one into subgalleries with photographs, narrative, and a sense of place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="px-5 py-3">
              <Link href="/galleries/new">
                Create a Gallery
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="px-5 py-3">
              <Link href="/galleries">Explore Demo</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FeaturePill icon={LibraryBig} label="Structured galleries" />
            <FeaturePill icon={Layers3} label="Subgallery chapters" />
            <FeaturePill icon={Sparkles} label="Story-first browsing" />
          </div>
        </div>
        <div className="relative">
          <div className="absolute -right-4 -top-6 hidden rounded-full border border-white/50 bg-white/75 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[color:var(--ink-faint)] shadow-[0_12px_34px_rgba(34,49,71,0.08)] md:block">
            Memory, not storage
          </div>
          <div className="overflow-hidden rounded-[2.75rem] border border-white/60 bg-white/74 p-4 shadow-[0_28px_90px_rgba(32,46,66,0.12)] backdrop-blur">
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative min-h-[28rem] overflow-hidden rounded-[2rem]">
                <Image
                  src={previewGallery.coverImage}
                  alt={previewGallery.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 30vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,20,32,0.78)] to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/70">Preview gallery</p>
                  <h2 className="mt-2 font-serif text-4xl">{previewGallery.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-white/84">{previewGallery.description}</p>
                </div>
              </div>
              <div className="space-y-3">
                {previewGallery.subgalleries.map((subgallery) => (
                  <div
                    key={subgallery.id}
                    className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--paper)] p-4"
                  >
                    <div className="flex gap-4">
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[1.25rem]">
                        <Image
                          src={subgallery.coverImage}
                          alt={subgallery.title}
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-serif text-2xl text-[color:var(--ink)]">
                          {subgallery.title}
                        </h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                          {subgallery.location} • {subgallery.dateLabel}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                          {subgallery.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 py-10 md:grid-cols-2 xl:grid-cols-4">
        <ConceptCard
          icon={LibraryBig}
          title="Galleries"
          description="Shape a broader memory like a trip, season, relationship chapter, or long weekend."
        />
        <ConceptCard
          icon={Layers3}
          title="Subgalleries"
          description="Break it into meaningful moments, places, or days so the memory has a natural rhythm."
        />
        <ConceptCard
          icon={Waypoints}
          title="Stories"
          description="Descriptions and captions matter here, turning images into a visual journal instead of a dump."
        />
        <ConceptCard
          icon={Sparkles}
          title="Shareable keepsakes"
          description="Create something elegant enough to revisit and gentle enough to share with the right people."
        />
      </section>

      <section className="grid gap-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2.5rem] border border-white/60 bg-white/74 p-7 shadow-[0_22px_70px_rgba(34,49,71,0.09)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Why Memora
          </p>
          <h2 className="mt-3 font-serif text-4xl text-[color:var(--ink)]">
            Better than a chaotic camera roll
          </h2>
          <p className="mt-4 text-base leading-8 text-[color:var(--ink-soft)]">
            Camera rolls flatten everything into one endless stream. Memora gives memories shape: a beginning, distinct scenes, descriptions, and a visual tone that invites reflection instead of scrolling fatigue.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ComparisonTile
            title="Typical photo storage"
            items={["Endless feeds", "Missing context", "No sense of chapter", "Hard to revisit emotionally"]}
            muted
          />
          <ComparisonTile
            title="Memora"
            items={["Curated galleries", "Subgalleries with place and date", "Narrative descriptions", "Designed to feel revisitable"]}
          />
        </div>
      </section>
    </AppShell>
  );
}

function FeaturePill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="rounded-full border border-white/60 bg-white/70 px-4 py-3 text-sm text-[color:var(--ink-soft)] shadow-[0_12px_28px_rgba(34,49,71,0.06)] backdrop-blur">
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-[color:var(--accent)]" />
        {label}
      </span>
    </div>
  );
}

function ConceptCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/60 bg-white/74 p-6 shadow-[0_20px_60px_rgba(34,49,71,0.08)] backdrop-blur">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--paper)] text-[color:var(--accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 font-serif text-3xl text-[color:var(--ink)]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">{description}</p>
    </div>
  );
}

function ComparisonTile({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: string[];
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-[2rem] border p-6 ${
        muted
          ? "border-[color:var(--border)] bg-[rgba(255,255,255,0.56)]"
          : "border-white/60 bg-[color:var(--paper)]"
      }`}
    >
      <h3 className="font-serif text-3xl text-[color:var(--ink)]">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--ink-soft)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
