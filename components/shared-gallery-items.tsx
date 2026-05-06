"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { LightboxViewer } from "@/components/lightbox-viewer";
import { nextImageUnoptimizedForSrc } from "@/lib/utils";
import type { GalleryDivider, MemoryPhoto } from "@/types/memora";

type Item =
  | { kind: "photo"; data: MemoryPhoto }
  | { kind: "divider"; data: GalleryDivider };

export function SharedGalleryItems({
  photos,
  dividers,
}: {
  photos: MemoryPhoto[];
  dividers: GalleryDivider[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const items = useMemo<Item[]>(() => {
    const merged: Array<Item & { order: number }> = [
      ...photos.map((p) => ({ kind: "photo" as const, data: p, order: p.order })),
      ...dividers.map((d) => ({ kind: "divider" as const, data: d, order: d.order })),
    ];
    merged.sort((a, b) => a.order - b.order);
    return merged.map(({ kind, data }) =>
      kind === "photo"
        ? ({ kind: "photo", data: data as MemoryPhoto } satisfies Item)
        : ({ kind: "divider", data: data as GalleryDivider } satisfies Item),
    );
  }, [photos, dividers]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {items.map((item) => {
          if (item.kind === "divider") {
            const label = item.data.label?.trim() || "";
            if (!label) return null;
            return (
              <div key={item.data.id} className="col-span-full pt-3">
                <div className="flex flex-col">
                  <h3 className="font-serif text-[19px] leading-tight text-[color:var(--ink)] md:text-[22px]">
                    {label}
                  </h3>
                  <span
                    aria-hidden
                    className="mt-1 h-px w-12 bg-[color:var(--border-strong)]"
                  />
                </div>
              </div>
            );
          }
          const photo = item.data;
          const caption = photo.caption?.trim() || "";
          const photoIdx = photos.findIndex((p) => p.id === photo.id);
          return (
            <div key={photo.id} className="flex flex-col gap-1.5">
              <button
                onClick={() => setOpenIndex(photoIdx)}
                className="group relative block border border-[color:var(--border)] bg-[color:var(--paper)] p-2 text-left"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  {photo.src ? (
                    <Image
                      src={photo.src}
                      alt=""
                      fill
                      className="object-cover transition duration-700 group-hover:scale-[1.03]"
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      quality={80}
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
