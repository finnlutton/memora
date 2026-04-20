"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Minus, Plus } from "lucide-react";
import { GalleryMapPinIcon } from "@/components/icons/GalleryMapPinIcon";
import type { GlobeMethods } from "react-globe.gl";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

type WorldGlobeProps = {
  /**
   * Explicit pixel dimensions. If omitted, the globe fills its parent box
   * and tracks resizes via ResizeObserver.
   */
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
  width,
  height,
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

  // Measured size for fill mode. When explicit width/height are passed, we honor them.
  const [measuredSize, setMeasuredSize] = useState<{ w: number; h: number }>({
    w: width ?? 600,
    h: height ?? 600,
  });

  const isFillMode = width === undefined || height === undefined;

  useEffect(() => {
    if (!isFillMode) return;
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setMeasuredSize({
        w: Math.max(320, Math.round(rect.width)),
        h: Math.max(320, Math.round(rect.height)),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [isFillMode]);

  const renderWidth = isFillMode ? measuredSize.w : width!;
  const renderHeight = isFillMode ? measuredSize.h : height!;

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
    controls.enableZoom = allowWheelZoom;
    controls.zoomSpeed = allowWheelZoom ? 0.8 : 0;

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

  const [previewPosition, setPreviewPosition] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!activePinPreview || !containerRef.current) {
      setPreviewPosition(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const x = activePinPreview.x - rect.left;
    const y = activePinPreview.y - rect.top;
    setPreviewPosition({
      left: Math.max(10, Math.min(rect.width - 250, x + 14)),
      top: Math.max(10, Math.min(rect.height - 160, y - 14)),
    });
  }, [activePinPreview]);

  const pinIconMarkup = useMemo(
    () =>
      renderToStaticMarkup(
        <GalleryMapPinIcon className="h-[18px] w-[18px] text-[#fffa5c] drop-shadow-[0_1px_2px_rgba(20,22,35,0.22)]" />,
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
      className={isFillMode ? "relative h-full w-full" : "relative"}
      onWheelCapture={(event) => {
        if (!allowWheelZoom) {
          event.stopPropagation();
        }
      }}
    >
      <Globe
        ref={globeRef}
        width={renderWidth}
        height={renderHeight}
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
          className="pointer-events-none absolute z-30 w-56 overflow-hidden border border-[color:var(--border-strong)] bg-[rgba(250,252,255,0.97)] shadow-[0_10px_28px_rgba(14,22,34,0.16)] md:w-64"
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
              className="h-24 w-full object-cover md:h-28"
            />
          ) : null}
          <div className="space-y-1 px-3.5 py-2.5">
            {activePinPreview.pin.title ? (
              <p className="font-serif text-[17px] leading-tight text-[color:var(--ink)]">
                {activePinPreview.pin.title}
              </p>
            ) : null}
            {formatDateRange(activePinPreview.pin.startDate, activePinPreview.pin.endDate) ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                {formatDateRange(activePinPreview.pin.startDate, activePinPreview.pin.endDate)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Zoom cluster — bottom-right, one connected panel with a hairline rule. */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-20 md:bottom-6 md:right-6">
        <div className="pointer-events-auto flex flex-col overflow-hidden border border-[color:var(--border-strong)] bg-[rgba(250,252,255,0.94)] shadow-[0_6px_18px_rgba(14,22,34,0.1)] backdrop-blur-sm">
          <button
            type="button"
            onClick={() => adjustZoom(-ZOOM_STEP)}
            className="flex h-9 w-9 items-center justify-center text-[color:var(--ink)] transition hover:bg-[color:var(--paper)] md:h-10 md:w-10"
            aria-label="Zoom in globe"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
          </button>
          <div className="h-px w-full bg-[color:var(--border-strong)]/70" aria-hidden="true" />
          <button
            type="button"
            onClick={() => adjustZoom(ZOOM_STEP)}
            className="flex h-9 w-9 items-center justify-center text-[color:var(--ink)] transition hover:bg-[color:var(--paper)] md:h-10 md:w-10"
            aria-label="Zoom out globe"
          >
            <Minus className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
