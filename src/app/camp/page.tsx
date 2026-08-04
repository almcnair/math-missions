// /camp — Mission Control
//
// Daily dashboard for debate camp students. Shows today's schedule, a
// "Right Now" callout that highlights the current block based on system
// time, "Up Next," announcements, and the full day's schedule.
//
// Content lives in src/content/camp/schedule.json (edit-and-commit workflow).
// The page picks today's day out of the JSON by matching the ISO date
// (America/Chicago). If no day matches (weekend, before camp, after camp),
// the page shows a friendly "no camp today" state.
//
// Not linked from the marketing nav — students get the URL directly.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { trackEventOnce } from "@/lib/analytics";
import { SpaceBackdrop } from "@/components/Starfield";
import { DebaterNav } from "@/components/DebaterNav";
import scheduleData from "@/content/camp/schedule.json";

type Block = {
  start: string;
  end: string;
  title: string;
  location: string | null;
  note: string | null;
};

type Day = {
  date: string;
  label: string;
  dayLabel: string;
  blocks: Block[];
};

type Announcement = {
  text: string;
  dateAdded: string;
};

type Schedule = {
  campName: string;
  days: Day[];
  announcements: Announcement[];
};

const schedule = scheduleData as Schedule;

// -------- Time helpers -----------------------------------------------------

