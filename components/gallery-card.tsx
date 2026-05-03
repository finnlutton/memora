import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import {
  formatDateRangeCompact,
  formatLocationForCard,
  nextImageUnoptimizedForSrc,
} from "@/lib/utils";
import type { Gallery } from "@/types/memora";

/**
 * GalleryCard — editorial variant.
 *
 * Earlier design wrapped each gallery in a white "card" (bg, border, shadow,
 * rounded) with a multi-line metadata body underneath. On an index of
 * photographs the chrome dominated, the body stacked dashboard-ish
 * metadata (chip counts, locations, updated-ago), and sparse galleries
 * read as big empty slabs.
 *
 * This version treats each entry as a photograph on the page canvas: no
 * card chrome, no shadow, no container. The cover image IS the object;
 * the title and a single quiet meta line sit directly on the page below
 * it. Sparse galleries take only the height they need — no empty body.
 *
 * Share-mode selection affordance (the circular checkbox) still pins to
 * the image corner; the parent grid still owns click-to-toggle.
 */
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
  // Prefer the persisted gallery cover; fall back to first subgallery if absent.
  const coverImage = gallery.coverImage || gallery.subgalleries[0]?.coverImage;

  const primaryLocation = formatLocationForCard(gallery.locations[0]);
  // Compact range: drop the year from the start date when both dates
  // share a year so 'Apr 22, 2026 - Apr 26, 2026' reads as
  // 'Apr 22 - Apr 26, 2026'. Cross-year ranges and single dates fall
  // back to the standard format.
  const dateRange = formatDateRangeCompact(gallery.startDate, gallery.endDate);
  const metaParts = [primaryLocation, dateRange].filter(Boolean);

  // Editorial badges. Year reads as a print-archive plate; trip duration
  // (in days) is derived from the date range and rounded up so a same-day
  // outing reads as "1d" rather than "0d".
  const yearBadge = (() => {
    const source = gallery.startDate || gallery.endDate;
    if (!source) return null;
    const date = new Date(source);
    if (Number.isNaN(date.getTime())) return null;
    return String(date.getFullYear());
  })();
  const durationBadge = (() => {
    if (!gallery.startDate || !gallery.endDate) return null;
    const start = new Date(gallery.startDate);
    const end = new Date(gallery.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const days = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
    );
    return `${days}d`;
  })();

  const body = (
    <>
      {/*
        Cover image. 16:9 desktop (cinematic crop, less "tall brick" weight
        at the wider 2-col width). 4:3 mobile to keep subject legibility on
        narrow screens. Hairline border is the only chrome — intentional,
        reads as a printed photograph's edge, not a UI card.
      */}
      <div className="relative w-full border border-[color:var(--border)] bg-[color:var(--paper)] p-1.5 md:p-[14px]">
      <div className="relative aspect-[4/3] w-full overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)] md:aspect-[16/9]">
        {/*
          Empty `coverImage` happens when the photo's `data:` src has been
          stripped from the persisted snapshot but Supabase hasn't yet
          re-hydrated the remote URL. The wrapping div's bg-paper acts as
          the placeholder until the URL arrives.
        */}
        {coverImage ? (
          <Image
            src={coverImage}
            alt={gallery.title}
            fill
            className="object-cover transition duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.015]"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 100vw, 720px"
            unoptimized={nextImageUnoptimizedForSrc(coverImage)}
          />
        ) : null}
        {shareSelectable ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleSelected?.(gallery.id);
            }}
            aria-label={`Select ${gallery.title}`}
            className={`absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border backdrop-blur transition md:right-4 md:top-4 md:h-7 md:w-7 ${
              selected
                ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
                : "border-white/70 bg-[rgba(255,255,255,0.28)] text-transparent hover:bg-[rgba(255,255,255,0.5)]"
            }`}
          >
            <Check className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" strokeWidth={2.4} />
          </button>
        ) : null}
      </div>
      {yearBadge ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-3 inline-flex items-center px-1 py-px font-[family-name:var(--font-mono)] text-[8.5px] tracking-[0.12em] text-[color:var(--ink)] bg-[color:var(--chrome)] md:left-5 md:top-5 md:px-1.5 md:py-0.5 md:text-[10px] md:tracking-[0.16em]"
        >
          {yearBadge}
        </span>
      ) : null}
      {durationBadge ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-3 inline-flex items-center px-1 py-px font-[family-name:var(--font-mono)] text-[8.5px] tracking-[0.12em] text-[color:var(--ink)] bg-[color:var(--chrome)] md:right-5 md:top-5 md:px-1.5 md:py-0.5 md:text-[10px] md:tracking-[0.16em]"
        >
          {durationBadge}
        </span>
      ) : null}
      </div>

      {/*
        Caption block. Directly on the page canvas — no bg, no border, no
        padding container. Serif title reads like a printed plate caption.
        One meta line, middle-dot separated. No description, no counts, no
        updated-ago. If a gallery has neither location nor dates, the meta
        line just doesn't render — no empty placeholder slab.
      */}
      <div className="mt-2 md:mt-6">
        <h3 className="font-serif text-[14px] leading-[1.22] text-[color:var(--ink)] md:text-[24px] md:leading-[1.15]">
          {gallery.title}
        </h3>
        {metaParts.length ? (
          <p className="mt-1 font-[family-name:var(--font-mono)] text-[10px] uppercase leading-[1.4] tracking-[0.12em] text-[color:var(--ink-faint)] md:mt-2 md:text-[11px] md:tracking-[0.16em]">
            {metaParts.join(" · ")}
          </p>
        ) : null}
      </div>
    </>
  );

  const groupClass = "group block";

  if (shareSelectable) {
    return (
      <div
        className={`${groupClass} cursor-pointer`}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={() => onToggleSelected?.(gallery.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggleSelected?.(gallery.id);
          }
        }}
      >
        {body}
      </div>
    );
  }

  return (
    <Link href={`/galleries/${gallery.id}`} className={groupClass}>
      {body}
    </Link>
  );
}
