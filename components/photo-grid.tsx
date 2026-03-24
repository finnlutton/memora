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
      <div className="grid auto-rows-[14rem] grid-cols-2 gap-4 md:grid-cols-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setOpenIndex(index)}
            className={`group relative overflow-hidden rounded-[1.75rem] border border-white/60 shadow-[0_16px_40px_rgba(34,49,71,0.08)] ${
              index % 5 === 0 ? "col-span-2 row-span-2" : ""
            }`}
          >
            <Image
              src={photo.src}
              alt={photo.caption || "Memory photo"}
              fill
              className="object-cover transition duration-700 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 50vw, 25vw"
              unoptimized={nextImageUnoptimizedForSrc(photo.src)}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(11,20,31,0.72)] to-transparent px-4 pb-4 pt-10 text-left text-sm text-white">
              {photo.caption || "Tap to open"}
            </div>
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
