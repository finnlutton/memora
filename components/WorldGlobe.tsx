"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GalleryMapPinIcon } from "@/components/icons/GalleryMapPinIcon";
import type { GlobeMethods } from "react-globe.gl";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

type WorldGlobeProps = {
  width?: number;
  height?: number;
  pins?: Array<{
    id: string;
    lat: number;
    lng: number;
    title?: string;
    coverImage?: string;
    startDate?: string;
    endDate?: string;
  }>;
  allowWheelZoom?: boolean;
};

const MIN_ALTITUDE = 1.05;
const MAX_ALTITUDE = 2.9;
const ZOOM_STEP = 0.3;
const ZOOM_ANIMATION_MS = 420;

export function WorldGlobe({
  width = 600,
  height = 600,
  pins = [],
  allowWheelZoom = false,
}: WorldGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [activePinPreview, setActivePinPreview] = useState<{
    pin: {
      id: string;
      title?: string;
      coverImage?: string;
      startDate?: string;
      endDate?: string;
    };
    x: number;
    y: number;
  } | null>(null);

  const adjustZoom = (delta: number) => {
    const globe = globeRef.current;
    if (!globe) return;
    const current = globe.pointOfView();
    const currentAltitude = typeof current.altitude === "number" ? current.altitude : 2;
    const nextAltitude = Math.min(
      MAX_ALTITUDE,
      Math.max(MIN_ALTITUDE, currentAltitude + delta),
    );

    globe.pointOfView(
      {
        lat: current.lat,
        lng: current.lng,
        altitude: nextAltitude,
      },
      ZOOM_ANIMATION_MS,
    );
  };

  useEffect(() => {
    const controls = globeRef.current?.controls?.();
    if (!controls) return;
    // Keep drag rotation; wheel zoom can be enabled per page.
    controls.enableZoom = allowWheelZoom;
    controls.zoomSpeed = allowWheelZoom ? 0.8 : 0;

    // Lift dark shading so oceans/continents read clearly on light dashboards.
    const globeInstance = globeRef.current as
      | {
          globeMaterial?: () => unknown;
        }
      | undefined;
    const material = globeInstance?.globeMaterial?.() as
      | {
          color?: { set: (value: string) => void };
          emissive?: { set: (value: string) => void };
          emissiveIntensity?: number;
          shininess?: number;
        }
      | undefined;

    material?.color?.set("#f3f8ff");
    material?.emissive?.set("#4f7098");
    if (material) {
      material.emissiveIntensity = 0.22;
      material.shininess = 0.35;
    }
  }, [allowWheelZoom]);

  useEffect(() => {
    if (!activePinPreview) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const inPreview = previewRef.current?.contains(target);
      const inMarker = Boolean(target.closest("[data-map-pin-marker='true']"));
      if (!inPreview && !inMarker) {
        setActivePinPreview(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activePinPreview]);

  const previewPosition = useMemo(() => {
    if (!activePinPreview || !containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = activePinPreview.x - rect.left;
    const y = activePinPreview.y - rect.top;
    const clampedLeft = Math.max(10, Math.min(rect.width - 250, x + 14));
    const clampedTop = Math.max(10, Math.min(rect.height - 160, y - 14));
    return {
      left: clampedLeft,
      top: clampedTop,
    };
  }, [activePinPreview]);

  const pinIconMarkup = useMemo(
    () =>
      renderToStaticMarkup(
        <GalleryMapPinIcon className="h-[18px] w-[18px] text-[rgba(196,54,58,0.95)] drop-shadow-[0_1px_2px_rgba(20,22,35,0.22)]" />,
      ),
    [],
  );

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return "";
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formatOne = (value: string) => {
      const date = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return value;
      return formatter.format(date);
    };
    if (startDate && endDate && startDate !== endDate) {
      return `${formatOne(startDate)} - ${formatOne(endDate)}`;
    }
    return formatOne(startDate ?? endDate ?? "");
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      // OrbitControls still listens to wheel events even with zoom disabled.
      // Capture wheel early so native page scroll remains smooth while hovered.
      onWheelCapture={(event) => {
        if (!allowWheelZoom) {
          event.stopPropagation();
        }
      }}
    >
      <Globe
        ref={globeRef}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="/textures/new_earth.jpg"
        showAtmosphere={true}
        atmosphereColor="rgba(118, 168, 232, 0.52)"
        atmosphereAltitude={0.1}
        htmlElementsData={pins}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.02}
        htmlElement={(pin) => {
          const markerPin = pin as {
            id: string;
            title?: string;
            coverImage?: string;
            startDate?: string;
            endDate?: string;
          };
          const marker = document.createElement("div");
          marker.dataset.mapPinMarker = "true";
          marker.style.width = "28px";
          marker.style.height = "28px";
          marker.style.display = "flex";
          marker.style.alignItems = "center";
          marker.style.justifyContent = "center";
          marker.style.background = "transparent";
          marker.style.pointerEvents = "auto";
          marker.style.cursor = "pointer";
          marker.style.position = "relative";
          marker.innerHTML = pinIconMarkup;
          marker.onpointerdown = (event) => {
            event.preventDefault();
            event.stopPropagation();
            setActivePinPreview({
              pin: {
                id: markerPin.id,
                title: markerPin.title,
                coverImage: markerPin.coverImage,
                startDate: markerPin.startDate,
                endDate: markerPin.endDate,
              },
              x: event.clientX,
              y: event.clientY,
            });
          };
          return marker;
        }}
      />
      {activePinPreview && previewPosition ? (
        <div
          ref={previewRef}
          className="pointer-events-none absolute z-20 w-60 overflow-hidden border border-[rgba(24,40,64,0.14)] bg-[rgba(250,253,255,0.96)] shadow-[0_10px_28px_rgba(16,24,38,0.16)] backdrop-blur"
          style={{
            left: previewPosition.left,
            top: previewPosition.top,
            transform: "translate(-50%, -100%)",
          }}
        >
          {activePinPreview.pin.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activePinPreview.pin.coverImage}
              alt={activePinPreview.pin.title || "Pinned gallery"}
              className="h-28 w-full object-cover"
            />
          ) : null}
          <div className="space-y-1 px-3 py-2.5">
            {activePinPreview.pin.title ? (
              <p className="font-serif text-[17px] leading-tight text-[color:var(--ink)]">
                {activePinPreview.pin.title}
              </p>
            ) : null}
            {formatDateRange(activePinPreview.pin.startDate, activePinPreview.pin.endDate) ? (
              <p className="text-xs text-[color:var(--ink-soft)]">
                {formatDateRange(activePinPreview.pin.startDate, activePinPreview.pin.endDate)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => adjustZoom(-ZOOM_STEP)}
          className="h-7 w-7 border border-[color:var(--border)] bg-[rgba(255,255,255,0.78)] text-sm leading-none text-[color:var(--ink)] shadow-[0_6px_18px_rgba(18,24,32,0.1)] backdrop-blur hover:border-[color:var(--border-strong)]"
          aria-label="Zoom in globe"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => adjustZoom(ZOOM_STEP)}
          className="h-7 w-7 border border-[color:var(--border)] bg-[rgba(255,255,255,0.78)] text-sm leading-none text-[color:var(--ink)] shadow-[0_6px_18px_rgba(18,24,32,0.1)] backdrop-blur hover:border-[color:var(--border-strong)]"
          aria-label="Zoom out globe"
        >
          -
        </button>
      </div>
    </div>
  );
}

