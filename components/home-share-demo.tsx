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
  // Used for the LOCATION · DATE caption on every surface (workspace card,
  // share-page tile, share-page hero). Mirrors the real GalleryCard fields.
  location: string;
  dateRange: string;
  year: string;
  days?: number;
  pattern: CoverPattern;
  // 0–3, subtly shifts the cover's tonal base within the shared palette.
  // Only consulted when `imageSrc` isn't provided.
  tone: 0 | 1 | 2 | 3;
  // Optional path to a real cover image under /public. When set, every
  // surface (workspace card, share hero, also-featured tile) renders this
  // image instead of the wireframe placeholder. Drop files at
  //   public/demo/share-demo/{c1,c2,c3,c4}.webp
  // and they'll wire up automatically.
  imageSrc?: string;
};

// Covers are wireframe-style layout hints, not photos. They share a single
// restrained palette (soft neutrals + blue-grays) and differ only in tonal
// depth and internal composition — the shape of a gallery, not its colors.
const CARDS: PlaceholderCard[] = [
  {
    id: "c1",
    title: "Baja Surf Trip",
    location: "Los Cabos, Mexico",
    dateRange: "Jun 8 – Jun 16, 2024",
    year: "2024",
    days: 9,
    pattern: "hero-thumbs",
    tone: 2,
    imageSrc: "/demo/share-demo/c1.webp",
  },
  {
    id: "c2",
    title: "Frühlingsfest 2026",
    location: "Munich, Germany",
    dateRange: "Apr 17 – Apr 26, 2026",
    year: "2026",
    days: 10,
    pattern: "triptych",
    tone: 1,
    imageSrc: "/demo/share-demo/c2.webp",
  },
  {
    id: "c3",
    title: "Lake Como",
    location: "Northern Italy",
    dateRange: "Apr 4 – Apr 14, 2024",
    year: "2024",
    days: 11,
    pattern: "quad",
    tone: 0,
    imageSrc: "/demo/share-demo/c3.webp",
  },
  {
    id: "c4",
    title: "Winter Olympics 2025",
    location: "Livigno, Italy",
    dateRange: "Mar 18 – Mar 26, 2024",
    year: "2024",
    days: 9,
    pattern: "strip",
    tone: 3,
    imageSrc: "/demo/share-demo/c4.webp",
  },
];

// Cards the script "selects" — referenced by index in the select-N steps.
const SELECTED_IDS = ["c1", "c2", "c3"];

type Group = { id: string; label: string; meta: string };

const GROUPS: Group[] = [
  { id: "parents", label: "Mom & Dad", meta: "2 people" },
  { id: "grandparents", label: "Grandparents", meta: "4 people" },
  { id: "friends", label: "Close friends", meta: "6 people" },
];

const CHOSEN_GROUP_ID = "parents";

// Content for the fake shared page. Mirrors the fields the real /share/[token]
// page reads off the `shares` row + sender context: group name + member labels
// in the eyebrow, a serif "Shared with X" headline, sender date, and the
// custom message. Keep this in sync with app/share/[token]/page.tsx.
const SHARED_PAGE: Record<
  string,
  {
    senderName: string;
    groupName: string;
    recipientLabels: string[];
    date: string;
    message: string;
    url: string;
  }
