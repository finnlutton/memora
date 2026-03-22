import Image from "next/image";
import { CalendarDays, MapPin } from "lucide-react";
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
          ? "border-[color:var(--border-strong)] shadow-[0_38px_110px_rgba(22,35,52,0.22)]"
          : "border-white/40 shadow-[0_22px_70px_rgba(22,35,52,0.12)]"
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden md:aspect-[16/11]">
        <Image
          src={subgallery.coverImage}
          alt={subgallery.title}
          fill
          className="object-cover transition duration-700"
          sizes="(max-width: 768px) 90vw, 60vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(9,16,26,0.84)] via-[rgba(9,16,26,0.26)] to-[rgba(9,16,26,0.02)]" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/65">
              Scene
            </p>
            <h3 className="mt-3 font-serif text-3xl leading-tight text-white md:text-5xl">
              {subgallery.title}
            </h3>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.18em] text-white/70 md:text-xs">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {subgallery.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {subgallery.dateLabel}
              </span>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/82 md:text-base md:leading-8">
              {subgallery.description}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-6 py-4 text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)] md:px-8">
        <span>{subgallery.photos.length} photographs</span>
        <span>Open chapter</span>
      </div>
    </article>
  );
}
