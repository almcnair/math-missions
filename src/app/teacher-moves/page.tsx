// /teacher-moves — Teacher Moves (part of the Lab Leader Toolkit).
//
// History: /lableaders (pre-2026-07-03) → /coach/lab-leader (2026-07-03,
// auth-gated experiment) → /teacher-moves (2026-07-04, un-gated, renamed).
// Old URLs redirect via next.config.ts.
//
// Quick-reference for CDSI lab leaders (who often don't have teaching
// experience). 14 top teacher moves framed as quest mechanics: each move
// has a concept, how-to-execute steps, and exact "what to say" scripts.
//
// Content lives in src/content/lab-leaders/moves.json (edit-and-commit).
//
// Some moves (e.g. Move 01 Avoid Power Struggles, Move 02 Community
// Agreement) go deeper and use optional fields — looksLike, whyItMatters,
// strategies — that render as extra modal sections when present. The other
// moves render unchanged.
//
// UX:
//   - Card grid, single page — every move visible at a glance
//   - Click a card → modal with the full playbook
//   - Search box (⌘K to focus, esc to close modal)
//   - Category filter chips: Setup / Behavior / Pacing / Engagement / SEL

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SpaceBackdrop } from "@/components/Starfield";
import ToolHeader from "@/components/toolkit/ToolHeader";
import movesData from "@/content/lab-leaders/moves.json";

// -------- Types ------------------------------------------------------------

type Tone = "cyan" | "magenta" | "violet";
type TagId = "setup" | "behavior" | "pacing" | "engagement" | "sel";

type ExecuteStep = {
  label: string;
  text: string;
};

type LooksLikeItem = {
  label: string;
  text: string;
};

type Strategy = {
  name: string;
  body: string;
  say?: string;
};

type MoveTool = {
  label: string;
  href: string;
  description?: string;
};

type Move = {
  n: number;
  icon: string;
  title: string;
  quest: string;
  tone: Tone;
  tags: TagId[];
  concept: string;
  looksLike?: LooksLikeItem[];
  whyItMatters?: string;
  strategies?: Strategy[];
  execute: ExecuteStep[];
  say: string[];
  tool?: MoveTool;
};

type Toolkit = {
  title: string;
  subtitle: string;
  moves: Move[];
};

const toolkit = movesData as Toolkit;

// -------- Tone + tag styling ----------------------------------------------

const TONE_CLASSES: Record<
  Tone,
  {
    border: string;
    borderStrong: string;
    text: string;
    bg: string;
    shadow: string;
  }
> = {
  cyan: {
    border: "border-accent-cyan/40",
    borderStrong: "border-accent-cyan",
    text: "text-accent-cyan",
    bg: "bg-accent-cyan/5",
    shadow: "shadow-[0_0_24px_rgba(34,211,238,0.12)]",
  },
  magenta: {
    border: "border-accent-magenta/40",
    borderStrong: "border-accent-magenta",
    text: "text-accent-magenta",
    bg: "bg-accent-magenta/5",
    shadow: "shadow-[0_0_24px_rgba(236,93,158,0.15)]",
  },
  violet: {
    border: "border-accent-violet/50",
    borderStrong: "border-accent-violet",
    text: "text-accent-violet",
    bg: "bg-accent-violet/10",
    shadow: "shadow-[0_0_24px_rgba(107,92,165,0.20)]",
  },
};

// Because Tailwind can't statically detect Violet's actual hex, keep text
// tone visible using a semi-brighter class — we import the CSS variable via
// arbitrary properties where needed.
const VIOLET_TEXT = "text-[#B8A6FF]";

function toneText(tone: Tone): string {
  if (tone === "violet") return VIOLET_TEXT;
  return TONE_CLASSES[tone].text;
}

const TAG_META: Record<TagId, { label: string; classes: string }> = {
  setup: {
    label: "Setup",
    classes: "text-status-good border-status-good/30 bg-status-good/10",
  },
  behavior: {
    label: "Behavior",
    classes: "text-accent-magenta border-accent-magenta/30 bg-accent-magenta/10",
  },
  pacing: {
    label: "Pacing",
    classes: "text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10",
  },
  engagement: {
    label: "Engagement",
    classes: "text-accent-magenta-soft border-accent-magenta-soft/30 bg-accent-magenta-soft/10",
  },
  sel: {
    label: "SEL",
    classes: "text-[#B8A6FF] border-accent-violet/40 bg-accent-violet/15",
  },
};

// -------- Move card -------------------------------------------------------

