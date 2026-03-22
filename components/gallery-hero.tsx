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
    <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative min-h-[14rem] overflow-hidden rounded-[1.5rem] border border-white/60 shadow-[0_20px_60px_rgba(27,42,60,0.16)]">
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
      <div className="flex flex-col justify-between rounded-[1.5rem] border border-white/60 bg-white/72 p-5 shadow-[0_16px_50px_rgba(34,49,71,0.1)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--ink-faint)]">
            Gallery Journal
          </p>
          <div>
            <h1 className="max-w-xl font-serif text-2xl leading-tight text-[color:var(--ink)] md:text-3xl">
              {gallery.title}
            </h1>
            <p className="mt-2 max-w-xl text-xs leading-6 text-[color:var(--ink-soft)]">
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
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/galleries/${gallery.id}/subgalleries/new`}>
              <Plus className="h-3 w-3" />
              Add Subgallery
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/galleries/${gallery.id}/edit`}>
              <PenLine className="h-3 w-3" />
              Edit Gallery
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
