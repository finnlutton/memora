"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GalleryForm } from "@/components/gallery-form";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { createId } from "@/lib/utils";
import type { MemoryPhoto } from "@/types/memora";

function formatSubgalleryDateLabel(startDate: string, endDate: string): string {
  if (!startDate) return "Your journey";
  const start = new Date(startDate);
  const startStr = start.toLocaleDateString("en", { month: "short", day: "numeric" });
  if (!endDate || startDate === endDate) return startStr;
  const end = new Date(endDate);
  const endStr = end.toLocaleDateString("en", { month: "short", day: "numeric" });
  return start.getMonth() === end.getMonth()
    ? `${startStr.split(" ")[0]} ${start.getDate()}-${end.getDate()}`
    : `${startStr} - ${endStr}`;
}

export default function DemoCreatePage() {
  const router = useRouter();
  const { createGallery, createSubgallery } = useMemoraStore();

  return (
    <AppShell>
      <section className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Try the demo
        </p>
        <h1 className="mt-3 font-serif text-5xl text-[color:var(--ink)]">Create a test gallery</h1>
      </section>
      <GalleryForm
        createLabel="Create gallery"
        backHref="/"
        backLabel="Back to home"
        defaultCoverImage="/demo/alpine-village.png"
        onSubmit={(value) => {
          const galleryId = createGallery(value);
          const tempSubgalleryId = createId("temp-sub");
          const now = new Date().toISOString();
          const firstLocation = value.locations[0]?.trim() || "Your journey";
          const locationDisplay = value.locations.length > 1
            ? `${firstLocation} and ${value.locations.length - 1} more`
            : firstLocation;
          const coverPhoto: MemoryPhoto = {
            id: createId("photo"),
            subgalleryId: tempSubgalleryId,
            src: value.coverImage,
            caption: "",
            createdAt: now,
            order: 0,
          };
          createSubgallery(galleryId, {
            title: value.title,
            coverImage: value.coverImage,
            location: locationDisplay,
            dateLabel: formatSubgalleryDateLabel(value.startDate, value.endDate),
            description: value.description,
            photos: [coverPhoto],
          });
          router.push("/galleries");
        }}
      />
    </AppShell>
  );
}
