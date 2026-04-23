"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Link2, Lock, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Home share demo — scripted, click-to-run walkthrough of the sharing flow.
 *
 * Everything on screen is a placeholder: cards, groups, link, and shared page.
 * No real data is read; no real share endpoint is called.
 *
 * The sequence is a pure state machine driven by a single `step`. All timing
 * lives in SEQUENCE below — adjust `at` values to re-time the demo without
 * touching animation code. Timeouts are tracked in a ref so the component
 * cleans up on unmount or on a re-run.
 */

type Step =
  | "idle"
  | "select-1"
  | "select-2"
  | "select-3"
  | "panel"
  | "group"
  | "message"
  | "creating"
  | "toast"
  | "browser-open"
  | "browser-paste"
  | "browser-navigate"
  | "shared";

// Milliseconds from the moment the user presses "Run share demo".
// Steps fire in order; the final "idle" step re-enables the button.
const SEQUENCE: { step: Step; at: number }[] = [
  { step: "select-1", at: 650 },
  { step: "select-2", at: 1550 },
  { step: "select-3", at: 2450 },
  { step: "panel", at: 3400 },
  { step: "group", at: 4600 },
  // Compose a short custom note to the chosen group. Typing is driven by
  // its own interval (see MESSAGE_TEXT + the effect below), but the step
  // must stay active long enough for the full reveal to play out.
  { step: "message", at: 5800 },
  { step: "creating", at: 10600 },
  { step: "toast", at: 11250 },
  // Link is now on the clipboard. Open a browser-like surface, paste the
  // URL into the address bar, press enter — then the shared page loads.
  { step: "browser-open", at: 12400 },
  { step: "browser-paste", at: 13300 },
  { step: "browser-navigate", at: 14200 },
  { step: "shared", at: 14750 },
  { step: "idle", at: 23750 },
];

// Characters per tick during the message-typing animation. Roughly
// ~35–40ms per character feels like hand-typing without dragging.
const MESSAGE_TYPE_MS = 38;

type CoverPattern = "hero-thumbs" | "triptych" | "quad" | "strip";

type PlaceholderCard = {
  id: string;
  title: string;
  meta: string;
  pattern: CoverPattern;
  // 0–3, subtly shifts the cover's tonal base within the shared palette
  tone: 0 | 1 | 2 | 3;
};

// Covers are wireframe-style layout hints, not photos. They share a single
// restrained palette (soft neutrals + blue-grays) and differ only in tonal
// depth and internal composition — the shape of a gallery, not its colors.
const CARDS: PlaceholderCard[] = [
  {
    id: "c1",
    title: "Switzerland & N. Italy",
    meta: "Feb 2026 · 4 subgalleries",
    pattern: "hero-thumbs",
    tone: 2,
  },
  {
    id: "c2",
    title: "Andalusian Day Trips",
    meta: "Sep 2022 · 3 subgalleries",
    pattern: "triptych",
    tone: 1,
  },
  {
    id: "c3",
    title: "Japan Trip",
    meta: "Apr 2024 · 2 subgalleries",
    pattern: "quad",
    tone: 0,
  },
  {
    id: "c4",
    title: "Baja Mornings",
    meta: "Mar 2024 · 3 subgalleries",
    pattern: "strip",
    tone: 3,
  },
];

// Cards the script "selects" — referenced by index in the select-N steps.
const SELECTED_IDS = ["c1", "c2", "c3"];

type Group = { id: string; label: string; meta: string };

const GROUPS: Group[] = [
  { id: "parents", label: "Parents", meta: "2 people" },
  { id: "grandparents", label: "Grandparents", meta: "4 people" },
  { id: "friends", label: "Close friends", meta: "6 people" },
];

const CHOSEN_GROUP_ID = "parents";

// Content for the fake shared page. Keyed by group id so the demo could be
// extended to script a different group without changing layout.
const SHARED_PAGE: Record<
  string,
  { audience: string; title: string; message: string; url: string }
