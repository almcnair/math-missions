"use client";

// ============================================================================
// MISSION PLAYER
// ----------------------------------------------------------------------------
// One component renders ANY mission JSON. Dispatches slide rendering to the
// right slide-type component, owns shared state (credits/shields/streak),
// renders the HUD + progress rail + nav.
// ============================================================================

import { useEffect, useReducer, useRef, useState } from "react";
import type { Mission, Slide } from "@/lib/mission-schema";
import { SpaceBackdrop } from "@/components/Starfield";
import {
  HookSlideView, DefineSlideView, ConceptSlideView, StrategySlideView, CompleteSlideView,
  type CompleteDynamics,
} from "./slides/ContentSlides";
import {
  McqSlideView, MultiSlideView, SortSlideView, OrderSlideView, MatchSlideView,
  FillSlideView, LabelSlideView, HighlightSlideView,
  type HintState,
} from "./slides/CfuSlides";
import { SimulationSlideView } from "./slides/SimulationSlides";
import {
  initState, reducer, canAdvance, accuracy, isCfuType,
  type CfuOutcome,
} from "./state";
import { logCfuAttempt, completeMission } from "@/app/play/[id]/actions";
import { saveMissionRun, deleteMissionRun, type SavedRun } from "@/app/play/[id]/run-actions";
import { rankFor } from "@/lib/xp";
import { trackEvent } from "@/lib/analytics";

