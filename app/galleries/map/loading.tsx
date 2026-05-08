// Streamed shell for the Memory Map. The page bundle pulls in
// react-globe.gl + three.js, both lazy-loaded via dynamic({ssr:false}),
// so the visitor would otherwise stare at an empty viewport while the
// chunk downloads on cold cache. The shimmer mirrors the full-bleed
// stage and editorial header so the visual jump when the globe hydrates
// is small.

export default function MemoryMapLoading() {
  return (
    <main className="relative min-h-[calc(100dvh-9rem)] w-full">
      <div
        aria-hidden
        style={{
          left: "var(--workspace-sidebar-width, 0px)",
          top: "var(--workspace-chrome-top, 0px)",
        }}
        className="fixed bottom-0 right-0 z-0 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(217,228,240,0.55),transparent_60%),var(--background)]"
      >
        <div className="pointer-events-none absolute left-5 top-14 max-w-[10.5rem] md:left-10 md:top-10 md:max-w-md">
          <div className="memora-shimmer hidden h-3 w-24 rounded-sm md:block" />
          <div className="memora-shimmer mt-3 h-9 w-40 rounded-sm md:h-14 md:w-72" />
          <div className="memora-shimmer mt-3 hidden h-3 w-72 rounded-sm md:block" />
        </div>
      </div>
    </main>
  );
}