> = {
  parents: {
    audience: "For Mom & Dad",
    title: "Past few weekends abroad!",
    message:
      "Check these out in your own time, I left a few comments for each of you. Mom, I found a restaurant I have to take you to...",
    url: "memora.app/share/a9f2xq7t",
  },
  grandparents: {
    audience: "For Nana & Papa",
    title: "Letters from the road.",
    message:
      "Saved these up so we could look through them together next time I'm over for Sunday lunch.",
    url: "memora.app/share/b4k8mz2e",
  },
  friends: {
    audience: "For the group",
    title: "The year, in pieces.",
    message:
      "Pulled the ones I think you'll actually want to see. Tell me which trip I owe you a full story on.",
    url: "memora.app/share/d7p3vw1s",
  },
};

const EASE = [0.32, 0.72, 0, 1] as const;

export function HomeShareDemo() {
  const [step, setStep] = useState<Step>("idle");
  const [running, setRunning] = useState(false);
  const [messageChars, setMessageChars] = useState(0);
  const timeoutsRef = useRef<number[]>([]);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  // Clean up on unmount so strays don't fire into a dead component.
  useEffect(() => clearAll, [clearAll]);

  const run = useCallback(() => {
    if (running) return;
    clearAll();
    setRunning(true);
    setStep("idle");
    setMessageChars(0);
    SEQUENCE.forEach(({ step: next, at }) => {
      const id = window.setTimeout(() => {
        setStep(next);
        if (next === "idle") setRunning(false);
      }, at);
      timeoutsRef.current.push(id);
    });
  }, [running, clearAll]);

  // Progressive message typing. When the message step activates, start an
  // interval that reveals one character at a time. The interval stops as
  // soon as we leave the message step (e.g. on demo re-run) so we never
  // race two typing drivers against each other.
  const shared = SHARED_PAGE[CHOSEN_GROUP_ID]!;
  useEffect(() => {
    if (step !== "message") {
      if (step === "idle") setMessageChars(0);
      return;
    }
    setMessageChars(0);
    const total = shared.message.length;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setMessageChars(i);
      if (i >= total) window.clearInterval(id);
    }, MESSAGE_TYPE_MS);
    return () => window.clearInterval(id);
  }, [step, shared.message]);

  // Derived flags — every on-screen element reads from `step` through these.
  const selectedCount =
    step === "select-1"
      ? 1
      : step === "select-2"
        ? 2
        : step === "select-3" ||
            step === "panel" ||
            step === "group" ||
            step === "message" ||
            step === "creating" ||
            step === "toast"
          ? 3
          : 0;
  const selectedSet = new Set(SELECTED_IDS.slice(0, selectedCount));

  const panelOpen =
    step === "panel" ||
    step === "group" ||
    step === "message" ||
    step === "creating" ||
    step === "toast";
  const groupChosen =
    step === "group" ||
    step === "message" ||
    step === "creating" ||
    step === "toast";
  const messageVisible =
    step === "message" || step === "creating" || step === "toast";
  const buttonPressed = step === "creating";
  const toastVisible = step === "toast";
  const showWorkspace =
    step === "idle" ||
    step === "select-1" ||
    step === "select-2" ||
    step === "select-3" ||
    step === "panel" ||
    step === "group" ||
    step === "message" ||
    step === "creating" ||
    step === "toast";
  const showBrowser =
    step === "browser-open" ||
    step === "browser-paste" ||
    step === "browser-navigate" ||
    step === "shared";
  const browserStage: "empty" | "pasted" | "navigating" | "loaded" =
    step === "browser-open"
      ? "empty"
      : step === "browser-paste"
        ? "pasted"
        : step === "browser-navigate"
          ? "navigating"
          : "loaded";

  const selectedCards = CARDS.filter((c) => SELECTED_IDS.includes(c.id));

  return (
    <section
      aria-label="Sharing demo"
      className="mx-auto w-full max-w-6xl px-4 md:px-6"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-[32px] leading-[1.06] text-white md:text-[44px] md:leading-[1.04]">
          Share your content more easily than ever.
        </h2>
        <p className="mx-auto mt-6 max-w-[38rem] text-[14px] leading-7 text-white/78 md:text-[15px]">
          Choose your galleries, write a custom message, and share a private
          link. No feed, no algorithm, just updating the people you care about.
        </p>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="mt-9 inline-flex items-center gap-2.5 border border-white/25 bg-white/10 px-6 py-3 text-[11px] uppercase tracking-[0.24em] text-white transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
          {running ? "Playing demo…" : "Run share demo"}
        </button>
      </div>

      {/* Stage — fixed height prevents layout shift during the swap. */}
      <div className="relative mx-auto mt-14 h-[520px] w-full max-w-5xl overflow-hidden rounded-sm border border-white/10 bg-[color:var(--chrome-strong)] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)] ring-1 ring-white/5 md:h-[560px]">
        <AnimatePresence initial={false}>
          {showBrowser ? (
            <motion.div
              key="browser"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.38, ease: EASE }}
              className="absolute inset-0"
            >
              <SharedPagePreview
                audience={shared.audience}
                title={shared.title}
                message={shared.message}
                url={shared.url}
                cards={selectedCards}
                stage={browserStage}
              />
            </motion.div>
          ) : showWorkspace ? (
            <motion.div
              key="workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="absolute inset-0"
            >
              <WorkspaceChrome />
              <div className="relative h-full pt-10">
                <div className="h-full overflow-hidden px-5 pb-5 pt-5 md:px-8 md:pt-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--ink-faint)]">
                        My galleries
                      </p>
                      <p className="mt-1 font-serif text-[18px] leading-tight text-[color:var(--ink)] md:text-[22px]">
                        Choose what to share
                      </p>
                    </div>
                    <motion.p
                      animate={{ opacity: selectedCount > 0 ? 1 : 0.55 }}
                      transition={{ duration: 0.25 }}
                      className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-soft)]"
                    >
                      {selectedCount > 0
                        ? `${selectedCount} selected`
                        : "Tap to select"}
                    </motion.p>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
                    {CARDS.map((card) => (
                      <GalleryCard
                        key={card.id}
                        card={card}
                        selected={selectedSet.has(card.id)}
                      />
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {panelOpen ? (
                    <motion.aside
                      key="panel"
                      initial={{ x: "100%", opacity: 0.3 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: "100%", opacity: 0 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      className="absolute bottom-0 right-0 top-10 flex w-[90%] flex-col overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--chrome-strong)] p-5 shadow-[-12px_0_40px_-16px_rgba(14,22,34,0.18)] md:w-[380px] md:p-6"
                    >
                      <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--ink-faint)]">
                        Share privately with
                      </p>
                      <p className="mt-1.5 font-serif text-[20px] leading-tight text-[color:var(--ink)]">
                        Pick a group
                      </p>
                      <div className="mt-5 space-y-2">
                        {GROUPS.map((g) => (
                          <GroupRow
                            key={g.id}
                            group={g}
                            chosen={groupChosen && g.id === CHOSEN_GROUP_ID}
                          />
                        ))}
                      </div>

                      <AnimatePresence initial={false}>
                        {messageVisible ? (
                          <MessageComposer
                            key="composer"
                            groupLabel={
                              GROUPS.find((g) => g.id === CHOSEN_GROUP_ID)
                                ?.label ?? ""
                            }
                            text={shared.message}
                            charsShown={messageChars}
                          />
                        ) : null}
                      </AnimatePresence>

                      <motion.div
                        animate={{
                          scale: buttonPressed ? 0.97 : 1,
                        }}
                        transition={{ duration: 0.22, ease: EASE }}
                        className="mt-6"
                      >
                        <div
                          className="inline-flex w-full items-center justify-center gap-2 bg-[color:var(--accent-strong)] px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-white"
                          style={{
                            backgroundColor: buttonPressed
                              ? "var(--accent-strong-hover)"
                              : "var(--accent-strong)",
                          }}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Create link
                        </div>
                      </motion.div>
                      <p className="mt-3 text-[10.5px] leading-5 text-[color:var(--ink-faint)]">
                        Only people in this group can open the link. Nothing
                        posted anywhere else.
                      </p>
                    </motion.aside>
                  ) : null}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {toastVisible ? (
                  <motion.div
                    key="toast"
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 16, opacity: 0 }}
                    transition={{ duration: 0.32, ease: EASE }}
                    className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 border border-white/10 bg-[color:var(--ink)] px-4 py-2.5 text-white shadow-[0_12px_30px_rgba(14,22,34,0.26)]"
                  >
                    <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Link copied · {shared.url}
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <p className="mx-auto mt-6 max-w-[38rem] text-center text-[11px] uppercase tracking-[0.24em] text-white/55">
        Demo only · placeholder cards, groups, and share page
      </p>
    </section>
  );
}

function MessageComposer({
  groupLabel,
  text,
  charsShown,
}: {
  groupLabel: string;
  text: string;
  charsShown: number;
}) {
  const typed = text.slice(0, charsShown);
  const typing = charsShown < text.length;
  const recipient = groupLabel ? `your ${groupLabel.toLowerCase()}` : "them";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.34, ease: EASE }}
      className="mt-6"
    >
      <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--ink-faint)]">
        Write a custom message to {recipient}
      </p>
      <div className="mt-2 min-h-[96px] rounded-sm border border-[color:var(--border)] bg-white px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <p className="whitespace-pre-wrap text-[12px] leading-[1.55] text-[color:var(--ink)]">
          {typed}
          <motion.span
            aria-hidden
            animate={{ opacity: typing ? [1, 1, 0, 0] : 0 }}
            transition={{
              duration: 0.9,
              repeat: typing ? Infinity : 0,
              ease: "linear",
              times: [0, 0.5, 0.5, 1],
            }}
            className="ml-[1px] inline-block h-[13px] w-[1.5px] translate-y-[2px] bg-[color:var(--accent-strong)] align-middle"
          />
        </p>
      </div>
    </motion.div>
  );
}

