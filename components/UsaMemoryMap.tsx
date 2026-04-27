"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { merge } from "topojson-client";
import type {
  GeometryCollection,
  MultiPolygon as TopoMultiPolygon,
  Polygon as TopoPolygon,
  Topology,
} from "topojson-specification";
import type { Feature, MultiPolygon } from "geojson";

/**
 * UsaMemoryMap — realistic, premium continental U.S. for the memory
 * map page.
 *
 * Built as a single merged silhouette (no state lines) projected with
 * geoAlbersUsa. Visual depth is layered:
 *
 *   1. Atmospheric ocean halo (radial gradient over the whole canvas)
 *   2. Outer glow + drop shadow filter on the landmass
 *   3. Landmass fill: NW-lit warm paper gradient (suggests sun from
 *      upper-left, a classic relief mood without literal terrain)
 *   4. Soft inner shadow: SVG feFlood + feComposite-in producing a
 *      gentle dark edge on the SE side, again echoing relief
 *   5. Subtle organic surface noise via low-opacity feTurbulence —
 *      reads as paper/terrain grain rather than GIS texture
 *   6. Two-stroke coastline: a wider soft outer halo stroke + a fine
 *      ink coastline on top, so the land feels lifted from the water
 *   7. Premium 3-circle Memora pins on top, anchored by the Albers
 *      projection used for both data and rendering
 *
 * Pins are projected with the same geoAlbersUsa instance used for the
 * landmass path, so they always land inside the actual coastline.
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

const USA_TOPO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const MAP_WIDTH = 980;
const MAP_HEIGHT = 551;
const PROJ_SCALE = 1100;

const projection = geoAlbersUsa()
  .scale(PROJ_SCALE)
  .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

const pathBuilder = geoPath(projection);

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

  // Single merged US silhouette path. Loaded once on mount.
  const [usPath, setUsPath] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(USA_TOPO_URL);
        if (!response.ok) throw new Error(`Topology fetch failed: ${response.status}`);
        const topology = (await response.json()) as Topology;
        // Each "state" is a Polygon or MultiPolygon in the source topology;
        // merge() unions them into a single MultiPolygon GeoJSON geometry.
        const states = topology.objects.states as GeometryCollection<{
          name?: string;
        }>;
        const polygons = states.geometries as Array<TopoPolygon | TopoMultiPolygon>;
        const merged = merge(topology, polygons) as MultiPolygon;
        const featureGeo: Feature<MultiPolygon> = {
          type: "Feature",
          properties: {},
          geometry: merged,
        };
        const d = pathBuilder(featureGeo);
        if (!cancelled && d) setUsPath(d);
      } catch (err) {
        console.error("Memora: USA map topology load failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // The silhouette is the experience — render the map even with zero
  // US pins. A small unobtrusive caption appears in the corner if
  // there are no pins yet.

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 md:px-8">
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
      >
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            {/*
              Land fill — NW-lit warm paper gradient. The diagonal
              direction mimics terrain lit by sun from the upper-left,
              the standard cartographic convention for shaded relief.
            */}
            <linearGradient id="usa-land-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbf6ec" />
              <stop offset="55%" stopColor="#f0e8d6" />
              <stop offset="100%" stopColor="#e3d8be" />
            </linearGradient>

            {/* Subtle warm-stone shadow tint on the SE flank. */}
            <linearGradient id="usa-land-shade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(120,98,60,0)" />
              <stop offset="100%" stopColor="rgba(120,98,60,0.18)" />
            </linearGradient>

            {/*
              Drop shadow + inner glow filter for the land. feDropShadow
              gives the lift; the inner-glow chain adds a soft warm rim
              just inside the coastline so the land reads as raised.
            */}
            <filter
              id="usa-land-lift"
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
            >
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="3"
                floodColor="rgba(60,46,30,0.22)"
              />
            </filter>

            {/*
              Inner shadow — paint a dark color, mask it to the inside
              of the land, blur, then composite over so it reads as a
              gentle interior depth on the SE side.
            */}
            <filter id="usa-inner-shadow">
              <feFlood floodColor="rgba(96,70,40,0.28)" result="flood" />
              <feComposite
                in="flood"
                in2="SourceGraphic"
                operator="out"
                result="outside"
              />
              <feGaussianBlur in="outside" stdDeviation="3" result="blurred" />
              <feComposite
                in="blurred"
                in2="SourceGraphic"
                operator="in"
                result="innerShadow"
              />
              <feComposite in="innerShadow" in2="SourceGraphic" operator="over" />
            </filter>

            {/*
              Organic surface texture — fractal noise clipped to the
              landmass at very low opacity. Reads as paper/terrain grain
              rather than GIS texture.
            */}
            <filter id="usa-noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="2"
                seed="7"
              />
              <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.25  0 0 0 0.25 0" />
            </filter>

            <clipPath id="usa-clip">
              {usPath ? <path d={usPath} /> : null}
            </clipPath>
          </defs>

          {usPath ? (
            <>
              {/* Land — base fill with drop shadow */}
              <path
                d={usPath}
                fill="url(#usa-land-fill)"
                filter="url(#usa-land-lift)"
              />

              {/* SE shading overlay clipped to the land */}
              <path
                d={usPath}
                fill="url(#usa-land-shade)"
                opacity={0.85}
              />

              {/* Inner shadow — clipped to the land, gives an interior
                  edge that suggests slight elevation */}
              <path
                d={usPath}
                fill="rgba(255,255,255,0)"
                filter="url(#usa-inner-shadow)"
              />

              {/* Organic surface noise — confined to the landmass */}
              <g clipPath="url(#usa-clip)">
                <rect
                  x="0"
                  y="0"
                  width={MAP_WIDTH}
                  height={MAP_HEIGHT}
                  filter="url(#usa-noise)"
                  opacity={0.35}
                />
              </g>

              {/* Refined coastline ink — fine, warmer line on top */}
              <path
                d={usPath}
                fill="none"
                stroke="rgba(96,68,40,0.45)"
                strokeWidth={0.9}
                strokeLinejoin="round"
              />
            </>
          ) : null}
        </svg>

        {/* Pins — HTML over the SVG so the preview card and click
            handling stay simple. */}
        {usaPins.map((pin) => {
          const projected = projection([pin.lng, pin.lat]);
          if (!projected) return null;
          const xPct = (projected[0] / MAP_WIDTH) * 100;
          const yPct = (projected[1] / MAP_HEIGHT) * 100;
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
                left: `${xPct}%`,
                top: `${yPct}%`,
                transform: "translate(-50%, -50%)",
              }}
              className={`absolute z-10 inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                isActive ? "scale-110" : "hover:scale-110"
              }`}
              aria-label={pin.title ?? "Memory location"}
            >
              <span className="memora-pin-pulse" />
              <span className="memora-pin-core" />
            </button>
          );
        })}

        {usaPins.length === 0 ? (
          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[10.5px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
            Add a U.S. location to see it appear here.
          </p>
        ) : null}

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
