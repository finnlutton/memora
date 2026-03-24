import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Images } from "lucide-react";
import { formatDateRange, formatUpdatedLabel, countPhotos, nextImageUnoptimizedForSrc } from "@/lib/utils";
import type { Gallery } from "@/types/memora";

export function GalleryCard({ gallery, index }: { gallery: Gallery; index: number }) {
  const coverImage =
    gallery.subgalleries[0]?.coverImage ?? gallery.coverImage;

  return (
    <Link
      href={`/galleries/${gallery.id}`}
      className="group relative overflow-hidden rounded-[1.25rem] border border-white/60 bg-white/72 shadow-[0_12px_40px_rgba(34,49,71,0.09)] backdrop-blur transition duration-500 hover:-translate-y-1 hover:shadow-[0_16px_50px_rgba(34,49,71,0.14)]"
    >
      <div className="relative aspect-[5/4] overflow-hidden">
        <Image
          src={coverImage}
          alt={gallery.title}
          fill
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
          sizes="(max-width: 768px) 100vw, 33vw"
          unoptimized={nextImageUnoptimizedForSrc(coverImage)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,25,39,0.72)] via-[rgba(13,25,39,0.18)] to-transparent" />
        <div className="absolute left-3 top-3 rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-white backdrop-blur">
          Gallery {index + 1}
        </div>
      </div>
      <div className="space-y-2 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg text-[color:var(--ink)]">{gallery.title}</h3>
            <p className="mt-0.5 text-xs text-[color:var(--ink-soft)]">
              {formatDateRange(gallery.startDate, gallery.endDate)}
            </p>
          </div>
          <span className="rounded-full bg-[color:var(--paper)] p-1.5 text-[color:var(--accent)] transition group-hover:bg-[color:var(--accent-strong)] group-hover:text-white">
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
        <p className="line-clamp-3 text-xs leading-6 text-[color:var(--ink-soft)]">
          {gallery.description}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--ink-soft)]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--paper)] px-2 py-1">
            <Images className="h-3 w-3 text-[color:var(--accent)]" />
            {gallery.subgalleries.length} subgalleries
          </span>
          <span>{countPhotos(gallery.subgalleries)} photos</span>
          <span>{gallery.locations.slice(0, 2).join(" • ")}</span>
        </div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          Updated {formatUpdatedLabel(gallery.updatedAt)}
        </p>
      </div>
    </Link>
  );
}
