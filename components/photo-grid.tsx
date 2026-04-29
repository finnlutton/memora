"use client";

import Image from "next/image";
import { useState } from "react";
import { LightboxViewer } from "@/components/lightbox-viewer";
import { cn, nextImageUnoptimizedForSrc } from "@/lib/utils";
import type { MemoryPhoto } from "@/types/memora";

type Density = "paper" | "contact";

/**
 * PhotoGrid — two editorial layouts.
 *  - "paper" (default): each photo wrapped in a hairline+paper inset with a
 *    mono caption underneath, like a photo plate in an archival book.
 *  - "contact": tight 4px gutters, no chrome, gradient-overlay caption, akin
 *    to a contact sheet. Used in archive (dark) reading.
 */
export function PhotoGrid({
  photos,
  density = "paper",
}: {
  photos: MemoryPhoto[];
  density?: Density;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const isContact = density === "contact";

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3",
          isContact ? "gap-1" : "gap-2.5 sm:gap-4",
        )}
      >
        {photos.map((photo, index) => {
          const caption = photo.caption?.trim() || "";

          if (isContact) {
            return (
              <button
                key={photo.id}
                onClick={() => setOpenIndex(index)}
                className="group relative aspect-[4/5] overflow-hidden text-left"
              >
                {photo.src ? (
                  <Image
                    src={photo.src}
                    alt=""
                    fill
                    className="object-cover transition duration-700 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized={nextImageUnoptimizedForSrc(photo.src)}
                  />
                ) : null}
                {caption ? (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(10,8,6,0.78)] to-transparent px-2 pb-2 pt-8 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.16em] text-white sm:px-3 sm:pb-3 sm:text-[10px]">
                    {caption}
                  </div>
                ) : null}
              </button>
            );
          }

          return (
            <div key={photo.id} className="flex flex-col gap-1.5">
              <button
                onClick={() => setOpenIndex(index)}
                className="group relative block border border-[color:var(--border)] bg-[color:var(--paper)] p-2 text-left"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  {photo.src ? (
                    <Image
                      src={photo.src}
                      alt=""
                      fill
                      className="object-cover transition duration-700 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized={nextImageUnoptimizedForSrc(photo.src)}
                    />
                  ) : null}
                </div>
              </button>
              {caption ? (
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                  {caption}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <LightboxViewer
        photos={photos}
        openIndex={openIndex}
        onOpenIndexChange={setOpenIndex}
      />
    </>
  );
}
