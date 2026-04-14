"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { WorldGlobe } from "@/components/WorldGlobe";
import { WorkspaceTopbar } from "@/components/workspace-topbar";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function MemoryMapPage() {
  const { galleries } = useMemoraStore();

  const mapPins = useMemo(() => {
    const pins: Array<{
      id: string;
      lat: number;
      lng: number;
      title?: string;
      coverImage?: string;
      startDate?: string;
      endDate?: string;
    }> = [];

    galleries.forEach((gallery) => {
      if (typeof gallery.locationLat === "number" && typeof gallery.locationLng === "number") {
        pins.push({
          id: `gallery-${gallery.id}`,
          lat: gallery.locationLat,
          lng: gallery.locationLng,
          title: gallery.title,
          coverImage: gallery.coverImage,
          startDate: gallery.startDate,
          endDate: gallery.endDate,
        });
      }

      gallery.subgalleries.forEach((subgallery) => {
        if (typeof subgallery.locationLat === "number" && typeof subgallery.locationLng === "number") {
          pins.push({
            id: `subgallery-${subgallery.id}`,
            lat: subgallery.locationLat,
            lng: subgallery.locationLng,
            title: subgallery.title,
            coverImage: subgallery.coverImage,
          });
        }
      });
    });

    return pins;
  }, [galleries]);

  return (
    <AppShell>
      <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden">
        <WorkspaceTopbar
          className="mb-0 pb-4"
          eyebrow="Memory map"
          title="Memory Map"
          subtitle="Explore your archive spatially. Select a location in gallery or subgallery edit to place a pin."
        />

        <section className="relative -mx-4 min-h-0 flex-1 md:-mx-8">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[color:var(--background)]">
            <WorldGlobe width={1260} height={760} pins={mapPins} allowWheelZoom />
          </div>
          <div className="pointer-events-none absolute right-5 top-5 text-xs tracking-[0.08em] text-[color:var(--ink-soft)] md:right-6 md:top-6">
            {mapPins.length} mapped memories
          </div>
        </section>
      </div>
    </AppShell>
  );
}

