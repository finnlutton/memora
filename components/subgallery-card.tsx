import Image from "next/image";
import { CalendarDays, MapPin } from "lucide-react";
import { formatLocationForCard, nextImageUnoptimizedForSrc } from "@/lib/utils";
import type { Subgallery } from "@/types/memora";

export function SubgalleryCard({
  subgallery,
  active,
}: {
  subgallery: Subgallery;
  active: boolean;
}) {
  return (
    <article
      className={`h-full overflow-hidden rounded-[6px] border bg-[rgba(255,255,255,0.72)] backdrop-blur transition duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
        active
          ? "border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
          : "border-white/12"
      }`}
    >
      <div className="relative aspect-[10/13] overflow-hidden md:aspect-[16/11]">
        {subgallery.coverImage ? (
          <Image
            src={subgallery.coverImage}
            alt={subgallery.title}
            fill
            className="object-cover transition duration-700"
            sizes="(max-width: 768px) 90vw, 60vw"
            unoptimized={nextImageUnoptimizedForSrc(subgallery.coverImage)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(8,14,24,0.96)] via-[rgba(20,45,74,0.7)] to-[rgba(120,165,205,0.55)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(6,12,22,0.92)] via-[rgba(6,12,22,0.22)] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-8">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/65">
              Scene
            </p>
            <h3 className="mt-2 font-serif text-2xl leading-tight text-white md:mt-3 md:text-5xl">
              {subgallery.title}
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-white/70 md:mt-3 md:gap-3 md:text-xs">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {formatLocationForCard(subgallery.location)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {subgallery.dateLabel}
              </span>
            </div>
            <p className="mt-3 max-w-xl text-xs leading-6 text-white/82 md:mt-4 md:text-base md:leading-8">
              {subgallery.description}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
