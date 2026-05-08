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
 *     the rest of the page receives a light wash so the highlighted
 *     element reads without the page-wide blur the old tour used. The
 *     cutout's centre is animated, so it glides between steps instead
 *     of cutting hard from one anchor to the next.
 *  2. A glowing halo ring on the anchor itself.
 *  3. A caption card. On desktop it's anchored to the highlighted
 *     element with a thin connector. On mobile it collapses to a
 *     bottom sheet (or top, when the anchor sits in the lower half),
 *     because anchored popovers tend to clip / overlap content on
 *     small viewports.
 *  4. An animated SVG cursor that drifts to the next nav item between
 *     page changes and ripples a "click" before pushing the route.
 *
 * Lifecycle: an outer AnimatePresence wraps the whole overlay so that
 * Skip / Got-it fade the surface out gracefully (instead of the abrupt
 * unmount the previous version produced). The localStorage `seen` flag
 * is written immediately; the overlay then waits ~exit-duration before
 * unmounting via onExitComplete.
 *
 * The tour mounts once inside WorkspaceShell and reads the tour state
 * from localStorage on mount. The storage key is intentionally not
 * bumped — existing users with `seen: true` should not be re-shown the
 * tour just because we polished it. A "Replay tour" button on the
 * Settings page dispatches a window event the listener below picks up
 * to remount mid-session.
 */

