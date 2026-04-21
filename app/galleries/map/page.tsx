"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { WorldGlobe } from "@/components/WorldGlobe";
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
        if (
          typeof subgallery.locationLat === "number" &&
          typeof subgallery.locationLng === "number"
        ) {
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

  const pinCount = mapPins.length;
  const pinLabel = pinCount === 1 ? "mapped memory" : "mapped memories";

  return (
    <AppShell>
      {/*
        The page owns the viewport from below the AppShell header to the bottom edge.
        We render a full-bleed fixed stage so the globe escapes AppShell's max-w-7xl
        clamp without fighting it via negative margins. All overlay wrappers are
        pointer-events-none so drag-rotate on the globe always works through them;
        only the actual controls opt back into pointer events.
      */}
      <div aria-hidden="true" className="sr-only">
        Memory Map is rendered as a full-bleed stage below the site header.
      </div>

      <section
        aria-labelledby="memory-map-title"
        style={{
          left: "var(--workspace-sidebar-width, 0px)",
          top: "var(--workspace-chrome-top, 0px)",
          transition:
            "left 320ms cubic-bezier(0.22, 1, 0.36, 1), top 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="fixed bottom-0 right-0 z-0 overflow-hidden"
      >
        {/* Globe fills the stage; ResizeObserver inside WorldGlobe handles responsive sizing. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <WorldGlobe pins={mapPins} allowWheelZoom />
        </div>

        {/* Subtle atmospheric vignette to anchor overlays against varying globe colors. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(244,248,252,0.55)_100%)]"
        />

        {/* Editorial header — top-left, floating on the globe. */}
        <header className="pointer-events-none absolute left-5 top-6 max-w-[22rem] md:left-10 md:top-10 md:max-w-md">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
            Memory map
          </p>
          <h1
            id="memory-map-title"
            className="mt-2 font-serif text-[40px] leading-[0.94] text-[color:var(--ink)] md:mt-3 md:text-[64px]"
          >
            Memory Map
          </h1>
          <p className="mt-3 hidden max-w-sm text-[13px] leading-6 text-[color:var(--ink-soft)] md:block">
            Every pin is a place you saved. Drag to rotate, scroll to move closer, tap a pin to revisit.
          </p>
        </header>

        {/* Count badge — bottom-left. Separate corner from the zoom cluster. */}
        <div className="pointer-events-none absolute bottom-4 left-5 z-20 md:bottom-6 md:left-10">
          <div className="flex items-baseline gap-2.5 border border-[color:var(--border-strong)] bg-[rgba(250,252,255,0.94)] px-3.5 py-2 shadow-[0_6px_18px_rgba(14,22,34,0.08)] backdrop-blur-sm">
            <span className="font-serif text-[24px] leading-none text-[color:var(--ink)] md:text-[28px]">
              {pinCount}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
              {pinLabel}
            </span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
