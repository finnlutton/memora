import Image from "next/image";
import { MapPin, CalendarDays, Images } from "lucide-react";
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
      className={`h-full overflow-hidden rounded-[2rem] border bg-white/80 shadow-[0_18px_60px_rgba(34,49,71,0.1)] backdrop-blur transition duration-500 ${
        active
          ? "border-[color:var(--border-strong)] shadow-[0_26px_80px_rgba(34,49,71,0.16)]"
          : "border-white/60"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={subgallery.coverImage}
          alt={subgallery.title}
          fill
          className="object-cover transition duration-700"
          sizes="(max-width: 768px) 90vw, 40vw"
        />
      </div>
      <div className="space-y-3 px-5 py-5">
        <div>
          <h3 className="font-serif text-2xl text-[color:var(--ink)]">{subgallery.title}</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {subgallery.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {subgallery.dateLabel}
            </span>
          </div>
        </div>
        <p className="line-clamp-3 text-sm leading-7 text-[color:var(--ink-soft)]">
          {subgallery.description}
        </p>
        <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--paper)] px-3 py-1.5 text-sm text-[color:var(--ink-soft)]">
          <Images className="h-4 w-4 text-[color:var(--accent)]" />
          {subgallery.photos.length} photos
        </div>
      </div>
    </article>
  );
}
