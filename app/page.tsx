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
      <section className="flex flex-col gap-4 border-b border-[color:var(--border)] pb-5 lg:pb-6">
        <div className="border border-[color:var(--border)] bg-[rgba(255,255,255,0.76)] p-4 md:p-5">
          <p className="text-[10px] uppercase tracking-[0.34em] text-[color:var(--ink-faint)] sm:text-xs">
            Curated galleries, meaningful descriptions
          </p>
          <h1 className="mt-2 w-full font-serif text-2xl leading-[0.94] text-[color:var(--ink)] sm:text-3xl md:text-3xl lg:text-4xl">
            An intentional way to share and keep your memories
          </h1>
          <div className="mt-4">
            <Button asChild>
              <Link href="/galleries">
                Explore demo
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatementCard
            label="Principle"
            title="Not a feed"
            description="Memora avoids the flattening effect of continuous photo streams by giving each memory chapter a defined structure."
          />
          <StatementCard
            label="Principle"
            title="Not generic storage"
            description="The point is not to dump photos. The point is to compose a revisitable archive with visual and narrative clarity."
          />
          <StatementCard
            label="Principle"
            title="Built to share and revisit"
            description="Share and record your experiences with more intimacy and care."
          />
        </div>
      </section>

      <section className="grid gap-4 py-6 xl:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)]">
        <div className="flex flex-col justify-between gap-5 border border-[color:var(--border)] bg-[rgba(246,249,252,0.72)] p-4 md:p-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.34em] text-[color:var(--ink-faint)]">
              Primary interaction
            </p>
            <h2 className="mt-2 font-serif text-xl leading-tight text-[color:var(--ink)] sm:text-2xl md:text-3xl">
              Browse scenes horizontally, like a controlled visual sequence.
            </h2>
          </div>
          <div className="space-y-2 text-xs leading-6 text-[color:var(--ink-soft)]">
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
          />
        </div>
      </section>
    </AppShell>
  );
}

function StatementCard({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="min-w-0 border border-[color:var(--border)] bg-[rgba(245,248,252,0.96)] p-4 transition-transform duration-200 ease-out hover:scale-[1.02] hover:shadow-lg sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="mt-2 text-balance break-words font-serif text-lg leading-tight text-[color:var(--ink)] md:text-xl">
        {title}
      </p>
      <p className="mt-2 text-xs leading-6 text-[color:var(--ink-soft)]">{description}</p>
    </div>
  );
}
