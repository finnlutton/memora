"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { GlobeMethods } from "react-globe.gl";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

type WorldGlobeProps = {
  width?: number;
  height?: number;
  pins?: Array<{
    id: string;
    lat: number;
    lng: number;
  }>;
};

const MIN_ALTITUDE = 1.05;
const MAX_ALTITUDE = 2.9;
const ZOOM_STEP = 0.3;
const ZOOM_ANIMATION_MS = 420;

export function WorldGlobe({ width = 600, height = 600, pins = [] }: WorldGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

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
    // Keep drag rotation, but disable all zoom interactions.
    controls.enableZoom = false;
    controls.zoomSpeed = 0;

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
  }, []);

  return (
    <div
      className="relative"
      // OrbitControls still listens to wheel events even with zoom disabled.
      // Capture wheel early so native page scroll remains smooth while hovered.
      onWheelCapture={(event) => {
        event.stopPropagation();
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
        htmlElement={() => {
          const marker = document.createElement("div");
          marker.style.width = "2px";
          marker.style.height = "34px";
          marker.style.background = "rgba(227, 233, 244, 0.96)";
          marker.style.position = "relative";
          marker.style.boxShadow = "0 0 0 1px rgba(32,44,66,0.14)";

          const flag = document.createElement("div");
          flag.style.position = "absolute";
          flag.style.left = "2px";
          flag.style.top = "3px";
          flag.style.width = "0";
          flag.style.height = "0";
          flag.style.borderTop = "5px solid transparent";
          flag.style.borderBottom = "5px solid transparent";
          flag.style.borderLeft = "14px solid rgba(202, 47, 47, 0.94)";
          flag.style.filter = "drop-shadow(0 1px 2px rgba(20,22,35,0.22))";

          marker.appendChild(flag);
          return marker;
        }}
      />
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

