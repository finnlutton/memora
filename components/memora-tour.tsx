"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  TOUR_STEPS,
  readTourProgress,
  readTourSeen,
  writeTourProgress,
  writeTourSeen,
  type TourStep,
} from "@/lib/tour";
import { cn } from "@/lib/utils";

type AnchorBox = { top: number; left: number; width: number; height: number };

const POPUP_WIDTH = 360;
const POPUP_OFFSET = 16;

/**
 * First-run guided tour overlay. Mounts inside WorkspaceShell. Reads a
 * single localStorage flag; if unset, walks the user through the six
 * steps defined in lib/tour.ts.
 *
 * Behavior notes:
 *  - Mandatory: no skip button. Only "Next" advances; the final "Done"
 *    button writes the flag and unmounts.
 *  - Backdrop is non-dismissable (clicking outside is a no-op) so the
 *    tour can't be skipped by mis-click.
 *  - When a step has an anchor selector, the popup positions itself next
 *    to that element. Otherwise it centers in the viewport.
 *  - The popup waits a tick after route changes so the next page's
 *    anchored element has time to mount.
 */
export function MemoraTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [anchorBox, setAnchorBox] = useState<AnchorBox | null>(null);

  // Decide on mount whether to start the tour. Read both the seen flag
  // and any in-progress step from localStorage — the latter survives
  // navigation between workspace pages, since WorkspaceShell (and this
  // component) remount per route.
  useEffect(() => {
    if (!readTourSeen()) {
      setStepIndex((current) => current ?? readTourProgress());
    }
  }, []);

  const step: TourStep | null =
    stepIndex == null ? null : TOUR_STEPS[stepIndex] ?? null;

  // Whenever the active step's route differs from the current path, push
  // the user there. The popup hides until pathname matches the step,
  // which prevents a flash of "wrong page + popup" during the navigation.
  useEffect(() => {
    if (!step) return;
    if (pathname !== step.route) {
      router.push(step.route);
    }
  }, [step, pathname, router]);

  const recomputeAnchor = useCallback(() => {
    if (!step?.anchor) {
      setAnchorBox(null);
      return;
    }
    const el = document.querySelector(step.anchor);
    if (!el) {
      setAnchorBox(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setAnchorBox({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [step]);

  // Re-measure the anchor after the route resolves and on every resize.
  useLayoutEffect(() => {
    if (!step || pathname !== step.route) return;
    let raf = requestAnimationFrame(recomputeAnchor);
    // Some anchors render late (e.g. globe canvas after dynamic import).
    // A retry burst over the first second covers that without polling.
    const retries = [120, 320, 640, 1000].map((delay) =>
      setTimeout(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(recomputeAnchor);
      }, delay),
    );
    window.addEventListener("resize", recomputeAnchor);
    window.addEventListener("scroll", recomputeAnchor, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      retries.forEach(clearTimeout);
      window.removeEventListener("resize", recomputeAnchor);
      window.removeEventListener("scroll", recomputeAnchor);
    };
  }, [step, pathname, recomputeAnchor]);

  if (!step || pathname !== step.route) return null;

  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      writeTourSeen();
      setStepIndex(null);
      return;
    }
    setStepIndex((current) => {
      const next = current == null ? null : current + 1;
      if (next != null) writeTourProgress(next);
      return next;
    });
  };

  const popupStyle = computePopupPosition(step, anchorBox);

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none" aria-live="polite">
      {/* Backdrop — softens the page so the popup reads, but doesn't block
          page paint of the anchored element. Clicks are absorbed so the
          user can't accidentally trigger background UI mid-tour. */}
      <div className="pointer-events-auto absolute inset-0 bg-[rgba(8,6,4,0.42)] backdrop-blur-[2px]" />

      {/* Anchor highlight ring — drawn behind the popup so the targeted
          element looks like the spotlight, not the popup. */}
      {anchorBox ? (
        <div
          aria-hidden="true"
          style={{
            top: anchorBox.top - 6,
            left: anchorBox.left - 6,
            width: anchorBox.width + 12,
            height: anchorBox.height + 12,
          }}
          className="pointer-events-none absolute rounded-md border-2 border-[color:var(--accent-strong)] shadow-[0_0_0_9999px_rgba(8,6,4,0.42)]"
        />
      ) : null}

      {/* Popup card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="memora-tour-title"
        style={popupStyle}
        className="pointer-events-auto absolute w-[min(360px,calc(100vw-32px))] border border-[color:var(--border-strong)] bg-[color:var(--background)] p-5 shadow-[0_24px_48px_rgba(8,6,4,0.32)] md:p-6"
      >
        <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Step {(stepIndex ?? 0) + 1} of {TOUR_STEPS.length}
        </p>
        <h2
          id="memora-tour-title"
          className="mt-2 font-serif text-2xl leading-[1.15] text-[color:var(--ink)] md:text-[26px]"
        >
          {step.title}
        </h2>
        <p className="mt-3 text-[14px] leading-[1.6] text-[color:var(--ink-soft)] md:text-[15px]">
          {step.body}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={cn(
                  "h-1 w-4 rounded-full transition-colors",
                  i === stepIndex
                    ? "bg-[color:var(--ink)]"
                    : "bg-[color:var(--border-strong)]",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--accent-strong)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--background)] transition hover:bg-[color:var(--accent-strong-hover)]"
          >
            {isLast ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

function computePopupPosition(
  step: TourStep,
  anchor: AnchorBox | null,
): React.CSSProperties {
  if (!anchor) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }
  const side = step.anchorSide ?? "bottom";
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const popupHeight = 240; // approx; only used for clamping
  const margin = 16;

  let top = 0;
  let left = 0;

  switch (side) {
    case "top":
      top = anchor.top - popupHeight - POPUP_OFFSET;
      left = anchor.left + anchor.width / 2 - POPUP_WIDTH / 2;
      break;
    case "left":
      top = anchor.top + anchor.height / 2 - popupHeight / 2;
      left = anchor.left - POPUP_WIDTH - POPUP_OFFSET;
      break;
    case "right":
      top = anchor.top + anchor.height / 2 - popupHeight / 2;
      left = anchor.left + anchor.width + POPUP_OFFSET;
      break;
    case "bottom":
    default:
      top = anchor.top + anchor.height + POPUP_OFFSET;
      left = anchor.left + anchor.width / 2 - POPUP_WIDTH / 2;
      break;
  }

  // Clamp inside viewport so the popup never sits off-screen on narrow
  // displays (the anchor itself may be near an edge).
  top = Math.max(margin, Math.min(top, vh - popupHeight - margin));
  left = Math.max(margin, Math.min(left, vw - POPUP_WIDTH - margin));
  return { top, left };
}
