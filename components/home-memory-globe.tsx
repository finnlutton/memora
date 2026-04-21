"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

type DemoPin = {
  id: string;
  title: string;
  location: string;
  season: string;
  lat: number;
  lng: number;
};

const DEMO_PINS: DemoPin[] = [
  { id: "nyc", title: "Winter in New York", location: "New York, USA", season: "Feb 2025", lat: 40.7128, lng: -74.006 },
  { id: "kyoto", title: "Kyoto in Spring", location: "Kyoto, Japan", season: "Apr 2024", lat: 35.0116, lng: 135.7681 },
  { id: "baja", title: "Baja Mornings", location: "Baja California, MX", season: "Mar 2024", lat: 26.0444, lng: -111.3456 },
  { id: "sicily", title: "Sicily Coastline", location: "Taormina, Italy", season: "Jun 2023", lat: 37.8516, lng: 15.2853 },
  { id: "cotswolds", title: "Cotswolds Gardens", location: "Gloucestershire, UK", season: "May 2023", lat: 51.8355, lng: -1.8433 },
  { id: "granada", title: "Granada Semester", location: "Andalucía, Spain", season: "Sep 2022", lat: 37.1773, lng: -3.5986 },
];

/**
 * Home memory globe — marketing demo for the memory map.
 *
 * Intentionally distinct from the production WorldGlobe: darker, slower, auto-
 * rotating, no zoom chrome, and richer pin treatment. Geographic precision is
 * not a goal here — this section sells the feeling of "your memories across
 * the world," not the real map.
 */
