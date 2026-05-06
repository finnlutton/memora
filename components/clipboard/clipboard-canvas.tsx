"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ClipboardCard } from "@/components/clipboard/clipboard-card";
import type {
  ClipboardItem,
  ClipboardPhotoSize,
} from "@/hooks/use-clipboard-items";

/**
 * Desktop canvas for clipboard memories.
 *
 * - Cards render at their stored x/y coords; cards without coords
 *   land in a soft scatter pattern derived from their id so the
 *   layout is stable across reloads even before the user drags.
 * - Drag runs outside the React tree. Pointermove writes
 *   `transform: translate3d(...)` straight onto the dragged card's
 *   DOM node, rAF-coalesced. Sibling cards never re-render during a
 *   drag, no matter how many are on the board. The final position
 *   is committed via `flushSync` on pointerup so the resting render
 *   (new left/top) and the inline-transform clear hit the browser
 *   in the same paint — no snap-back flicker.
 *
 * Touch isn't supported here intentionally — mobile uses the
 * stacked layout.
 *
 * Cards stay inside the canvas via a clamp on drop. The canvas is
 * tall enough (2200px) that ~30 cards never overflow horizontally
 * while still providing room to spread out vertically.
 */

const CANVAS_HEIGHT = 2200;
const CARD_WIDTH = 320; // matches max-w of ClipboardCard
const CARD_DEFAULT_HEIGHT = 220;
// Reserve the top of the canvas for the floating editorial header so
// fallback-positioned cards don't render under the title block.
const HEADER_SAFE_TOP_PX = 240;
// Pointer movement under this distance counts as a click, not a drag.
const DRAG_THRESHOLD_PX = 4;