export function MissionPlayer({
  mission,
  savedRun,
  onExit,
}: {
  mission: Mission;
  savedRun?: SavedRun | null;
  onExit?: () => void;
}) {
  const [state, dispatch] = useReducer(reducer, mission, (m) => initState(m));

  // ---- Resume prompt gate -------------------------------------------------
  // If the server loaded a saved run (student has mid-mission progress),
  // we show a Resume? modal before any slide renders. "Resume" hydrates
  // state from the snapshot; "Start Over" deletes the saved row and plays
  // from slide 1. Unauthenticated / fresh runs skip this gate entirely.
  const hasResumableRun = !!savedRun && savedRun.currentIndex > 0;
  const [resumeDecided, setResumeDecided] = useState(!hasResumableRun);

  function doResume() {
    if (savedRun) {
      dispatch({
        kind: "hydrate",
        snapshot: {
          currentIndex: savedRun.currentIndex,
          credits:      savedRun.credits,
          shields:      savedRun.shields,
          streak:       savedRun.streak,
          cfuOutcomes:  savedRun.cfuOutcomes,
          hintsUsed:    savedRun.hintsUsed,
        },
      });
      // Restore the CFU-order tracking so completeMission's streak math is
      // correct when the student finishes the resumed run.
      cfuOrderRef.current = [...(savedRun.cfuOrder ?? [])];
    }
    setResumeDecided(true);
  }

  function doStartOver() {
    if (savedRun) void deleteMissionRun(mission.id);
    setResumeDecided(true);
  }
  const slide = mission.slides[state.currentIndex];
  const advanceOk = canAdvance(state, slide);

  // ---- Leave-mission confirmation ---------------------------------------
  // HOME button doesn't fire onExit directly; it opens a modal so a debater
  // can't accidentally nuke their attempt with one misclick. Bypass the modal
  // on the complete slide — there's nothing left to lose.
  const [confirmLeave, setConfirmLeave] = useState(false);
  function requestExit() {
    if (slide.type === "complete") {
      onExit?.();
      return;
    }
    setConfirmLeave(true);
  }

  // ---- XP submission ------------------------------------------------------
  // Ordered CFU log lets the server compute streak/perfect bonuses correctly.
  const cfuOrderRef = useRef<{ cfuId: string; cfuType: string }[]>([]);
  const completionFiredRef = useRef(false);
  const [completeXp, setCompleteXp] = useState<CompleteDynamics["xp"]>(undefined);
  const [saveError, setSaveError] = useState<string | undefined>(undefined);

  // ---- Mid-mission auto-save (debounced) ---------------------------------
  // Every state change schedules a save ~1.5s later. If another change comes
  // in during that window, the previous save is cancelled and the clock
  // restarts. Prevents thrashing on rapid CFU interactions. Fire-and-forget;
  // the server action no-ops gracefully for unauthenticated callers (demo
  // path) and for the pre-migration period when mission_runs doesn't exist.
  useEffect(() => {
    if (!resumeDecided) return;
    if (slide.type === "complete") return;
    const timer = setTimeout(() => {
      void saveMissionRun({
        missionId: mission.id,
        run: {
          currentIndex: state.currentIndex,
          credits:      state.credits,
          shields:      state.shields,
          streak:       state.streak,
          cfuOutcomes:  state.cfuOutcomes,
          hintsUsed:    state.hintsUsed,
          cfuOrder:     cfuOrderRef.current,
        },
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    resumeDecided,
    slide.type,
    mission.id,
    state.currentIndex,
    state.credits,
    state.shields,
    state.streak,
    state.cfuOutcomes,
    state.hintsUsed,
  ]);

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement | null)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) return;
      if (e.key === "ArrowRight" && advanceOk && slide.type !== "complete") dispatch({ kind: "next" });
      if (e.key === "ArrowLeft"  && state.currentIndex > 0)                  dispatch({ kind: "prev" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advanceOk, state.currentIndex, slide.type]);

  // When entering the complete slide for the first time, finalize XP server-side.
  useEffect(() => {
    if (slide.type !== "complete" || completionFiredRef.current) return;
    completionFiredRef.current = true;

    const cfuEntries = cfuOrderRef.current.map((meta, i) => {
      const o = state.cfuOutcomes[meta.cfuId];
      return {
        cfuId: meta.cfuId,
        correct: o?.correct ?? false,
        partialScore: o?.partialScore,
        creditsAwarded: o?.creditsEarned ?? 0,
        order: i + 1,
      };
    });

    // Analytics: game_completed fires once per mission run at the moment
    // the completion slide is reached (whether XP save succeeds or not).
    // Includes basic accuracy so we can see completion quality trends.
    const correctCount = cfuEntries.filter((e) => e.correct).length;
    trackEvent("game_completed", {
      missionId: mission.id,
      cfuCount: cfuEntries.length,
      correctCount,
    });

    completeMission({
      mission,
      runSummary: { missionId: mission.id, cfuEntries },
    })
      .then((res) => {
        if (!res.ok || !res.breakdown || !res.profileAfter) {
          setSaveError(res.error ?? "unknown error");
          return;
        }
        const rank = rankFor(res.profileAfter.rank_xp);
        const previousRankXp = res.profileAfter.rank_xp - res.breakdown.rankXp;
        setCompleteXp({
          baseCredits: res.breakdown.baseCredits,
          streakBonus: res.breakdown.streakBonus,
          perfectBonus: res.breakdown.perfectBonus,
          totalCredits: res.breakdown.totalCredits,
          rankXp: res.breakdown.rankXp,
          perfectRun: res.breakdown.perfectRun,
          newBest: res.newBest ?? false,
          profileTotalCredits: res.profileAfter.credits,
          profileRankXp: res.profileAfter.rank_xp,
          previousRankXp,
          rankName: rank.name,
        });
        // Mission is done — clear the in-progress save so re-opening the
        // mission starts fresh (replay path) rather than resuming the
        // just-finished run. Best-score bookkeeping lives in
        // mission_progress, which completeMission already wrote.
        void deleteMissionRun(mission.id);
      })
      .catch((err: unknown) => setSaveError(err instanceof Error ? err.message : String(err)));
  }, [slide.type, mission, state.cfuOutcomes]);

  function handleCfuResult(slideId: string) {
    return (outcome: CfuOutcome) => {
      dispatch({ kind: "submit-cfu", slideId, outcome });
      // Track the order CFUs were answered (for server-side streak math).
      const already = cfuOrderRef.current.find((c) => c.cfuId === slideId);
      if (!already) cfuOrderRef.current.push({ cfuId: slideId, cfuType: slide.type });
      // Fire-and-forget log of the attempt.
      void logCfuAttempt({
        missionId: mission.id,
        cfuId: slideId,
        cfuType: slide.type,
        isCorrect: outcome.correct,
        partialScore: outcome.partialScore,
        creditsEarned: outcome.creditsEarned,
        attemptNumber: 1, // v1: each CFU only answered once per run
      });
    };
  }

  // Resume prompt gates the whole player — if the student has a saved run
  // and hasn't decided yet, we render only the modal (over the starfield) so
  // nothing from slide 0 flashes behind it.
  if (!resumeDecided && savedRun) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <SpaceBackdrop />
        <ResumePromptModal
          savedIndex={savedRun.currentIndex}
          totalSlides={mission.slides.length}
          lastSavedAt={savedRun.lastSavedAt}
          onResume={doResume}
          onStartOver={doStartOver}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <SpaceBackdrop />

      <div className="relative z-10 flex flex-col min-h-screen">
        <MissionHud
          mission={mission}
          credits={state.credits}
          streak={state.streak}
          shields={state.shields}
          onHome={requestExit}
        />
        <ProgressRail mission={mission} index={state.currentIndex} />

        <main className="flex-1 px-4 sm:px-8 py-10 max-w-7xl w-full mx-auto">
          <SlideRenderer
            slide={slide}
            outcome={state.cfuOutcomes[slide.id]}
            onCfuResult={handleCfuResult(slide.id)}
            hintState={
              isCfuType(slide.type) && "hint" in slide && slide.hint
                ? {
                    hint: slide.hint,
                    used: !!state.hintsUsed[slide.id],
                    onUse: () => dispatch({ kind: "use-hint", slideId: slide.id }),
                  }
                : undefined
            }
            completeDynamics={{
              credits: state.credits,
              accuracy: accuracy(state),
              unlockedNext: mission.unlocks[0],
              rankDelta: `+${mission.rewards.rankXp}`,
              xp: completeXp,
              saveError,
            }}
            onPrimary={() => onExit?.()}
            onSecondary={() => onExit?.()}
          />
        </main>

        {slide.type !== "complete" && (
          <SlideNav
            index={state.currentIndex}
            total={mission.slides.length}
            canAdvance={advanceOk}
            isCfu={isCfuType(slide.type)}
            answered={!!state.cfuOutcomes[slide.id]}
            onBack={() => dispatch({ kind: "prev" })}
            onNext={() => dispatch({ kind: "next" })}
          />
        )}
      </div>

      {confirmLeave && (
        <LeaveMissionModal
          onStay={() => setConfirmLeave(false)}
          onLeave={() => {
            setConfirmLeave(false);
            onExit?.();
          }}
        />
      )}

    </div>
  );
}

// ---------- Leave-mission confirmation modal ---------------------------------

function LeaveMissionModal({
  onStay,
  onLeave,
}: {
  onStay: () => void;
  onLeave: () => void;
}) {
  // ESC and backdrop click both = Stay (the safe default).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onStay();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStay]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-mission-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-sm"
      onClick={onStay}
    >
      <div
        className="w-full max-w-md bg-bg-panel-solid border border-border-strong rounded-xl p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-xs tracking-[0.18em] text-accent-amber mb-2">▲ HEADS UP</div>
        <h2
          id="leave-mission-title"
          className="font-display font-bold text-xl tracking-wide uppercase text-text-bright mb-3"
        >
          Leave this mission?
        </h2>
        <p className="text-text-bright text-base leading-relaxed mb-6">
          Don&apos;t worry — we&apos;ll save your spot. When you come back,
          you&apos;ll pick up right where you left off.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onLeave}
            className="px-5 py-2 font-mono text-xs tracking-[0.15em] uppercase text-text-dim border border-border-strong rounded hover:text-text-bright hover:border-text-dim transition-colors"
          >
            Leave mission
          </button>
          <button
            onClick={onStay}
            autoFocus
            className="px-5 py-2 font-mono text-xs tracking-[0.15em] uppercase font-bold bg-accent-cyan text-bg-deep rounded hover:bg-accent-cyan-soft"
          >
            Stay & finish ▸
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Resume prompt modal ---------------------------------------------
// Shown on mission entry when the server loaded a saved run with
// currentIndex > 0. Pressing Resume hydrates state from the snapshot;
// Start Over deletes the saved row and begins from slide 1.

function ResumePromptModal({
  savedIndex,
  totalSlides,
  lastSavedAt,
  onResume,
  onStartOver,
}: {
  savedIndex: number;
  totalSlides: number;
  lastSavedAt: string;
  onResume: () => void;
  onStartOver: () => void;
}) {
  // ESC = Resume (the safe default — don't nuke progress on an errant key).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onResume();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResume]);

  const whenLabel = (() => {
    if (!lastSavedAt) return "earlier";
    const d = new Date(lastSavedAt);
    if (Number.isNaN(d.getTime())) return "earlier";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-mission-title"
      className="relative z-10 w-full max-w-md mx-4 bg-bg-panel-solid border border-accent-cyan/60 rounded-xl p-7 shadow-2xl"
    >
      <div className="font-mono text-xs tracking-[0.18em] text-accent-cyan mb-2">⟲ WELCOME BACK</div>
      <h2
        id="resume-mission-title"
        className="font-display font-bold text-xl tracking-wide uppercase text-text-bright mb-3"
      >
        Pick up where you left off?
      </h2>
      <p className="text-text-bright text-base leading-relaxed mb-2">
        You were on <strong className="font-bold">slide {savedIndex + 1} of {totalSlides}</strong>.
      </p>
      <p className="text-text-dim text-sm mb-6">
        Last saved {whenLabel}.
      </p>
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={onStartOver}
          className="px-5 py-2 font-mono text-xs tracking-[0.15em] uppercase text-text-dim border border-border-strong rounded hover:text-text-bright hover:border-text-dim transition-colors"
        >
          Start over
        </button>
        <button
          onClick={onResume}
          autoFocus
          className="px-5 py-2 font-mono text-xs tracking-[0.15em] uppercase font-bold bg-accent-cyan text-bg-deep rounded hover:bg-accent-cyan-soft"
        >
          Resume ▸
        </button>
      </div>
    </div>
  );
}

// ---------- HUD --------------------------------------------------------------

function MissionHud({
  mission, credits, streak, shields, onHome,
}: {
  mission: Mission; credits: number; streak: number; shields: number; onHome?: () => void;
}) {
  // Top nav simplified 2026-06-26:
  //   - ABORT (red, ambiguous, fired sign-out feel) → HOME (cyan, navigational).
  //   - Dropped the eyebrow stack (MISSION 02 · ORIENTATION · CHECKPOINT).
  //   - Title now reads "Mission N: <Title>" on a single line with ellipsis.
  //   - HOME opens a confirm modal upstream; it doesn't fire onExit directly.
  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center gap-6 px-4 sm:px-8 py-4 border-b border-border-faint backdrop-blur-sm bg-bg-deep/60">
      <button
        onClick={onHome}
        className="font-mono text-xs tracking-[0.18em] text-accent-cyan/80 hover:text-accent-cyan border border-accent-cyan/30 hover:border-accent-cyan/60 rounded px-3 py-1.5 flex items-center gap-2 transition-colors"
      >
        ◀ HOME
      </button>
      <div className="text-center min-w-0">
        <div className="font-display font-bold text-xl tracking-wide truncate">
          {`MISSION ${mission.number}: ${mission.title}`.toUpperCase()}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <StatPill icon="🔥" value={streak.toString()} label="STREAK" />
        <StatPill icon="◈" value={`+${credits}`} label="CRD" tone="amber" />
        <ShieldsPill shields={shields} />
      </div>
    </header>
  );
}

function StatPill({ icon, value, label, tone = "cyan" }: {
  icon: string; value: string; label: string; tone?: "cyan" | "amber";
}) {
  const accent = tone === "cyan" ? "text-accent-cyan" : "text-accent-amber";
  return (
    <div className="flex items-center gap-2 border border-border-faint rounded-md px-3 py-1.5">
      <span className="text-base">{icon}</span>
      <span className={`font-display font-bold ${accent}`}>{value}</span>
      <span className="font-mono text-xs tracking-[0.15em] text-text-dim">{label}</span>
    </div>
  );
}

function ShieldsPill({ shields }: { shields: number }) {
  return (
    <div className="flex items-center gap-2 border border-border-faint rounded-md px-3 py-1.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`text-sm ${i < shields ? "text-accent-cyan" : "text-text-faint opacity-30"}`}>▲</span>
      ))}
      <span className="font-mono text-xs tracking-[0.15em] text-text-dim">SHIELDS</span>
    </div>
  );
}

