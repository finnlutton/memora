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
        <div className="rounded-[10px] bg-[linear-gradient(180deg,rgba(244,248,253,0.85),rgba(239,245,251,0.62))] px-4 py-5 md:px-5 md:py-6">
          <div
            className={`grid gap-6 transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isOpen
                ? "lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:items-center"
                : "lg:grid-cols-1 lg:place-items-center"
            }`}
          >
            <motion.button
              type="button"
              layout
              onClick={() => setIsOpen((current) => !current)}
              whileHover={{ y: -2 }}
              transition={{ layout: { duration: 0.52, ease: [0.22, 1, 0.36, 1] }, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={`group relative overflow-hidden rounded-[8px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.78)] text-left shadow-[0_14px_42px_rgba(18,31,48,0.08)] ${
                isOpen ? "lg:-translate-x-2" : "mx-auto w-full max-w-[34rem]"
              }`}
            >
              <div className="relative aspect-[4/5] overflow-hidden md:aspect-[16/13]">
                <Image
                  src={gallery.coverImage}
                  alt="Winter Olympics 2026"
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 1024px) 100vw, 26rem"
                  unoptimized={nextImageUnoptimizedForSrc(gallery.coverImage)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(8,14,24,0.88)] via-[rgba(8,14,24,0.22)] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/62">
                    Gallery
                  </p>
                  <h3 className="mt-3 font-serif text-3xl leading-[1.02] text-white md:text-[2.25rem]">
                    Winter Olympics 2026
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/76">
                    Open one archive to reveal the scenes that give it shape.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/72">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Click to open
                  </div>
                </div>
              </div>
            </motion.button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="subgalleries"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  {subgalleries.map((subgallery, index) => (
                    <motion.article
                      key={subgallery.id}
                      initial={{ opacity: 0, y: 18, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{
                        duration: 0.38,
                        delay: 0.06 + index * 0.05,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="overflow-hidden rounded-[8px] border border-[color:var(--border)] bg-[rgba(255,255,255,0.78)]"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <Image
                          src={subgallery.coverImage}
                          alt={subgallery.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 26vw"
                          unoptimized={nextImageUnoptimizedForSrc(subgallery.coverImage)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(8,14,24,0.66)] via-transparent to-transparent" />
                      </div>
                      <div className="p-4 md:p-5">
                        <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {subgallery.location}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {subgallery.dateLabel}
                          </span>
                        </div>
                        <h3 className="mt-3 font-serif text-xl leading-tight text-[color:var(--ink)] md:text-[1.4rem]">
                          {subgallery.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                          {subgallery.description}
                        </p>
                      </div>
                    </motion.article>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
