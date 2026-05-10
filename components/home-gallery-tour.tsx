"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpDown,
  Calendar,
  ChevronRight,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  LogOut,
  MapPin,
  Notebook,
  PanelLeft,
  Play,
  Plus,
  Settings,
  Share2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * HomeGalleryTour — guided walkthrough of a real Memora workspace.
 *
 * Replaces the previous abstract "watch a memory take shape" demo. Plays
 * a three-stage tour of an actual completed archive so visitors see what
 * their workspace will look like after a few real trips have been added,
 * not an empty schematic of how to make one.
 *
 * Stages:
 *   1. Workspace      — `Finn's galleries` grid with four completed entries.
 *   2. Gallery        — interior of `Road trip to Pais Vasco`: title,
 *                       collapsed entry teaser, two subgallery covers.
 *   3. Scene          — interior of `Hiking in Picos de Europa`: title,
 *                       expanded entry, 3-col photo grid.
 *   4. Scene-scrolled — same view, photo grid auto-scrolled to reveal more
 *                       photos so the viewer feels the depth of one scene.
 *
 * Each cut is preceded by a brief click pulse on the target card so the
 * transition is read as a navigation, not a shuffle.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const SIDEBAR_WIDTH = 144;

type GalleryEntry = {
  id: string;
  title: string;
  location: string;
  dateRange: string;
  year: string;
  days: number;
  imageSrc: string;
  focal?: { x: number; y: number };
};

const GALLERIES: GalleryEntry[] = [
  {
    id: "norway",
    title: "Spring Break in Norway",
    location: "Stavanger",
    dateRange: "Mar 28 – Apr 5, 2026",
    year: "2026",
    days: 9,
    imageSrc: "/demo/home-tour/gallery-norway.webp",
  },
  {
    id: "spain",
    title: "Weekends in Spain",
    location: "Andalusia, Spain",
    dateRange: "Jan 15 – May 22, 2026",
    year: "2026",
    days: 128,
    imageSrc: "/demo/home-tour/gallery-spain.webp",
  },
  {
    id: "pais-vasco",
    title: "Road trip to Pais Vasco",
    location: "Basque Country, Spain",
    dateRange: "Apr 30 – May 4, 2026",
    year: "2026",
    days: 5,
    imageSrc: "/demo/home-tour/gallery-pais-vasco.webp",
  },
  {
    id: "fruhlingsfest",
    title: "Frühlingsfest 2026",
    location: "Munich, Germany",
    dateRange: "Apr 22 – Apr 26, 2026",
    year: "2026",
    days: 5,
    imageSrc: "/demo/home-tour/gallery-fruhlingsfest.webp",
  },
];

type Subgallery = {
  id: string;
  title: string;
  location: string;
  date: string;
  teaser: string;
  imageSrc: string;
  focal?: { x: number; y: number };
};

const PAIS_VASCO_SUBGALLERIES: Subgallery[] = [
  {
    id: "picos",
    title: "Hiking in Picos de Europa",
    location: "Picos de Europa, Spain",
    date: "2026-05-01",
    teaser:
      "Sweeeeet hike up the mountain, and took the gondola back down. Check out photos",
    imageSrc: "/demo/home-tour/sub-picos.webp",
    focal: { x: 50, y: 35 },
  },
  {
    id: "maraton",
    title: "Media Maratón",
    location: "Biarritz, France",
    date: "2026-05-03",
    teaser:
      "My hardest yet most rewarding moment abroad. I had ran 3-4 times before this, but…",
    imageSrc: "/demo/home-tour/sub-maraton.webp",
    focal: { x: 50, y: 25 },
  },
];

const PICOS_ENTRY =
  "We decided to hike up los Picos 2 days before our half-marathon. It was a beautiful hike, and we got lucky with great weather. It took us around 3.5 hours to get to the top, and got to take the gondola down (thank god for this). Highly reccomend the hike, check out some of the photos below!";

const SCENE_PHOTOS = Array.from({ length: 11 }, (_, i) => ({
  id: i + 1,
  src: `/demo/home-tour/scene-${i + 1}.webp`,
}));

type Stage = "workspace" | "gallery" | "scene" | "done";

