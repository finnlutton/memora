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
 * UsaMemoryMap — realistic continental U.S. with real terrain imagery.
 *
 * Layers, bottom-up:
 *   1. The same satellite-style Earth texture used by the marketing
 *      globe (/textures/new_earth.jpg). Cropped via SVG clipPath to a
 *      single merged US silhouette so only the conterminous land is
 *      visible. Reusing the globe texture keeps the U.S. map in the
 *      same emotional register as the rest of Memora.
 *   2. A subtle warm tint multiplied over the imagery to integrate
 *      with Memora's paper-tone palette and soften the satellite
 *      saturation.
 *   3. A drop shadow on the silhouette so the land lifts off the
 *      page background.
 *   4. Soft inner shadow + fine warm coastline ink for definition.
 *   5. Premium glowing pins (same memora-pin-pulse + memora-pin-core
 *      classes the globe uses).
 *
 * No state borders, no SVG box, no rectangular halo. The map sits on
 * the page's existing atmospheric background.
 *
 * Alignment note: the source texture is equirectangular full-world;
 * the silhouette is geoAlbersUsa. At this rendering scale the residual
 * projection difference inside the conterminous US is small (a few
 * pixels at the coastlines), so positioning the equirectangular crop
 * to match the silhouette's projected bounding box looks right.
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
const RELIEF_TEXTURE_URL = "/textures/new_earth.jpg";

const MAP_WIDTH = 980;
const MAP_HEIGHT = 551;
const PROJ_SCALE = 1100;

// Conterminous-US bounding box in lat/lng for placing the
// equirectangular relief texture. These values are intentionally a
// touch wider than the strict bbox so the texture visibly fills the
// silhouette through any residual projection mismatch.
const US_LNG_W = -125;
const US_LNG_E = -66;
const US_LAT_N = 50;
const US_LAT_S = 24;

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

  // Merged US silhouette path + projected bbox, both derived from the
  // topology fetched once on mount.
  const [usPath, setUsPath] = useState<string | null>(null);
  const [reliefBox, setReliefBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(USA_TOPO_URL);
        if (!response.ok) throw new Error(`Topology fetch failed: ${response.status}`);
        const topology = (await response.json()) as Topology;
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
        if (cancelled || !d) return;
        setUsPath(d);

        // Use the path's own projected bounding box. This is
        // guaranteed valid because we just successfully built the
        // path — no risk of geoAlbersUsa returning null at the
        // edge corners.
        const [[minX, minY], [maxX, maxY]] = pathBuilder.bounds(featureGeo);

        // Source equirectangular texture: full world, 360° lng × 180° lat.
        // The US occupies a sub-rectangle of that. Size the full
        // texture so its US sub-rectangle equals our projected bbox.
        const usFracX = (US_LNG_E - US_LNG_W) / 360; // ≈ 0.164
        const usFracY = (US_LAT_N - US_LAT_S) / 180; // ≈ 0.144
        const fullW = (maxX - minX) / usFracX;
        const fullH = (maxY - minY) / usFracY;
        const leftFrac = (US_LNG_W + 180) / 360; // ≈ 0.153
        const topFrac = (90 - US_LAT_N) / 180; // ≈ 0.222
        const x = minX - leftFrac * fullW;
        const y = minY - topFrac * fullH;
        setReliefBox({ x, y, width: fullW, height: fullH });
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

  // Note: we always render the map — even with zero US-located pins.
  // The silhouette itself is the experience; an empty US is still
  // worth seeing. A small unobtrusive caption appears in the corner
  // if there are no pins to plot.

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
            {/* Silhouette clip — wraps the relief texture into the US shape. */}
            <clipPath id="usa-clip">
              {usPath ? <path d={usPath} /> : null}
            </clipPath>

            {/* Drop shadow lift for the land. */}
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

            {/* Soft warm inner shadow for a hint of edge depth. */}
            <filter id="usa-inner-shadow">
              <feFlood floodColor="rgba(96,70,40,0.25)" result="flood" />
              <feComposite
                in="flood"
                in2="SourceGraphic"
                operator="out"
                result="outside"
              />
              <feGaussianBlur in="outside" stdDeviation="2.4" result="blurred" />
              <feComposite
                in="blurred"
                in2="SourceGraphic"
                operator="in"
              />
            </filter>

            {/* Subtle warm tint applied as an overlay so the satellite
                imagery integrates with Memora's paper palette. */}
            <linearGradient id="usa-warm-tint" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,239,205,0.18)" />
              <stop offset="100%" stopColor="rgba(120,86,52,0.18)" />
            </linearGradient>
          </defs>

          {/* The silhouette is rendered as soon as the topology
              loads. The relief texture layers on top of it once its
              bbox is computed — so even if the texture or projection
              math hits a snag, we always see the land. */}
          {usPath ? (
            <>
              {/* 1. Drop shadow base + warm fallback fill. */}
              <path
                d={usPath}
                fill="#e6d6b4"
                filter="url(#usa-land-lift)"
              />

              {/* 2. Real terrain imagery clipped to the silhouette. */}
              {reliefBox ? (
                <g clipPath="url(#usa-clip)">
                  <image
                    href={RELIEF_TEXTURE_URL}
                    x={reliefBox.x}
                    y={reliefBox.y}
                    width={reliefBox.width}
                    height={reliefBox.height}
                    preserveAspectRatio="none"
                  />
                  {/* Warm-tone overlay so the imagery reads as a
                      Memora artifact rather than a NASA tile. */}
                  <rect
                    x={0}
                    y={0}
                    width={MAP_WIDTH}
                    height={MAP_HEIGHT}
                    fill="url(#usa-warm-tint)"
                  />
                </g>
              ) : null}

              {/* 3. Inner shadow — gentle warm rim on the inside of
                  the coastline. */}
              <path
                d={usPath}
                fill="rgba(255,255,255,0)"
                filter="url(#usa-inner-shadow)"
              />

              {/* 4. Fine ink coastline. */}
              <path
                d={usPath}
                fill="none"
                stroke="rgba(76,52,30,0.55)"
                strokeWidth={0.9}
                strokeLinejoin="round"
              />
            </>
          ) : null}
        </svg>

        {/* Pins layered above. */}
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

        {/* Small unobtrusive caption when no US locations exist yet. */}
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
