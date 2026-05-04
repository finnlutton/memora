"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  HOME_GALLERY_DEMO,
  type DemoScene,
  type DemoSubgallery,
} from "@/lib/home-gallery-demo-data";

/**
 * Home gallery build — staged "memory being made" demo.
 *
 *   0. Idle:    intro view rendered with an empty Gallery title field
 *               and a Watch-the-demo button. Nothing animates until the
 *               user opts in — autoplaying when the section scrolls into
 *               view risks burning the demo before the visitor is ready.
 *   1. Intro:   typewriter cycles four example titles in the field,
 *               settles on "Semester Abroad in Granada", then a cursor
 *               drifts over and clicks "Start a gallery".
 *   2. Build:   the gallery shell appears, cover uploads, title/meta/
 *               description fill in, and subgalleries + scenes populate
 *               progressively underneath.
 *   3. Settle:  the fully built demo gallery stays put — no replay.
 *
 * Reduced motion: skips the staged animation and renders the final state.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const TYPE_MS = 52;
const ERASE_MS = 26;
const PAUSE_MS = 320;
const FINAL_TYPE_MS = 62;

const INTRO_TITLES = [
  "Family Japan Trip 2024",
  "Road Trip to Zion",
] as const;
const FINAL_TITLE = "Semester Abroad in Granada";

const POST_FINAL_PAUSE = 520;
const CURSOR_TRAVEL_MS = 760;
const CURSOR_HOLD_MS = 220;
const CURSOR_CLICK_MS = 260;
const INTRO_TO_BUILD_MS = 300;

const introCycleMs = (text: string) =>
  text.length * TYPE_MS + PAUSE_MS + text.length * ERASE_MS;
const INTRO_CYCLES_MS = INTRO_TITLES.reduce((s, t) => s + introCycleMs(t), 0);
const FINAL_TYPE_TOTAL = FINAL_TITLE.length * FINAL_TYPE_MS;
const INTRO_TOTAL_MS =
  INTRO_CYCLES_MS +
  FINAL_TYPE_TOTAL +
  POST_FINAL_PAUSE +
  CURSOR_TRAVEL_MS +
  CURSOR_HOLD_MS +
  CURSOR_CLICK_MS +
  INTRO_TO_BUILD_MS;

// Build phase offsets, relative to the start of the build phase.
const BUILD = {
  shellIn: 0,
  coverUploadStart: 280,
  coverUploadDone: 1180,
  titleStart: 520,
  metaStart: 2000,
  descStart: 2280,
  subgalleryStart: 6200,
  scenesStart: 6900,
  settled: 7800,
} as const;

const TITLE_TYPE_MS = 55;
const DESC_TYPE_MS = 19;

type Phase = "idle" | "intro" | "build";

export function HomeGalleryBuild() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [buildElapsed, setBuildElapsed] = useState(0);
  const [settled, setSettled] = useState(false);

  // Drive intro → build hand-off and the build ticker once the user starts.
  useEffect(() => {
    if (phase === "idle" || phase === "build" || reduceMotion) return;
    const timeouts: number[] = [];
    const at = (ms: number, fn: () => void) =>
      timeouts.push(window.setTimeout(fn, ms));

    at(INTRO_TOTAL_MS - INTRO_TO_BUILD_MS, () => setPhase("build"));

    return () => {
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, [phase, reduceMotion]);

  // Once we enter the build phase, tick elapsed time at ~60Hz until settled.
  useEffect(() => {
    if (phase !== "build" || reduceMotion) return;
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      setBuildElapsed(elapsed);
      if (elapsed >= BUILD.settled) {
        setSettled(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [phase, reduceMotion]);

  if (reduceMotion) {
    return (
      <section>
        <BuildView elapsed={Number.POSITIVE_INFINITY} settled showFinalCaret={false} />
      </section>
    );
  }

  const playing = phase !== "idle";

  return (
    <section>
      <AnimatePresence mode="wait" initial={false}>
        {phase === "build" ? (
          <motion.div
            key="build"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: EASE }}
          >
            <BuildView
              elapsed={buildElapsed}
              settled={settled}
              showFinalCaret={!settled}
            />
          </motion.div>
        ) : (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            <IntroView
              playing={playing}
              onPlay={() => setPhase("intro")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── Intro: typewriter input + cursor click ─────────────────────────── */

