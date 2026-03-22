import Image from "next/image";
import Link from "next/link";
import { PenLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateRange } from "@/lib/utils";
import { MetadataRow } from "@/components/metadata-row";
import { TagList } from "@/components/tag-list";
import type { Gallery } from "@/types/memora";

export function GalleryHero({ gallery }: { gallery: Gallery }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative min-h-[22rem] overflow-hidden rounded-[2.5rem] border border-white/60 shadow-[0_28px_90px_rgba(27,42,60,0.16)]">
        <Image
          src={gallery.coverImage}
          alt={gallery.title}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 55vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,22,34,0.8)] via-[rgba(13,22,34,0.2)] to-transparent" />
      </div>
      <div className="flex flex-col justify-between rounded-[2.5rem] border border-white/60 bg-white/72 p-7 shadow-[0_22px_70px_rgba(34,49,71,0.1)] backdrop-blur">
        <div className="space-y-5">
          <p className="text-xs uppercase tracking-[0.26em] text-[color:var(--ink-faint)]">
            Gallery Journal
          </p>
          <div>
            <h1 className="max-w-2xl font-serif text-4xl leading-tight text-[color:var(--ink)] md:text-5xl">
              {gallery.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[color:var(--ink-soft)]">
              {gallery.description}
            </p>
          </div>
          <MetadataRow
            date={formatDateRange(gallery.startDate, gallery.endDate)}
            locations={gallery.locations}
            people={gallery.people}
          />
          <TagList items={gallery.moodTags} />
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/galleries/${gallery.id}/subgalleries/new`}>
              <Plus className="h-4 w-4" />
              Add Subgallery
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/galleries/${gallery.id}/edit`}>
              <PenLine className="h-4 w-4" />
              Edit Gallery
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
