// Streamed shell for a single gallery on the public profile page.
// The page handler does a profile lookup + gallery row fetch + a
// parallel subgalleries/photos fetch before any HTML can render, so
// without this file a fresh visitor sees a blank document for the
// duration of TTFB. The shimmer mirrors the real page's two-column
// subgallery grid.

export default function PublicProfileGalleryLoading() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--ink)] md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 border-b border-[color:var(--border)] pb-4 md:mb-8 md:pb-5">
          <div className="memora-shimmer h-3 w-20 rounded-sm" />
          <div className="memora-shimmer mt-3 h-3 w-44 rounded-sm" />
          <div className="memora-shimmer mt-4 h-9 w-2/3 rounded-sm md:h-12 md:w-1/2" />
          <div className="memora-shimmer mt-3 h-3 w-40 rounded-sm" />
        </div>
        <section className="grid gap-x-3 gap-y-7 sm:grid-cols-2 md:gap-x-8 md:gap-y-12">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="memora-shimmer aspect-[5/3] w-full rounded-sm" />
              <div className="memora-shimmer h-6 w-2/3 rounded-sm" />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
