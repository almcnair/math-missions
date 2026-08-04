// /toolkit/jeopardy — Projector-friendly hub for Jeopardy-style review games.
//
// Lab-leader-facing. Adults land here from the /toolkit hub when they want
// to project a review game in class. The page is intentionally minimalist:
// giant tiles, high contrast, no auth gates, no chrome. Every game opens
// in a new tab so this hub stays visible for the next selection.
//
// Games are declared inline for now (there's only one). When there are 3+
// games this should move into tools.json alongside the other toolkit
// entries, and the tile grid should read from a shared data source.

import Link from "next/link";
import type { Metadata } from "next";
import { SpaceBackdrop } from "@/components/Starfield";
import ToolHeader from "@/components/toolkit/ToolHeader";

export const metadata: Metadata = {
  title: "Jeopardy Games · Lab Leader Toolkit · Policy Debate 101",
  description:
    "Projector-friendly hub of Jeopardy-style review games for policy debate classrooms. One click to project.",
};

// -------- Game catalog ----------------------------------------------------

type Status = "ready" | "coming-soon";

type Game = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  status: Status;
  categoryCount: number;
  clueCount: number;
  covers: string; // Which lesson(s) this game reviews
  tone: "magenta" | "cyan" | "violet";
};

const GAMES: Game[] = [
  {
    id: "jeopardy-day1",
    title: "DAY 1 REVIEW",
    subtitle: "First-day fundamentals",
    href: "/games/jeopardy-day1.html",
    status: "ready",
    categoryCount: 6,
    clueCount: 30,
    covers: "Lesson 1",
    tone: "magenta",
  },
  // Future games slot in here — keep them in classroom order.
  // {
  //   id: "jeopardy-day2",
  //   title: "DAY 2 REVIEW",
  //   subtitle: "Argument structure",
  //   href: "/games/jeopardy-day2.html",
  //   status: "coming-soon",
  //   categoryCount: 6,
  //   clueCount: 30,
  //   covers: "Lesson 2",
  //   tone: "cyan",
  // },
];

// -------- Tone tokens (echo CollectionHub palette) ------------------------

const TONE = {
  magenta: {
    ring: "ring-accent-magenta/40",
    ringHover: "hover:ring-accent-magenta/80",
    glow: "hover:shadow-[0_20px_60px_rgba(236,93,158,0.35),0_0_0_1px_rgba(236,93,158,0.45)]",
    chip: "bg-accent-magenta/15 text-accent-magenta border-accent-magenta/40",
    accent: "text-accent-magenta",
    gradient: "from-accent-magenta/20 via-transparent to-transparent",
  },
  cyan: {
    ring: "ring-accent-cyan/40",
    ringHover: "hover:ring-accent-cyan/80",
    glow: "hover:shadow-[0_20px_60px_rgba(34,211,238,0.30),0_0_0_1px_rgba(34,211,238,0.45)]",
    chip: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/40",
    accent: "text-accent-cyan",
    gradient: "from-accent-cyan/20 via-transparent to-transparent",
  },
  violet: {
    ring: "ring-accent-violet/50",
    ringHover: "hover:ring-accent-violet/90",
    glow: "hover:shadow-[0_20px_60px_rgba(107,92,165,0.40),0_0_0_1px_rgba(107,92,165,0.55)]",
    chip: "bg-accent-violet/15 text-[#B8A6FF] border-accent-violet/40",
    accent: "text-[#B8A6FF]",
    gradient: "from-accent-violet/20 via-transparent to-transparent",
  },
} as const;

// -------- Page -----------------------------------------------------------