function MoveCard({
  move,
  onOpen,
}: {
  move: Move;
  onOpen: () => void;
}) {
  const tone = TONE_CLASSES[move.tone];
  const firstSentence = move.concept.split(/(?<=\.)\s+/)[0];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={
        "group text-left rounded-lg border bg-bg-panel-solid/50 px-5 py-4 " +
        "transition-all duration-150 " +
        "hover:-translate-y-0.5 hover:bg-bg-panel-solid/70 " +
        `hover:${tone.borderStrong.replace("border-", "border-")} hover:${tone.shadow} ` +
        `${tone.border} ` +
        "flex flex-col gap-2 min-h-[180px] w-full"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-mono text-[10px] tracking-[0.25em] text-text-faint">
          MOVE {String(move.n).padStart(2, "0")}
        </div>
        <div className="text-2xl leading-none">{move.icon}</div>
      </div>
      <h3 className="font-display text-lg font-bold text-text-bright leading-tight">
        {move.title}
      </h3>
      <div className={`font-ui text-xs italic font-semibold ${toneText(move.tone)}`}>
        ▸ {move.quest}
      </div>
      <p className="font-body text-[14.5px] leading-[1.55] text-[#C7CFE4]">
        {firstSentence}
      </p>
      <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
        {move.tags.map((t) => (
          <span
            key={t}
            className={
              "font-mono text-[9px] tracking-[0.15em] uppercase font-bold " +
              "px-2 py-0.5 rounded-full border " +
              TAG_META[t].classes
            }
          >
            {TAG_META[t].label}
          </span>
        ))}
      </div>
    </button>
  );
}

// -------- Modal -----------------------------------------------------------

// Split a paragraph into a lead sentence + the remainder. Used inside the
// modal's reading sections so the takeaway pops for skim-readers even if
// they never read the rest. Robust to sentences that end with . ! or ?
// followed by whitespace, and handles the case where there's only one
// sentence (no supporting text).
function splitLead(text: string): { lead: string; rest: string } {
  const trimmed = text.trim();
  // Find the end of the first sentence: first . ! or ? followed by
  // whitespace. Manual scan avoids needing the /s dotAll flag (which
  // requires ES2018+ in tsconfig).
  const match = trimmed.match(/[.!?](\s+)/);
  if (!match || match.index === undefined) {
    return { lead: trimmed, rest: "" };
  }
  const endOfLead = match.index + 1; // include the terminal punctuation
  const restStart = endOfLead + match[1].length;
  return {
    lead: trimmed.slice(0, endOfLead).trim(),
    rest: trimmed.slice(restStart).trim(),
  };
}

type ReadingTab = "concept" | "looks" | "why";

