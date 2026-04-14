import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Images } from "lucide-react";
import { formatDateRange, formatUpdatedLabel, countPhotos, nextImageUnoptimizedForSrc } from "@/lib/utils";
import type { Gallery } from "@/types/memora";

export function GalleryCard({
  gallery,
  shareSelectable = false,
  selected = false,
  onToggleSelected,
}: {
  gallery: Gallery;
  shareSelectable?: boolean;
  selected?: boolean;
  onToggleSelected?: (galleryId: string) => void;
}) {
  // Prefer the persisted gallery cover. Only fall back to a subgallery cover if the gallery has no cover.
  const coverImage = gallery.coverImage || gallery.subgalleries[0]?.coverImage;

  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    console.info("Memora: gallery card image source", {
      galleryId: gallery.id,
      coverImage,
    });
  }

  const cardClasses = `group relative overflow-hidden border bg-white/72 shadow-[0_12px_40px_rgba(34,49,71,0.09)] backdrop-blur transition duration-500 ${
    shareSelectable
      ? selected
        ? "border-[rgba(56,88,131,0.52)] shadow-[0_16px_46px_rgba(44,70,108,0.18)]"
        : "border-white/60 hover:border-[rgba(56,88,131,0.28)]"
      : "border-white/60 hover:-translate-y-1 hover:shadow-[0_16px_50px_rgba(34,49,71,0.14)]"
  }`;

  const cardBody = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden md:aspect-[5/3]">
        <Image
          src={coverImage}
          alt={gallery.title}
          fill
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
          sizes="(max-width: 768px) 100vw, 33vw"
          unoptimized={nextImageUnoptimizedForSrc(coverImage)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,25,39,0.72)] via-[rgba(13,25,39,0.18)] to-transparent" />
        {shareSelectable ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleSelected?.(gallery.id);
            }}
            className={`absolute right-2.5 top-2.5 inline-flex h-5.5 w-5.5 items-center justify-center rounded-full border transition md:right-3 md:top-3 md:h-6 md:w-6 ${
              selected
                ? "border-[color:var(--accent-strong)] bg-[color:var(--accent-strong)] text-white"
                : "border-white/60 bg-[rgba(255,255,255,0.14)] text-transparent hover:bg-[rgba(255,255,255,0.24)]"
            }`}
            aria-label={`Select ${gallery.title}`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <div className="space-y-1.5 px-3 py-3 md:px-3.5 md:py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-base text-[color:var(--ink)] md:text-[1.02rem]">{gallery.title}</h3>
            <p className="mt-0.5 text-xs text-[color:var(--ink-soft)]">
              {formatDateRange(gallery.startDate, gallery.endDate)}
            </p>
          </div>
          <span className="rounded-full bg-[color:var(--paper)] p-1 text-[color:var(--accent)] transition group-hover:bg-[color:var(--accent-strong)] group-hover:text-white md:p-1.5">
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
        <p className="line-clamp-3 text-xs leading-5 text-[color:var(--ink-soft)] md:leading-6">
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
    </>
  );

  if (shareSelectable) {
    return (
      <div className={cardClasses} role="button" tabIndex={0} onClick={() => onToggleSelected?.(gallery.id)}>
        {cardBody}
      </div>
    );
  }

  return (
    <Link
      href={`/galleries/${gallery.id}`}
      className={cardClasses}
    >
      {cardBody}
    </Link>
  );
}