// Return today's date in America/Chicago as YYYY-MM-DD.
function todayInChicago(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${d}`;
}

// Return current HH:MM in America/Chicago (24h).
function nowHHMMInChicago(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

// Convert HH:MM -> minutes-from-midnight for easy comparisons.
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Format HH:MM -> "9:30 AM" for display.
function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// Find the current + next block indices given now-in-minutes.
// Returns { currentIndex, nextIndex } where either can be -1.
function findCurrentBlock(
  blocks: Block[],
  nowMinutes: number,
): { currentIndex: number; nextIndex: number } {
  let currentIndex = -1;
  for (let i = 0; i < blocks.length; i++) {
    const startM = toMinutes(blocks[i].start);
    const endM = toMinutes(blocks[i].end);
    if (nowMinutes >= startM && nowMinutes < endM) {
      currentIndex = i;
      break;
    }
  }
  let nextIndex = -1;
  if (currentIndex >= 0) {
    nextIndex = currentIndex + 1 < blocks.length ? currentIndex + 1 : -1;
  } else {
    // Not inside a block — find the next block that starts after now.
    for (let i = 0; i < blocks.length; i++) {
      if (toMinutes(blocks[i].start) > nowMinutes) {
        nextIndex = i;
        break;
      }
    }
  }
  return { currentIndex, nextIndex };
}

// -------- Presentational pieces --------------------------------------------

function Header() {
  return <DebaterNav />;
}

function RightNowCard({ block }: { block: Block }) {
  return (
    <section
      aria-labelledby="right-now-heading"
      className="border-2 border-accent-magenta bg-accent-magenta/5 rounded-lg px-6 py-5 shadow-[0_0_20px_rgba(236,93,158,0.15)]"
    >
      <div
        id="right-now-heading"
        className="font-mono text-[11px] tracking-[0.35em] text-accent-magenta mb-2"
      >
        ▶ RIGHT NOW
      </div>
      <h2 className="font-display text-2xl md:text-3xl font-bold text-text-bright mb-1">
        {block.title}
      </h2>
      <div className="font-mono text-sm text-text-dim">
        {formatTime(block.start)} – {formatTime(block.end)}
        {block.location ? ` · ${block.location}` : ""}
      </div>
      {block.note ? (
        <div className="mt-3 pt-3 border-t border-accent-magenta/30 text-sm text-text-bright">
          {block.note}
        </div>
      ) : null}
    </section>
  );
}

function UpNextCard({ block }: { block: Block }) {
  return (
    <section
      aria-labelledby="up-next-heading"
      className="border border-border-mid rounded-md px-5 py-4"
    >
      <div
        id="up-next-heading"
        className="font-mono text-[10px] tracking-[0.35em] text-accent-cyan mb-1.5"
      >
        UP NEXT
      </div>
      <div className="font-display text-lg font-bold text-text-bright">
        {block.title}
      </div>
      <div className="font-mono text-xs text-text-dim mt-0.5">
        {formatTime(block.start)} – {formatTime(block.end)}
        {block.location ? ` · ${block.location}` : ""}
      </div>
    </section>
  );
}

function DoneForTodayCard() {
  return (
    <section className="border border-accent-cyan/40 bg-bg-panel-solid/50 rounded-lg px-5 py-5 sm:px-6 text-center">
      <div className="font-mono text-[10px] tracking-[0.35em] text-accent-cyan mb-2">
        ▲ DONE FOR TODAY
      </div>
      <div className="text-text-bright break-words">
        No more sessions today. See you tomorrow!
      </div>
    </section>
  );
}

function BeforeCampCard({ firstBlock }: { firstBlock: Block }) {
  return (
    <section className="border border-accent-cyan/40 bg-bg-panel-solid/50 rounded-md px-6 py-5">
      <div className="font-mono text-[10px] tracking-[0.35em] text-accent-cyan mb-2">
        ● STARTING SOON
      </div>
      <div className="font-display text-xl font-bold text-text-bright mb-1">
        First up: {firstBlock.title}
      </div>
      <div className="font-mono text-sm text-text-dim">
        {formatTime(firstBlock.start)}
        {firstBlock.location ? ` · ${firstBlock.location}` : ""}
      </div>
    </section>
  );
}

function Announcements({ items }: { items: Announcement[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="announcements-heading">
      <h3
        id="announcements-heading"
        className="font-mono text-[11px] tracking-[0.35em] text-accent-cyan mb-3"
      >
        📢 ANNOUNCEMENTS
      </h3>
      <ul className="space-y-2">
        {items.map((a, i) => (
          <li
            key={i}
            className="border-l-2 border-accent-cyan/50 pl-3 py-1 text-text-bright"
          >
            {a.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FullSchedule({
  blocks,
  currentIndex,
}: {
  blocks: Block[];
  currentIndex: number;
}) {
  return (
    <section aria-labelledby="full-schedule-heading">
      <h3
        id="full-schedule-heading"
        className="font-mono text-[11px] tracking-[0.35em] text-accent-cyan mb-3"
      >
        📅 FULL SCHEDULE
      </h3>
      <ol className="space-y-1">
        {blocks.map((b, i) => {
          const isCurrent = i === currentIndex;
          return (
            <li
              key={i}
              className={
                (isCurrent
                  ? "rounded border border-accent-magenta/60 bg-accent-magenta/5 "
                  : "") +
                "px-3 py-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"
              }
            >
              <span
                className={
                  "font-mono text-xs shrink-0 w-[70px] " +
                  (isCurrent ? "text-accent-magenta" : "text-text-dim")
                }
              >
                {formatTime(b.start)}
              </span>
              <span
                className={
                  "font-ui flex-1 min-w-0 break-words " +
                  (isCurrent
                    ? "text-text-bright font-semibold"
                    : "text-text-bright")
                }
              >
                {b.title}
                {b.location ? (
                  <span className="text-text-dim text-sm">
                    {" · "}
                    {b.location}
                  </span>
                ) : null}
              </span>
              {isCurrent ? (
                <span className="font-mono text-[10px] tracking-[0.3em] text-accent-magenta shrink-0 basis-full sm:basis-auto">
                  ← NOW
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Days between two YYYY-MM-DD strings (ignoring TZ nuances — close enough
// for a countdown card).
function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

// Find the next upcoming camp day given today's ISO date.
function findUpcomingDay(days: Day[], todayIso: string): Day | null {
  const future = days.filter((d) => d.date > todayIso);
  if (future.length === 0) return null;
  future.sort((a, b) => a.date.localeCompare(b.date));
  return future[0];
}

function NoCampToday({
  upcoming,
  todayIso,
}: {
  upcoming: Day | null;
  todayIso: string;
}) {
  if (!upcoming) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="border border-border-mid rounded-lg px-8 py-10 text-center">
          <div className="font-mono text-[11px] tracking-[0.35em] text-accent-cyan mb-3">
            ● NO CAMP TODAY
          </div>
          <div className="font-display text-2xl font-bold text-text-bright mb-2">
            Enjoy your day off!
          </div>
          <div className="text-text-dim">
            Camp has wrapped. Thanks for a great two weeks!
          </div>
        </div>
      </div>
    );
  }

  const days = daysBetween(todayIso, upcoming.date);
  const countdownLabel =
    days === 0
      ? "TODAY"
      : days === 1
        ? "TOMORROW"
        : `IN ${days} DAYS`;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
      {/* Countdown hero */}
      <section className="border-2 border-accent-cyan bg-accent-cyan/5 rounded-lg px-6 py-6 shadow-[0_0_20px_rgba(34,211,238,0.15)] text-center">
        <div className="font-mono text-[11px] tracking-[0.35em] text-accent-cyan mb-2">
          ● CAMP STARTS {countdownLabel}
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-text-bright mb-1">
          {upcoming.label}
        </h1>
        <div className="font-mono text-xs tracking-[0.3em] text-text-dim">
          {upcoming.dayLabel}
        </div>
      </section>

      {/* Announcements */}
      <Announcements items={schedule.announcements} />

      {/* Preview of the first day's schedule */}
      <section aria-labelledby="preview-heading">
        <h3
          id="preview-heading"
          className="font-mono text-[11px] tracking-[0.35em] text-accent-cyan mb-3"
        >
          📅 FIRST DAY — SCHEDULE PREVIEW
        </h3>
        <ol className="space-y-1">
          {upcoming.blocks.map((b, i) => (
            <li
              key={i}
              className="px-3 py-2 flex flex-wrap items-baseline gap-x-3 gap-y-1"
            >
              <span className="font-mono text-xs shrink-0 w-[70px] text-text-dim">
                {formatTime(b.start)}
              </span>
              <span className="font-ui flex-1 min-w-0 break-words text-text-bright">
                {b.title}
                {b.location ? (
                  <span className="text-text-dim text-sm">
                    {" · "}
                    {b.location}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// -------- Main page --------------------------------------------------------

export default function CampPage() {
  // useSearchParams needs to live inside a Suspense boundary in Next 16.
  return (
    <Suspense fallback={<CampLoading />}>
      <CampPageInner />
    </Suspense>
  );
}

function CampLoading() {
  return (
    <main className="relative min-h-screen bg-bg-deep text-text-bright overflow-x-hidden">
      <SpaceBackdrop />
      <div className="relative z-10">
        <Header />
        <div className="mx-auto max-w-4xl px-6 py-16 text-text-dim text-center">
          Loading Mission Control…
        </div>
      </div>
    </main>
  );
}

function CampPageInner() {
  // Start with null so first render (SSR + first client render) matches, then
  // hydrate with real time. Prevents hydration mismatch on the "now" state.
  const [now, setNow] = useState<Date | null>(null);

  // Optional ?date=YYYY-MM-DD query param lets us preview any camp day.
  // Useful for staff sanity-checks and for students who want to peek ahead.
  const searchParams = useSearchParams();
  const previewDate = searchParams.get("date");
  const isValidPreview =
    previewDate && /^\d{4}-\d{2}-\d{2}$/.test(previewDate);

  useEffect(() => {
    setNow(new Date());
    // One camp_page_view event per browser session (see lib/analytics.ts).
    trackEventOnce("camp_page_view", "camp_page_view", {
      preview: isValidPreview ? previewDate : null,
    });
    // Refresh every minute so the "Right Now" state stays accurate without a
    // full page reload.
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-hydration: render a minimal skeleton so nothing flashes.
  if (!now) {
    return (
      <main className="relative min-h-screen bg-bg-deep text-text-bright overflow-x-hidden">
        <SpaceBackdrop />
        <div className="relative z-10">
          <Header />
          <div className="mx-auto max-w-4xl px-6 py-16 text-text-dim text-center">
            Loading Mission Control…
          </div>
        </div>
      </main>
    );
  }

  const realTodayIso = todayInChicago(now);
  // If a ?date= override is in the URL and it matches a known day, treat that
  // as "today" for rendering. Otherwise use the real Chicago date.
  const todayIso = isValidPreview ? previewDate! : realTodayIso;
  const isPreviewMode = isValidPreview && todayIso !== realTodayIso;
  const nowHHMM = nowHHMMInChicago(now);
  const nowMinutes = toMinutes(nowHHMM);
  const today = schedule.days.find((d) => d.date === todayIso);

  if (!today) {
    const upcoming = findUpcomingDay(schedule.days, realTodayIso);
    return (
      <main className="relative min-h-screen bg-bg-deep text-text-bright overflow-x-hidden">
        <SpaceBackdrop />
        <div className="relative z-10">
          <Header />
          <NoCampToday upcoming={upcoming} todayIso={realTodayIso} />
        </div>
      </main>
    );
  }

  // In preview mode we don't run the time-based state machine — nobody wants
  // to see "DONE FOR TODAY" on a day that hasn't happened yet. Just show the
  // full schedule with nothing highlighted.
  const { currentIndex, nextIndex } = isPreviewMode
    ? { currentIndex: -1, nextIndex: -1 }
    : findCurrentBlock(today.blocks, nowMinutes);
  const currentBlock = currentIndex >= 0 ? today.blocks[currentIndex] : null;
  const nextBlock = nextIndex >= 0 ? today.blocks[nextIndex] : null;
  const firstBlock = today.blocks[0] ?? null;
  const beforeCamp =
    !isPreviewMode && currentIndex === -1 && nextIndex === 0 && firstBlock !== null;
  const afterCamp =
    !isPreviewMode && currentIndex === -1 && nextIndex === -1;

  return (
    <main className="relative min-h-screen bg-bg-deep text-text-bright overflow-x-hidden">
      <SpaceBackdrop />
      <div className="relative z-10">
        <Header />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
        {/* Preview-mode banner — only shows when ?date= overrides real today */}
        {isPreviewMode ? (
          <div className="border border-accent-magenta/60 bg-accent-magenta/10 rounded-md px-4 py-2 font-mono text-[11px] tracking-[0.25em] text-accent-magenta text-center">
            ◉ PREVIEW MODE · SHOWING {todayIso}
          </div>
        ) : null}

        {/* Date */}
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-text-bright">
            {today.label}
          </h1>
          <div className="font-mono text-xs tracking-[0.3em] text-text-dim mt-1">
            {today.dayLabel}
          </div>
        </div>

        {/* Current state */}
        {currentBlock ? <RightNowCard block={currentBlock} /> : null}
        {beforeCamp ? <BeforeCampCard firstBlock={firstBlock!} /> : null}
        {afterCamp ? <DoneForTodayCard /> : null}

        {/* Up next (only when we're mid-day and have another block coming) */}
        {currentBlock && nextBlock ? <UpNextCard block={nextBlock} /> : null}

        {/* Announcements */}
        <Announcements items={schedule.announcements} />

        {/* Full day schedule */}
        <FullSchedule blocks={today.blocks} currentIndex={currentIndex} />
        </div>
      </div>
    </main>
  );
}
