"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoAlbersUsa } from "d3-geo";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

/**
 * UsaMemoryMap — real continental U.S. map.
 *
 * Backed by us-atlas state geometry (10m resolution) projected with
 * geoAlbersUsa via react-simple-maps. Pins are projected with the same
 * projection as the map (no percentage math), so they always land
 * inside the actual state borders.
 *
 * Alaska + Hawaii: geoAlbersUsa includes their insets out of the box.
 *
 * Pin click reveals a small preview card (cover image + title + dates),
 * matching the WorldGlobe interaction pattern.
 */

export type UsaMapPin = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
};

// us-atlas state outlines (10m simplified; ~155KB). Loaded by react-simple-maps.
const USA_TOPO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// react-simple-maps draws into an SVG of these intrinsic dimensions; CSS
// scales the SVG responsively. Pin preview positioning uses these dims to
// convert projected viewBox coords → percentages.
const MAP_WIDTH = 980;
const MAP_HEIGHT = 551;
const PROJ_SCALE = 1100;

// A single projection instance shared across pin filtering and preview
// positioning. geoAlbersUsa returns null for points outside the inset
// composition, which is exactly the filter we want.
const projection = geoAlbersUsa()
  .scale(PROJ_SCALE)
  .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

function isProjectable(lat: number, lng: number) {
  const result = projection([lng, lat]);
  return (
    result !== null &&
    Number.isFinite(result[0]) &&
    Number.isFinite(result[1])
  );
}

function formatDateRange(start?: string, end?: string) {
  if (!start && !end) return "";
  if (start && end && start !== end) return `${start} – ${end}`;
  return start || end || "";
}

export function UsaMemoryMap({ pins }: { pins: UsaMapPin[] }) {
  const usaPins = useMemo(
    () => pins.filter((p) => isProjectable(p.lat, p.lng)),
    [pins],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close preview on outside click.
  useEffect(() => {
    if (!activeId) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest("[data-usa-pin]")) setActiveId(null);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [activeId]);

  const activePin = usaPins.find((p) => p.id === activeId) ?? null;
  const activeProjected = useMemo(() => {
    if (!activePin) return null;
    const result = projection([activePin.lng, activePin.lat]);
    if (!result) return null;
    return {
      xPct: (result[0] / MAP_WIDTH) * 100,
      yPct: (result[1] / MAP_HEIGHT) * 100,
    };
  }, [activePin]);

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
        style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
      >
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: PROJ_SCALE }}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <radialGradient id="usa-map-halo" cx="50%" cy="55%" r="70%">
              <stop offset="0%" stopColor="rgba(140,184,232,0.18)" />
              <stop offset="100%" stopColor="rgba(140,184,232,0)" />
            </radialGradient>
            <linearGradient id="usa-map-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(247,251,255,0.98)" />
              <stop offset="100%" stopColor="rgba(224,235,249,0.92)" />
            </linearGradient>
          </defs>

          {/* Soft atmospheric halo over the whole canvas. */}
          <rect
            x={0}
            y={0}
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            fill="url(#usa-map-halo)"
          />

          <Geographies geography={USA_TOPO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="url(#usa-map-fill)"
                  stroke="rgba(108,148,196,0.42)"
                  strokeWidth={0.6}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "rgba(220,232,247,0.95)" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {usaPins.map((pin) => (
            <Marker key={pin.id} coordinates={[pin.lng, pin.lat]}>
              <g
                data-usa-pin
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveId((prev) => (prev === pin.id ? null : pin.id));
                }}
                aria-label={pin.title ?? "Memory location"}
              >
                {/* outer halo */}
                <circle r={10} fill="rgba(108,148,196,0.18)" />
                {/* mid ring */}
                <circle r={5.5} fill="rgba(108,148,196,0.5)" />
                {/* core */}
                <circle
                  r={2.6}
                  fill="#ffffff"
                  stroke="rgba(56,92,148,0.95)"
                  strokeWidth={1.1}
                />
              </g>
            </Marker>
          ))}
        </ComposableMap>

        {/* Preview card — anchored at the projected pin position */}
        {activePin && activeProjected ? (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute z-30 w-56 overflow-hidden border border-[color:var(--border-strong)] bg-[rgba(250,252,255,0.97)] shadow-[0_18px_36px_-12px_rgba(14,22,34,0.22)]"
            style={{
              left: `${activeProjected.xPct}%`,
              top: `${activeProjected.yPct}%`,
              transform: "translate(-50%, calc(-100% - 18px))",
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
              {formatDateRange(activePin.startDate, activePin.endDate) ? (
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                  {formatDateRange(activePin.startDate, activePin.endDate)}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
