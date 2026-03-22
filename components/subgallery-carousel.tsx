"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SubgalleryCard } from "@/components/subgallery-card";
import type { Subgallery } from "@/types/memora";

export function SubgalleryCarousel({
  galleryId,
  subgalleries,
  title = "Subgalleries",
  eyebrow = "Browse the chapters",
  description,
}: {
  galleryId: string;
  subgalleries: Subgallery[];
  title?: string;
  eyebrow?: string;
  description?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const cards = Array.from(
          container.querySelectorAll<HTMLElement>("[data-subgallery-card]"),
        );
        const containerCenter = container.scrollLeft + container.clientWidth / 2;
        const nextIndex = cards.reduce(
          (bestIndex, card, index, list) => {
            const cardCenter = card.offsetLeft + card.clientWidth / 2;
            const bestCard = list[bestIndex];
            const bestCenter = bestCard.offsetLeft + bestCard.clientWidth / 2;
            return Math.abs(cardCenter - containerCenter) <
              Math.abs(bestCenter - containerCenter)
              ? index
              : bestIndex;
          },
          0,
        );
        setActiveIndex(nextIndex);
      });
    };

    let isDown = false;
    let startX = 0;
    let startLeft = 0;

    const onPointerDown = (event: PointerEvent) => {
      isDown = true;
      startX = event.clientX;
      startLeft = container.scrollLeft;
      container.setPointerCapture(event.pointerId);
      container.dataset.dragging = "true";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDown) {
        return;
      }
      const walk = event.clientX - startX;
      container.scrollLeft = startLeft - walk;
    };

    const onPointerUp = (event: PointerEvent) => {
      isDown = false;
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
      container.dataset.dragging = "false";
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointerleave", onPointerUp);
    handleScroll();

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointerleave", onPointerUp);
    };
  }, [subgalleries.length]);

  const scrollByCard = (direction: -1 | 1) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    container.scrollBy({
      left: direction * (container.clientWidth * 0.78),
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-6 text-white">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">
            {eyebrow}
          </p>
          <h2 className="mt-3 font-serif text-4xl text-white md:text-5xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-4 text-base leading-8 text-white/64">
              {description}
            </p>
          ) : null}
        </div>
        <div className="hidden gap-2 md:flex">
          <Button variant="secondary" onClick={() => scrollByCard(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={() => scrollByCard(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="memora-carousel flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {subgalleries.map((subgallery, index) => (
          <motion.div
            key={subgallery.id}
            data-subgallery-card
            animate={{
              scale: index === activeIndex ? 1 : 0.965,
              y: index === activeIndex ? -4 : 0,
              opacity: index === activeIndex ? 1 : 0.86,
            }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="min-w-[91%] snap-center md:min-w-[52rem] lg:min-w-[62rem]"
          >
            <Link href={`/galleries/${galleryId}/subgalleries/${subgallery.id}`}>
              <SubgalleryCard subgallery={subgallery} active={index === activeIndex} />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
