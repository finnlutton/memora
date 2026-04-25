"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * UsaMemoryMap — stylized continental U.S. alternative to WorldGlobe.
 *
 * Pins are positioned via a flat equirectangular projection inside the
 * continental U.S. bounding box. Lat/lng outside the bounds are filtered.
 * The silhouette is intentionally impressionistic — premium and quiet
 * rather than cartographically perfect (per spec).
 *
 * Pin click reveals a small preview card (cover image + title + dates),
 * matching the WorldGlobe interaction pattern.
 */

const USA_BOUNDS = {
  minLat: 24.396308,
  maxLat: 49.384358,
  minLng: -124.848974,
  maxLng: -66.885444,
};

function projectUsaPoint(lat: number, lng: number) {
  const x = ((lng - USA_BOUNDS.minLng) / (USA_BOUNDS.maxLng - USA_BOUNDS.minLng)) * 100;
  const y = ((USA_BOUNDS.maxLat - lat) / (USA_BOUNDS.maxLat - USA_BOUNDS.minLat)) * 100;
  return { x, y };
}

function isInUsaBounds(lat: number, lng: number) {
  return (
    lat >= USA_BOUNDS.minLat &&
    lat <= USA_BOUNDS.maxLat &&
    lng >= USA_BOUNDS.minLng &&
    lng <= USA_BOUNDS.maxLng
  );
}

export type UsaMapPin = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
};

/**
 * Stylized continental U.S. silhouette. Hand-tuned to occupy the full
 * viewBox so it shares its coordinate space with `projectUsaPoint`. The
 * shape is impressionistic — premium silhouette, not GIS-accurate. Swap
 * for a higher-fidelity path later without changing pin math.
 */
const USA_SVG_PATH =
  "M 70 80 " +
  "L 75 60 " +
  "C 80 45 120 35 180 32 " +
  "C 240 28 300 25 380 25 " +
  "C 460 25 540 25 620 28 " +
  "C 700 30 770 35 815 50 " +
  "C 850 60 875 75 880 80 " +
  "L 890 50 " +
  "C 895 35 905 25 920 25 " +
  "C 935 25 945 35 945 50 " +
  "C 945 70 940 90 935 110 " +
  "C 935 130 945 160 950 195 " +
  "C 955 230 950 260 935 280 " +
  "C 920 295 900 305 885 312 " +
  "C 870 320 855 330 840 340 " +
  "C 825 350 810 358 795 360 " +
  "L 785 360 " +
  "C 775 360 770 365 770 380 " +
  "L 775 410 " +
  "C 778 430 782 450 786 465 " +
  "C 788 472 785 478 780 478 " +
  "C 775 478 770 475 765 465 " +
  "C 758 445 752 425 748 405 " +
  "C 745 390 738 380 725 380 " +
  "C 700 380 670 380 640 380 " +
  "C 600 380 560 385 525 388 " +
  "C 490 391 460 392 430 388 " +
  "C 395 383 360 375 325 365 " +
  "C 290 354 255 340 220 322 " +
  "C 185 304 155 280 130 258 " +
  "C 105 235 90 215 80 195 " +
  "C 70 175 70 150 75 130 " +
  "C 80 110 70 95 70 80 Z";

function formatDateRange(start?: string, end?: string) {
  if (!start && !end) return "";
  if (start && end && start !== end) {
    return `${start} – ${end}`;
  }
  return start || end || "";
}

export function UsaMemoryMap({ pins }: { pins: UsaMapPin[] }) {
  const usaPins = useMemo(
    () => pins.filter((p) => isInUsaBounds(p.lat, p.lng)),
    [pins],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close preview on outside click (anywhere except a pin button).
  useEffect(() => {
    if (!activeId) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest("[data-usa-pin]")) {
        setActiveId(null);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [activeId]);

  const activePin = usaPins.find((p) => p.id === activeId) ?? null;

  if (usaPins.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-16 text-center">
        <div className="font-serif text-[20px] leading-tight text-[color:var(--ink)] md:text-[24px]">
          U.S.A. Map
        </div>
        <p className="mt-3 text-[13px] leading-6 text-[color:var(--ink-soft)]">
          Add a U.S. location to see it appear on your map.
        </p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 md:px-8">
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ aspectRatio: "1000 / 500" }}
      >
        {/* Silhouette + soft halo */}
        <svg
          viewBox="0 0 1000 500"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <radialGradient id="usa-map-halo" cx="50%" cy="55%" r="65%">
              <stop offset="0%" stopColor="rgba(140,184,232,0.22)" />
              <stop offset="100%" stopColor="rgba(140,184,232,0)" />
            </radialGradient>
            <linearGradient id="usa-map-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(245,249,254,0.96)" />
              <stop offset="100%" stopColor="rgba(220,232,247,0.85)" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="1000" height="500" fill="url(#usa-map-halo)" />
          <path
            d={USA_SVG_PATH}
            fill="url(#usa-map-fill)"
            stroke="rgba(108,148,196,0.45)"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </svg>

        {/* Pins layered above the silhouette */}
        {usaPins.map((pin) => {
          const { x, y } = projectUsaPoint(pin.lat, pin.lng);
          const isActive = activeId === pin.id;
          return (
            <button
              key={pin.id}
              data-usa-pin
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveId((prev) => (prev === pin.id ? null : pin.id));
              }}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
              className={`absolute z-10 inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                isActive ? "scale-110" : "hover:scale-110"
              }`}
              aria-label={pin.title ?? "Memory location"}
            >
              {/* Reuse the same pin pulse + core as the globe (globals.css). */}
              <span className="memora-pin-pulse" />
              <span className="memora-pin-core" />
            </button>
          );
        })}

        {/* Preview card — anchored above the active pin */}
        {activePin
          ? (() => {
              const { x, y } = projectUsaPoint(activePin.lat, activePin.lng);
              const dateRange = formatDateRange(activePin.startDate, activePin.endDate);
              return (
                <div
                  role="status"
                  aria-live="polite"
                  className="pointer-events-none absolute z-30 w-56 overflow-hidden border border-[color:var(--border-strong)] bg-[rgba(250,252,255,0.97)] shadow-[0_18px_36px_-12px_rgba(14,22,34,0.22)]"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%, calc(-100% - 22px))",
                  }}
                >
                  {activePin.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activePin.coverImage}
                      alt={activePin.title ?? ""}
                      className="h-24 w-full object-cover"
                    />
                  ) : null}
                  <div className="space-y-1 px-3.5 py-2.5">
                    {activePin.title ? (
                      <p className="font-serif text-[15px] leading-tight text-[color:var(--ink)]">
                        {activePin.title}
                      </p>
                    ) : null}
                    {dateRange ? (
                      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                        {dateRange}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })()
          : null}
      </div>
    </div>
  );
}

UsaMemoryMap.isInUsaBounds = isInUsaBounds;
UsaMemoryMap.projectUsaPoint = projectUsaPoint;
