// Streamed shell for the public share landing. The page handler does
// 3 sequential DB round-trips (shares -> share_galleries -> galleries)
// before any HTML can render, so without this file the visitor stares at
// a blank document for the duration of TTFB. The shimmer mirrors the real
// page's structure (eyebrow, title, two-up cover grid) so the visual jump
// when content arrives is small.

export default function PublicSharePageLoading() {
  return (
    <main className="flex min-h-screen flex-col bg-[color:var(--background)] px-4 py-6 text-[color:var(--ink)] md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
        <div className="mb-6 border-b border-[color:var(--border)] pb-4 md:mb-8 md:pb-5">
          <div className="memora-shimmer h-3 w-20 rounded-sm" />
          <div className="memora-shimmer mt-3 h-9 w-2/3 rounded-sm md:h-12 md:w-1/2" />
          <div className="memora-shimmer mt-3 h-3 w-40 rounded-sm" />
        </div>
        <section className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="memora-shimmer aspect-[16/10] w-full rounded-sm" />
              <div className="memora-shimmer h-6 w-3/4 rounded-sm" />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
