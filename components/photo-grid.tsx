"use client";

import Image from "next/image";
import { useState } from "react";
import { LightboxViewer } from "@/components/lightbox-viewer";
import { nextImageUnoptimizedForSrc } from "@/lib/utils";
import type { MemoryPhoto } from "@/types/memora";

export function PhotoGrid({ photos }: { photos: MemoryPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setOpenIndex(index)}
            className="group relative aspect-[4/5] overflow-hidden border border-[color:var(--border)] bg-[rgba(255,255,255,0.82)] text-left shadow-[0_12px_28px_rgba(34,49,71,0.06)] transition duration-300 hover:shadow-[0_18px_36px_rgba(34,49,71,0.1)]"
          >
            <Image
              src={photo.src}
              alt={photo.caption || "Memory photo"}
              fill
              className="object-cover transition duration-700 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized={nextImageUnoptimizedForSrc(photo.src)}
            />
            {photo.caption ? (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(10,18,30,0.68)] to-transparent px-4 pb-4 pt-10 text-left text-sm text-white">
                {photo.caption}
              </div>
            ) : null}
          </button>
        ))}
      </div>
      <LightboxViewer
        photos={photos}
        openIndex={openIndex}
        onOpenIndexChange={setOpenIndex}
      />
    </>
  );
}