// ms timestamps for the auto-played tour. `step` is the stage to enter at
// time `at`. `pulseTarget` is the data-id of the card to flash before the
// transition so the cut reads as a navigation, not a shuffle.
type Cue =
  | { kind: "stage"; stage: Stage; at: number }
  | { kind: "pulse"; targetId: string; at: number }
  | { kind: "scroll"; at: number; durationMs: number };

const SEQUENCE: Cue[] = [
  { kind: "stage", stage: "workspace", at: 0 },
  { kind: "pulse", targetId: "pais-vasco", at: 3300 },
  { kind: "stage", stage: "gallery", at: 3850 },
  { kind: "pulse", targetId: "picos", at: 7100 },
  { kind: "stage", stage: "scene", at: 7650 },
  // Long scroll — all 11 photos cycle past. Distance is the inner content
  // overflow (~1020 px); duration keeps the rate around 110 px/s, slow enough
  // to read each row.
  { kind: "scroll", at: 9500, durationMs: 9000 },
  { kind: "stage", stage: "done", at: 20000 },
];

const TOTAL_DURATION_MS = 20000;
const SCENE_SCROLL_DISTANCE = 1020;

export function HomeGalleryTour() {
  const [stage, setStage] = useState<Stage>("workspace");
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [tourComplete, setTourComplete] = useState(false);
  const timeoutsRef = useRef<number[]>([]);
  const scrollRafRef = useRef<number | null>(null);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = null;
  }, []);

  useEffect(() => clearAll, [clearAll]);

  const animateScroll = useCallback((distance: number, durationMs: number) => {
    const startTs = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTs) / durationMs);
      // easeInOutCubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setScrollY(eased * distance);
      if (t < 1) {
        scrollRafRef.current = requestAnimationFrame(tick);
      } else {
        scrollRafRef.current = null;
      }
    };
    scrollRafRef.current = requestAnimationFrame(tick);
  }, []);

  const run = useCallback(() => {
    if (running) return;
    clearAll();
    setRunning(true);
    setTourComplete(false);
    setStage("workspace");
    setPulseId(null);
    setScrollY(0);

    SEQUENCE.forEach((cue) => {
      const id = window.setTimeout(() => {
        if (cue.kind === "stage") {
          setStage(cue.stage);
          setPulseId(null);
          if (cue.stage === "done") {
            setRunning(false);
            setTourComplete(true);
          }
        } else if (cue.kind === "pulse") {
          setPulseId(cue.targetId);
          // Clear pulse shortly after so the next stage doesn't carry the dim
          const clearId = window.setTimeout(() => setPulseId(null), 360);
          timeoutsRef.current.push(clearId);
        } else if (cue.kind === "scroll") {
          // Distance is the full inner-content overflow so every photo in
          // the scene rolls into view by the end of the scroll cue.
          animateScroll(SCENE_SCROLL_DISTANCE, cue.durationMs);
        }
      }, cue.at);
      timeoutsRef.current.push(id);
    });
  }, [animateScroll, clearAll, running]);

  // Auto-play once on mount via IntersectionObserver so the tour doesn't
  // burn before the visitor has scrolled to it.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hasPlayedRef = useRef(false);
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasPlayedRef.current) {
            hasPlayedRef.current = true;
            run();
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [run]);

  return (
    <section
      aria-label="Workspace tour"
      className="mx-auto w-full max-w-6xl px-4 md:px-6"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">
          A walkthrough
        </p>
        <h2 className="mt-5 font-serif text-[34px] leading-[1.04] text-[color:var(--ink)] md:text-[48px] md:leading-[1.0]">
          A look inside a real archive.
        </h2>
        <p className="mx-auto mt-5 max-w-[34rem] text-[14px] leading-7 text-[color:var(--ink-soft)] md:text-[15px]">
          Here&rsquo;s what your workspace looks like after a few trips. Open a
          gallery, then a scene — written context and the photos that go with it,
          all in one place.
        </p>
      </div>

      {/* Stage — fixed height so the cuts don't reflow the page. */}
      <div
        ref={stageRef}
        className="relative mx-auto mt-12 h-[600px] w-full max-w-5xl overflow-hidden rounded-sm border border-white/10 bg-[color:var(--background)] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)] ring-1 ring-white/5 md:h-[640px]"
      >
        <BrowserChrome path={browserPathFor(stage)} />

        <div className="absolute inset-x-0 bottom-0 top-9 flex bg-[color:var(--background)] text-[color:var(--ink)]">
          <Sidebar />
          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {stage === "workspace" ? (
                <motion.div
                  key="workspace"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.32, ease: EASE }}
                  className="absolute inset-0 overflow-hidden"
                >
                  <WorkspaceStage pulseId={pulseId} />
                </motion.div>
              ) : null}
              {stage === "gallery" ? (
                <motion.div
                  key="gallery"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.36, ease: EASE }}
                  className="absolute inset-0 overflow-hidden"
                >
                  <GalleryStage pulseId={pulseId} />
                </motion.div>
              ) : null}
              {stage === "scene" || stage === "done" ? (
                <motion.div
                  key="scene"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.36, ease: EASE }}
                  className="absolute inset-0 overflow-hidden"
                >
                  <SceneStage scrollY={scrollY} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Replay affordance — appears once the tour has played through. */}
        <AnimatePresence>
          {tourComplete ? (
            <motion.button
              type="button"
              onClick={run}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="absolute bottom-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-[color:var(--ink)]/85 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white shadow-[0_10px_28px_-12px_rgba(14,22,34,0.5)] backdrop-blur"
            >
              <Play className="h-3 w-3" fill="currentColor" strokeWidth={0} />
              Replay tour
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      <p className="mx-auto mt-6 max-w-[40rem] text-center text-[11px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
        Built from a real archive · plays automatically when in view
      </p>
    </section>
  );
}