export default function JeopardyHubPage() {
  const ready = GAMES.filter((g) => g.status === "ready");
  const coming = GAMES.filter((g) => g.status === "coming-soon");

  return (
    <div className="relative min-h-screen bg-black text-white">
      <SpaceBackdrop />

      <ToolHeader collectionId="lab-leader" activeToolId="jeopardy-day1" />

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-6 sm:px-8">
        {/* Hero */}
        <header className="mb-10">
          <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/60">
            <Link
              href="/toolkit"
              className="hover:text-white focus:outline-none focus-visible:text-white"
            >
              Lab Leader Toolkit
            </Link>
            <span aria-hidden>›</span>
            <span className="text-white/80">Jeopardy Games</span>
          </div>

          <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
            JEOPARDY <span className="text-accent-magenta">GAMES</span>
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-white/70">
            One-click review games for the lab. Project on the board, split
            the room into teams, run the clock. Every game opens in a new tab
            so this hub stays open for the next one.
          </p>
        </header>

        {/* Ready-to-project grid */}
        {ready.length > 0 && (
          <section aria-labelledby="ready-heading" className="mb-14">
            <h2
              id="ready-heading"
              className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-white/50"
            >
              Ready to Project
            </h2>

            <ul
              className="grid grid-cols-1 gap-5 md:grid-cols-2"
              role="list"
            >
              {ready.map((game) => (
                <li key={game.id}>
                  <GameTile game={game} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Coming soon (only rendered when non-empty) */}
        {coming.length > 0 && (
          <section aria-labelledby="coming-heading" className="mb-14">
            <h2
              id="coming-heading"
              className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-white/50"
            >
              Coming Soon
            </h2>

            <ul
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              role="list"
            >
              {coming.map((game) => (
                <li key={game.id}>
                  <ComingSoonTile game={game} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Usage notes */}
        <section
          aria-labelledby="how-to-heading"
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
        >
          <h2
            id="how-to-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/70"
          >
            How to Run It
          </h2>

          <ol className="space-y-3 text-white/80 [counter-reset:step]">
            {[
              "Click a game tile. It opens in a new tab, full screen.",
              "Split the room into 2–4 teams. Give each team a whiteboard or paper for answers.",
              "Click a tile on the board. Read the clue. First team to buzz (or hand up) gets first crack.",
              "Use the coach panel (top-right of the game) to reveal answers and track scores.",
              "When the board is empty, close the tab. You're back here for the next game.",
            ].map((line, i) => (
              <li
                key={i}
                className="relative pl-10 leading-relaxed [counter-increment:step] before:absolute before:left-0 before:top-0 before:flex before:h-7 before:w-7 before:items-center before:justify-center before:rounded-full before:border before:border-accent-magenta/40 before:bg-accent-magenta/10 before:text-sm before:font-bold before:text-accent-magenta before:content-[counter(step)]"
              >
                {line}
              </li>
            ))}
          </ol>

          <p className="mt-6 border-t border-white/10 pt-4 text-sm text-white/50">
            Projecting from a Chromebook cart? Full-screen the tab (F11 or ⌘+
            Shift+F). The game is designed for 16:9 projectors and scales down
            to laptop screens.
          </p>
        </section>
      </main>
    </div>
  );
}

// -------- Tiles ----------------------------------------------------------

function GameTile({ game }: { game: Game }) {
  const t = TONE[game.tone];

  return (
    <Link
      href={game.href}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "group relative block overflow-hidden rounded-3xl bg-neutral-950/60",
        "ring-1 ring-inset transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
        t.ring,
        t.ringHover,
        t.glow,
      ].join(" ")}
      aria-label={`Open ${game.title} — ${game.covers} — in a new tab`}
    >
      {/* Ambient gradient wash */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.gradient} opacity-70`}
      />

      <div className="relative flex min-h-[220px] flex-col justify-between gap-6 p-7 sm:min-h-[260px] sm:p-8">
        {/* Top row: covers + status */}
        <div className="flex items-start justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${t.chip}`}
          >
            {game.covers}
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50"
            aria-hidden
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Ready
          </span>
        </div>

        {/* Title block */}
        <div>
          <div className={`text-4xl font-black tracking-tight sm:text-5xl`}>
            {game.title}
          </div>
          <div className="mt-1 text-lg text-white/70">{game.subtitle}</div>
        </div>

        {/* Footer meta + CTA */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.15em] text-white/50">
            {game.categoryCount} categories · {game.clueCount} clues
          </div>
          <div
            className={`inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] ${t.accent} transition-transform group-hover:translate-x-1`}
          >
            Project
            <span aria-hidden>›</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ComingSoonTile({ game }: { game: Game }) {
  return (
    <div
      className="relative flex min-h-[160px] flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6"
      aria-disabled
    >
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">
        {game.covers}
      </span>
      <div>
        <div className="text-2xl font-black tracking-tight text-white/70">
          {game.title}
        </div>
        <div className="mt-1 text-sm text-white/40">{game.subtitle}</div>
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
        Coming Soon
      </div>
    </div>
  );
}
