"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronDown, MapPin } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import {
  HOME_GALLERY_DEMO,
  type DemoScene,
  type DemoSubgallery,
} from "@/lib/home-gallery-demo-data";

/**
 * Home gallery reveal — progressive-disclosure demo of Memora's hierarchy.
 *
 *   Gallery  (always visible as the anchor)
 *     └── 3 Subgalleries  (revealed when the gallery is opened)
 *           └── 3 Scenes each  (revealed when a subgallery is opened)
 *
 * Copy and image paths are defined in `lib/home-gallery-demo-data.ts`.
 * Drop image files into `public/demo/home-gallery/` — see the README there.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export function HomeGalleryReveal() {
  const gallery = HOME_GALLERY_DEMO;
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [openSubId, setOpenSubId] = useState<string | null>(null);

  const toggleGallery = () => {
    setGalleryOpen((prev) => {
      const next = !prev;
      if (!next) setOpenSubId(null);
      return next;
    });
  };

  return (
    <section>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-[32px] leading-[1.02] text-[color:var(--ink)] md:text-[44px]">
          A time period, broken into its adventures.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[14px] leading-7 text-[color:var(--ink-soft)] md:text-[15px]">
          Open my gallery to see what I mean. If you prefer
          organization, you won&apos;t look back.
        </p>
      </div>

      <div className="mx-auto mt-12 flex w-full max-w-5xl flex-col items-center">
        {/* ── Level 1: Gallery ─────────────────────────────────────────── */}
        <GalleryCard
          title={gallery.title}
          location={gallery.location}
          dates={gallery.dates}
          description={gallery.description}
          image={gallery.coverImage}
          open={galleryOpen}
          onClick={toggleGallery}
        />

        {/* ── Level 2: Subgalleries ────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {galleryOpen ? (
            <motion.div
              key="subs"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="w-full overflow-hidden"
            >
              <div className="pt-2">
                {/* Branching stem from gallery down to three subgalleries */}
                <BranchConnector count={gallery.subgalleries.length} />

                <div className="mt-0 grid grid-cols-3 gap-2.5 md:gap-5">
                  {gallery.subgalleries.map((sub) => (
                    <SubgalleryCard
                      key={sub.id}
                      sub={sub}
                      open={openSubId === sub.id}
                      onClick={() =>
                        setOpenSubId((prev) => (prev === sub.id ? null : sub.id))
                      }
                    />
                  ))}
                </div>

                {/* ── Level 3: Scenes — pushed below the subgalleries row ─── */}
                <AnimatePresence initial={false}>
                  {openSubId ? (
                    <motion.div
                      key={openSubId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.44, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4">
                        <SceneStemConnector
                          openIndex={gallery.subgalleries.findIndex(
                            (s) => s.id === openSubId,
                          )}
                          total={gallery.subgalleries.length}
                        />
                        {/*
                          Mobile-only descriptor — the subgallery's full
                          description rides above the 2×2 scene grid as
                          another item flowing from the open subgallery,
                          and animates in/out with the scenes when the
                          user switches between subgalleries.
                        */}
                        <div className="mb-3 rounded-lg border border-[color:var(--border)] bg-white px-3.5 py-3 shadow-[0_8px_22px_-14px_rgba(18,31,48,0.18)] md:hidden">
                          <p className="text-[12px] leading-[1.55] text-[color:var(--ink-soft)]">
                            {gallery.subgalleries.find(
                              (s) => s.id === openSubId,
                            )?.description}
                          </p>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-5">
                          {(gallery.subgalleries.find((s) => s.id === openSubId)
                            ?.scenes ?? []).map((scene, i) => (
                            <SceneCard key={scene.id} scene={scene} index={i} />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ── Gallery card ────────────────────────────────────────────────────── */

function GalleryCard({
  title,
  location,
  dates,
  description,
  image,
  open,
  onClick,
}: {
  title: string;
  location: string;
  dates: string;
  description: string;
  image: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.24, ease: EASE }}
      className="group relative w-full max-w-[42rem] overflow-hidden rounded-xl border border-[color:var(--border)] bg-white text-left shadow-[0_18px_48px_-24px_rgba(18,31,48,0.22)]"
      aria-expanded={open}
    >
      <Cover
        src={image}
        alt={title}
        aspectClass="aspect-[1.55/1]"
        sizes="(max-width: 768px) 100vw, 672px"
      />
      <div className="px-5 py-4 md:px-8 md:py-6">
        <p className="text-[9.5px] font-medium uppercase tracking-[0.3em] text-[color:var(--ink-faint)] md:text-[10px]">
          Gallery
        </p>
        <h3 className="mt-1.5 font-serif text-[20px] leading-[1.08] text-[color:var(--ink)] md:mt-2 md:text-[30px]">
          {title}
        </h3>
        <Meta location={location} dates={dates} className="mt-1.5 md:mt-2.5" />
        <p className="mt-2 max-w-xl text-[12.5px] leading-[1.55] text-[color:var(--ink-soft)] md:mt-3 md:text-[14.5px] md:leading-7">
          {description}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)] md:mt-5">
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="inline-flex"
          >
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </motion.span>
          {open ? "Close gallery" : "Open gallery"}
        </div>
      </div>
    </motion.button>
  );
}

/* ── Subgallery card ─────────────────────────────────────────────────── */

function SubgalleryCard({
  sub,
  open,
  onClick,
}: {
  sub: DemoSubgallery;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.22, ease: EASE }}
      animate={{
        borderColor: open ? "var(--border-strong)" : "var(--border)",
      }}
      className="relative flex h-full flex-col overflow-hidden rounded-lg border bg-white text-left shadow-[0_10px_26px_-18px_rgba(18,31,48,0.22)]"
      aria-expanded={open}
    >
      <Cover
        src={sub.coverImage}
        alt={sub.title}
        aspectClass="aspect-[5/4]"
        sizes="(max-width: 768px) 33vw, 340px"
      />
      <div className="flex-1 px-2 py-2 md:px-5 md:py-5">
        <p className="hidden text-[9.5px] font-medium uppercase tracking-[0.28em] text-[color:var(--ink-faint)] md:block">
          Subgallery
        </p>
        <h4 className="line-clamp-3 font-serif text-[10.5px] leading-[1.18] text-[color:var(--ink)] md:mt-1.5 md:line-clamp-none md:text-[19px] md:leading-tight">
          {sub.title}
        </h4>
        <div className="hidden md:block">
          <Meta
            location={sub.location}
            dates={sub.dates}
            className="mt-2"
            size="xs"
          />
          <p className="mt-2.5 text-[12.5px] leading-6 text-[color:var(--ink-soft)]">
            {sub.description}
          </p>
        </div>
        <div className="mt-1.5 inline-flex items-center gap-1 text-[8px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)] md:mt-3 md:gap-1.5 md:text-[9.5px] md:tracking-[0.22em]">
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="inline-flex"
          >
            <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3" strokeWidth={2} />
          </motion.span>
          <span className="md:hidden">{open ? "Hide" : "Open"}</span>
          <span className="hidden md:inline">
            {open ? "Hide scenes" : "Open scenes"}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/* ── Scene card ──────────────────────────────────────────────────────── */

function SceneCard({ scene, index }: { scene: DemoScene; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE, delay: 0.04 + index * 0.04 }}
      className="flex flex-col"
    >
      <div className="overflow-hidden rounded-lg shadow-[0_10px_26px_-16px_rgba(18,31,48,0.24)]">
        <Cover
          src={scene.image}
          alt={scene.title ?? "Scene"}
          aspectClass="aspect-[4/3]"
          sizes="(max-width: 768px) 50vw, 480px"
        />
      </div>
      {scene.caption ? (
        <p className="mt-2 hidden line-clamp-2 px-0.5 text-[10.5px] leading-[1.45] text-[color:var(--ink-soft)] md:block md:text-[11px]">
          {scene.caption}
        </p>
      ) : null}
    </motion.article>
  );
}

