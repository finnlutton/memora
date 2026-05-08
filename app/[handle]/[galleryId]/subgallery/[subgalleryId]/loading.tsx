// Streamed shell for the public profile subgallery view. The page
// handler awaits a profile + gallery + subgallery + photos chain
// before any HTML can render; without this file an unauthenticated
// visitor stares at a blank document for that interval.

export default function PublicProfileSubgalleryLoading() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--ink)] md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 border-b border-[color:var(--border)] pb-4 md:mb-8 md:pb-5">
          <div className="memora-shimmer h-3 w-20 rounded-sm" />
          <div className="memora-shimmer mt-3 h-3 w-44 rounded-sm" />
          <div className="memora-shimmer mt-4 h-9 w-2/3 rounded-sm md:h-12 md:w-1/2" />
          <div className="memora-shimmer mt-3 h-3 w-40 rounded-sm" />
        </div>
        <section className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="memora-shimmer aspect-[4/5] w-full rounded-sm" />
          ))}
        </section>
      </div>
    </main>
  );
}
