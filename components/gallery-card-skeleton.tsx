/**
 * Gallery card skeleton.
 *
 * Mirrors the visible structure of GalleryCard (cover image + title block
 * + meta line) so the dashboard's hydration window doesn't shift layout
 * when real cards swap in. Uses a soft shimmer animation tuned to feel
 * editorial rather than flashy.
 */
export function GalleryCardSkeleton() {
  return (
    <article
      aria-hidden
      className="overflow-hidden rounded-[1.25rem] border border-[color:var(--border)] bg-white/70"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[color:var(--paper)]">
        <div className="memora-shimmer absolute inset-0" />
      </div>
      <div className="space-y-3 px-5 py-4 md:px-6 md:py-5">
        <div className="memora-shimmer h-4 w-32 rounded-sm" />
        <div className="memora-shimmer h-7 w-2/3 rounded-sm" />
        <div className="memora-shimmer h-3 w-1/3 rounded-sm" />
      </div>
    </article>
  );
}

export function GalleryCardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-14 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-16">
      {Array.from({ length: count }).map((_, index) => (
        <GalleryCardSkeleton key={index} />
      ))}
    </div>
  );
}
