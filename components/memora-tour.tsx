"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  TOUR_REPLAY_EVENT,
  TOUR_STEPS,
  markTourSeen,
  readTourState,
  setTourProgress,
  type TourSide,
  type TourStep,
} from "@/lib/tour";

/**
 * First-run guided product tour.
 *
 * Renders four layered pieces inside a single fixed overlay:
 *  1. A soft scrim with a circular cut-out around the active anchor —
 *     the rest of the page receives a 14% wash so the highlighted
 *     element reads without the page-wide blur the old tour used.
 *  2. A glowing halo ring on the anchor itself.
 *  3. An anchored caption card with a thin connector pointing back at
 *     the anchor (or centered when the step has no anchor).
 *  4. An animated SVG cursor that drifts to the next nav item between
 *     page changes and ripples a "click" before pushing the route.
 *
 * The tour mounts once inside WorkspaceShell and reads the tour state
 * from localStorage on mount. Skip / complete write `seen: true`. A
 * "Replay tour" button on the Settings page dispatches a window event
 * the listener below picks up to remount mid-session.
 */

type AnchorBox = {
  top: number;
  left: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

const CAPTION_WIDTH = 340;
const CAPTION_OFFSET = 18;
const CAPTION_MARGIN = 16;
const CURSOR_PARK_OFFSET = 22;
const NAV_SETTLE_MS = 520;
const MOBILE_BREAKPOINT = 768;

export function MemoraTour() {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  // Initial step is decided synchronously on first render so a brand-new
  // user gets the welcome step painted on the same frame as /galleries.
  // SSR returns `seen: true` from readTourState() so this is safe.
  const [stepIndex, setStepIndex] = useState<number | null>(() => {
    const state = readTourState();
    return state.seen ? null : (state.lastIndex ?? 0);
  });
  const [anchorBox, setAnchorBox] = useState<AnchorBox | null>(null);
  const [navTarget, setNavTarget] = useState<AnchorBox | null>(null);
  const [viewport, setViewport] = useState({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  });

  // Replay listener — Settings exposes a button that dispatches this.
  useEffect(() => {
    const handler = () => {
      setStepIndex(0);
      setNavTarget(null);
      setAnchorBox(null);
    };
    window.addEventListener(TOUR_REPLAY_EVENT, handler);
    return () => window.removeEventListener(TOUR_REPLAY_EVENT, handler);
  }, []);

  // Track viewport for caption clamping + cursor parking.
  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const step: TourStep | null =
    stepIndex == null ? null : TOUR_STEPS[stepIndex] ?? null;
  const totalSteps = TOUR_STEPS.length;

  // Persist progress as the user advances so a hard reload mid-tour
  // resumes on the same step instead of restarting.
  useEffect(() => {
    if (stepIndex != null) setTourProgress(stepIndex);
  }, [stepIndex]);

  // Cross-page navigation: when the active step's route differs from
  // the current path, animate the cursor to the matching nav item
  // (when the step provides one) and only THEN push the route.
  // setNavTarget here is a deliberate side-effect — we're synchronizing
  // the cursor's pose with an external system (Next router + the rendered
  // sidebar nav DOM); React's set-state-in-effect rule is overly strict
  // for this case.
  useEffect(() => {
    if (!step || stepIndex == null) return;
    if (pathname === step.route) return;
    if (!step.navTo || reduceMotion) {
      router.push(step.route);
      return;
    }
    const navEl = document.querySelector(
      `[data-tour-nav='${step.navTo}']`,
    ) as HTMLElement | null;
    if (!navEl) {
      router.push(step.route);
      return;
    }
    const rect = navEl.getBoundingClientRect();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavTarget({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    });
    // Give the cursor a moment to drift onto the nav item, ripple,
    // and "click" before route push. Total ~520ms — short enough to
    // feel snappy, long enough to read as deliberate.
    const id = window.setTimeout(() => {
      router.push(step.route);
    }, NAV_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [step, stepIndex, pathname, router, reduceMotion]);

  // Re-measure the anchor (and clear the nav-target cursor pose) once
  // the route resolves. The retry burst handles late-mounting elements
  // like the globe canvas which arrives after a dynamic import.
  const recomputeAnchor = useCallback(() => {
    if (!step?.anchor) {
      setAnchorBox(null);
      return;
    }
    const el = document.querySelector(step.anchor) as HTMLElement | null;
    if (!el) {
      setAnchorBox(null);
      return;
    }
    let rect = el.getBoundingClientRect();
    // If the anchor is off-screen vertically, scroll it into view before
    // measuring. Without this, the spotlight can paint on an empty patch
    // of viewport — common on mobile where steps land below the fold
    // (e.g. settings appearance after navigating to /galleries/settings).
    const offTop = rect.bottom < 24;
    const offBottom = rect.top > window.innerHeight - 24;
    if (offTop || offBottom) {
      el.scrollIntoView({ block: "center", behavior: "auto" });
      rect = el.getBoundingClientRect();
    }
    setAnchorBox({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    });
  }, [step]);

  useLayoutEffect(() => {
    if (!step || pathname !== step.route) return;
    // Drop both the cursor's nav-target pose and the previous step's
    // anchor box now that the new step is active. The recompute below
    // will populate a fresh anchor — clearing first prevents the
    // spotlight from lingering on the previous element while the new
    // anchor measurement is in flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavTarget(null);
    setAnchorBox(null);
    let raf = requestAnimationFrame(recomputeAnchor);
    const retries = [120, 320, 640, 1000, 1600].map((delay) =>
      window.setTimeout(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(recomputeAnchor);
      }, delay),
    );
    const onResize = () => recomputeAnchor();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      retries.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
    };
  }, [step, pathname, recomputeAnchor]);

  const isLast = stepIndex != null && stepIndex === totalSteps - 1;
  const isFirst = stepIndex === 0;

  const handleNext = useCallback(() => {
    if (stepIndex == null) return;
    if (isLast) {
      markTourSeen();
      setStepIndex(null);
      setNavTarget(null);
      return;
    }
    setStepIndex((current) => (current == null ? null : current + 1));
  }, [isLast, stepIndex]);

  const handleBack = useCallback(() => {
    setStepIndex((current) => {
      if (current == null || current <= 0) return current;
      return current - 1;
    });
  }, []);

  const handleSkip = useCallback(() => {
    markTourSeen();
    setStepIndex(null);
    setNavTarget(null);
  }, []);

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------
  if (step == null || stepIndex == null) return null;

  const captionVisible = pathname === step.route;
  const navigating = navTarget != null;
  const isMobile = viewport.width < MOBILE_BREAKPOINT;
  // 340px caption barely fits at 375px viewport and overflows below.
  // Clamp to viewport on mobile so margins stay even on either side.
  const captionWidth = isMobile
    ? Math.min(CAPTION_WIDTH, viewport.width - CAPTION_MARGIN * 2)
    : CAPTION_WIDTH;
  // On mobile there's no horizontal room for a full caption beside an
  // anchor, so authored "left"/"right" sides collapse to vertical
  // placement — top if the anchor sits in the lower half of the viewport,
  // bottom otherwise. Native top/bottom sides pass through unchanged.
  const authoredSide = step.anchorSide ?? "bottom";
  const effectiveSide: TourSide = (() => {
    if (!isMobile) return authoredSide;
    if (authoredSide === "top" || authoredSide === "bottom") return authoredSide;
    if (anchorBox && anchorBox.centerY > viewport.height / 2) return "top";
    return "bottom";
  })();
  const captionPos = computeCaptionPos(
    effectiveSide,
    anchorBox,
    viewport,
    captionWidth,
  );
  const cursorPos = computeCursorPos({
    navigating,
    navTarget,
    anchorBox,
    captionPos,
    viewport,
  });

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="false"
      aria-live="polite"
    >
      {/* Invisible click-blocker — keeps the user on the rails of the
          tour without imposing the heavy modal blur the old version
          used. Visual hierarchy comes from the scrim above; this layer
          is purely behavioral. */}
      <div className="pointer-events-auto absolute inset-0" />

      {/* Soft scrim with anchor cut-out — keeps the page paint visible
          while pushing the rest of the chrome quietly back. */}
      <SoftScrim anchor={anchorBox} viewport={viewport} reduce={!!reduceMotion} />

      {/* Halo ring on the anchored element. */}
      <AnimatePresence>
        {captionVisible && anchorBox ? (
          <motion.div
            key={`halo-${stepIndex}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{
              top: anchorBox.top - 8,
              left: anchorBox.left - 8,
              width: anchorBox.width + 16,
              height: anchorBox.height + 16,
            }}
            className="pointer-events-none absolute rounded-[10px] ring-1 ring-[color:var(--ink)]/20 shadow-[0_0_0_1px_rgba(255,255,255,0.5)_inset,0_18px_38px_-12px_rgba(20,28,40,0.18)]"
          />
        ) : null}
      </AnimatePresence>

      {/* Caption card — the editorial callout. */}
      <AnimatePresence mode="wait">
        {captionVisible ? (
          <motion.div
            key={`caption-${stepIndex}`}
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: 4,
              scale: 0.99,
              transition: { duration: 0.18 },
            }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            style={{
              top: captionPos.top,
              left: captionPos.left,
              width: captionWidth,
            }}
            className="pointer-events-auto absolute"
          >
            {/* Connector line — only when anchored */}
            {anchorBox ? (
              <Connector
                anchor={anchorBox}
                caption={captionPos}
                side={effectiveSide}
                captionWidth={captionWidth}
              />
            ) : null}

            <div className="relative rounded-[14px] border border-[color:var(--border-strong)] bg-[color:var(--background)]/95 p-5 shadow-[0_24px_60px_-12px_rgba(15,24,35,0.22)] backdrop-blur-xl md:p-6">
              <div className="flex items-center justify-between">
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  Step {stepIndex + 1} of {totalSteps}
                </p>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="-mr-2 inline-flex h-9 items-center px-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)] transition hover:text-[color:var(--ink-soft)] md:h-auto md:p-0"
                  aria-label="Skip the tour"
                >
                  Skip
                </button>
              </div>

              <h2 className="mt-2.5 font-serif text-[26px] leading-[1.06] text-[color:var(--ink)] md:text-[28px]">
                {step.title}
              </h2>
              <p className="mt-3 text-[14px] leading-[1.65] text-[color:var(--ink-soft)] md:text-[14.5px]">
                {step.body}
              </p>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className={`block h-[3px] rounded-full transition-all duration-300 ${
                        i === stepIndex
                          ? "w-5 bg-[color:var(--ink)]"
                          : i < stepIndex
                            ? "w-3 bg-[color:var(--ink-soft)]"
                            : "w-3 bg-[color:var(--border-strong)]"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {!isFirst ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="inline-flex h-11 items-center rounded-full px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)] transition hover:bg-[color:var(--hover-tint)] hover:text-[color:var(--ink)] md:h-auto md:py-1.5"
                    >
                      Back
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex h-11 items-center gap-1.5 rounded-full bg-[color:var(--ink)] px-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--background)] transition hover:bg-[color:var(--accent-strong-hover)] md:h-auto md:py-2"
                  >
                    {isLast ? "Begin" : isFirst ? "Start tour" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Animated cursor — desktop-only metaphor (touch users don't see
          a pointer in their normal interaction model). On mobile the
          cursor would also need to chase off-screen mobile-strip nav
          items, which produces a visible "drift to nowhere" jank. */}
      {!reduceMotion && !isMobile ? (
        <TourCursor pos={cursorPos} clicking={navigating} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------
// Soft scrim — anchor cut-out via SVG mask. Avoids blurring the page.
// ---------------------------------------------------------------
function SoftScrim({
  anchor,
  viewport,
  reduce,
}: {
  anchor: AnchorBox | null;
  viewport: { width: number; height: number };
  reduce: boolean;
}) {
  // Generous cutout so the anchored element AND a halo of context
  // around it stay fully clear. Scrim opacity is intentionally light
  // — the page should still read as the hero, the wash just softly
  // pushes the chrome backward.
  const cutoutRadius = anchor
    ? Math.max(anchor.width, anchor.height) / 2 + 80
    : 0;

  return (
    <motion.svg
      width={viewport.width}
      height={viewport.height}
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}
    >
      <defs>
        <radialGradient id="memora-tour-cutout" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="black" stopOpacity="1" />
          <stop offset="40%" stopColor="black" stopOpacity="1" />
          <stop offset="100%" stopColor="black" stopOpacity="0" />
        </radialGradient>
        <mask id="memora-tour-mask">
          <rect
            x="0"
            y="0"
            width={viewport.width}
            height={viewport.height}
            fill="white"
          />
          {anchor ? (
            <motion.circle
              cx={anchor.centerX}
              cy={anchor.centerY}
              r={cutoutRadius}
              fill="url(#memora-tour-cutout)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduce ? 0 : 0.32 }}
            />
          ) : null}
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width={viewport.width}
        height={viewport.height}
        fill="rgba(15, 24, 35, 0.10)"
        mask="url(#memora-tour-mask)"
      />
    </motion.svg>
  );
}

// ---------------------------------------------------------------
// Connector — short line + dot from caption back to the anchor edge.
// ---------------------------------------------------------------
function Connector({
  anchor,
  caption,
  side,
  captionWidth,
}: {
  anchor: AnchorBox;
  caption: { top: number; left: number; height: number };
  side: TourSide;
  captionWidth: number;
}) {
  // Pick a tail point on the anchor edge facing the caption, and a head
  // point on the caption edge facing the anchor. The line is a short
  // muted stroke; a small dot pins the anchor end.
  let tailX: number;
  let tailY: number;
  let headX: number;
  let headY: number;

  switch (side) {
    case "top":
      tailX = anchor.centerX;
      tailY = anchor.top;
      headX = caption.left + captionWidth / 2;
      headY = caption.top + caption.height;
      break;
    case "left":
      tailX = anchor.left;
      tailY = anchor.centerY;
      headX = caption.left + captionWidth;
      headY = caption.top + caption.height / 2;
      break;
    case "right":
      tailX = anchor.left + anchor.width;
      tailY = anchor.centerY;
      headX = caption.left;
      headY = caption.top + caption.height / 2;
      break;
    case "bottom":
    default:
      tailX = anchor.centerX;
      tailY = anchor.top + anchor.height;
      headX = caption.left + captionWidth / 2;
      headY = caption.top;
      break;
  }

  // SVG drawn fixed-position at viewport scale; coordinates above are
  // already in viewport pixels.
  const minX = Math.min(tailX, headX) - 4;
  const minY = Math.min(tailY, headY) - 4;
  const w = Math.abs(tailX - headX) + 8;
  const h = Math.abs(tailY - headY) + 8;

  // Connector renders relative to the caption div's positioned origin.
  // The caption itself is `absolute` inside the fixed overlay (its
  // top/left match captionPos), so we compute connector offsets in the
  // caption's local coordinate space.
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="pointer-events-none absolute"
      style={{
        top: minY - caption.top,
        left: minX - caption.left,
      }}
      aria-hidden="true"
    >
      <line
        x1={tailX - minX}
        y1={tailY - minY}
        x2={headX - minX}
        y2={headY - minY}
        stroke="rgba(15, 24, 35, 0.32)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <circle
        cx={tailX - minX}
        cy={tailY - minY}
        r={3}
        fill="var(--ink)"
        opacity={0.7}
      />
    </svg>
  );
}

// ---------------------------------------------------------------
// Animated cursor
// ---------------------------------------------------------------
function TourCursor({
  pos,
  clicking,
}: {
  pos: { x: number; y: number; visible: boolean };
  clicking: boolean;
}) {
  if (!pos.visible) return null;
  return (
    <motion.div
      className="pointer-events-none absolute"
      animate={{ x: pos.x, y: pos.y }}
      transition={{
        type: "spring",
        stiffness: 110,
        damping: 18,
        mass: 0.7,
      }}
      style={{ top: 0, left: 0 }}
    >
      {/* Click ripple */}
      <AnimatePresence>
        {clicking ? (
          <motion.span
            key="ripple"
            initial={{ scale: 0.4, opacity: 0.6 }}
            animate={{ scale: 2.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="absolute -left-3 -top-3 block h-6 w-6 rounded-full bg-[color:var(--ink)]/35"
            aria-hidden="true"
          />
        ) : null}
      </AnimatePresence>
      <motion.div
        animate={{ scale: clicking ? 0.86 : 1 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative"
      >
        <CursorIcon />
      </motion.div>
    </motion.div>
  );
}

function CursorIcon() {
  // Editorial cursor — a slim arrow with a subtle drop shadow that
  // reads on both the warm clipboard paper and the cool harbor blue.
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      style={{ filter: "drop-shadow(0 6px 10px rgba(15,24,35,0.22))" }}
      aria-hidden="true"
    >
      <path
        d="M3 2.5 L18 11 L11.2 12.4 L8.6 18.6 Z"
        fill="white"
        stroke="rgba(15,24,35,0.85)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------
function computeCaptionPos(
  side: TourSide,
  anchor: AnchorBox | null,
  viewport: { width: number; height: number },
  captionWidth: number,
): { top: number; left: number; height: number } {
  // Approximate caption height for clamping. Real height is measured
  // by Framer Motion at paint, but we need a number for edge clamping.
  const estHeight = 220;
  if (!anchor) {
    return {
      top: Math.max(viewport.height / 2 - estHeight / 2, CAPTION_MARGIN),
      left: Math.max(viewport.width / 2 - captionWidth / 2, CAPTION_MARGIN),
      height: estHeight,
    };
  }
  let top = 0;
  let left = 0;
  switch (side) {
    case "top":
      top = anchor.top - estHeight - CAPTION_OFFSET;
      left = anchor.centerX - captionWidth / 2;
      break;
    case "left":
      top = anchor.centerY - estHeight / 2;
      left = anchor.left - captionWidth - CAPTION_OFFSET;
      break;
    case "right":
      top = anchor.centerY - estHeight / 2;
      left = anchor.left + anchor.width + CAPTION_OFFSET;
      break;
    case "bottom":
    default:
      top = anchor.top + anchor.height + CAPTION_OFFSET;
      left = anchor.centerX - captionWidth / 2;
      break;
  }
  top = Math.max(
    CAPTION_MARGIN,
    Math.min(top, viewport.height - estHeight - CAPTION_MARGIN),
  );
  left = Math.max(
    CAPTION_MARGIN,
    Math.min(left, viewport.width - captionWidth - CAPTION_MARGIN),
  );
  return { top, left, height: estHeight };
}

function computeCursorPos({
  navigating,
  navTarget,
  anchorBox,
  captionPos,
  viewport,
}: {
  navigating: boolean;
  navTarget: AnchorBox | null;
  anchorBox: AnchorBox | null;
  captionPos: { top: number; left: number; height: number };
  viewport: { width: number; height: number };
}): { x: number; y: number; visible: boolean } {
  if (navigating && navTarget) {
    return {
      x: navTarget.centerX - 4,
      y: navTarget.centerY - 2,
      visible: true,
    };
  }
  if (anchorBox) {
    // Park the cursor just inside the anchor toward the caption — a
    // quiet "I'm pointing at this" pose without overlapping the
    // caption card.
    return {
      x: Math.min(
        anchorBox.left + anchorBox.width - CURSOR_PARK_OFFSET,
        viewport.width - 12,
      ),
      y: Math.min(
        anchorBox.top + anchorBox.height - CURSOR_PARK_OFFSET,
        viewport.height - 12,
      ),
      visible: true,
    };
  }
  // No anchor (welcome step) — sit just above the caption pointing in.
  return {
    x: captionPos.left + 36,
    y: captionPos.top - 14,
    visible: true,
  };
}