function IntroView({
  playing,
  onPlay,
}: {
  playing: boolean;
  onPlay: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  // Caret is only visible while characters are actively being added — during
  // the post-type pause and the erase pass, hiding it avoids the leftover
  // vertical line that reads like a half-typed letter.
  const [caretActive, setCaretActive] = useState(false);
  const [cursorPhase, setCursorPhase] = useState<
    "hidden" | "moving" | "clicking" | "pressed"
  >("hidden");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [cursorStart, setCursorStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [cursorEnd, setCursorEnd] = useState<{ x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    const timeouts: number[] = [];
    const at = (ms: number, fn: () => void) => {
      timeouts.push(window.setTimeout(fn, ms));
    };

    const typeOut = (text: string, speed: number, baseMs: number) => {
      for (let i = 1; i <= text.length; i++) {
        at(baseMs + i * speed, () => {
          if (!cancelled) setTyped(text.slice(0, i));
        });
      }
      return baseMs + text.length * speed;
    };

    const eraseFrom = (text: string, speed: number, baseMs: number) => {
      for (let i = text.length - 1; i >= 0; i--) {
        const step = text.length - i;
        at(baseMs + step * speed, () => {
          if (!cancelled) setTyped(text.slice(0, i));
        });
      }
      return baseMs + text.length * speed;
    };

    let cursor = 0;
    for (const t of INTRO_TITLES) {
      at(cursor, () => !cancelled && setCaretActive(true));
      cursor = typeOut(t, TYPE_MS, cursor);
      // Hide caret during the pause AND the erase — both phases caused the
      // ghost-letter line at the end of the title.
      at(cursor, () => !cancelled && setCaretActive(false));
      cursor += PAUSE_MS;
      cursor = eraseFrom(t, ERASE_MS, cursor);
    }
    at(cursor, () => !cancelled && setCaretActive(true));
    cursor = typeOut(FINAL_TITLE, FINAL_TYPE_MS, cursor);
    at(cursor, () => {
      if (cancelled) return;
      setDone(true);
      setCaretActive(false);
    });
    cursor += POST_FINAL_PAUSE;

    // Cursor movement is laid out after we have measurements; trigger here.
    at(cursor, () => {
      if (cancelled) return;
      const stage = stageRef.current;
      const input = inputRef.current;
      const btn = buttonRef.current;
      if (!stage || !input || !btn) return;
      const stageBox = stage.getBoundingClientRect();
      const inputBox = input.getBoundingClientRect();
      const btnBox = btn.getBoundingClientRect();
      // Park the cursor near the right edge of the input first.
      setCursorStart({
        x: inputBox.right - stageBox.left - 32,
        y: inputBox.bottom - stageBox.top - 18,
      });
      setCursorEnd({
        x: btnBox.left - stageBox.left + btnBox.width / 2,
        y: btnBox.top - stageBox.top + btnBox.height / 2,
      });
      setCursorPhase("moving");
    });
    cursor += CURSOR_TRAVEL_MS + CURSOR_HOLD_MS;
    at(cursor, () => {
      if (!cancelled) setCursorPhase("clicking");
    });
    at(cursor + 90, () => {
      if (!cancelled) setCursorPhase("pressed");
    });

    return () => {
      cancelled = true;
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, [playing]);

  return (
    <div ref={stageRef} className="relative mx-auto max-w-2xl px-2 py-12 text-center md:py-20">
      <h2 className="font-serif text-[32px] leading-[1.04] text-[color:var(--ink)] md:text-[44px]">
        Start with a title. Build the memory yourself.
      </h2>
      <p className="mx-auto mt-5 max-w-xl text-[14px] leading-7 text-[color:var(--ink-soft)] md:text-[15px]">
        Memora gives you beautiful structure for the trips, seasons, and
        chapters you want to remember.
      </p>

      <div className="mx-auto mt-12 max-w-xl text-left md:mt-14">
        <p className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
          Gallery title
        </p>
        <div
          ref={inputRef}
          aria-hidden
          className="mt-3 flex min-h-[64px] items-center border-b-[1.5px] border-[color:var(--border-strong)] py-3 transition-colors md:min-h-[72px]"
        >
          <span className="font-serif text-[26px] leading-[1.05] tracking-[-0.005em] text-[color:var(--ink)] md:text-[32px]">
            {typed}
          </span>
          {playing ? (
            caretActive ? (
              <Caret
                blink
                className="ml-1 mt-1 h-[1.05em] w-[1.5px] bg-[color:var(--ink)] md:h-[1em] md:w-[2px]"
              />
            ) : null
          ) : (
            <span className="ml-1 mt-1 inline-block font-serif text-[26px] leading-[1.05] text-[color:var(--ink-faint)]/70 md:text-[32px]">
              Untitled
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-10 flex items-center justify-center md:mt-12">
        <button
          ref={buttonRef}
          type="button"
          aria-hidden
          tabIndex={-1}
          className={`pointer-events-none inline-flex h-12 items-center justify-center rounded-full border border-[color:var(--accent-strong)] bg-[color:var(--accent-strong)] px-8 text-[13.5px] font-medium tracking-[0.04em] text-white transition-all duration-300 ${cursorPhase === "pressed" ? "scale-[0.97]" : "scale-100"} ${playing ? "opacity-100" : "opacity-40"}`}
        >
          Start a gallery
        </button>
      </div>

      {/* Play affordance — visible only at idle. The user opts in to the
          demo, so it can't fire before they're paying attention. */}
      <AnimatePresence>
        {!playing ? (
          <motion.div
            key="play"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mt-8 flex items-center justify-center md:mt-10"
          >
            <button
              type="button"
              onClick={onPlay}
              className="group inline-flex items-center gap-2.5 rounded-full border border-[color:var(--ink)]/15 bg-[color:var(--paper)] px-5 py-2.5 text-[13px] font-medium tracking-[0.02em] text-[color:var(--ink)] shadow-[0_1px_2px_rgba(15,24,35,0.04)] transition-all hover:border-[color:var(--ink)]/30 hover:shadow-[0_4px_14px_rgba(15,24,35,0.08)]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--ink)] transition-transform group-hover:scale-105">
                <svg
                  width="9"
                  height="10"
                  viewBox="0 0 9 10"
                  fill="white"
                  aria-hidden
                  className="ml-[1px]"
                >
                  <path d="M0 0.5 L9 5 L0 9.5 Z" />
                </svg>
              </span>
              Watch a memory take shape
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Animated cursor — only mounted once we have measurements. */}
      {cursorStart && cursorEnd ? (
        <motion.div
          className="pointer-events-none absolute z-10"
          initial={{ x: cursorStart.x, y: cursorStart.y, opacity: 0 }}
          animate={{
            x: cursorPhase === "moving" || cursorPhase === "clicking" || cursorPhase === "pressed" ? cursorEnd.x : cursorStart.x,
            y: cursorPhase === "moving" || cursorPhase === "clicking" || cursorPhase === "pressed" ? cursorEnd.y : cursorStart.y,
            opacity: cursorPhase === "hidden" ? 0 : 1,
          }}
          transition={{
            x: { duration: CURSOR_TRAVEL_MS / 1000, ease: EASE },
            y: { duration: CURSOR_TRAVEL_MS / 1000, ease: EASE },
            opacity: { duration: 0.2 },
          }}
          style={{ top: 0, left: 0 }}
        >
          <AnimatePresence>
            {cursorPhase === "clicking" || cursorPhase === "pressed" ? (
              <motion.span
                key="ripple"
                initial={{ scale: 0.4, opacity: 0.55 }}
                animate={{ scale: 2.6, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute -left-3 -top-3 block h-6 w-6 rounded-full bg-[color:var(--ink)]/35"
                aria-hidden
              />
            ) : null}
          </AnimatePresence>
          <motion.div
            animate={{ scale: cursorPhase === "pressed" ? 0.86 : 1 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <CursorIcon />
          </motion.div>
        </motion.div>
      ) : null}
    </div>
  );
}

function CursorIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      style={{ filter: "drop-shadow(0 6px 10px rgba(15,24,35,0.22))" }}
      aria-hidden
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

function Caret({ blink, className }: { blink: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block align-middle ${blink ? "animate-pulse" : ""} ${className ?? ""}`}
      style={blink ? { animationDuration: "1s" } : undefined}
    />
  );
}

/* ── Build: full layout, progressively populated ─────────────────────── */

function BuildView({
  elapsed,
  settled,
  showFinalCaret,
}: {
  elapsed: number;
  settled: boolean;
  showFinalCaret: boolean;
}) {
  const gallery = HOME_GALLERY_DEMO;
  // Subgallery whose scenes are surfaced at the end. Mountain biking is the
  // first and most visually establishing of the three.
  const openSub = gallery.subgalleries[0];

  const past = (ms: number) => elapsed >= ms;
  const between = (start: number, end: number) =>
    Math.min(1, Math.max(0, (elapsed - start) / Math.max(1, end - start)));

  // Title typing: tied to elapsed time, so it stays in sync if a frame is missed.
  const titleProgress = Math.min(
    1,
    Math.max(0, (elapsed - BUILD.titleStart) / (gallery.title.length * TITLE_TYPE_MS)),
  );
  const titleText = gallery.title.slice(
    0,
    Math.round(titleProgress * gallery.title.length),
  );

  const descProgress = Math.min(
    1,
    Math.max(0, (elapsed - BUILD.descStart) / (gallery.description.length * DESC_TYPE_MS)),
  );
  const descText = gallery.description.slice(
    0,
    Math.round(descProgress * gallery.description.length),
  );

  const titleDone = titleProgress >= 1;
  const descDone = descProgress >= 1;

  const coverProgress = between(BUILD.coverUploadStart, BUILD.coverUploadDone);
  const coverShown = past(BUILD.coverUploadStart);

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-[32px] leading-[1.02] text-[color:var(--ink)] md:text-[44px]">
          A time period, broken into its adventures.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[14px] leading-7 text-[color:var(--ink-soft)] md:text-[15px]">
          A gallery in Memora becomes the place where a season — its trips,
          rides, weekends — settles into something you can return to.
        </p>
      </div>

      <div className="mx-auto mt-12 flex w-full max-w-7xl flex-col items-center">
        {/* ── Gallery card ─────────────────────────────────────────── */}
        <div className="w-full max-w-[44rem]">
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
            Gallery
          </p>
          <div className="mt-3 block w-full text-left">
            <div className="relative border border-[color:var(--border)] bg-[color:var(--paper)] p-2 md:p-[14px]">
              <div className="relative aspect-[16/10] overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)]">
                {coverShown ? (
                  <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: EASE }}
                  >
                    <Image
                      src={gallery.coverImage}
                      alt={gallery.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 704px"
                      quality={80}
                      className="object-cover"
                    />
                  </motion.div>
                ) : null}
                {/* Upload progress sweep — faint horizontal bar across the top
                    while the cover is loading in. Quiet, not gimmicky. */}
                {!settled && coverShown && coverProgress < 1 ? (
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-[color:var(--paper-strong)]/60">
                    <div
                      className="h-full bg-[color:var(--ink)]/65"
                      style={{ width: `${Math.round(coverProgress * 100)}%`, transition: "width 80ms linear" }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <h3 className="mt-2 min-h-[1.35em] font-serif text-[26px] leading-[1.08] text-[color:var(--ink)] md:mt-3 md:text-[34px]">
              {settled ? gallery.title : titleText}
              {!settled && !titleDone && titleProgress > 0 ? (
                <Caret
                  blink
                  className="ml-[2px] inline-block h-[0.85em] w-[2px] translate-y-[1px] bg-[color:var(--ink)]"
                />
              ) : null}
            </h3>
          </div>
          <div className="mt-2 min-h-[14px]">
            <motion.p
              initial={false}
              animate={{ opacity: past(BUILD.metaStart) ? 1 : 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]"
            >
              {[gallery.location, gallery.dates].filter(Boolean).join(" · ")}
            </motion.p>
          </div>
          <p className="mt-3 min-h-[5.5em] text-[14px] leading-7 text-[color:var(--ink-soft)] md:mt-4 md:min-h-[5em] md:text-[15px]">
            {settled ? gallery.description : descText}
            {!settled && descProgress > 0 && !descDone && showFinalCaret ? (
              <Caret
                blink
                className="ml-[2px] inline-block h-[0.85em] w-[2px] translate-y-[1px] bg-[color:var(--ink-soft)]"
              />
            ) : null}
          </p>
        </div>

        {/* ── Subgalleries + scenes (always reserved, fade in) ───── */}
        <div className="w-full">
          <div className="pt-2">
            <BranchConnector
              count={gallery.subgalleries.length}
              visible={past(BUILD.subgalleryStart)}
            />

            <div className="mt-0 grid gap-x-6 gap-y-12 sm:grid-cols-2 md:grid-cols-3 md:gap-x-8 md:gap-y-16">
              {gallery.subgalleries.map((sub, i) => (
                <SubgalleryCard
                  key={sub.id}
                  sub={sub}
                  visibleAt={BUILD.subgalleryStart + i * 180}
                  elapsed={elapsed}
                />
              ))}
            </div>

            <div className="overflow-hidden">
              <motion.div
                initial={false}
                animate={{
                  opacity: past(BUILD.scenesStart) ? 1 : 0,
                  y: past(BUILD.scenesStart) ? 0 : 6,
                }}
                transition={{ duration: 0.5, ease: EASE }}
                className="pt-10 md:pt-14"
              >
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
                  Scenes
                </p>
                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-7 md:gap-x-6 md:gap-y-10">
                  {openSub.scenes.map((scene, i) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      visibleAt={BUILD.scenesStart + 80 + i * 110}
                      elapsed={elapsed}
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubgalleryCard({
  sub,
  visibleAt,
  elapsed,
}: {
  sub: DemoSubgallery;
  visibleAt: number;
  elapsed: number;
}) {
  const meta = [sub.location, sub.dates].filter(Boolean).join(" · ");
  const visible = elapsed >= visibleAt;
  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex flex-col"
    >
      <p className="font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
        Subgallery
      </p>
      <div className="mt-3 block w-full text-left">
        <div className="relative border border-[color:var(--border)] bg-[color:var(--paper)] p-2 md:p-[12px]">
          <div className="relative aspect-[5/3] overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)]">
            <Image
              src={sub.coverImage}
              alt={sub.title}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              quality={80}
              className="object-cover"
            />
          </div>
        </div>
        <h4 className="mt-2 font-serif text-[22px] leading-[1.12] text-[color:var(--ink)] md:mt-3 md:text-[28px]">
          {sub.title}
        </h4>
      </div>
      {meta ? (
        <p className="mt-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
          {meta}
        </p>
      ) : null}
      <p className="mt-3 text-[14px] leading-[1.65] text-[color:var(--ink-soft)] md:text-[15px]">
        {sub.description}
      </p>
    </motion.div>
  );
}

function SceneCard({
  scene,
  visibleAt,
  elapsed,
}: {
  scene: DemoScene;
  visibleAt: number;
  elapsed: number;
}) {
  const visible = elapsed >= visibleAt;
  return (
    <motion.article
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 6 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="flex flex-col"
    >
      <div className="relative border border-[color:var(--border)] bg-[color:var(--paper)] p-1.5 md:p-2.5">
        <div className="relative aspect-[4/3] overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)]">
          <Image
            src={scene.image}
            alt={scene.title ?? "Scene"}
            fill
            sizes="(max-width: 768px) 50vw, 480px"
            quality={80}
            className="object-cover"
          />
        </div>
      </div>
      {scene.caption ? (
        <p className="mt-2.5 font-serif text-[13px] italic leading-snug text-[color:var(--ink-soft)] md:text-[14px]">
          {scene.caption}
        </p>
      ) : null}
    </motion.article>
  );
}

function BranchConnector({
  count,
  visible,
}: {
  count: number;
  visible: boolean;
}) {
  const stemHeight = 22;
  const dropHeight = 16;
  const leftPct = 100 / (2 * count);
  const rightPct = 100 - leftPct;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="relative mx-auto hidden w-full sm:block"
      aria-hidden
    >
      <div
        className="mx-auto w-px bg-[color:var(--border-strong)] opacity-55"
        style={{ height: stemHeight }}
      />
      <div className="relative" style={{ height: 1 }}>
        <div
          className="absolute top-0 h-px bg-[color:var(--border-strong)] opacity-55"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
      </div>
      <div className="relative" style={{ height: dropHeight }}>
        {Array.from({ length: count }).map((_, i) => {
          const centerPct = (100 / count) * i + 100 / (2 * count);
          return (
            <div
              key={i}
              className="absolute top-0 w-px bg-[color:var(--border-strong)] opacity-55"
              style={{ left: `calc(${centerPct}% - 0.5px)`, height: dropHeight }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