function browserPathFor(stage: Stage): string {
  if (stage === "workspace") return "memora.app/galleries";
  if (stage === "gallery") return "memora.app/galleries/road-trip-to-pais-vasco";
  return "memora.app/galleries/road-trip-to-pais-vasco/picos-de-europa";
}

function BrowserChrome({ path }: { path: string }) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex h-9 items-center gap-3 border-b border-[color:var(--border)] bg-[color:var(--paper)] px-4">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ec8682]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f3c066]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#86bd7d]" />
      </div>
      <motion.div
        key={path}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="flex flex-1 items-center gap-2 overflow-hidden border border-[color:var(--border)] bg-white/70 px-3 py-1 text-[10px] text-[color:var(--ink-soft)]"
      >
        <span className="text-[color:var(--ink-faint)]">https://</span>
        <span className="truncate text-[color:var(--ink)]">{path}</span>
      </motion.div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside
      style={{ width: SIDEBAR_WIDTH }}
      className="relative flex shrink-0 flex-col border-r border-[color:var(--border)] bg-[color:var(--chrome)] py-3"
    >
      <div className="flex items-center justify-between px-3 pb-3">
        <SidebarLogo />
        <PanelLeft className="h-3.5 w-3.5 text-[color:var(--ink-faint)]" />
      </div>
      <nav className="mt-1 flex flex-col gap-0.5 px-2">
        <SidebarLink active icon={<ImageIcon className="h-3.5 w-3.5" strokeWidth={1.6} />}>
          Galleries
        </SidebarLink>
        <SidebarLink icon={<Notebook className="h-3.5 w-3.5" strokeWidth={1.6} />}>
          Clipboard
        </SidebarLink>
        <SidebarLink icon={<Globe className="h-3.5 w-3.5" strokeWidth={1.6} />}>
          Memory Map
        </SidebarLink>
      </nav>
      <div className="mt-auto flex flex-col gap-0.5 border-t border-[color:var(--border)] px-2 pt-3">
        <SidebarLink icon={<HelpCircle className="h-3.5 w-3.5" strokeWidth={1.6} />}>
          Help
        </SidebarLink>
        <SidebarLink icon={<Settings className="h-3.5 w-3.5" strokeWidth={1.6} />}>
          Account Info
        </SidebarLink>
        <SidebarLink icon={<LogOut className="h-3.5 w-3.5" strokeWidth={1.6} />}>
          Sign out
        </SidebarLink>
      </div>
    </aside>
  );
}