/* ── Shared primitives ───────────────────────────────────────────────── */

function Meta({
  location,
  dates,
  className = "",
  size = "sm",
}: {
  location: string;
  dates?: string;
  className?: string;
  size?: "xs" | "sm";
}) {
  const textCls =
    size === "xs"
      ? "text-[10px] tracking-[0.16em]"
      : "text-[10.5px] tracking-[0.18em]";
  const iconCls = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${textCls} font-medium uppercase text-[color:var(--ink-faint)] ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <MapPin className={iconCls} strokeWidth={1.6} />
        {location}
      </span>
      {dates ? (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className={iconCls} strokeWidth={1.6} />
          {dates}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Scene stem connector: a vertical line dropping from the center of the
 * opened subgallery column down to the scenes grid below, then angling to
 * the horizontal center so the scenes clearly descend from their parent.
 * Hidden on narrow screens where everything stacks vertically.
 */
function SceneStemConnector({
  openIndex,
  total,
}: {
  openIndex: number;
  total: number;
}) {
  if (openIndex < 0 || total <= 0) return null;
  // Center X of the opened subgallery card, within the shared full-width
  // container that holds both the subgalleries grid and the scenes grid.
  const parentPct = (100 / total) * openIndex + 100 / (2 * total);
  // Scene centers in a 2-column full-width grid.
  const leftChildPct = 25;
  const rightChildPct = 75;
  const stem = 16;
  const drop = 14;
  const ruleLeft = Math.min(parentPct, leftChildPct);
  const ruleRight = Math.max(parentPct, rightChildPct);
  return (
    <div className="relative mx-auto hidden w-full md:block" aria-hidden>
      {/* Parent stem: drops from the opened subgallery's center */}
      <div className="relative" style={{ height: stem }}>
        <div
          className="absolute w-px bg-[color:var(--border-strong)] opacity-55"
          style={{ left: `calc(${parentPct}% - 0.5px)`, top: 0, height: stem }}
        />
      </div>
      {/* Horizontal rule joining the parent stem to both children */}
      <div className="relative" style={{ height: 1 }}>
        <div
          className="absolute top-0 h-px bg-[color:var(--border-strong)] opacity-55"
          style={{ left: `${ruleLeft}%`, right: `${100 - ruleRight}%` }}
        />
      </div>
      {/* Two symmetric drops into each scene's center */}
      <div className="relative" style={{ height: drop }}>
        <div
          className="absolute w-px bg-[color:var(--border-strong)] opacity-55"
          style={{ left: `calc(${leftChildPct}% - 0.5px)`, top: 0, height: drop }}
        />
        <div
          className="absolute w-px bg-[color:var(--border-strong)] opacity-55"
          style={{ left: `calc(${rightChildPct}% - 0.5px)`, top: 0, height: drop }}
        />
      </div>
    </div>
  );
}

/**
 * Branching connector: a short vertical stem from the parent, a horizontal
 * rule spanning the children's centers, and a short vertical drop into
 * each child. Hidden on narrow screens where children stack vertically.
 */
function BranchConnector({
  count,
  tight = false,
}: {
  count: number;
  tight?: boolean;
}) {
  const stemHeight = tight ? 14 : 22;
  const dropHeight = tight ? 10 : 16;
  // Horizontal rule spans from the center of the first child to the center
  // of the last child. In an N-column grid with equal widths, those
  // centers sit at 1/(2N) and 1 - 1/(2N).
  const leftPct = 100 / (2 * count);
  const rightPct = 100 - leftPct;

  return (
    <div
      className={`relative mx-auto w-full ${
        tight ? "hidden md:block" : "hidden md:block"
      }`}
      aria-hidden
    >
      {/* Parent stem */}
      <div
        className="mx-auto w-px bg-[color:var(--border-strong)] opacity-55"
        style={{ height: stemHeight }}
      />
      {/* Horizontal rule across child centers */}
      <div className="relative" style={{ height: 1 }}>
        <div
          className="absolute top-0 h-px bg-[color:var(--border-strong)] opacity-55"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
      </div>
      {/* Drops into each child */}
      <div className="relative" style={{ height: dropHeight }}>
        {Array.from({ length: count }).map((_, i) => {
          const centerPct = (100 / count) * i + 100 / (2 * count);
          return (
            <div
              key={i}
              className="absolute top-0 w-px bg-[color:var(--border-strong)] opacity-55"
              style={{ left: `calc(${centerPct}% - 0.5px)`, height: dropHeight }}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Cover — wraps next/image with the same soft neutral fallback used
 * before. The home gallery section sits below the fold, so we lazy-load
 * everything by default. The container's CSS gradient acts as the
 * placeholder while the image streams in (no extra blur asset needed).
 *
 * `sizes` defaults to a hint that matches the typical render widths
 * across the gallery reveal — gallery cover, subgallery card, scene
 * tile. Callers can override for tighter precision.
 */
function Cover({
  src,
  alt,
  aspectClass,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
}: {
  src: string;
  alt: string;
  aspectClass: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  return (
    <div
      className={`relative w-full overflow-hidden ${aspectClass} bg-[linear-gradient(145deg,#eef2f7_0%,#dde5ee_100%)]`}
    >
      {!errored ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={80}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          className="object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
            Placeholder
          </span>
        </div>
      )}
    </div>
  );
}