type AnchorBox = {
  top: number;
  left: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

const CAPTION_WIDTH = 360;
const CAPTION_OFFSET = 18;
const CAPTION_MARGIN = 16;
const CURSOR_PARK_OFFSET = 22;
const NAV_SETTLE_MS = 520;
const MOBILE_BREAKPOINT = 768;
const OVERLAY_FADE_MS = 320;

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
  // `exiting` lets us fade the entire overlay out on Skip / Got-it
  // before unmounting, instead of cutting straight to null.
  const [exiting, setExiting] = useState(false);
  const [anchorBox, setAnchorBox] = useState<AnchorBox | null>(null);
  const [navTarget, setNavTarget] = useState<AnchorBox | null>(null);
  // Mobile cross-page choreography: instead of a fake cursor, we pulse
  // a halo on the real UI — first the hamburger, then the target nav
  // tab inside the opened drawer — so the user learns the actual
  // navigation gesture. Box is the pulse anchor; phase gates the
  // accompanying caption hint.
  const [mobileNavBox, setMobileNavBox] = useState<AnchorBox | null>(null);
  const [mobileNavPhase, setMobileNavPhase] = useState<
    "idle" | "menu" | "tab"
  >("idle");
  const [viewport, setViewport] = useState({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  });

  // Replay listener — Settings exposes a button that dispatches this.
  useEffect(() => {
    const handler = () => {
      setExiting(false);
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
  // resumes on the same step instead of restarting. We skip writes
  // while `exiting` so the final fade-out doesn't overwrite the
  // `seen: true` value just written by Skip / Got-it.
  useEffect(() => {
    if (stepIndex != null && !exiting) setTourProgress(stepIndex);
  }, [stepIndex, exiting]);

  // Cross-page navigation: when the active step's route differs from
  // the current path, demonstrate the navigation gesture before
  // actually pushing the route.
  //
  // Desktop: animate a fake cursor to the sidebar nav item (the
  //   metaphor matches the real interaction — pointer + click).
  //
  // Mobile: pulse a halo on the hamburger button → open the drawer →
  //   pulse a halo on the target nav tab → push the route. No fake
  //   cursor (touch users don't have a pointer model); the pulse
  //   teaches the actual gesture using the actual UI.
  //
  // Both branches set state inside the effect because we're sequencing
  // an external system (Next router + rendered nav DOM); React's
  // set-state-in-effect rule is overly strict for this case.
  useEffect(() => {
    if (!step || stepIndex == null) return;
    if (pathname === step.route) return;
    const isMobileViewport = viewport.width < MOBILE_BREAKPOINT;
    if (!step.navTo || reduceMotion) {
      router.push(step.route);
      return;
    }

    // ---- Mobile choreography ----
    if (isMobileViewport) {
      const menuEl = document.querySelector(
        '[data-tour-id="mobile-menu-trigger"]',
      ) as HTMLElement | null;
      if (!menuEl) {
        router.push(step.route);
        return;
      }
      const measureBox = (el: HTMLElement): AnchorBox => {
        const r = el.getBoundingClientRect();
        return {
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
          centerX: r.left + r.width / 2,
          centerY: r.top + r.height / 2,
        };
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMobileNavBox(measureBox(menuEl));
      setMobileNavPhase("menu");
      // Drop the previous step's spotlight cutout so the pulse halo
      // is the only visual focus during the choreography.
      setAnchorBox(null);

      // Phase 1: hamburger pulses for ~620ms, then we ask the shell
      // to open the drawer (its 320ms slide-in starts here).
      const tOpen = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("memora:tour:open-mobile-drawer"));
      }, 620);

      // Phase 2: once the drawer has slid in, find the target tab,
      // re-anchor the pulse to it, swap caption hint to "tap tab".
      const tTab = window.setTimeout(() => {
        const tabEl = document.querySelector(
          `[data-tour-nav-mobile='${step.navTo}']`,
        ) as HTMLElement | null;
        if (tabEl) {
          setMobileNavBox(measureBox(tabEl));
          setMobileNavPhase("tab");
        }
      }, 1020);

      // Phase 3: route push. The shell's pathname effect closes the
      // drawer for us; the new step's caption fades in on the next
      // page.
      const tPush = window.setTimeout(() => {
        router.push(step.route);
      }, 1640);

      return () => {
        window.clearTimeout(tOpen);
        window.clearTimeout(tTab);
        window.clearTimeout(tPush);
      };
    }

    // ---- Desktop cursor ----
    const navEl = document.querySelector(
      `[data-tour-nav='${step.navTo}']`,
    ) as HTMLElement | null;
    if (!navEl) {
      router.push(step.route);
      return;
    }
    const rect = navEl.getBoundingClientRect();
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
  }, [step, stepIndex, pathname, router, reduceMotion, viewport.width]);

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
    // Drop the desktop cursor's nav-target pose, the mobile nav pulse,
    // and the previous step's anchor box now that the new step is
    // active. The recompute below will populate a fresh anchor —
    // clearing first prevents the spotlight from lingering on the
    // previous element while the new anchor measurement is in flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavTarget(null);
    setMobileNavBox(null);
    setMobileNavPhase("idle");
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
      setExiting(true);
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
    setExiting(true);
  }, []);

  // Once the overlay's fade-out finishes, drop state. Without this the
  // overlay would keep re-rendering at opacity 0 and the next replay
  // would think the previous tour was still mid-flight.
  const handleExitComplete = useCallback(() => {
    if (!exiting) return;
    setStepIndex(null);
    setNavTarget(null);
    setAnchorBox(null);
    setExiting(false);
  }, [exiting]);

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------
  const overlayActive = !exiting && step != null && stepIndex != null;
  const captionVisible = overlayActive && pathname === step!.route;
  const navigating = navTarget != null;
  const isMobile = viewport.width < MOBILE_BREAKPOINT;
  // Mobile sheet width: nearly full viewport, capped at 460 so it
  // doesn't sprawl on tablets between the breakpoint and md.
  const captionWidth = isMobile
    ? Math.min(viewport.width - CAPTION_MARGIN * 2, 460)
    : CAPTION_WIDTH;
  // On desktop, honor the authored side. On mobile the caption is a
  // bottom sheet by default; only flip to "top" when the anchor sits
  // in the lower half of the viewport (otherwise the sheet would
  // cover the very thing it's pointing at).
  const authoredSide = step?.anchorSide ?? "bottom";
  const effectiveSide: TourSide = (() => {
    if (!isMobile) return authoredSide;
    if (anchorBox && anchorBox.centerY > viewport.height * 0.55) return "top";
    return "bottom";
  })();
  const captionPos = computeCaptionPos(
    effectiveSide,
    anchorBox,
    viewport,
    captionWidth,
    isMobile,
  );
  const cursorPos = computeCursorPos({
    navigating,
    navTarget,
    anchorBox,
    captionPos,
    viewport,
  });

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {overlayActive ? (
        <motion.div
          key="memora-tour-overlay"
          className="pointer-events-none fixed inset-0 z-[80]"
          role="dialog"
          aria-modal="false"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: OVERLAY_FADE_MS / 1000, ease: "easeOut" },
          }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Invisible click-blocker — keeps the user on the rails of
              the tour without imposing the heavy modal blur the old
              version used. Visual hierarchy comes from the scrim
              above; this layer is purely behavioural. */}
          <div className="pointer-events-auto absolute inset-0" />

          {/* Soft scrim with anchor cut-out — keeps the page paint
              visible while pushing the rest of the chrome quietly
              back. The cutout's centre is animated, so it glides
              between steps instead of cutting hard. */}
          <SoftScrim
            anchor={anchorBox}
            viewport={viewport}
            reduce={!!reduceMotion}
          />

          {/* Mobile cross-page choreography — pulses on the hamburger
              then on the target nav tab inside the open drawer, with
              a small contextual hint. Renders ABOVE the halo block
              so it sits on top of the drawer's z=50 layer. */}
          <MobileNavPulse box={mobileNavBox} phase={mobileNavPhase} />

          {/* Halo ring on the anchored element. */}
          <AnimatePresence>
            {captionVisible && anchorBox ? (
              <motion.div
                key={`halo-${stepIndex}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0.98,
                  transition: { duration: 0.22 },
                }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  top: anchorBox.top - 8,
                  left: anchorBox.left - 8,
                  width: anchorBox.width + 16,
                  height: anchorBox.height + 16,
                }}
                className="pointer-events-none absolute rounded-[12px] ring-1 ring-[color:var(--ink)]/22 shadow-[0_0_0_1px_rgba(255,255,255,0.55)_inset,0_18px_38px_-12px_rgba(20,28,40,0.20)]"
              />
            ) : null}
          </AnimatePresence>

          {/* Caption card — popover on desktop, bottom-sheet on mobile. */}
          <AnimatePresence mode="wait">
            {captionVisible && step ? (
              <motion.div
                key={`caption-${stepIndex}`}
                initial={
                  isMobile
                    ? { opacity: 0, y: 28 }
                    : { opacity: 0, y: 10, scale: 0.985 }
                }
                animate={
                  isMobile
                    ? { opacity: 1, y: 0 }
                    : { opacity: 1, y: 0, scale: 1 }
                }
                exit={
                  isMobile
                    ? {
                        opacity: 0,
                        y: 20,
                        transition: { duration: 0.22 },
                      }
                    : {
                        opacity: 0,
                        y: 6,
                        scale: 0.99,
                        transition: { duration: 0.2 },
                      }
                }
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                // Mobile bottom-sheet uses CSS `bottom` so the card hugs
                // the viewport edge regardless of its real (variable)
                // height. Desktop / mobile-top use computed `top`.
                style={
                  isMobile && effectiveSide === "bottom"
                    ? {
                        bottom: CAPTION_MARGIN,
                        left: captionPos.left,
                        width: captionWidth,
                      }
                    : {
                        top: captionPos.top,
                        left: captionPos.left,
                        width: captionWidth,
                      }
                }
                className="pointer-events-auto absolute"
              >
                {/* Connector — desktop only. On the mobile sheet the
                    halo + scrim cutout already speak for the anchor;
                    a long dashed line from anchor to a bottom sheet
                    looks fussy. */}
                {!isMobile && anchorBox ? (
                  <Connector
                    anchor={anchorBox}
                    caption={captionPos}
                    side={effectiveSide}
                    captionWidth={captionWidth}
                  />
                ) : null}

                <div
                  className={`relative border border-[color:var(--border-strong)] bg-[color:var(--background)]/96 p-5 shadow-[0_30px_70px_-18px_rgba(15,24,35,0.28),0_4px_14px_-4px_rgba(15,24,35,0.10)] backdrop-blur-xl md:p-6 ${
                    isMobile ? "rounded-[18px]" : "rounded-[16px]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                      Step {stepIndex! + 1} of {totalSteps}
                    </p>
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="-mr-1 inline-flex h-9 items-center gap-1.5 rounded-full px-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)] transition hover:text-[color:var(--ink-soft)] focus-visible:text-[color:var(--ink-soft)] focus-visible:outline-none"
                      aria-label="Skip the tour"
                    >
                      <span>Skip</span>
                      <SkipIcon />
                    </button>
                  </div>

                  <h2 className="mt-2.5 font-serif text-[26px] leading-[1.06] text-[color:var(--ink)] md:text-[28px]">
                    {step.title}
                  </h2>
                  <p className="mt-3 text-[14px] leading-[1.65] text-[color:var(--ink-soft)] md:text-[14.5px]">
                    {step.body}
                  </p>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div
                      className="flex items-center gap-1.5"
                      aria-hidden="true"
                    >
                      {TOUR_STEPS.map((_, i) => (
                        <span
                          key={i}
                          className={`block h-[3px] rounded-full transition-all duration-300 ${
                            i === stepIndex
                              ? "w-5 bg-[color:var(--ink)]"
                              : i < stepIndex!
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
                        {isLast ? "Got it" : isFirst ? "Start tour" : "Next"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Animated cursor — only shown during cross-page navigation
              (the "drift to the sidebar and click" metaphor). When the
              caption is static there's nothing for the cursor to do, so
              parking it on/near the anchor just looked like noise.
              Hidden on mobile (touch users don't have a pointer in
              their interaction model) and when reduce-motion is set. */}
          <AnimatePresence>
            {!reduceMotion && !isMobile && navigating ? (
              <TourCursor pos={cursorPos} clicking />
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------
// Mobile nav pulse — replaces the desktop cursor during cross-page
// nav. Renders an inner halo on the target element plus an outer
// ripple, both behind a small mono-uppercase label that names the
// gesture ("Open menu" → "Tap Memory Map" etc.). Reads on the warm
// page background and on the drawer's chrome tone alike.
// ---------------------------------------------------------------
function MobileNavPulse({
  box,
  phase,
}: {
  box: AnchorBox | null;
  phase: "idle" | "menu" | "tab";
}) {
  const visible = !!box && phase !== "idle";
  // Generous 6px halo so the inner ring reads even on the small (36px)
  // hamburger button. The outer ripple expands beyond this.
  const padding = 6;
  return (
    <AnimatePresence mode="wait">
      {visible && box ? (
        <motion.div
          key={`mobile-pulse-${phase}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{
            top: box.top - padding,
            left: box.left - padding,
            width: box.width + padding * 2,
            height: box.height + padding * 2,
          }}
          className="pointer-events-none absolute"
        >
          {/* Outer ripple — expands and fades on a 1.4s loop. */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-[14px] border border-[color:var(--ink)]/45"
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0.55, 0], scale: [1, 1.55] }}
            transition={{
              duration: 1.4,
              ease: "easeOut",
              repeat: Infinity,
            }}
          />
          {/* Inner ring — steady halo around the element, gently
              breathing so it reads even when the ripple is at peak. */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-[12px] ring-2 ring-[color:var(--ink)]/55 shadow-[0_0_0_4px_rgba(255,255,255,0.55),0_10px_30px_-8px_rgba(15,24,35,0.35)]"
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{
              duration: 1.4,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------
// Skip icon — paired with the "Skip" label in the caption header.
// ---------------------------------------------------------------
function SkipIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 2 L8 8 M8 2 L2 8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
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
  // Fall back to viewport centre when no anchor — keeps the cutout's
  // last-known position from snapping to (0,0) between anchored and
  // centred steps.
  const cx = anchor ? anchor.centerX : viewport.width / 2;
  const cy = anchor ? anchor.centerY : viewport.height / 2;
  const ease = [0.22, 1, 0.36, 1] as const;

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
          {/* Always rendered — opacity is the gate for "is there an
              anchor right now?" — so the cutout glides between anchored
              steps instead of blinking off and on. */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={cutoutRadius}
            fill="url(#memora-tour-cutout)"
            initial={{ opacity: 0 }}
            animate={{
              cx,
              cy,
              r: cutoutRadius,
              opacity: anchor ? 1 : 0,
            }}
            transition={{
              duration: reduce ? 0 : 0.42,
              ease,
            }}
          />
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
      initial={{ opacity: 0, x: pos.x, y: pos.y }}
      animate={{ opacity: 1, x: pos.x, y: pos.y }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{
        opacity: { duration: 0.2, ease: "easeOut" },
        x: { type: "spring", stiffness: 110, damping: 18, mass: 0.7 },
        y: { type: "spring", stiffness: 110, damping: 18, mass: 0.7 },
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
  isMobile: boolean,
): { top: number; left: number; height: number } {
  // Approximate caption height for clamping. Real height is measured
  // by Framer Motion at paint, but we need a number for edge clamping
  // and for the bottom-sheet's `top` calculation.
  const estHeight = 220;

  // Mobile: bottom-sheet style. The caption is full-width (minus side
  // margins) and pinned to the viewport edge. The anchor's halo + scrim
  // cutout already tells the user what's being highlighted, so the
  // caption doesn't need to float beside it.
  if (isMobile) {
    const left = Math.round((viewport.width - captionWidth) / 2);
    if (side === "top") {
      return { top: CAPTION_MARGIN, left, height: estHeight };
    }
    return {
      top: viewport.height - estHeight - CAPTION_MARGIN,
      left,
      height: estHeight,
    };
  }

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

