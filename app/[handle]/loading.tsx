// Streamed shell for the public Memora profile (/@handle). The page
// handler awaits a profiles row + the user's enabled-on-public-profile
// galleries before any HTML can render, so without this file an
// unauthenticated visitor stares at a blank document for the duration
// of TTFB. The shimmer mirrors the real page's structure (eyebrow,
// title, two-column gallery grid).

export default function PublicProfileLoading() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 pb-16 pt-14 text-[color:var(--ink)] md:px-8 md:pt-16">
      <div className="mx-auto w-full max-w-5xl">
        <header className="text-center">
          <div className="memora-shimmer mx-auto h-3 w-24 rounded-sm" />
          <div className="memora-shimmer mx-auto mt-4 h-10 w-2/3 max-w-md rounded-sm md:h-14" />
          <div className="memora-shimmer mx-auto mt-4 h-3 w-3/4 max-w-md rounded-sm" />
        </header>
        <div className="mt-8 h-px w-full bg-[color:var(--border)] md:mt-12" />
        <section className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 md:mt-10 md:gap-x-8 md:gap-y-12">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="memora-shimmer aspect-[4/3] w-full rounded-sm md:aspect-[16/9]" />
              <div className="memora-shimmer h-5 w-3/4 rounded-sm" />
              <div className="memora-shimmer h-3 w-1/2 rounded-sm" />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
