"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Drag-the-photo-within-the-frame focal-point picker. The frame matches the
 * gallery card's actual aspect ratio (4/5 mobile, 16/9 desktop by default) so
 * the upload/edit preview is exactly what the published card will show.
 *
 * Mostly meaningful for vertical photos: in a wide landscape frame they would
 * otherwise center-crop to whatever's at the photo's vertical midpoint, which
 * is rarely the subject. The user grabs the photo and drags it up/down (or
 * left/right) to anchor what they want kept.
 *
 * Output is two percentages [0, 100] passed back via `onChange`. Render sites
 * apply them as `object-position: ${x}% ${y}%`. Default 50/50 = current
 * behavior, so legacy covers without a focal point look identical to today.
 *
 * Sensitivity is intentionally direct (1px drag = 1px frame movement scaled to
 * the focal-percent range): a full drag across the frame sweeps the full crop
 * range, which feels like 1:1 manipulation of the visible content.
 */
export function CoverFocalPicker({
  src,
  alt,
  focalX,
  focalY,
  onChange,
  aspectClassName = "aspect-[4/5] md:aspect-[16/9]",
  className,
}: {
  src: string;
  alt: string;
  focalX: number;
  focalY: number;
  onChange: (next: { focalX: number; focalY: number }) => void;
  /** Tailwind aspect class for the frame. Match the destination card. */
  aspectClassName?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startFocalX: number;
    startFocalY: number;
    rectWidth: number;
    rectHeight: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Surface the brief instructional hint until the user has interacted at
  // least once. After that, the affordance is learned and the chip becomes
  // visual noise on every cover edit.
  const [hasInteracted, setHasInteracted] = useState(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startFocalX: focalX,
      startFocalY: focalY,
      rectWidth: rect.width,
      rectHeight: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    setHasInteracted(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startClientX;
    const dy = event.clientY - drag.startClientY;
    // Drag the photo right → user wants the LEFT portion in view → focal
    // shifts toward 0%. Hence the subtraction.
    const nextX = clamp(drag.startFocalX - (dx / drag.rectWidth) * 100, 0, 100);
    const nextY = clamp(drag.startFocalY - (dy / drag.rectHeight) * 100, 0, 100);
    if (nextX !== focalX || nextY !== focalY) {
      onChange({ focalX: nextX, focalY: nextY });
    }
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag && drag.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className={cn(
        "relative w-full select-none overflow-hidden border border-[color:var(--border-strong)]/70 bg-[color:var(--paper-strong)] touch-none",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        aspectClassName,
        className,
      )}
      role="application"
      aria-label="Drag to reposition the cover image"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: `${focalX}% ${focalY}%` }}
      />
      {!hasInteracted ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          <span className="rounded-full bg-black/55 px-2.5 py-1 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.16em] text-white backdrop-blur">
            Drag to reframe
          </span>
        </div>
      ) : null}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
