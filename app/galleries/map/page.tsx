"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  describeFilterSummary,
  MemoryMapDateFilter,
  type DateFilter,
} from "@/components/memory-map/date-filter";
import { WorldGlobe } from "@/components/WorldGlobe";
import { UsaMemoryMap } from "@/components/UsaMemoryMap";
import { useMemoraStore } from "@/hooks/use-memora-store";

type MapView = "globe" | "usa";

type MapPin = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
};

function pinDateRange(pin: MapPin): { start: number; end: number } | null {
  // Use whichever date(s) we have; fall back so a single-date pin still
  // produces a valid (collapsed) range. Pins with no dates at all are
  // hidden from any non-"all-time" filter.
  const startStr = pin.startDate || pin.endDate;
  const endStr = pin.endDate || pin.startDate;
  if (!startStr || !endStr) return null;
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start, end };
}

export default function MemoryMapPage() {
  const { galleries } = useMemoraStore();
  const [view, setView] = useState<MapView>("globe");
  const [dateFilter, setDateFilter] = useState<DateFilter>({ kind: "all" });

  // All pins, with subgallery pins inheriting their parent gallery's
  // date range so the date filter applies consistently to both.
  const mapPinsRaw = useMemo<MapPin[]>(() => {
    const pins: MapPin[] = [];
    galleries.forEach((gallery) => {
      if (
        typeof gallery.locationLat === "number" &&
        typeof gallery.locationLng === "number"
      ) {
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
            // Inherit parent gallery dates so the filter has something
            // to compare against. (Subgallery-level start/end live on
            // the row but aren't currently exposed in the local type;
            // parent dates are a sensible MVP fallback.)
            startDate: gallery.startDate,
            endDate: gallery.endDate,
          });
        }
      });
    });
    return pins;
  }, [galleries]);

  // Years that appear anywhere in the pin date ranges, descending.
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    mapPinsRaw.forEach((pin) => {
      [pin.startDate, pin.endDate].forEach((str) => {
        if (!str) return;
        const date = new Date(str);
        if (!Number.isNaN(date.getTime())) years.add(date.getFullYear());
      });
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [mapPinsRaw]);

  // Apply the active date filter.
  const mapPins = useMemo(() => {
    if (dateFilter.kind === "all") return mapPinsRaw;
    let filterStart: number;
    let filterEnd: number;
    if (dateFilter.kind === "year") {
      filterStart = new Date(dateFilter.year, 0, 1).getTime();
      filterEnd = new Date(dateFilter.year, 11, 31, 23, 59, 59).getTime();
    } else {
      filterStart = new Date(dateFilter.start).getTime();
      filterEnd = new Date(dateFilter.end).getTime();
      // End-of-day for the end bound so a same-day range still matches.
      const endOfDay = new Date(dateFilter.end);
      endOfDay.setHours(23, 59, 59, 999);
      filterEnd = endOfDay.getTime();
    }
    return mapPinsRaw.filter((pin) => {
      const range = pinDateRange(pin);
      if (!range) return false;
      // Standard interval-overlap: pin range and filter range share
      // any moment.
      return range.start <= filterEnd && range.end >= filterStart;
    });
  }, [mapPinsRaw, dateFilter]);

  const pinCount = mapPins.length;
  const pinLabel = pinCount === 1 ? "mapped memory" : "mapped memories";
  const filterActive = dateFilter.kind !== "all";

  return (
    <AppShell>
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
        <div className="absolute inset-0 flex items-center justify-center">
          {view === "globe" ? (
            <WorldGlobe pins={mapPins} allowWheelZoom />
          ) : (
            <UsaMemoryMap pins={mapPins} />
          )}
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(244,248,252,0.55)_100%)]"
        />

        {/* Editorial header — top-left. The active filter summary
            replaces the default "every pin" copy when set. */}
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
            {filterActive
              ? describeFilterSummary(dateFilter)
              : "Every pin is a place you saved. Drag to rotate, scroll to move closer, tap a pin to revisit."}
          </p>
        </header>

        {/*
          Top-right cluster: date filter on top, view toggle below.
          Stacked so the filter pill doesn't shove the toggle off-screen
          on narrow viewports.
        */}
        <div className="pointer-events-auto absolute right-5 top-6 z-20 flex flex-col items-end gap-2 md:right-10 md:top-10">
          <MemoryMapDateFilter
            filter={dateFilter}
            onChange={setDateFilter}
            availableYears={availableYears}
          />
          <div
            role="tablist"
            aria-label="Map view"
            className="inline-flex items-stretch border border-[color:var(--border-strong)] bg-[rgba(250,252,255,0.94)] backdrop-blur-sm shadow-[0_6px_18px_rgba(14,22,34,0.08)]"
          >
            {(["globe", "usa"] as const).map((option) => {
              const selected = view === option;
              const label = option === "globe" ? "Globe" : "U.S.A.";
              return (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setView(option)}
                  className={`px-3.5 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.22em] transition md:px-4 md:py-2 md:text-[11px] ${
                    selected
                      ? "bg-[color:var(--ink)] text-white"
                      : "text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Count badge — bottom-left. Surfaces the empty-result case
            when the active filter excludes every pin. */}
        <div className="pointer-events-none absolute bottom-4 left-5 z-20 md:bottom-6 md:left-10">
          {pinCount > 0 ? (
            <div className="flex items-baseline gap-2.5 border border-[color:var(--border-strong)] bg-[rgba(250,252,255,0.94)] px-3.5 py-2 shadow-[0_6px_18px_rgba(14,22,34,0.08)] backdrop-blur-sm">
              <span className="font-serif text-[24px] leading-none text-[color:var(--ink)] md:text-[28px]">
                {pinCount}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
                {pinLabel}
              </span>
            </div>
          ) : filterActive ? (
            <div className="border border-[color:var(--border-strong)] bg-[rgba(250,252,255,0.94)] px-3.5 py-2 shadow-[0_6px_18px_rgba(14,22,34,0.08)] backdrop-blur-sm">
              <p className="text-[11.5px] leading-5 text-[color:var(--ink-soft)]">
                No memories found for this date range.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
