"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardCard } from "@/components/clipboard/clipboard-card";
import type { ClipboardItem } from "@/hooks/use-clipboard-items";

/**
 * Desktop canvas for clipboard memories.
 *
 * - Cards render at their stored x/y coords; cards without coords
 *   land in a soft scatter pattern derived from their id so the
 *   layout is stable across reloads even before the user drags.
 * - Drag uses native pointer events tracked at the canvas root so
 *   only one set of listeners fires regardless of how many cards
 *   exist; touch isn't supported here intentionally — mobile uses
 *   the stacked layout.
 *
 * Cards stay inside the canvas via a clamp on drop. The canvas is
 * tall enough (2200px) that ~30 cards never overflow horizontally
 * while still providing room to spread out vertically.
 */

const CANVAS_HEIGHT = 2200;
const CARD_WIDTH = 320; // matches max-w of ClipboardCard
const CARD_DEFAULT_HEIGHT = 220;

// Stable pseudo-random scatter for cards without saved coords. Hashing
// the uuid keeps initial positions deterministic so reloads don't shift
// untouched cards around.
function hashToUnit(seed: string, salt: number): number {
  let hash = salt | 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  // Map to [0, 1)
  return ((hash >>> 0) % 10000) / 10000;
}

function fallbackPosition(item: ClipboardItem, canvasWidth: number) {
  const safeWidth = Math.max(canvasWidth - CARD_WIDTH - 32, 320);
  const safeHeight = Math.max(CANVAS_HEIGHT - CARD_DEFAULT_HEIGHT - 32, 320);
  const x = 16 + Math.round(hashToUnit(item.id, 7) * safeWidth);
  const y = 16 + Math.round(hashToUnit(item.id, 13) * safeHeight);
  return { x, y };
}

export function ClipboardCanvas({
  items,
  onUpdatePosition,
  onUpdateContent,
  onRemove,
  onAddAtPosition,
}: {
  items: ClipboardItem[];
  onUpdatePosition: (id: string, x: number, y: number) => Promise<void>;
  onUpdateContent: (id: string, content: string) => Promise<void>;
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

  // Drag state lives in refs so re-renders during drag don't slow us down.
  const dragStateRef = useRef<{
    id: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const handlePointerDown = (item: ClipboardItem) => (
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (e.button !== 0) return;
    const card = e.currentTarget;
    const cardRect = card.getBoundingClientRect();
    const offsetX = e.clientX - cardRect.left;
    const offsetY = e.clientY - cardRect.top;
    dragStateRef.current = {
      id: item.id,
      pointerId: e.pointerId,
      offsetX,
      offsetY,
    };
    setDragId(item.id);
    setDragPos({ x: cardRect.left, y: cardRect.top });
    card.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    const canvas = canvasRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    let nextX = e.clientX - canvasRect.left - drag.offsetX;
    let nextY = e.clientY - canvasRect.top - drag.offsetY;
    nextX = Math.max(0, Math.min(canvasRect.width - CARD_WIDTH, nextX));
    nextY = Math.max(0, Math.min(CANVAS_HEIGHT - CARD_DEFAULT_HEIGHT, nextY));
    setDragPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const finalPos = dragPos;
    dragStateRef.current = null;
    setDragId(null);
    setDragPos(null);
    if (finalPos) {
      void onUpdatePosition(drag.id, finalPos.x, finalPos.y);
    }
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

  return (
    <div
      ref={canvasRef}
      onClick={handleCanvasClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ height: CANVAS_HEIGHT }}
      className="memora-clipboard-paper relative w-full select-none overflow-hidden"
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
        const stored = {
          x: item.xPosition,
          y: item.yPosition,
        };
        const fallback = fallbackPosition(item, canvasWidth);
        const baseX = typeof stored.x === "number" ? stored.x : fallback.x;
        const baseY = typeof stored.y === "number" ? stored.y : fallback.y;
        const isDragging = dragId === item.id && dragPos;
        const x = isDragging ? dragPos!.x : baseX;
        const y = isDragging ? dragPos!.y : baseY;

        return (
          <div
            key={item.id}
            onPointerDown={handlePointerDown(item)}
            style={{
              left: x,
              top: y,
              width: CARD_WIDTH,
              transform: isDragging ? "scale(1.02)" : undefined,
              transition: isDragging
                ? undefined
                : "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
              zIndex: isDragging ? 50 : 1,
            }}
            className="absolute touch-none"
          >
            <ClipboardCard
              item={item}
              onUpdateContent={onUpdateContent}
              onRemove={onRemove}
              draggable
            />
          </div>
        );
      })}
    </div>
  );
}