function MoveModal({
  move,
  onClose,
}: {
  move: Move;
  onClose: () => void;
}) {
  const tone = TONE_CLASSES[move.tone];

  // Reading-section tabs: Concept / Looks Like / Why It Matters.
  // Tabs render only if the move has at least one optional section
  // (looksLike or whyItMatters). Shallow moves keep the single-panel look.
  const hasLooks = Boolean(move.looksLike && move.looksLike.length > 0);
  const hasWhy = Boolean(move.whyItMatters);
  const showTabs = hasLooks || hasWhy;
  const [tab, setTab] = useState<ReadingTab>("concept");

  const concept = splitLead(move.concept);
  const why = move.whyItMatters ? splitLead(move.whyItMatters) : null;

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg " +
          "bg-gradient-to-b from-bg-panel-solid to-bg-deep border-2 " +
          `${tone.borderStrong} ${tone.shadow}`
        }
      >
        {/* Frame corners */}
        <span className="corner tl"></span>
        <span className="corner tr"></span>
        <span className="corner bl"></span>
        <span className="corner br"></span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-md border border-border-mid bg-bg-panel-solid/80 text-text-dim hover:text-text-bright hover:border-accent-cyan flex items-center justify-center transition-colors"
        >
          ✕
        </button>

        <div className="p-6 sm:p-8">
          {/* Head */}
          <div className="flex items-start gap-4 mb-4">
            <div className="text-4xl leading-none">{move.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] tracking-[0.25em] text-text-faint mb-1">
                MOVE {String(move.n).padStart(2, "0")} · {move.quest.toUpperCase()}
              </div>
              <h2
                id="move-modal-title"
                className="font-display text-2xl md:text-3xl font-bold text-text-bright leading-tight"
              >
                {move.title}
              </h2>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {move.tags.map((t) => (
              <span
                key={t}
                className={
                  "font-mono text-[10px] tracking-[0.18em] uppercase font-bold " +
                  "px-2.5 py-1 rounded-full border " +
                  TAG_META[t].classes
                }
              >
                {TAG_META[t].label}
              </span>
            ))}
          </div>

          {/*
           * Reading sections — Concept / Looks Like / Why It Matters.
           *
           * Design shipped 2026-07-07 (Option 5 restructure). When a move
           * has at least one optional section, we render the three top
           * sections as tabs so coaches don't face a wall of prose. Shallow
           * moves fall back to the single-panel render.
           *
           * Prose treatment: first sentence becomes a bright, semibold
           * "lead", rest is a smaller, dimmer "supporting" paragraph.
           */}
          {showTabs ? (
            <div className="mb-6">
              {/* Tab bar */}
              <div
                role="tablist"
                aria-label="Move sections"
                className="flex gap-1 border-b border-border-faint mb-5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "concept"}
                  onClick={() => setTab("concept")}
                  className={
                    "flex-1 px-2 py-3 font-mono text-[11px] tracking-[0.22em] font-bold uppercase " +
                    "border-b-2 transition-colors " +
                    (tab === "concept"
                      ? `${toneText(move.tone)} ${tone.borderStrong}`
                      : "text-text-dim border-transparent hover:text-text-bright")
                  }
                >
                  🧠 Concept
                </button>
                {hasLooks ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "looks"}
                    onClick={() => setTab("looks")}
                    className={
                      "flex-1 px-2 py-3 font-mono text-[11px] tracking-[0.22em] font-bold uppercase " +
                      "border-b-2 transition-colors " +
                      (tab === "looks"
                        ? `${toneText(move.tone)} ${tone.borderStrong}`
                        : "text-text-dim border-transparent hover:text-text-bright")
                    }
                  >
                    👀 Looks Like
                  </button>
                ) : null}
                {hasWhy ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "why"}
                    onClick={() => setTab("why")}
                    className={
                      "flex-1 px-2 py-3 font-mono text-[11px] tracking-[0.22em] font-bold uppercase " +
                      "border-b-2 transition-colors " +
                      (tab === "why"
                        ? `${toneText(move.tone)} ${tone.borderStrong}`
                        : "text-text-dim border-transparent hover:text-text-bright")
                    }
                  >
                    🧬 Why It Matters
                  </button>
                ) : null}
              </div>

              {/* Concept panel */}
              {tab === "concept" ? (
                <section role="tabpanel">
                  <div className="reading-panel">
                    {concept.rest ? (
                      <>
                        <p className="lead">{concept.lead}</p>
                        <p className="supporting">{concept.rest}</p>
                      </>
                    ) : (
                      <p className="lead">{concept.lead}</p>
                    )}
                  </div>
                </section>
              ) : null}

              {/* Looks Like panel */}
              {tab === "looks" && move.looksLike ? (
                <section role="tabpanel">
                  <ul className="callout-list">
                    {move.looksLike.map((item, i) => (
                      <li key={i}>
                        <span className="callout-chip">{item.label}</span>
                        <span className="callout-body">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {/* Why It Matters panel */}
              {tab === "why" && why ? (
                <section role="tabpanel">
                  <div className="reading-panel">
                    {why.rest ? (
                      <>
                        <p className="lead">{why.lead}</p>
                        <p className="supporting">{why.rest}</p>
                      </>
                    ) : (
                      <p className="lead">{why.lead}</p>
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            /* Shallow moves — no tabs, just the Concept panel. */
            <section className="mb-6">
              <h4
                className={
                  "font-mono text-[11px] tracking-[0.28em] font-bold mb-2 " +
                  toneText(move.tone)
                }
              >
                🧠 THE CONCEPT
              </h4>
              <div className="reading-panel">
                {concept.rest ? (
                  <>
                    <p className="lead">{concept.lead}</p>
                    <p className="supporting">{concept.rest}</p>
                  </>
                ) : (
                  <p className="lead">{concept.lead}</p>
                )}
              </div>
            </section>
          )}

          {/* How to execute */}
          <section className="mb-6">
            <h4
              className={
                "font-mono text-[11px] tracking-[0.28em] font-bold mb-3 " +
                toneText(move.tone)
              }
            >
              ⚙️ HOW TO EXECUTE
            </h4>
            <ul className="space-y-2">
              {move.execute.map((step, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border-faint bg-white/[0.02] px-4 py-3"
                >
                  <span className={`font-bold ${toneText(move.tone)}`}>
                    {step.label}:
                  </span>{" "}
                  <span className="font-body text-[15.5px] leading-[1.6] text-[#E4E9F5]">
                    {step.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* What to say — quote blocks use move tone (matches modal border). */}
          <section>
            <h4
              className={
                "font-mono text-[11px] tracking-[0.28em] font-bold mb-3 " +
                toneText(move.tone)
              }
            >
              💬 WHAT TO SAY
            </h4>
            <div className="space-y-2">
              {move.say.map((quote, i) => (
                <div
                  key={i}
                  className={
                    "rounded-md border-l-4 px-4 py-3 italic leading-relaxed " +
                    "font-body text-[15.5px] text-[#E4E9F5] " +
                    `${tone.borderStrong} ${tone.bg}`
                  }
                >
                  <span className={`${toneText(move.tone)} font-bold not-italic`}>
                    &ldquo;
                  </span>
                  {quote}
                  <span className={`${toneText(move.tone)} font-bold not-italic`}>
                    &rdquo;
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/*
           * Strategies (optional — deep moves only).
           *
           * Design decision 2026-07-07 (Austin): strategies always render
           * in CYAN regardless of the move's tone. Rationale: the magenta
           * tint on violet/magenta moves was hard to read at paragraph
           * length. Cyan reads well against dark navy at all font sizes
           * and provides a consistent "strategies" visual identity across
           * the whole /teacher-moves system.
           */}
          {move.strategies && move.strategies.length > 0 ? (
            <section className="mt-6">
              <h4 className="font-mono text-[11px] tracking-[0.28em] font-bold mb-3 text-accent-cyan">
                🎯 STRATEGIES
              </h4>
              <ol className="space-y-3">
                {move.strategies.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-accent-cyan/40 bg-accent-cyan/[0.04] px-4 py-3"
                  >
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-mono text-[11px] font-bold tracking-[0.1em] text-accent-cyan">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-display font-bold text-text-bright">
                        {s.name}
                      </span>
                    </div>
                    <p className="font-body text-[15.5px] leading-[1.6] text-[#DFE4F2]">
                      {s.body}
                    </p>
                    {s.say ? (
                      <div className="mt-2 rounded-md border-l-4 border-accent-cyan bg-accent-cyan/[0.06] px-3 py-2 italic font-body text-[15px] leading-[1.55] text-[#E4E9F5]">
                        {s.say}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {/* Tool / classroom resource (optional) */}
          {move.tool ? (
            <section>
              <h4
                className={
                  "font-mono text-[11px] tracking-[0.28em] font-bold mb-3 " +
                  toneText(move.tone)
                }
              >
                🎯 CLASSROOM TOOL
              </h4>
              <Link
                href={move.tool.href}
                target={move.tool.href.startsWith("http") ? "_blank" : undefined}
                rel={move.tool.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className={
                  "group flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition " +
                  `${tone.borderStrong} ${tone.bg} hover:brightness-125`
                }
              >
                <div className="min-w-0">
                  <div className={`font-display font-bold text-base ${toneText(move.tone)}`}>
                    {move.tool.label}
                  </div>
                  {move.tool.description ? (
                    <div className="text-text-bright text-sm mt-0.5">
                      {move.tool.description}
                    </div>
                  ) : null}
                </div>
                <span
                  className={`font-mono text-lg ${toneText(move.tone)} transition-transform group-hover:translate-x-1`}
                  aria-hidden
                >
                  →
                </span>
              </Link>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// -------- Filter chips ----------------------------------------------------

const FILTER_OPTIONS: Array<{ id: "all" | TagId; label: string; icon: string }> = [
  { id: "all", label: "All", icon: "◈" },
  { id: "setup", label: "Setup", icon: "🛠" },
  { id: "behavior", label: "Behavior", icon: "🎯" },
  { id: "pacing", label: "Pacing", icon: "⏱" },
  { id: "engagement", label: "Engagement", icon: "✨" },
  { id: "sel", label: "SEL", icon: "💜" },
];

function FilterChips({
  active,
  onChange,
  counts,
}: {
  active: "all" | TagId;
  onChange: (v: "all" | TagId) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map((opt) => {
        const isActive = active === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.id)}
            className={
              "font-mono text-[11px] tracking-[0.12em] font-bold uppercase " +
              "px-3.5 py-2 rounded-full border transition-all inline-flex items-center gap-2 " +
              (isActive
                ? "border-accent-cyan text-accent-cyan bg-accent-cyan/10 shadow-[0_0_16px_rgba(34,211,238,0.15)]"
                : "border-border-faint text-text-dim hover:text-text-bright hover:border-border-mid")
            }
          >
            <span aria-hidden>{opt.icon}</span>
            {opt.label}
            <span
              className={
                "text-[10px] font-mono px-1.5 py-0 rounded-full " +
                (isActive
                  ? "bg-accent-cyan/20 text-accent-cyan"
                  : "bg-white/5 text-text-faint")
              }
            >
              {counts[opt.id] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// -------- Main page --------------------------------------------------------

export default function LabLeadersPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | TagId>("all");
  const [query, setQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // ⌘K / Ctrl+K focuses the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: toolkit.moves.length };
    for (const opt of FILTER_OPTIONS) {
      if (opt.id === "all") continue;
      c[opt.id] = toolkit.moves.filter((m) => m.tags.includes(opt.id as TagId))
        .length;
    }
    return c;
  }, []);

  const visibleMoves = useMemo(() => {
    const q = query.trim().toLowerCase();
    return toolkit.moves.filter((m) => {
      const matchesFilter =
        activeFilter === "all" || m.tags.includes(activeFilter);
      const hay = [
        m.title,
        m.quest,
        m.concept,
        ...m.execute.map((e) => e.label + " " + e.text),
        ...m.say,
        ...m.tags,
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = q === "" || hay.includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query]);

  const openMove = openIndex !== null ? toolkit.moves[openIndex] : null;

  return (
    <main className="relative min-h-screen bg-bg-deep text-text-bright overflow-x-hidden">
      <SpaceBackdrop />
      <div className="relative z-10">
        <ToolHeader collectionId="lab-leader" activeToolId="teacher-moves" maxWidth="max-w-6xl" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
          {/* Title block */}
          <div>
            <div className="font-mono text-[11px] tracking-[0.3em] text-text-dim mb-2">
              CDSI 2026 · LAB LEADER TOOLKIT
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-text-bright leading-tight">
              Teacher{" "}
              <span className="text-accent-cyan">Moves</span>
            </h1>
          </div>

          {/* Briefing */}
          <section className="rounded-lg border border-border-mid bg-bg-panel-solid/50 px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <p className="text-text-dim text-sm sm:text-base m-0 leading-relaxed">
              <span className="text-text-bright font-semibold">
                Your quick-reference for classroom management, pacing, and
                engagement.
              </span>{" "}
              Twelve top teacher moves, framed as quest mechanics. Tap any card
              for the full playbook: what it is, how to execute, and exactly what
              to say.
            </p>
            <div className="font-mono text-[10px] tracking-[0.25em] font-bold text-accent-cyan border border-accent-cyan/50 bg-accent-cyan/5 px-3 py-1.5 rounded-full whitespace-nowrap self-start sm:self-auto">
              ⚡ {toolkit.moves.length} MOVES LOADED
            </div>
          </section>

          {/* Toolbar: search + filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search — 'distracted', 'timer', 'frustrated'…"
                autoComplete="off"
                className="w-full bg-bg-panel-solid/60 border border-border-faint rounded-md pl-10 pr-10 py-2.5 text-text-bright placeholder:text-text-faint focus:outline-none focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan/20 transition-colors font-ui"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded bg-white/5 hover:bg-white/10 text-text-dim hover:text-text-bright transition-colors flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="font-mono text-[10px] tracking-[0.25em] text-text-faint whitespace-nowrap hidden sm:flex items-center gap-1.5">
              <kbd className="border border-border-faint bg-bg-panel-solid px-1.5 py-0.5 rounded text-[10px]">
                ⌘K
              </kbd>
              <span>SEARCH</span>
              <span className="mx-1">·</span>
              <kbd className="border border-border-faint bg-bg-panel-solid px-1.5 py-0.5 rounded text-[10px]">
                ESC
              </kbd>
              <span>CLOSE</span>
            </div>
          </div>

          <FilterChips
            active={activeFilter}
            onChange={setActiveFilter}
            counts={counts}
          />

          {/* Grid */}
          {visibleMoves.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {visibleMoves.map((m) => {
                const idx = toolkit.moves.findIndex((x) => x.n === m.n);
                return (
                  <MoveCard
                    key={m.n}
                    move={m}
                    onOpen={() => setOpenIndex(idx)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-text-dim">
              <div className="text-3xl mb-2">🔍</div>
              <div>No moves match that search.</div>
            </div>
          )}

          {/* Footer */}
          <footer className="pt-6 border-t border-border-faint text-center text-text-faint text-xs font-mono tracking-wider">
            Adapted from{" "}
            <em className="text-text-dim">
              CDSI Lab Leader Toolkit: Top Teacher Moves
            </em>{" "}
            · Camp Debate Summer Institute 2026
          </footer>
        </div>
      </div>

      {openMove !== null && (
        <MoveModal move={openMove} onClose={() => setOpenIndex(null)} />
      )}
    </main>
  );
}
