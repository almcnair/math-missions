// /resources/study-aids — Slide Decks & Graphic Organizers
//
// One page, nine lessons. Pick a lesson on the left; the right pane shows the
// slide deck inline (PDF viewer) plus a download button for that lesson's
// graphic organizer. Lessons without files yet render "Coming soon" states.
//
// Content is data-driven from lessons.ts. Files live under
//   /public/study-aids/decks/lesson-<id>-deck.pdf
//   /public/study-aids/organizers/lesson-<id>-organizer.pdf
//
// Design: matches the other /resources tool pages — SpaceBackdrop +
// ToolHeader + site color tokens. Client component because lesson selection
// and mobile disclosure are interactive.

"use client";

import { useMemo, useState } from "react";
import { trackEvent, trackEventOnce } from "@/lib/analytics";
import { SpaceBackdrop } from "@/components/Starfield";
import ToolHeader from "@/components/toolkit/ToolHeader";
import { LESSONS, type Lesson } from "./lessons";

export default function StudyAidsPage() {
  // Default to the first lesson that actually has a deck; fall back to first.
  const initialId = useMemo(() => {
    const withDeck = LESSONS.find((l) => l.deck);
    return (withDeck ?? LESSONS[0]).id;
  }, []);

  const [activeId, setActiveId] = useState<string>(initialId);
  const active =
    LESSONS.find((l) => l.id === activeId) ?? LESSONS[0];

  return (
    <div className="relative min-h-screen bg-bg-base text-text-bright">
      <SpaceBackdrop />

      <ToolHeader
        collectionId="debater"
        activeToolId="study-aids"
        maxWidth="max-w-6xl"
      />

      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {/* Page intro */}
        <div className="mb-6">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-text-faint">
            Debater Resources
          </p>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-bold tracking-[0.06em] text-accent-cyan">
            LESSON SLIDE DECKS &amp; GRAPHIC ORGANIZERS
          </h1>
          <p className="mt-2 text-sm text-text-dim max-w-3xl">
            Review the slides from class and grab the worksheet for each
            lesson. Slide decks open in the viewer below; graphic organizers
            download as PDFs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
          {/* Lesson list */}
          <nav aria-label="Lesson list" className="md:sticky md:top-6 md:self-start">
            <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-text-faint mb-2 px-1">
              Lessons
            </div>
            <ul className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
              {LESSONS.map((lesson) => (
                <li key={lesson.id} className="shrink-0">
                  <LessonButton
                    lesson={lesson}
                    active={lesson.id === activeId}
                    onClick={() => {
                      setActiveId(lesson.id);
                      // Session-scoped dedupe: opening the same lesson
                      // repeatedly in one visit only fires one event.
                      trackEventOnce(
                        `lesson_opened:${lesson.id}`,
                        "lesson_opened",
                        { lessonId: lesson.id, hasDeck: Boolean(lesson.deck), hasOrganizer: Boolean(lesson.organizer) },
                      );
                    }}
                  />
                </li>
              ))}
            </ul>
          </nav>

          {/* Detail pane */}
          <section
            key={active.id}
            aria-live="polite"
            className="rounded-xl border border-border-mid bg-bg-panel-solid/40 backdrop-blur-sm p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-text-faint">
                  Lesson {active.number}
                </p>
                <h2 className="mt-0.5 font-display text-xl font-bold tracking-[0.05em] text-text-bright">
                  {active.title}
                </h2>
              </div>

              <OrganizerButton lesson={active} />
            </div>

            <DeckViewer lesson={active} />
          </section>
        </div>
      </main>
    </div>
  );
}

// -------- Lesson list button --------------------------------------------

function LessonButton({
  lesson,
  active,
  onClick,
}: {
  lesson: Lesson;
  active: boolean;
  onClick: () => void;
}) {
  const hasContent = Boolean(lesson.deck || lesson.organizer);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={[
        "w-full md:w-full text-left rounded-lg border px-3 py-2.5 transition-colors",
        active
          ? "border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan"
          : "border-border-faint bg-bg-panel-solid/30 text-text-bright hover:border-border-mid hover:bg-bg-panel-solid/50",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-ui font-semibold text-sm tracking-[0.03em] whitespace-nowrap">
          Lesson {lesson.number}
        </span>
        {!hasContent && (
          <span className="font-mono text-[8px] tracking-[0.24em] uppercase text-text-faint">
            Soon
          </span>
        )}
      </div>
      <div
        className={[
          "mt-1 text-[12.5px] leading-snug",
          active ? "text-accent-cyan-soft" : "text-text-dim",
        ].join(" ")}
      >
        {lesson.title}
      </div>
    </button>
  );
}

// -------- Slide deck viewer ---------------------------------------------

function DeckViewer({ lesson }: { lesson: Lesson }) {
  if (!lesson.deck) {
    return (
      <ComingSoonPanel
        label="Slide deck"
        detail="This lesson's slides aren't up yet. Check back once the lesson runs."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-text-faint">
          Slide deck
        </span>
        <div className="flex items-center gap-3">
          <a
            href={lesson.deck}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] tracking-[0.24em] uppercase text-accent-cyan hover:text-accent-cyan-soft transition-colors"
          >
            Open in new tab ↗
          </a>
          <a
            href={lesson.deck}
            download
            onClick={() =>
              trackEvent("deck_downloaded", { lessonId: lesson.id })
            }
            className="font-mono text-[10px] tracking-[0.24em] uppercase text-accent-cyan hover:text-accent-cyan-soft transition-colors"
          >
            Download ↓
          </a>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-border-mid bg-black/30">
        <iframe
          key={lesson.deck}
          src={lesson.deck}
          title={`${lesson.title} slide deck`}
          className="w-full h-[70vh] min-h-[520px] block"
        />
      </div>

      <p className="mt-2 font-mono text-[9px] tracking-[0.24em] uppercase text-text-faint">
        PDF viewer · use full screen or download for the best view on mobile
      </p>
    </div>
  );
}

// -------- Graphic organizer download button ------------------------------

function OrganizerButton({ lesson }: { lesson: Lesson }) {
  if (!lesson.organizer) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-md border border-dashed border-border-faint px-3 py-2 font-mono text-[10px] tracking-[0.24em] uppercase text-text-faint"
        aria-disabled="true"
      >
        Graphic organizer · soon
      </span>
    );
  }
  return (
    <a
      href={lesson.organizer}
      download
      onClick={() =>
        trackEvent("organizer_downloaded", { lessonId: lesson.id })
      }
      className="inline-flex items-center gap-2 rounded-md border border-accent-magenta/50 bg-accent-magenta/10 px-3 py-2 font-mono text-[10px] tracking-[0.24em] uppercase text-accent-magenta hover:bg-accent-magenta/20 transition-colors"
    >
      Download graphic organizer ↓
    </a>
  );
}

// -------- Coming soon panel ---------------------------------------------

function ComingSoonPanel({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border-mid bg-bg-panel-solid/20 p-8 text-center">
      <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-text-faint mb-1">
        {label}
      </div>
      <div className="font-display text-lg font-bold tracking-[0.05em] text-text-bright mb-2">
        Coming soon
      </div>
      <div className="text-sm text-text-dim max-w-md mx-auto">{detail}</div>
    </div>
  );
}
