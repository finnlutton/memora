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
}: {
  galleryId: string;
  subgalleries: Subgallery[];
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
      container.releasePointerCapture(event.pointerId);
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
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            Browse the chapters
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[color:var(--ink)] md:text-4xl">
            Subgalleries
          </h2>
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
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {subgalleries.map((subgallery, index) => (
          <motion.div
            key={subgallery.id}
            data-subgallery-card
            animate={{
              scale: index === activeIndex ? 1 : 0.97,
              y: index === activeIndex ? -4 : 0,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="min-w-[88%] snap-center md:min-w-[42rem] lg:min-w-[46rem]"
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
