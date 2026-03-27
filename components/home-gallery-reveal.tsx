"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { useState } from "react";
import { nextImageUnoptimizedForSrc } from "@/lib/utils";
import type { Gallery } from "@/types/memora";

export function HomeGalleryReveal({ gallery }: { gallery: Gallery }) {
  const subgalleries = gallery.subgalleries
    .filter((subgallery) => subgallery.title !== "Train to Livigno")
    .slice(0, 3);
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
          <div className="relative min-h-[30rem] md:min-h-[44rem]">
            <AnimatePresence mode="wait" initial={false}>
              {!isOpen ? (
                <motion.div
                  key="closed-gallery"
                  className="flex min-h-[30rem] items-center justify-center md:min-h-[44rem]"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 1.08 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    whileHover={{ y: -2 }}
                    transition={{
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
                  className="flex min-h-[30rem] flex-col justify-start pt-2 md:min-h-[44rem] md:pt-0"
                >
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 mx-auto w-full max-w-6xl px-1 text-center"
                  >
                    <button type="button" onClick={() => setIsOpen(false)} className="text-center">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                        Open gallery
                      </p>
                      <h3 className="mt-3 font-serif text-3xl leading-[1.02] text-[color:var(--ink)] md:text-[2.35rem]">
                        Winter Olympics 2026
                      </h3>
                    </button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.46, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 mx-auto mt-6 grid w-full max-w-[104rem] gap-5 md:mt-8 xl:grid-cols-3 xl:gap-7"
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
                        className="flex h-full min-w-0 flex-col overflow-hidden rounded-[8px] border border-[color:var(--border)] bg-[rgba(248,251,255,0.7)] shadow-[0_12px_28px_rgba(13,21,34,0.06)]"
                      >
                        <div className="relative aspect-[1.14/1] w-full overflow-hidden">
                          <Image
                            src={subgallery.coverImage}
                            alt={subgallery.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1279px) 100vw, 33vw"
                            unoptimized={nextImageUnoptimizedForSrc(subgallery.coverImage)}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(8,14,24,0.82)] via-[rgba(8,14,24,0.14)] to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                            <div className="max-w-[20rem]">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[9px] uppercase tracking-[0.16em] text-white/68 md:text-[9.5px]">
                                <span className="inline-flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {subgallery.location}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {subgallery.dateLabel}
                                </span>
                              </div>
                              <h3 className="mt-3 font-serif text-lg leading-tight text-white md:text-[1.18rem]">
                                {subgallery.title === "Zurich" ? "Landing in Zurich" : subgallery.title}
                              </h3>
                              <p className="mt-2 max-w-[18rem] text-sm leading-5 text-white/82">
                                {toShortDescription(subgallery.description)}
                              </p>
                            </div>
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

function toShortDescription(description: string) {
  const [firstSentence] = description.split(". ");
  if (!firstSentence) {
    return description;
  }

  return firstSentence.endsWith(".") ? firstSentence : `${firstSentence}.`;
}