// Stable pseudo-random scatter for cards without saved coords. Hashing
// the uuid keeps initial positions deterministic so reloads don't shift
// untouched cards around.
function hashToUnit(seed: string, salt: number): number {
  let hash = salt | 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function fallbackPosition(item: ClipboardItem, canvasWidth: number) {
  const safeWidth = Math.max(canvasWidth - CARD_WIDTH - 32, 320);
  const safeHeight = Math.max(
    CANVAS_HEIGHT - CARD_DEFAULT_HEIGHT - HEADER_SAFE_TOP_PX - 32,
    320,
  );
  const x = 16 + Math.round(hashToUnit(item.id, 7) * safeWidth);
  const y =
    HEADER_SAFE_TOP_PX + Math.round(hashToUnit(item.id, 13) * safeHeight);
  return { x, y };
}

export function ClipboardCanvas({
  items,
  onUpdatePosition,
  onUpdateContent,
  onUpdatePhotoSize,
  onRemove,
  onAddAtPosition,
}: {
  items: ClipboardItem[];
  onUpdatePosition: (id: string, x: number, y: number) => Promise<void>;
  onUpdateContent: (id: string, content: string) => Promise<void>;
  onUpdatePhotoSize: (id: string, size: ClipboardPhotoSize) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  /** Click on empty canvas → open the add dialog seeded with that point. */
  onAddAtPosition: (x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1200);

  // Track the canvas's intrinsic width so fallback positions sit nicely
  // even on different screen sizes.
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const update = () => setCanvasWidth(node.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Everything about an in-flight drag lives in this ref + on the
  // dragged DOM node. No React state changes fire while the user
  // moves the pointer, so sibling cards stay still even at 240+Hz.
  const dragStateRef = useRef<{
    id: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    /** Pointer-down origin in viewport coords for threshold checks. */
    startClientX: number;
    startClientY: number;
    /** Resting card position; the live transform is a delta from this. */
    baseX: number;
    baseY: number;
    moved: boolean;
    node: HTMLDivElement;
    rafHandle: number | null;
    pendingDx: number;
    pendingDy: number;
  } | null>(null);

  const handlePointerDown = (
    item: ClipboardItem,
    initialX: number,
    initialY: number,
  ) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const card = e.currentTarget;
    const cardRect = card.getBoundingClientRect();
    dragStateRef.current = {
      id: item.id,
      pointerId: e.pointerId,
      offsetX: e.clientX - cardRect.left,
      offsetY: e.clientY - cardRect.top,
      startClientX: e.clientX,
      startClientY: e.clientY,
      baseX: initialX,
      baseY: initialY,
      moved: false,
      node: card,
      rafHandle: null,
      pendingDx: 0,
      pendingDy: 0,
    };
    // Promote just this card to its own compositor layer for the
    // duration of the drag — the rest of the canvas stays on the
    // main thread's layer and avoids extra GPU memory cost.
    card.style.willChange = "transform";
    card.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    const canvas = canvasRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !canvas) return;
    if (!drag.moved) {
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      // Lift the card above its siblings only once we've committed to
      // a drag — keeps a clean tap from briefly bumping the z-stack.
      drag.node.style.zIndex = "50";
    }
    const canvasRect = canvas.getBoundingClientRect();
    let nextX = e.clientX - canvasRect.left - drag.offsetX;
    let nextY = e.clientY - canvasRect.top - drag.offsetY;
    nextX = Math.max(0, Math.min(canvasRect.width - CARD_WIDTH, nextX));
    nextY = Math.max(0, Math.min(CANVAS_HEIGHT - CARD_DEFAULT_HEIGHT, nextY));
    drag.pendingDx = nextX - drag.baseX;
    drag.pendingDy = nextY - drag.baseY;
    if (drag.rafHandle == null) {
      drag.rafHandle = requestAnimationFrame(() => {
        const d = dragStateRef.current;
        if (!d) return;
        d.rafHandle = null;
        d.node.style.transform = `translate3d(${d.pendingDx}px, ${d.pendingDy}px, 0) scale(1.02)`;
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (drag.rafHandle != null) cancelAnimationFrame(drag.rafHandle);
    const moved = drag.moved;
    const node = drag.node;
    const id = drag.id;
    const finalX = drag.baseX + drag.pendingDx;
    const finalY = drag.baseY + drag.pendingDy;
    dragStateRef.current = null;

    if (!moved) {
      // Pure tap — nothing to persist. Strip any layer-promotion hint.
      node.style.willChange = "";
      return;
    }

    // Commit the new position synchronously so React re-renders the
    // wrapper with the new left/top in the same JS task. We then
    // clear the inline transform/zIndex; the browser paints both
    // changes together and the card lands without a snap-back.
    flushSync(() => {
      void onUpdatePosition(id, finalX, finalY);
    });
    node.style.transform = "";
    node.style.zIndex = "";
    node.style.willChange = "";
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - CARD_WIDTH, e.clientX - rect.left - CARD_WIDTH / 2));
    const y = Math.max(0, Math.min(CANVAS_HEIGHT - CARD_DEFAULT_HEIGHT, e.clientY - rect.top - 30));
    onAddAtPosition(x, y);
  };

  // Determine which cards should preload eagerly. The canvas is taller
  // than the viewport, so most cards sit below the fold — but the
  // browser doesn't know which positioned-absolutely cards are visible
  // without scrolling first. We pick the four cards with the lowest Y
  // coordinate (resolved to fallback for unset coords) and mark those
  // priority. Empirically these are the cards the user paints first;
  // priority preloads them via <link rel="preload"> so they're already
  // streaming by the time the canvas hydrates.
  const PRIORITY_COUNT = 4;
  const priorityIds = useMemo(() => {
    if (items.length === 0) return new Set<string>();
    const sorted = items
      .map((item) => {
        const fallback = fallbackPosition(item, canvasWidth);
        const y =
          typeof item.yPosition === "number" ? item.yPosition : fallback.y;
        return { id: item.id, y };
      })
      .sort((a, b) => a.y - b.y)
      .slice(0, PRIORITY_COUNT);
    return new Set(sorted.map((entry) => entry.id));
  }, [items, canvasWidth]);

  return (
    <div
      ref={canvasRef}
      onClick={handleCanvasClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ height: CANVAS_HEIGHT }}
      className="relative w-full select-none overflow-hidden"
      aria-label="Clipboard canvas — click to add a memory"
      role="region"
    >
      {/*
        Helper hint for first-time users on the empty canvas. Disappears
        as soon as they add anything.
      */}
      {items.length === 0 ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="font-serif text-[18px] italic text-[color:var(--ink-soft)] md:text-[20px]">
            Click anywhere to drop a memory.
          </p>
        </div>
      ) : null}

      {items.map((item) => {
        const fallback = fallbackPosition(item, canvasWidth);
        const baseX =
          typeof item.xPosition === "number" ? item.xPosition : fallback.x;
        const baseY =
          typeof item.yPosition === "number" ? item.yPosition : fallback.y;

        return (
          <div
            key={item.id}
            onPointerDown={handlePointerDown(item, baseX, baseY)}
            style={{
              left: baseX,
              top: baseY,
              zIndex: 1,
            }}
            className="absolute touch-none"
          >
            <ClipboardCard
              item={item}
              onUpdateContent={onUpdateContent}
              onUpdatePhotoSize={onUpdatePhotoSize}
              onRemove={onRemove}
              draggable
              priority={priorityIds.has(item.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
