"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { nextImageUnoptimizedForSrc } from "@/lib/utils";
import type { MemoryPhoto } from "@/types/memora";

const SWIPE_THRESHOLD_PX = 60;
const SWIPE_MAX_VERTICAL_DRIFT = 80;

export function LightboxViewer({
  photos,
  openIndex,
  onOpenIndexChange,
}: {
  photos: MemoryPhoto[];
  openIndex: number | null;
  onOpenIndexChange: (index: number | null) => void;
}) {
  const isOpen = openIndex !== null;
  const current = openIndex !== null ? photos[openIndex] : null;
  const [captionOpen, setCaptionOpen] = useState(true);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenIndexChange(null);
      }
      if (event.key === "ArrowRight" && openIndex !== null) {
        onOpenIndexChange((openIndex + 1) % photos.length);
      }
      if (event.key === "ArrowLeft" && openIndex !== null) {
        onOpenIndexChange((openIndex - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, openIndex, onOpenIndexChange, photos.length]);

  // Re-show the caption whenever the user advances to a different photo —
  // the prior photo's hide-state shouldn't carry over to a new caption.
  useEffect(() => {
    if (openIndex !== null) setCaptionOpen(true);
  }, [openIndex]);

  const goPrev = () => {
    if (openIndex === null) return;
    onOpenIndexChange((openIndex - 1 + photos.length) % photos.length);
  };
  const goNext = () => {
    if (openIndex === null) return;
    onOpenIndexChange((openIndex + 1) % photos.length);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Only respond to primary touch / mouse — ignore right-click.
    if (event.button !== 0 && event.pointerType === "mouse") return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dy) > SWIPE_MAX_VERTICAL_DRIFT) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) {
      // A short, mostly-stationary press is a tap — toggle the caption so
      // mobile viewers can clear the bottom band and see the photograph
      // unobstructed.
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        setCaptionOpen((value) => !value);
      }
      return;
    }
    if (dx < 0) goNext();
    else goPrev();
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onOpenIndexChange(null);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(9,14,22,0.76)] backdrop-blur-md" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-8">
          {current ? (
            <div className="relative flex h-full w-full max-w-6xl flex-col justify-center gap-3 md:gap-5">
              {/* Counter pill — tells you where you are in the set without
                  needing to read the caption. */}
              <div className="absolute left-0 top-0 z-10">
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/80 backdrop-blur">
                  {openIndex! + 1} / {photos.length}
                </span>
              </div>
              <div className="absolute right-0 top-0 z-10">
                <Dialog.Close asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Close lightbox"
                    className="bg-white/10 text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </Dialog.Close>
              </div>
              <div
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => {
                  swipeStartRef.current = null;
                }}
                className="relative flex-1 overflow-hidden rounded-[1.1rem] border border-white/10 bg-[rgba(255,255,255,0.05)] touch-pan-y select-none md:rounded-[2rem]"
              >
                <Image
                  src={current.src}
                  alt={current.caption || "Photo"}
                  fill
                  className="pointer-events-none object-contain"
                  sizes="100vw"
                  unoptimized={nextImageUnoptimizedForSrc(current.src)}
                  draggable={false}
                />
                {/* Side chevrons — full-height edge buttons so the thumb
                    can navigate from either screen edge without needing
                    to find a small target. Hidden behind a thin gradient
                    on hover/touch so the photo stays the focus. */}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goPrev();
                  }}
                  aria-label="Previous photo"
                  className="absolute inset-y-0 left-0 flex w-14 items-center justify-center text-white/0 transition hover:text-white/90 active:text-white md:w-20"
                >
                  <span className="rounded-full bg-black/30 p-2 backdrop-blur md:p-2.5">
                    <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goNext();
                  }}
                  aria-label="Next photo"
                  className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-white/0 transition hover:text-white/90 active:text-white md:w-20"
                >
                  <span className="rounded-full bg-black/30 p-2 backdrop-blur md:p-2.5">
                    <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                  </span>
                </button>
              </div>
              {captionOpen && current.caption ? (
                <div className="flex items-end gap-3 text-white md:gap-4">
                  <p className="min-w-0 flex-1 max-w-2xl text-[13px] leading-6 text-white/88 md:text-sm md:leading-7">
                    {current.caption}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCaptionOpen(false)}
                    aria-label="Hide caption"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white md:h-8 md:w-8"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              {/* Mobile-only swipe hint — single line, subtle, hides on
                  desktop since cursors don't swipe. */}
              <p className="text-center text-[10px] uppercase tracking-[0.22em] text-white/40 md:hidden">
                Swipe or tap edges · Tap photo to {captionOpen ? "hide" : "show"} caption
              </p>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
