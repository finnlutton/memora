"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SubgalleryCard } from "@/components/subgallery-card";
import type { Subgallery } from "@/types/memora";

export function SubgalleryCarousel({
  galleryId,
  subgalleries = [],
  title = "Subgalleries",
  eyebrow = "Browse the chapters",
  description,
  theme = "dark",
  clickable = true,
  onActiveIndexChange,
}: {
  galleryId: string;
  subgalleries?: Subgallery[];
  title?: string;
  eyebrow?: string;
  description?: string;
  theme?: "light" | "dark";
  clickable?: boolean;
  onActiveIndexChange?: (index: number) => void;
}) {
  const isLight = theme === "light";
  const textClass = isLight ? "text-[color:var(--ink)]" : "text-white";
  const mutedTextClass = isLight ? "text-[color:var(--ink-soft)]" : "text-white/70";
  const buttonClass = isLight
    ? "disabled:opacity-40"
    : "bg-white/10 text-white hover:bg-white/20 disabled:opacity-40";

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
        const nextIndex = cards.reduce((bestIndex, card, index, list) => {
          const cardLeft = card.offsetLeft;
          const bestCard = list[bestIndex];
          const bestLeft = bestCard.offsetLeft;
          return Math.abs(cardLeft - containerLeft) < Math.abs(bestLeft - containerLeft)
            ? index
            : bestIndex;
        }, 0);

        setActiveIndex(nextIndex);
        onActiveIndexChange?.(nextIndex);
      });
    };

    let isDown = false;
    let isDragging = false;
    let startX = 0;
    let startLeft = 0;

    const onPointerDown = (event: PointerEvent) => {
      isDown = true;
      isDragging = false;
      startX = event.clientX;
      startLeft = container.scrollLeft;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDown) return;
      const delta = Math.abs(event.clientX - startX);
      if (!isDragging && delta > 5) {
        isDragging = true;
        container.setPointerCapture(event.pointerId);
        container.dataset.dragging = "true";
      }
      if (isDragging) {
        container.scrollLeft = startLeft - (event.clientX - startX);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (isDragging && container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
      isDown = false;
      isDragging = false;
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
  }, [onActiveIndexChange, positionCard]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className={`text-[11px] uppercase tracking-[0.28em] sm:text-sm ${mutedTextClass}`}>
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2 className={`font-serif text-3xl md:text-4xl ${eyebrow ? "mt-3" : ""} ${textClass}`}>
              {title}
            </h2>
          ) : null}
          {description ? (
            <p
              className={`mt-4 text-base leading-8 ${
                isLight ? "text-[color:var(--ink-soft)]" : "text-white/64"
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
        <div className="hidden gap-2 md:flex">
          <Button
            variant={isLight ? "primary" : "secondary"}
            onClick={() => {
              const nextIndex = positionCard(activeIndex - 1);
              setActiveIndex(nextIndex);
              onActiveIndexChange?.(nextIndex);
            }}
            disabled={activeIndex === 0}
            className={buttonClass}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isLight ? "primary" : "secondary"}
            onClick={() => {
              const nextIndex = positionCard(activeIndex + 1);
              setActiveIndex(nextIndex);
              onActiveIndexChange?.(nextIndex);
            }}
            disabled={subgalleries.length < 2 || activeIndex === subgalleries.length - 1}
            className={buttonClass}
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
          <div
            key={subgallery.id}
            ref={(element) => {
              cardRefs.current[index] = element;
            }}
            data-subgallery-card
            className="w-[94%] shrink-0 snap-start md:w-[44rem] lg:w-[54rem] xl:w-[62rem]"
          >
            {clickable ? (
              <Link
                href={`/galleries/${galleryId}/subgalleries/${subgallery.id}`}
                className="block"
              >
                <SubgalleryCard subgallery={subgallery} active={index === activeIndex} />
              </Link>
            ) : (
              <SubgalleryCard subgallery={subgallery} active={index === activeIndex} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