> = {
  parents: {
    senderName: "Finn",
    groupName: "Mom & Dad",
    recipientLabels: ["Mom", "Dad"],
    date: "May 9, 2026",
    message:
      "Check these out in your own time, I left a few comments for each of you. Mom, I found a restaurant I have to take you to...",
    url: "memora.app/share/a9f2xq7t",
  },
  grandparents: {
    senderName: "Finn",
    groupName: "Nana & Papa",
    recipientLabels: ["Nana", "Papa"],
    date: "May 9, 2026",
    message:
      "Saved these up so we could look through them together next time I'm over for Sunday lunch.",
    url: "memora.app/share/b4k8mz2e",
  },
  friends: {
    senderName: "Finn",
    groupName: "the group",
    recipientLabels: ["Maya", "Theo", "Hadley", "Quinn"],
    date: "May 9, 2026",
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
                senderName={shared.senderName}
                groupName={shared.groupName}
                recipientLabels={shared.recipientLabels}
                date={shared.date}
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
                <div className="h-full overflow-hidden px-3 pb-3 pt-3 md:px-8 md:pb-5 md:pt-6">
                  <div className="flex items-baseline justify-between gap-3 md:gap-4">
                    <div>
                      <p className="text-[8.5px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)] md:text-[10px] md:tracking-[0.26em]">
                        My galleries
                      </p>
                      <p className="mt-0.5 font-serif text-[13px] leading-tight text-[color:var(--ink)] md:mt-1 md:text-[22px]">
                        Choose what to share
                      </p>
                    </div>
                    <motion.p
                      animate={{ opacity: selectedCount > 0 ? 1 : 0.55 }}
                      transition={{ duration: 0.25 }}
                      className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)] md:text-[11px] md:tracking-[0.2em]"
                    >
                      {selectedCount > 0
                        ? `${selectedCount} selected`
                        : "Tap to select"}
                    </motion.p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 md:mt-5 md:gap-5">
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
                      className="absolute bottom-0 right-0 top-10 flex w-[88%] flex-col overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--chrome-strong)] p-3 shadow-[-12px_0_40px_-16px_rgba(14,22,34,0.18)] md:w-[380px] md:p-6"
                    >
                      <p className="text-[8.5px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)] md:text-[10px] md:tracking-[0.26em]">
                        Share privately with
                      </p>
                      <p className="mt-1 font-serif text-[14px] leading-tight text-[color:var(--ink)] md:mt-1.5 md:text-[20px]">
                        Pick a group
                      </p>
                      <div className="mt-2.5 space-y-1.5 md:mt-5 md:space-y-2">
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
                        className="mt-3 md:mt-6"
                      >
                        <div
                          className="inline-flex w-full items-center justify-center gap-1.5 bg-[color:var(--accent-strong)] px-3 py-2 text-[9.5px] uppercase tracking-[0.2em] text-white md:gap-2 md:px-4 md:py-3 md:text-[11px] md:tracking-[0.24em]"
                          style={{
                            backgroundColor: buttonPressed
                              ? "var(--accent-strong-hover)"
                              : "var(--accent-strong)",
                          }}
                        >
                          <Link2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          Create link
                        </div>
                      </motion.div>
                      <p className="mt-2 text-[9px] leading-[1.4] text-[color:var(--ink-faint)] md:mt-3 md:text-[10.5px] md:leading-5">
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
                    className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 border border-white/10 bg-[color:var(--ink)] px-2.5 py-1.5 text-white shadow-[0_12px_30px_rgba(14,22,34,0.26)] md:bottom-6 md:px-4 md:py-2.5"
                  >
                    <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] md:gap-2 md:text-[11px] md:tracking-[0.2em]">
                      <Check className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" strokeWidth={2.5} />
                      Link copied · {shared.url}
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
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
      className="mt-3 md:mt-6"
    >
      <p className="text-[8.5px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)] md:text-[10px] md:tracking-[0.26em]">
        Write a custom message to {recipient}
      </p>
      <div className="mt-1.5 min-h-[60px] rounded-sm border border-[color:var(--border)] bg-white px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] md:mt-2 md:min-h-[96px] md:px-3 md:py-2.5">
        <p className="whitespace-pre-wrap text-[10.5px] leading-[1.45] text-[color:var(--ink)] md:text-[12px] md:leading-[1.55]">
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
  // Editorial card: faithful compressed version of components/gallery-card.tsx.
  // Frame mat with hairline border + paper bg + padding (the "matted print"
  // treatment); 16:9 cover inside a darker hairline frame; year + duration
  // badges sit on the mat at the top corners; caption block (serif title +
  // mono caps "LOCATION · DATE") sits directly on the page canvas — no card
  // bg, no shadow.
  return (
    <motion.div
      animate={{ y: selected ? -2 : 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="group block"
    >
      <motion.div
        animate={{
          borderColor: selected
            ? "var(--ink)"
            : "var(--frame-border)",
          boxShadow: selected
            ? "0 10px 28px -16px rgba(14,22,34,0.32)"
            : "0 0 0 rgba(14,22,34,0)",
        }}
        transition={{ duration: 0.28, ease: EASE }}
        className="relative w-full border bg-[color:var(--frame-bg)] p-1.5 md:p-3"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden border border-[color:var(--border)] bg-[color:var(--paper-strong)]">
          <CoverArt card={card} />
          <AnimatePresence>
            {selected ? (
              <motion.div
                key="check"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.26, ease: EASE }}
                className="absolute right-1 top-1 z-20 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--ink)] text-white shadow-[0_4px_12px_rgba(14,22,34,0.32)] md:right-2 md:top-2 md:h-6 md:w-6"
                aria-hidden
              >
                <Check className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" strokeWidth={2.5} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        {/* Year + duration badges — match real GalleryCard placement */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-2 top-2 inline-flex items-center bg-[color:var(--chrome)] px-1 py-px font-[family-name:var(--font-mono)] text-[7.5px] tracking-[0.12em] text-[color:var(--ink)] md:left-3.5 md:top-3.5 md:px-1.5 md:py-0.5 md:text-[9px] md:tracking-[0.16em]"
        >
          {card.year}
        </span>
        {card.days ? (
          <span
            aria-hidden
            className="pointer-events-none absolute right-2 top-2 inline-flex items-center bg-[color:var(--chrome)] px-1 py-px font-[family-name:var(--font-mono)] text-[7.5px] tracking-[0.12em] text-[color:var(--ink)] md:right-3.5 md:top-3.5 md:px-1.5 md:py-0.5 md:text-[9px] md:tracking-[0.16em]"
          >
            {card.days}d
          </span>
        ) : null}
      </motion.div>
      <div className="mt-1.5 md:mt-3">
        <h3 className="truncate font-serif text-[12px] leading-[1.2] text-[color:var(--ink)] md:text-[18px] md:leading-[1.15]">
          {card.title}
        </h3>
        <p className="mt-0.5 truncate font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)] md:mt-1.5 md:text-[10px] md:tracking-[0.16em]">
          {card.location.toUpperCase()} · {card.dateRange.toUpperCase()}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * CoverArt — single entry point for every demo cover surface (workspace card,
 * share-page hero, also-featured tile). When `card.imageSrc` is set, renders
 * that file as a full-bleed photograph (Next/Image); otherwise falls back to
 * the wireframe `CoverPlaceholder` so the demo still looks intentional with
 * no photo assets shipped. Drop files at /public/demo/share-demo/{c1,...}.webp
 * and set `imageSrc` on each CARDS entry — every surface picks them up
 * automatically.
 */
function CoverArt({ card }: { card: PlaceholderCard }) {
  if (card.imageSrc) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={card.imageSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    );
  }
  return <CoverPlaceholder pattern={card.pattern} tone={card.tone} fill />;
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
  fill = false,
}: {
  pattern: CoverPattern;
  tone: 0 | 1 | 2 | 3;
  large?: boolean;
  // `fill` makes the placeholder absolute-fill its parent. The parent must be
  // `relative` and own its own aspect/height. Used by the share-page hero +
  // also-featured tiles where the surrounding tile sets the aspect ratio.
  fill?: boolean;
}) {
  const heightClass = fill
    ? "absolute inset-0"
    : large
      ? "h-20 md:h-44"
      : "h-16 md:h-36";
  const shape = "bg-white/55 ring-1 ring-inset ring-white/40";
  return (
    <div
      className={`relative w-full overflow-hidden ${heightClass}`}
      style={{ backgroundImage: COVER_BASES[tone] }}
      aria-hidden
    >
      <div className="absolute inset-0 p-1.5 md:p-4">
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
      className="flex items-center justify-between border px-2.5 py-1.5 md:px-3.5 md:py-2.5"
    >
      <div className="min-w-0">
        <p className="truncate text-[11px] text-[color:var(--ink)] md:text-[12.5px]">
          {group.label}
        </p>
        <p className="mt-0.5 truncate text-[8.5px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)] md:text-[10px] md:tracking-[0.18em]">
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
            className="flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--accent-strong)] text-white md:h-5 md:w-5"
          >
            <Check className="h-2.5 w-2.5 md:h-3 md:w-3" strokeWidth={2.5} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * SharedPagePreview — compressed, faithful mock of /share/[token].
 *
 * Layout mirrors app/share/[token]/page.tsx so the demo doesn't drift when
 * that page is iterated:
 *   - hairline top bar with serif italic "Memora" + mono date caps
 *   - masthead (eyebrow with sender + recipients, big serif "Shared with X."
 *     headline with italic on the variable portion, optional message column
 *     separated by a vertical rule)
 *   - featured hero (16:9-ish placeholder with FEATURED tag, location caps,
 *     gallery title overlay, date range + day count on the right)
 *   - "Also featured:" grid of secondary tiles
 *
 * Sizes are tuned for the demo stage's fixed ~560 px height — proportions
 * match the real page; absolute font sizes are scaled down ~30%.
 */
function SharedPagePreview({
  senderName,
  groupName,
  recipientLabels,
  date,
  message,
  url,
  cards,
  stage = "loaded",
}: {
  senderName: string;
  groupName: string;
  recipientLabels: string[];
  date: string;
  message: string;
  url: string;
  cards: PlaceholderCard[];
  stage?: "empty" | "pasted" | "navigating" | "loaded";
}) {
  const [featured, ...rest] = cards;
  const showUrl = stage !== "empty";
  const highlightUrl = stage === "pasted";
  const showProgress = stage === "navigating";
  const showContent = stage === "loaded";

  // Real page splits the title so the variable portion (group name) renders
  // italic against the leading "Shared with". For the default no-group fallback
  // ("Shared with you") the second word still goes italic, which matches.
  const titleLeading = "Shared with";
  const titleRest = groupName || "you";

  const recipientsLine = recipientLabels.length
    ? recipientLabels.map((l) => l.toUpperCase()).join(" · ")
    : null;
  const eyebrow = `${recipientsLine ? `${recipientsLine} — ` : ""}FROM ${senderName.toUpperCase()}`;
  const dateCaps = date.toUpperCase();
  const restCount = rest.length;
  const restCountLabel = `${restCount} ${restCount === 1 ? "GALLERY" : "GALLERIES"}`;

  return (
    <div className="flex h-full flex-col bg-[color:var(--background)]">
      {/* Browser chrome */}
      <div className="relative flex h-10 shrink-0 items-center gap-3 border-b border-[color:var(--border)] bg-[color:var(--paper)] px-4 md:px-5">
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
        className="relative flex-1 overflow-hidden bg-[color:var(--background)] px-4 pt-3 text-[color:var(--ink)] md:px-8 md:pt-4"
      >
        {/* Top bar: brand · date — black hairline divider, real page idiom. */}
        <div className="flex items-baseline justify-between border-b-[0.5px] border-[color:var(--ink)] pb-2 md:pb-2.5">
          <p className="font-serif italic text-[12px] text-[color:var(--ink)] md:text-[14px]">
            Memora
          </p>
          <p className="font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-[0.22em] text-[color:var(--ink)] md:text-[9.5px]">
            {dateCaps}
          </p>
        </div>

        {/* Masthead — title left, message right with vertical rule */}
        <div className="grid grid-cols-1 gap-3 py-3 md:grid-cols-[1.6fr_1fr] md:gap-6 md:py-4">
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-[0.22em] text-[color:var(--ink-soft)] md:text-[9.5px]">
              {eyebrow}
            </p>
            <h3 className="mt-1.5 font-serif text-[18px] leading-[1.05] tracking-tight text-[color:var(--ink)] md:mt-2 md:text-[30px]">
              {titleLeading} <span className="italic">{titleRest}</span>
              <span className="text-[color:var(--ink-faint)]">.</span>
            </h3>
          </div>
          <div className="md:border-l-[0.5px] md:border-[color:var(--ink)] md:pl-5">
            <p className="font-serif text-[10.5px] leading-[1.5] text-[color:var(--ink)] md:text-[12px] md:leading-[1.6]">
              {message}
            </p>
          </div>
        </div>

        {/* Featured hero — placeholder with overlay text */}
        {featured ? (
          <div className="relative aspect-[21/10] w-full overflow-hidden rounded-[3px] bg-[color:var(--paper-strong)] md:aspect-[24/10]">
            <CoverArt card={featured} />
            {/* Dark scrim for overlay text. Real /share lays this over a
                photograph; here it only needs to bottom-load so the wireframe
                placeholder still reads above it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
            />
            <span className="absolute left-2.5 top-2.5 hidden rounded-sm bg-white/90 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-[0.22em] text-black md:left-3 md:top-3 md:inline-block md:px-2 md:py-1 md:text-[9px]">
              Featured
            </span>
            <div className="absolute inset-x-2.5 bottom-2 flex flex-wrap items-end justify-between gap-2 text-white md:inset-x-4 md:bottom-3">
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-[0.22em] text-white/85 md:text-[9.5px]">
                  {featured.location.toUpperCase()}
                </p>
                <h4 className="mt-1 font-serif text-[16px] leading-tight md:mt-1.5 md:text-[26px]">
                  {featured.title}
                </h4>
              </div>
              <div className="text-right">
                <p className="font-[family-name:var(--font-mono)] text-[8.5px] uppercase tracking-[0.16em] text-white/85 md:text-[9.5px]">
                  {featured.dateRange.toUpperCase()}
                </p>
                {featured.days ? (
                  <p className="mt-0.5 font-[family-name:var(--font-mono)] text-[8.5px] uppercase tracking-[0.16em] text-white/75 md:text-[9.5px]">
                    {featured.days} DAYS
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Also featured */}
        {rest.length ? (
          <div className="mt-3 md:mt-5">
            <div className="flex items-baseline justify-between border-b-[0.5px] border-[color:var(--border-strong)] pb-1.5 md:pb-2">
              <p className="font-serif text-[13px] text-[color:var(--ink)] md:text-[16px]">
                Also featured:
              </p>
              <p className="font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-[0.22em] text-[color:var(--ink)] md:text-[9.5px]">
                {restCountLabel}
              </p>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-3 md:mt-3 md:gap-5">
              {rest.slice(0, 2).map((card) => (
                <SharedAlsoTile key={card.id} card={card} />
              ))}
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

function SharedAlsoTile({ card }: { card: PlaceholderCard }) {
  return (
    <div>
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[2px] bg-[color:var(--paper-strong)]">
        <CoverArt card={card} />
      </div>
      <p className="mt-1.5 truncate font-serif text-[11px] leading-[1.15] text-[color:var(--ink)] md:mt-2 md:text-[14px]">
        {card.title}
      </p>
      <p className="mt-0.5 truncate font-[family-name:var(--font-mono)] text-[7.5px] uppercase tracking-[0.14em] text-[color:var(--ink-faint)] md:text-[9px] md:tracking-[0.16em]">
        {card.location.toUpperCase()} · {card.dateRange.toUpperCase()}
      </p>
    </div>
  );
}
