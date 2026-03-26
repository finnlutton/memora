"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { useState } from "react";
import { nextImageUnoptimizedForSrc } from "@/lib/utils";
import type { Gallery } from "@/types/memora";

export function HomeGalleryReveal({ gallery }: { gallery: Gallery }) {
  const subgalleries = gallery.subgalleries.slice(0, 4);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="py-10 md:py-12">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
          Gallery structure
        </p>
        <h2 className="mt-3 font-serif text-3xl leading-[1.02] text-[color:var(--ink)] md:text-4xl">
          A gallery unfolds into scenes.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)]">
          Memora organizes memories as one larger archive, then reveals the places, moments, and chapters inside it.
        </p>
      </div>

      <div className="mt-8">
        <div className="relative overflow-hidden rounded-[10px] bg-[linear-gradient(180deg,rgba(244,248,253,0.85),rgba(239,245,251,0.62))] px-4 py-5 md:px-5 md:py-6">
          <AnimatePresence initial={false}>
            {isOpen ? (
              <motion.div
                key="gallery-atmosphere"
                layoutId="home-gallery-shell"
                className="absolute inset-0"
                transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="absolute inset-0 overflow-hidden">
                  <Image
                    src={gallery.coverImage}
                    alt="Winter Olympics 2026 background"
                    fill
                    className="scale-[1.08] object-cover blur-[2px] brightness-[0.82] saturate-[0.88]"
                    sizes="100vw"
                    unoptimized={nextImageUnoptimizedForSrc(gallery.coverImage)}
                  />
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(242,246,250,0.44),rgba(10,18,28,0.36))]" />
                <div className="absolute inset-0 bg-[rgba(238,244,250,0.22)]" />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="relative min-h-[30rem] md:min-h-[42rem]">
            <AnimatePresence mode="wait" initial={false}>
              {!isOpen ? (
                <motion.div
                  key="closed-gallery"
                  className="flex min-h-[30rem] items-center justify-center md:min-h-[42rem]"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.button
                    type="button"
                    layoutId="home-gallery-shell"
                    onClick={() => setIsOpen(true)}
                    whileHover={{ y: -2 }}
                    transition={{
                      layout: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
                      duration: 0.28,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="group relative w-full max-w-[42rem] overflow-hidden rounded-[8px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.78)] text-left shadow-[0_14px_42px_rgba(18,31,48,0.08)]"
                  >
                    <div className="relative aspect-[16/13] overflow-hidden">
                      <Image
                        src={gallery.coverImage}
                        alt="Winter Olympics 2026"
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.02]"
                        sizes="(max-width: 1024px) 100vw, 42rem"
                        unoptimized={nextImageUnoptimizedForSrc(gallery.coverImage)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(8,14,24,0.76)] via-[rgba(8,14,24,0.16)] to-[rgba(255,255,255,0.04)]" />
                      <div className="absolute inset-0 bg-[rgba(255,255,255,0.06)]" />
                      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-white/62">
                          Gallery
                        </p>
                        <h3 className="mt-3 font-serif text-3xl leading-[1.02] text-white md:text-[2.25rem]">
                          Winter Olympics 2026
                        </h3>
                        <p className="mt-3 max-w-sm text-sm leading-6 text-white/82">
                          Open one archive to reveal the scenes that give it shape.
                        </p>
                        <div className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/72">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          Click to open
                        </div>
                      </div>
                    </div>
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="open-gallery"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="flex min-h-[30rem] flex-col justify-center md:min-h-[42rem]"
                >
                  <button
                    type="button"
                    aria-label="Close gallery"
                    onClick={() => setIsOpen(false)}
                    className="absolute inset-0 z-0"
                  />

                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 mx-auto w-full max-w-6xl px-1 text-center"
                  >
                    <button type="button" onClick={() => setIsOpen(false)} className="text-center">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-white/64">
                        Gallery
                      </p>
                      <h3 className="mt-3 font-serif text-3xl leading-[1.02] text-white md:text-[2.35rem]">
                        Winter Olympics 2026
                      </h3>
                    </button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.46, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 mx-auto mt-10 grid w-full max-w-[88rem] gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5"
                  >
                    {subgalleries.map((subgallery, index) => (
                      <motion.article
                        key={subgallery.id}
                        initial={{ opacity: 0, y: 18, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          duration: 0.38,
                          delay: 0.12 + index * 0.05,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="flex h-full min-w-0 flex-col overflow-hidden rounded-[8px] border border-white/18 bg-[rgba(248,251,255,0.84)] shadow-[0_12px_28px_rgba(13,21,34,0.08)] backdrop-blur-sm"
                      >
                        <div className="relative aspect-[0.98/1] w-full overflow-hidden">
                          <Image
                            src={subgallery.coverImage}
                            alt={subgallery.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 28vw"
                            unoptimized={nextImageUnoptimizedForSrc(subgallery.coverImage)}
                          />
                        </div>
                        <div className="flex flex-1 flex-col bg-[rgba(255,255,255,0.92)] px-4 py-3 md:px-4 md:py-3.5">
                          <h3 className="font-serif text-lg leading-tight text-[color:var(--ink)] md:text-[1.15rem]">
                            {subgallery.title === "Zurich" ? "Landing in Zurich" : subgallery.title}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[9px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)] md:text-[9.5px]">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {subgallery.location}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {subgallery.dateLabel}
                            </span>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