function SidebarLogo() {
  // Compressed mark — italic serif word + tiny camera glyph. Avoids
  // pulling in the 33 KB raster logo for a 100 px nav header.
  return (
    <div className="flex items-center gap-1">
      <span className="font-serif text-[14px] italic leading-none text-[color:var(--ink)]">
        Memora
      </span>
      <span aria-hidden className="inline-block h-3 w-3 -rotate-6 rounded-[2px] border border-[color:var(--ink)]" />
    </div>
  );
}

function SidebarLink({
  active = false,
  icon,
  children,
}: {
  active?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-[3px] px-2 py-1.5 text-[11px] leading-tight ${
        active
          ? "bg-[color:var(--hover-tint)] text-[color:var(--ink)]"
          : "text-[color:var(--ink-soft)]"
      }`}
    >
      <span className={active ? "text-[color:var(--ink)]" : "text-[color:var(--ink-faint)]"}>
        {icon}
      </span>
      <span>{children}</span>
    </div>
  );
}

function WorkspaceStage({ pulseId }: { pulseId: string | null }) {
  return (
    <div className="h-full overflow-hidden px-6 pt-5 md:px-8 md:pt-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Workspace
          </p>
          <h3 className="mt-1 font-serif text-[26px] leading-[1.05] text-[color:var(--ink)] md:text-[32px]">
            Finn&rsquo;s galleries
          </h3>
          <p className="mt-1.5 font-serif text-[12px] italic leading-[1.4] text-[color:var(--ink-soft)] md:text-[13px]">
            Curate, preserve, and share your experiences here.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-1">
          <ArrowUpDown className="h-3 w-3 text-[color:var(--ink-faint)]" />
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
            <Share2 className="h-2.5 w-2.5" /> Share galleries
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-strong)] px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-[color:var(--ink)]">
            <Plus className="h-2.5 w-2.5" /> Create gallery
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-7 md:gap-x-7">
        {GALLERIES.map((gallery) => (
          <WorkspaceGalleryCard
            key={gallery.id}
            gallery={gallery}
            pulsing={pulseId === gallery.id}
          />
        ))}
      </div>
    </div>
  );
}

function WorkspaceGalleryCard({
  gallery,
  pulsing,
}: {
  gallery: GalleryEntry;
  pulsing: boolean;
}) {
  return (
    <motion.div
      animate={
        pulsing
          ? { scale: [1, 0.985, 1], boxShadow: ["0 0 0 rgba(0,0,0,0)", "0 12px 28px -16px rgba(14,22,34,0.4)", "0 0 0 rgba(0,0,0,0)"] }
          : {}
      }
      transition={{ duration: 0.36, ease: EASE }}
      className="group block"
    >
      <motion.div
        animate={{
          borderColor: pulsing ? "var(--ink)" : "var(--frame-border)",
        }}
        transition={{ duration: 0.28, ease: EASE }}
        className="relative w-full border bg-[color:var(--frame-bg)] p-1.5 md:p-2.5"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gallery.imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: gallery.focal
                ? `${gallery.focal.x}% ${gallery.focal.y}%`
                : "50% 50%",
            }}
            loading="lazy"
            decoding="async"
          />
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-3 inline-flex items-center bg-[color:var(--chrome)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] tracking-[0.14em] text-[color:var(--ink)]"
        >
          {gallery.year}
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 inline-flex items-center bg-[color:var(--chrome)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] tracking-[0.14em] text-[color:var(--ink)]"
        >
          {gallery.days}d
        </span>
      </motion.div>
      <div className="mt-2.5">
        <h4 className="truncate font-serif text-[15px] leading-[1.15] text-[color:var(--ink)] md:text-[17px]">
          {gallery.title}
        </h4>
        <p className="mt-1 truncate font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)] md:text-[10px]">
          {gallery.location.toUpperCase()} · {gallery.dateRange.toUpperCase()}
        </p>
      </div>
    </motion.div>
  );
}

function GalleryStage({ pulseId }: { pulseId: string | null }) {
  return (
    <div className="h-full overflow-hidden px-6 pt-5 md:px-8 md:pt-6">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-[0.2em] text-[color:var(--ink-soft)]"
      >
        <ArrowLeft className="h-3 w-3" strokeWidth={1.8} />
        Back
      </button>
      <p className="mt-4 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        Gallery workspace
      </p>
      <h3 className="mt-1 font-serif text-[34px] leading-[1.04] text-[color:var(--ink)] md:text-[44px]">
        Road trip to Pais Vasco
      </h3>
      <p className="mt-3 font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
        ▼ Read entry · 88 words · ~1 min
      </p>

      <div className="mt-5 flex items-baseline justify-between">
        <h4 className="font-serif text-[18px] text-[color:var(--ink)] md:text-[22px]">
          Subgalleries
        </h4>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--ink-faint)]">
            <ChevronRight className="h-3 w-3 -scale-x-100" />
          </span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--ink)] text-white">
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:gap-5">
        {PAIS_VASCO_SUBGALLERIES.map((sub) => (
          <SubgalleryCard key={sub.id} sub={sub} pulsing={pulseId === sub.id} />
        ))}
      </div>
    </div>
  );
}

function SubgalleryCard({ sub, pulsing }: { sub: Subgallery; pulsing: boolean }) {
  return (
    <motion.div
      animate={
        pulsing
          ? { scale: [1, 0.985, 1] }
          : {}
      }
      transition={{ duration: 0.36, ease: EASE }}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-[4px] bg-[color:var(--paper-strong)] md:aspect-[16/11]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sub.imageSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          objectPosition: sub.focal
            ? `${sub.focal.x}% ${sub.focal.y}%`
            : "50% 50%",
        }}
        loading="lazy"
        decoding="async"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/72 via-black/30 to-black/0"
      />
      <div className="absolute inset-x-3 bottom-3 text-white md:inset-x-4 md:bottom-4">
        <p className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.22em] text-white/85">
          Scene
        </p>
        <h5 className="mt-1 font-serif text-[18px] leading-[1.05] md:text-[24px]">
          {sub.title}
        </h5>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-[family-name:var(--font-mono)] text-[8.5px] uppercase tracking-[0.16em] text-white/85 md:text-[9.5px]">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" strokeWidth={1.8} />
            {sub.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5" strokeWidth={1.8} />
            {sub.date}
          </span>
        </p>
        <p className="mt-1.5 line-clamp-1 font-serif text-[11px] italic leading-[1.35] text-white/92 md:text-[12.5px]">
          {sub.teaser}
        </p>
      </div>
      <AnimatePresence>
        {pulsing ? (
          <motion.div
            key="ring"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-white/70"
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function SceneStage({ scrollY }: { scrollY: number }) {
  return (
    <div className="h-full overflow-hidden">
      {/* The whole scene view scrolls as one block during the auto-scroll
          cue so the entry text drifts up as the photo grid reveals more. */}
      <motion.div
        animate={{ y: -scrollY }}
        transition={{ duration: 0 }}
        className="px-6 pt-5 md:px-8 md:pt-6"
      >
        <button
          type="button"
          className="inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-[0.2em] text-[color:var(--ink-soft)]"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={1.8} />
          Back
        </button>
        <p className="mt-4 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Inside Road trip to Pais Vasco
        </p>
        <h3 className="mt-1 font-serif text-[30px] leading-[1.05] text-[color:var(--ink)] md:text-[38px]">
          Hiking in Picos de Europa
        </h3>
        <p className="mt-2 font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
          Picos de Europa, Spain &nbsp;/&nbsp; 2026-05-01
        </p>

        <p className="mt-4 font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
          ▲ Hide entry · {PICOS_ENTRY.split(/\s+/).length} words · ~1 min
        </p>
        <p className="mt-3 max-w-[44rem] text-[12px] leading-[1.7] text-[color:var(--ink)] md:text-[13px]">
          {PICOS_ENTRY}
        </p>

        <div className="mt-4 border-t border-[color:var(--border)] pt-4">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {SCENE_PHOTOS.map((p) => (
              <ScenePhoto key={p.id} src={p.src} />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ScenePhoto({ src }: { src: string }) {
  // Uniform 4:5 with hairline + paper inset — mirrors the "paper" density in
  // components/photo-grid.tsx. Every tile is the same size regardless of the
  // underlying photo's orientation; object-cover crops to fit.
  return (
    <div className="relative block border border-[color:var(--border)] bg-[color:var(--paper)] p-1.5">
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  );
}
