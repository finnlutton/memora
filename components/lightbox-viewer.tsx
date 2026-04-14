"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { nextImageUnoptimizedForSrc } from "@/lib/utils";
import type { MemoryPhoto } from "@/types/memora";

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
              <div className="absolute right-0 top-0 z-10">
                <Dialog.Close asChild>
                  <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                    <X className="h-4 w-4" />
                    Close
                  </Button>
                </Dialog.Close>
              </div>
              <div className="relative flex-1 overflow-hidden rounded-[1.1rem] border border-white/10 bg-[rgba(255,255,255,0.05)] md:rounded-[2rem]">
                <Image
                  src={current.src}
                  alt={current.caption || "Photo"}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  unoptimized={nextImageUnoptimizedForSrc(current.src)}
                />
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3 text-white md:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/60">
                    Photo {openIndex! + 1} of {photos.length}
                  </p>
                  <p className="mt-1.5 max-w-2xl text-xs leading-6 text-white/88 md:mt-2 md:text-sm md:leading-7">
                    {current.caption || "No caption yet. Add one in the scene editor to deepen the memory."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="bg-white/10 text-white hover:bg-white/20"
                    onClick={() =>
                      onOpenIndexChange((openIndex! - 1 + photos.length) % photos.length)
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-white/10 text-white hover:bg-white/20"
                    onClick={() => onOpenIndexChange((openIndex! + 1) % photos.length)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
