"use client";

import { AnimatePresence, motion } from "framer-motion";
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
 *     └── 3 Subgalleries  (revealed when the gallery is clicked)
 *           └── scenes each  (revealed when a subgallery is clicked)
 *
 * The cover image itself is the click target at every level — no separate
 * "Open" toggle. Editorial chrome mirrors the live gallery + share screens.
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
          Click my gallery to see what I mean. If you prefer
          organization, you won&apos;t look back.
        </p>
      </div>

      <div className="mx-auto mt-12 flex w-full max-w-7xl flex-col items-center">
        {/* ── Level 1: Gallery ─────────────────────────────────────────── */}
        <GalleryCard
          title={gallery.title}
          location={gallery.location}
          dates={gallery.dates}
          description={gallery.description}
          image={gallery.coverImage}
          open={galleryOpen}
          onToggle={toggleGallery}
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
                <BranchConnector count={gallery.subgalleries.length} />

                <div className="mt-0 grid gap-x-6 gap-y-12 sm:grid-cols-2 md:grid-cols-3 md:gap-x-8 md:gap-y-16">
                  {gallery.subgalleries.map((sub) => (
                    <SubgalleryCard
                      key={sub.id}
                      sub={sub}
                      open={openSubId === sub.id}
                      onToggle={() =>
                        setOpenSubId((prev) => (prev === sub.id ? null : sub.id))
                      }
                    />
                  ))}
                </div>

                {/* ── Level 3: Scenes ─────────────────────────────────── */}
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
                      <div className="pt-10 md:pt-14">
                        <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                          Scenes
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-7 md:gap-x-6 md:gap-y-10">
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
  onToggle,
}: {
  title: string;
  location: string;
  dates: string;
  description: string;
  image: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.24, ease: EASE }}
      className="w-full max-w-[44rem]"
    >
      <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
        Gallery
      </p>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? "Close gallery" : "Open gallery"}
        className="group mt-3 block w-full text-left"
      >
        <div className="relative border border-[color:var(--border)] bg-[color:var(--paper)] p-2 md:p-[14px]">
          <div className="relative aspect-[16/10] overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)]">
            <Cover
              src={image}
              alt={title}
              sizes="(max-width: 768px) 100vw, 704px"
            />
          </div>
        </div>
        <h3 className="mt-2 font-serif text-[26px] leading-[1.08] text-[color:var(--ink)] md:mt-3 md:text-[34px]">
          {title}
        </h3>
      </button>
      <p className="mt-2 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
        {[location, dates].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-3 text-[14px] leading-7 text-[color:var(--ink-soft)] md:mt-4 md:text-[15px]">
        {description}
      </p>
    </motion.div>
  );
}

/* ── Subgallery card ─────────────────────────────────────────────────── */

function SubgalleryCard({
  sub,
  open,
  onToggle,
}: {
  sub: DemoSubgallery;
  open: boolean;
  onToggle: () => void;
}) {
  const meta = [sub.location, sub.dates].filter(Boolean).join(" · ");
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="flex flex-col"
    >
      <p className="font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
        Subgallery
      </p>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? `Hide scenes in ${sub.title}` : `Open scenes in ${sub.title}`}
        className="group mt-3 block w-full text-left"
      >
        <div className="relative border border-[color:var(--border)] bg-[color:var(--paper)] p-2 md:p-[12px]">
          <div className="relative aspect-[5/3] overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)]">
            <Cover
              src={sub.coverImage}
              alt={sub.title}
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          </div>
        </div>
        <h4 className="mt-2 font-serif text-[22px] leading-[1.12] text-[color:var(--ink)] md:mt-3 md:text-[28px]">
          {sub.title}
        </h4>
      </button>
      {meta ? (
        <p className="mt-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
          {meta}
        </p>
      ) : null}
      <p className="mt-3 text-[14px] leading-[1.65] text-[color:var(--ink-soft)] md:text-[15px]">
        {sub.description}
      </p>
    </motion.div>
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
      <div className="relative border border-[color:var(--border)] bg-[color:var(--paper)] p-1.5 md:p-2.5">
        <div className="relative aspect-[4/3] overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)]">
          <Cover
            src={scene.image}
            alt={scene.title ?? "Scene"}
            sizes="(max-width: 768px) 50vw, 480px"
          />
        </div>
      </div>
      {scene.caption ? (
        <p className="mt-2.5 font-serif text-[13px] italic leading-snug text-[color:var(--ink-soft)] md:text-[14px]">
          {scene.caption}
        </p>
      ) : null}
    </motion.article>
  );
}

/* ── Shared primitives ───────────────────────────────────────────────── */

/**
 * Branching connector: a short vertical stem from the parent, a horizontal
 * rule spanning the children's centers, and a short vertical drop into
 * each child. Hidden on narrow screens where children stack vertically.
 */
function BranchConnector({ count }: { count: number }) {
  const stemHeight = 22;
  const dropHeight = 16;
  const leftPct = 100 / (2 * count);
  const rightPct = 100 - leftPct;

  return (
    <div className="relative mx-auto hidden w-full sm:block" aria-hidden>
      <div
        className="mx-auto w-px bg-[color:var(--border-strong)] opacity-55"
        style={{ height: stemHeight }}
      />
      <div className="relative" style={{ height: 1 }}>
        <div
          className="absolute top-0 h-px bg-[color:var(--border-strong)] opacity-55"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
      </div>
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
 * Cover — wraps next/image with a soft neutral fallback. The home gallery
 * section sits below the fold, so we lazy-load everything by default.
 */
function Cover({
  src,
  alt,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  return (
    <>
      {!errored ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={80}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          className="object-cover transition duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.015]"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
            Placeholder
          </span>
        </div>
      )}
    </>
  );
}