function WorkspaceChrome() {
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex h-10 items-center gap-3 border-b border-[color:var(--border)] bg-[color:var(--chrome)] px-4 md:px-5">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ec8682]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f3c066]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#86bd7d]" />
      </div>
      <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--ink-faint)]">
        Memora — Workspace
      </p>
    </div>
  );
}

function GalleryCard({
  card,
  selected,
}: {
  card: PlaceholderCard;
  selected: boolean;
}) {
  return (
    <motion.div
      animate={{
        borderColor: selected
          ? "var(--accent-strong)"
          : "var(--border)",
        boxShadow: selected
          ? "0 8px 20px -10px rgba(14,22,34,0.22)"
          : "0 0 0 rgba(14,22,34,0)",
        y: selected ? -2 : 0,
      }}
      transition={{ duration: 0.28, ease: EASE }}
      className="relative overflow-hidden rounded-lg border bg-white"
    >
      <CoverPlaceholder pattern={card.pattern} tone={card.tone} />
      <div className="px-4 py-3 md:px-5 md:py-3.5">
        <p className="truncate font-serif text-[14px] leading-tight text-[color:var(--ink)] md:text-[16px]">
          {card.title}
        </p>
        <p className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          {card.meta}
        </p>
      </div>
      <AnimatePresence>
        {selected ? (
          <motion.div
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--accent-strong)] text-white shadow-[0_4px_12px_rgba(14,22,34,0.22)]"
            aria-hidden
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

// Restrained cover placeholder — soft neutral base with a faint wireframe
// layout. Single cohesive palette across all cards; tone shifts depth only.
const COVER_BASES = [
  "linear-gradient(145deg, #eef2f7 0%, #dde5ee 100%)",
  "linear-gradient(145deg, #e8eef5 0%, #d3dde9 100%)",
  "linear-gradient(145deg, #e2e9f1 0%, #c9d5e2 100%)",
  "linear-gradient(145deg, #dbe3ec 0%, #bfccdb 100%)",
] as const;

function CoverPlaceholder({
  pattern,
  tone,
  large = false,
}: {
  pattern: CoverPattern;
  tone: 0 | 1 | 2 | 3;
  large?: boolean;
}) {
  const heightClass = large ? "h-32 md:h-44" : "h-32 md:h-36";
  const shape = "bg-white/55 ring-1 ring-inset ring-white/40";
  return (
    <div
      className={`relative w-full overflow-hidden ${heightClass}`}
      style={{ backgroundImage: COVER_BASES[tone] }}
      aria-hidden
    >
      <div className="absolute inset-0 p-3 md:p-4">
        {pattern === "hero-thumbs" ? (
          <div className="grid h-full grid-cols-[1.6fr_1fr] gap-2">
            <div className={`rounded ${shape}`} />
            <div className="grid grid-rows-2 gap-2">
              <div className={`rounded ${shape}`} />
              <div className={`rounded ${shape}`} />
            </div>
          </div>
        ) : null}
        {pattern === "triptych" ? (
          <div className="grid h-full grid-cols-3 gap-2">
            <div className={`rounded ${shape}`} />
            <div className={`rounded ${shape}`} />
            <div className={`rounded ${shape}`} />
          </div>
        ) : null}
        {pattern === "quad" ? (
          <div className="grid h-full grid-cols-2 grid-rows-2 gap-2">
            <div className={`rounded ${shape}`} />
            <div className={`rounded ${shape}`} />
            <div className={`rounded ${shape}`} />
            <div className={`rounded ${shape}`} />
          </div>
        ) : null}
        {pattern === "strip" ? (
          <div className="grid h-full grid-rows-[1.4fr_1fr] gap-2">
            <div className={`rounded ${shape}`} />
            <div className="grid grid-cols-3 gap-2">
              <div className={`rounded ${shape}`} />
              <div className={`rounded ${shape}`} />
              <div className={`rounded ${shape}`} />
            </div>
          </div>
        ) : null}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/[0.04]" />
    </div>
  );
}

function GroupRow({ group, chosen }: { group: Group; chosen: boolean }) {
  return (
    <motion.div
      animate={{
        borderColor: chosen
          ? "var(--accent-strong)"
          : "var(--border)",
        backgroundColor: chosen
          ? "var(--paper)"
          : "rgba(255,255,255,0)",
      }}
      transition={{ duration: 0.24, ease: EASE }}
      className="flex items-center justify-between border px-3.5 py-2.5"
    >
      <div className="min-w-0">
        <p className="truncate text-[12.5px] text-[color:var(--ink)]">
          {group.label}
        </p>
        <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          {group.meta}
        </p>
      </div>
      <AnimatePresence>
        {chosen ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--accent-strong)] text-white"
          >
            <Check className="h-3 w-3" strokeWidth={2.5} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function SharedGalleryTile({
  card,
  large = false,
}: {
  card: PlaceholderCard;
  large?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-white">
      <CoverPlaceholder pattern={card.pattern} tone={card.tone} large={large} />
      <div className={large ? "px-4 py-3 md:px-5 md:py-3.5" : "px-3 py-2.5"}>
        <p
          className={
            large
              ? "truncate font-serif text-[15px] leading-tight text-[color:var(--ink)] md:text-[17px]"
              : "truncate font-serif text-[13px] leading-tight text-[color:var(--ink)]"
          }
        >
          {card.title}
        </p>
        <p
          className={
            large
              ? "mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]"
              : "mt-0.5 truncate text-[9.5px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]"
          }
        >
          {card.meta}
        </p>
      </div>
    </div>
  );
}

function SharedPagePreview({
  audience,
  title,
  message,
  url,
  cards,
  stage = "loaded",
}: {
  audience: string;
  title: string;
  message: string;
  url: string;
  cards: PlaceholderCard[];
  stage?: "empty" | "pasted" | "navigating" | "loaded";
}) {
  const [cover, ...thumbs] = cards;
  const showUrl = stage !== "empty";
  const highlightUrl = stage === "pasted";
  const showProgress = stage === "navigating";
  const showContent = stage === "loaded";
  return (
    <div className="flex h-full flex-col bg-white">
      {/* Browser chrome */}
      <div className="relative flex h-10 items-center gap-3 border-b border-[color:var(--border)] bg-[color:var(--paper)] px-4 md:px-5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ec8682]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f3c066]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#86bd7d]" />
        </div>
        <motion.div
          animate={{
            backgroundColor: highlightUrl
              ? "rgba(88,112,144,0.14)"
              : "rgba(255,255,255,0.7)",
          }}
          transition={{ duration: 0.45, ease: EASE }}
          className="relative flex flex-1 items-center gap-2 overflow-hidden border border-[color:var(--border)] px-3 py-1 text-[10.5px] text-[color:var(--ink-soft)]"
        >
          <Lock className="h-3 w-3 shrink-0 text-[color:var(--ink-faint)]" />
          {showUrl ? (
            <motion.span
              key="url"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="flex min-w-0 items-center gap-1"
            >
              <span className="text-[color:var(--ink-faint)]">https://</span>
              <span className="truncate text-[color:var(--ink)]">{url}</span>
            </motion.span>
          ) : (
            <motion.span
              key="caret"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
              className="inline-block h-3 w-[1px] bg-[color:var(--ink-soft)]"
              aria-hidden
            />
          )}
        </motion.div>
        {/* Loading progress — hairline across the chrome base */}
        <AnimatePresence>
          {showProgress ? (
            <motion.div
              key="progress"
              initial={{ scaleX: 0, opacity: 1 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
              style={{ transformOrigin: "left" }}
              className="absolute inset-x-0 bottom-0 h-[1.5px] bg-[color:var(--accent-strong)]"
            />
          ) : null}
        </AnimatePresence>
      </div>

      {/* Shared content — fades in only once the page has "loaded". */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showContent ? 1 : 0 }}
        transition={{ duration: 0.4, ease: EASE, delay: showContent ? 0.05 : 0 }}
        className="relative flex-1 overflow-hidden px-6 py-7 md:px-12 md:py-10"
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
          Shared privately · {audience}
        </p>
        <h3 className="mt-2.5 max-w-[22rem] font-serif text-[26px] leading-[1.08] text-[color:var(--ink)] md:text-[34px] md:leading-[1.04]">
          {title}
        </h3>
        <p className="mt-4 max-w-[22rem] text-[13px] leading-6 text-[color:var(--ink-soft)] md:text-[14.5px] md:leading-7">
          “{message}”
        </p>

        {cover ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:mt-8 md:grid-cols-[1.4fr_1fr] md:gap-5">
            <SharedGalleryTile card={cover} large />
            <div className="grid grid-cols-2 gap-4 md:gap-5">
              {thumbs.slice(0, 2).map((t) => (
                <SharedGalleryTile key={t.id} card={t} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Annotation callouts — visible once the page has loaded. */}
        {showContent ? (
          <>
            <Annotation
              delay={0.35}
              style={{ left: "calc(22rem + 0.75rem)", top: "90px" }}
              text="Choose a personalized title for the people you're sharing with."
            />
            <Annotation
              delay={0.55}
              style={{ left: "calc(22rem + 0.75rem)", top: "188px" }}
              text="Add a personal note along the way."
            />
          </>
        ) : null}
      </motion.div>
    </div>
  );
}

/**
 * Annotation callout — a small captioned box with a hairline pointer to
 * the element it's describing. Positioned absolutely by the parent.
 */
function Annotation({
  text,
  style,
  delay = 0,
}: {
  text: string;
  style: React.CSSProperties;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
      style={style}
      className="pointer-events-none absolute z-20 hidden w-[210px] items-center md:flex"
    >
      {/* Pointer: dot on the target end, hairline running to the caption */}
      <div className="relative flex h-px w-6 shrink-0 items-center">
        <span
          className="absolute left-0 h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-[color:var(--accent-strong)]"
          style={{ top: "50%" }}
        />
        <span className="h-px w-full bg-[color:var(--border-strong)] opacity-70" />
      </div>
      <div className="rounded-md border border-[color:var(--border)] bg-white/95 px-3 py-2 text-[10.5px] leading-[1.35] text-[color:var(--ink)] shadow-[0_10px_22px_-14px_rgba(18,31,48,0.22)] backdrop-blur-sm">
        {text}
      </div>
    </motion.div>
  );
}
