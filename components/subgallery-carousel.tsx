"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SubgalleryCard } from "@/components/subgallery-card";
import type { Subgallery } from "@/types/memora";

export function SubgalleryCarousel({
  galleryId,
  subgalleries,
  title = "Subgalleries",
  eyebrow = "Browse the chapters",
  description,
  theme = "dark",
  onActiveIndexChange,
}: {
  galleryId: string;
  subgalleries: Subgallery[];
  title?: string;
  eyebrow?: string;
  description?: string;
  theme?: "light" | "dark";
  onActiveIndexChange?: (index: number) => void;
}) {
  const isLight = theme === "light";
  const textClass = isLight ? "text-[color:var(--ink)]" : "text-white";
  const mutedTextClass = isLight ? "text-[color:var(--ink-soft)]" : "text-white/70";
  const buttonClass = isLight
    ? "bg-[color:var(--accent-strong)] text-white hover:bg-[#22314a]"
    : "bg-white/10 text-white hover:bg-white/20";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isProgrammaticScrollRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let frame = 0;
    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;
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
        onActiveIndexChange?.(nextIndex);
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
  }, [subgalleries.length, onActiveIndexChange]);

  const scrollToCard = (direction: -1 | 1) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>("[data-subgallery-card]"),
    );
    const nextIndex = Math.max(
      0,
      Math.min(activeIndex + direction, cards.length - 1),
    );
    const targetCard = cards[nextIndex];
    if (targetCard) {
      isProgrammaticScrollRef.current = true;
      setActiveIndex(nextIndex);
      onActiveIndexChange?.(nextIndex);
      targetCard.scrollIntoView({ behavior: "instant", block: "nearest", inline: "start" });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 100);
    }
  };

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
            <p className={`mt-4 text-base leading-8 ${isLight ? "text-[color:var(--ink-soft)]" : "text-white/64"}`}>
              {description}
            </p>
          ) : null}
        </div>
        <div className="hidden gap-2 md:flex">
          <Button
            variant={isLight ? "primary" : "secondary"}
            onClick={() => scrollToCard(-1)}
            disabled={activeIndex === 0}
            className={isLight ? "disabled:opacity-40" : `${buttonClass} disabled:opacity-40`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isLight ? "primary" : "secondary"}
            onClick={() => scrollToCard(1)}
            disabled={activeIndex === subgalleries.length - 1}
            className={isLight ? "disabled:opacity-40" : `${buttonClass} disabled:opacity-40`}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="memora-carousel flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5 [-ms-overflow-style:none] [scrollbar-width:none] md:gap-5 [&::-webkit-scrollbar]:hidden"
      >
        {subgalleries.map((subgallery, index) => (
          <div
            key={subgallery.id}
            data-subgallery-card
            className="min-w-[91%] shrink-0 snap-start md:min-w-[52rem] lg:min-w-[62rem]"
          >
            <Link href={`/galleries/${galleryId}/subgalleries/${subgallery.id}`}>
              <SubgalleryCard subgallery={subgallery} active={index === activeIndex} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