// ---------- Progress rail ----------------------------------------------------

function ProgressRail({ mission, index }: { mission: Mission; index: number }) {
  const pct = (index / Math.max(1, mission.slides.length - 1)) * 100;
  return (
    <div className="relative px-8 py-3 border-b border-border-faint/50">
      <div className="relative h-1 bg-bg-panel-solid rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-cyan to-accent-amber transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {mission.slides.map((s, i) => (
          <div
            key={s.id}
            className={`w-1.5 h-1.5 rounded-full ${
              i < index ? "bg-accent-cyan" :
              i === index ? "bg-accent-amber ring-2 ring-accent-amber/40" :
              isCfuType(s.type) ? "bg-accent-amber/40" :
              "bg-text-faint/30"
            }`}
            title={s.type}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- Nav --------------------------------------------------------------

function SlideNav({
  index, total, canAdvance, isCfu, answered, onBack, onNext,
}: {
  index: number; total: number; canAdvance: boolean; isCfu: boolean; answered: boolean;
  onBack: () => void; onNext: () => void;
}) {
  const isLastInteractive = index === total - 2;
  const nextLabel = !canAdvance && isCfu && !answered ? "ANSWER FIRST"
    : isLastInteractive ? "COMPLETE MISSION ▶"
    : "CONTINUE ▶";
  return (
    <footer className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-8 py-4 border-t border-border-faint bg-bg-deep/60 backdrop-blur-sm">
      <div>
        <button
          onClick={onBack}
          disabled={index === 0}
          className="font-mono text-xs tracking-[0.18em] text-text-dim hover:text-accent-cyan disabled:opacity-30"
        >
          ◀ PREVIOUS
        </button>
      </div>
      <div className="font-mono text-sm tracking-[0.18em] text-text-bright/70">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>
      <div className="text-right">
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className="px-6 py-2 bg-accent-cyan text-bg-deep font-mono text-xs tracking-[0.18em] font-bold disabled:opacity-30 disabled:bg-text-faint hover:bg-accent-cyan-soft"
        >
          {nextLabel}
        </button>
      </div>
    </footer>
  );
}

// ---------- Slide dispatcher -------------------------------------------------

function SlideRenderer({
  slide, outcome, onCfuResult, hintState, completeDynamics, onPrimary, onSecondary,
}: {
  slide: Slide;
  outcome?: CfuOutcome;
  onCfuResult: (o: CfuOutcome) => void;
  hintState?: HintState;
  completeDynamics: CompleteDynamics;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  switch (slide.type) {
    case "hook":      return <HookSlideView slide={slide} />;
    case "define":    return <DefineSlideView slide={slide} />;
    case "concept":   return <ConceptSlideView slide={slide} />;
    case "strategy":  return <StrategySlideView slide={slide} />;
    case "cfu-mcq":       return <McqSlideView       slide={slide} outcome={outcome} onResult={onCfuResult} hintState={hintState} />;
    case "cfu-multi":     return <MultiSlideView     slide={slide} outcome={outcome} onResult={onCfuResult} hintState={hintState} />;
    case "cfu-sort":      return <SortSlideView      slide={slide} outcome={outcome} onResult={onCfuResult} hintState={hintState} />;
    case "cfu-order":     return <OrderSlideView     slide={slide} outcome={outcome} onResult={onCfuResult} hintState={hintState} />;
    case "cfu-match":     return <MatchSlideView     slide={slide} outcome={outcome} onResult={onCfuResult} hintState={hintState} />;
    case "cfu-fill":      return <FillSlideView      slide={slide} outcome={outcome} onResult={onCfuResult} hintState={hintState} />;
    case "cfu-label":     return <LabelSlideView     slide={slide} outcome={outcome} onResult={onCfuResult} hintState={hintState} />;
    case "cfu-highlight": return <HighlightSlideView slide={slide} outcome={outcome} onResult={onCfuResult} hintState={hintState} />;
    case "cfu-simulation": return <SimulationSlideView slide={slide} outcome={outcome} onResult={onCfuResult} />;
    case "complete":
      return (
        <CompleteSlideView
          slide={slide}
          dynamics={completeDynamics}
          onPrimary={onPrimary}
          onSecondary={onSecondary}
        />
      );
  }
}