export function HomeMemoryGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 560, h: 560 });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      const side = Math.max(320, Math.min(720, Math.round(Math.min(rect.width, rect.height))));
      setSize({ w: Math.round(rect.width), h: Math.round(rect.height) || side });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // react-globe.gl is dynamically imported, so globeRef.current may not be
    // populated on first mount. Poll briefly until it is, then configure.
    let cancelled = false;
    const configure = () => {
      if (cancelled) return;
      const globe = globeRef.current;
      if (!globe) {
        requestAnimationFrame(configure);
        return;
      }
      const controls = globe.controls?.() as
        | {
            autoRotate?: boolean;
            autoRotateSpeed?: number;
            enableZoom?: boolean;
            enablePan?: boolean;
          }
        | undefined;
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.38;
        controls.enableZoom = false;
        controls.enablePan = false;
      }
      globe.pointOfView({ lat: 24, lng: -20, altitude: 2.2 }, 0);

      const globeInstance = globe as { globeMaterial?: () => unknown };
      const material = globeInstance.globeMaterial?.() as
        | {
            emissive?: { set: (value: string) => void };
            emissiveIntensity?: number;
            shininess?: number;
          }
        | undefined;
      material?.emissive?.set("#6a8eb8");
      if (material) {
        material.emissiveIntensity = 0.22;
        material.shininess = 0.5;
      }
      setReady(true);
    };
    configure();
    return () => {
      cancelled = true;
    };
  }, []);

  const pauseRotation = useCallback((paused: boolean) => {
    const controls = globeRef.current?.controls?.() as { autoRotate?: boolean } | undefined;
    if (controls) controls.autoRotate = !paused;
  }, []);

  const activePin = useMemo(() => DEMO_PINS.find((p) => p.id === activeId) ?? null, [activeId]);

  // While a pin is selected, keep auto-rotation paused so the attached
  // preview stays anchored and doesn't travel to the back of the globe.
  useEffect(() => {
    if (!activePin) return;
    const controls = globeRef.current?.controls?.() as { autoRotate?: boolean } | undefined;
    if (controls) controls.autoRotate = false;
  }, [activePin]);

  // Track the selected pin's screen position every frame so the preview
  // tracks small manual rotations or altitude transitions.
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!activePin) {
      setPreviewPos(null);
      return;
    }
    let rafId: number;
    const tick = () => {
      const globe = globeRef.current as unknown as {
        getScreenCoords?: (
          lat: number,
          lng: number,
          alt?: number,
        ) => { x: number; y: number } | undefined;
      };
      const coords = globe?.getScreenCoords?.(activePin.lat, activePin.lng, 0);
      if (coords && Number.isFinite(coords.x) && Number.isFinite(coords.y)) {
        setPreviewPos({ x: coords.x, y: coords.y });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [activePin]);

  const htmlElement = useCallback(
    (d: object) => {
      const pin = d as DemoPin;
      const el = document.createElement("div");
      el.dataset.demoPin = "true";
      el.dataset.pinId = pin.id;
      el.style.cssText = `
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        pointer-events: auto;
      `;
      el.innerHTML = `
        <span class="memora-pin-pulse"></span>
        <span class="memora-pin-core"></span>
      `;
      // Hover only pauses rotation for easier aim; it does not change the
      // preview target. Selection happens on click only.
      el.addEventListener("pointerenter", () => {
        pauseRotation(true);
      });
      el.addEventListener("pointerleave", () => {
        pauseRotation(false);
      });
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        setActiveId(pin.id);
      });
      return el;
    },
    [pauseRotation],
  );

  return (
    <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1fr_1.15fr] md:gap-14 lg:gap-20">
      <div className="order-2 md:order-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/72">
          Across the world
        </p>
        <h2 className="mt-5 font-serif text-[34px] leading-[1.02] text-white md:text-[48px] md:leading-[1.0]">
          The places you&apos;d want to walk through again.
        </h2>
        <p className="mt-6 max-w-[30rem] text-[14px] leading-7 text-white/82 md:text-[15px]">
          Each gallery finds its place on a quiet atlas — a soft record of where you&apos;ve been and what you kept from it. Click a pin to preview a trip.
        </p>

        <ul className="mt-9 grid grid-cols-1 gap-x-8 gap-y-3 text-[13px] leading-6 text-white/85 sm:grid-cols-2">
          {DEMO_PINS.map((pin) => {
            const isActive = pin.id === activeId;
            return (
              <li key={pin.id}>
                <button
                  type="button"
                  onMouseEnter={() => pauseRotation(true)}
                  onMouseLeave={() => {
                    if (!activeId) pauseRotation(false);
                  }}
                  onClick={() => {
                    setActiveId(pin.id);
                    globeRef.current?.pointOfView(
                      { lat: pin.lat, lng: pin.lng, altitude: 1.9 },
                      900,
                    );
                  }}
                  className={`group flex w-full items-center gap-3 text-left transition ${
                    isActive ? "text-white" : "text-white/82 hover:text-white"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`inline-block h-[7px] w-[7px] rounded-full transition ${
                      isActive
                        ? "bg-[#f6d880] shadow-[0_0_12px_rgba(246,216,128,0.8)]"
                        : "bg-white/32 group-hover:bg-white/60"
                    }`}
                  />
                  <span className="font-serif text-[15px] tracking-tight">{pin.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="order-1 md:order-2">
        <div
          ref={containerRef}
          onPointerLeave={() => {
            if (!activeId) pauseRotation(false);
          }}
          className="relative mx-auto aspect-square w-full max-w-[620px]"
        >
          {/* Ambient halo behind the globe — softer, wider, better integrated */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-20%] rounded-full bg-[radial-gradient(circle_at_center,rgba(150,192,240,0.34)_0%,rgba(130,176,224,0.14)_40%,transparent_72%)] blur-[3px]"
          />
          <div
            className={`absolute inset-0 transition-opacity duration-[900ms] ${
              ready ? "opacity-100" : "opacity-0"
            }`}
          >
            <Globe
              ref={globeRef}
              width={size.w}
              height={size.h}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="/textures/new_earth.jpg"
              showAtmosphere
              atmosphereColor="rgba(156, 196, 240, 0.7)"
              atmosphereAltitude={0.26}
              htmlElementsData={DEMO_PINS}
              htmlLat="lat"
              htmlLng="lng"
              htmlAltitude={0.008}
              htmlElement={htmlElement}
            />
          </div>

          {/* Compact preview anchored directly above the selected pin. */}
          {activePin && previewPos ? (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute z-20 w-44 border border-white/16 bg-[rgba(14,22,38,0.88)] px-3 py-2 text-center backdrop-blur-md"
              style={{
                left: previewPos.x,
                top: previewPos.y,
                transform: "translate(-50%, calc(-100% - 22px))",
              }}
            >
              <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-white/68">
                {activePin.season}
              </p>
              <p className="mt-1 font-serif text-[14px] leading-tight text-white">
                {activePin.title}
              </p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-white/72">
                {activePin.location}
              </p>
              {/* Small downward pointer toward the pin */}
              <span
                aria-hidden
                className="absolute left-1/2 top-full -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-[rgba(14,22,38,0.88)]"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
