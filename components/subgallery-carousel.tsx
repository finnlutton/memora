"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const positionCard = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const nextIndex = Math.max(0, Math.min(index, subgalleries.length - 1));
      const card = cardRefs.current[nextIndex];
      if (!card) {
        return nextIndex;
      }

      card.scrollIntoView({
        behavior,
        inline: "start",
        block: "nearest",
      });
      return nextIndex;
    },
    [subgalleries.length],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
        const containerLeft = container.scrollLeft;
        const nextIndex = cards.reduce(
          (bestIndex, card, index, list) => {
            const cardLeft = card.offsetLeft;
            const bestCard = list[bestIndex];
            const bestLeft = bestCard.offsetLeft;
            return Math.abs(cardLeft - containerLeft) <
              Math.abs(bestLeft - containerLeft)
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
    positionCard(0, "auto");

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointerleave", onPointerUp);
    };
  }, [positionCard, subgalleries.length]);

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
          <Button
            variant="secondary"
            onClick={() => {
              const nextIndex = positionCard(activeIndex - 1);
              setActiveIndex(nextIndex);
            }}
            disabled={activeIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const nextIndex = positionCard(activeIndex + 1);
              setActiveIndex(nextIndex);
            }}
            disabled={activeIndex === subgalleries.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="memora-carousel flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5 [-ms-overflow-style:none] [scrollbar-width:none] md:gap-5 [&::-webkit-scrollbar]:hidden"
      >
        {subgalleries.map((subgallery, index) => (
          <motion.div
            key={subgallery.id}
            ref={(element) => {
              cardRefs.current[index] = element;
            }}
            data-subgallery-card
            animate={{
              scale: index === activeIndex ? 1 : 0.965,
              y: index === activeIndex ? -4 : 0,
              opacity: index === activeIndex ? 1 : 0.86,
            }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="w-[92%] shrink-0 snap-start md:w-[44rem] lg:w-[54rem] xl:w-[62rem]"
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
