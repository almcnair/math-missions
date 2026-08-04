// ============================================================================
// MISSION PLAYER — shared state, reducers, helpers
// ----------------------------------------------------------------------------
// Single source of truth for what's happening inside the mission:
//   - which slide is active
//   - which CFUs have been answered, and how
//   - credits earned, shields remaining, streak
//
// CFU slide components dispatch results here via `submitCfu`; the player
// reads progress + gates "Continue" until each CFU is answered.
// ============================================================================

import type { Mission, Slide, SlideType, CfuScoring } from "@/lib/mission-schema";

export type CfuOutcome = {
  correct: boolean;
  partialScore?: number;       // 0–1 when scoring.mode === "partial"
  creditsEarned: number;
  shieldLost: boolean;
  streakBroken: boolean;
};

export type MissionState = {
  missionId: string;
  currentIndex: number;
  totalSlides: number;
  credits: number;             // gained in THIS mission only
  shields: number;             // 0–3, resets to 3 at mission start
  streak: number;              // carries across missions in real app; mocked here
  cfuOutcomes: Record<string, CfuOutcome>;   // keyed by slide.id
  /**
   * Tracks which CFU slides the student requested a hint on.
   * Used by the player to (a) render the post-reveal state and (b) prevent
   * a correct answer from awarding streak when help was used. Streak is
   * broken immediately on hint request — see the `use-hint` action.
   */
  hintsUsed: Record<string, true>;
  startTime: number;
};

export function initState(mission: Mission, startingStreak = 0): MissionState {
  return {
    missionId: mission.id,
    currentIndex: 0,
    totalSlides: mission.slides.length,
    credits: 0,
    shields: 3,
    streak: startingStreak,
    cfuOutcomes: {},
    hintsUsed: {},
    startTime: Date.now(),
  };
}

export type MissionAction =
  | { kind: "next" }
  | { kind: "prev" }
  | { kind: "goto"; index: number }
  | { kind: "submit-cfu"; slideId: string; outcome: CfuOutcome }
  | { kind: "use-hint"; slideId: string };

export function reducer(state: MissionState, action: MissionAction): MissionState {
  switch (action.kind) {
    case "next":
      return { ...state, currentIndex: Math.min(state.currentIndex + 1, state.totalSlides - 1) };
    case "prev":
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };
    case "goto":
      return { ...state, currentIndex: Math.max(0, Math.min(action.index, state.totalSlides - 1)) };
    case "submit-cfu": {
      // Don't re-score the same CFU.
      if (state.cfuOutcomes[action.slideId]) return state;
      const { outcome } = action;
      const usedHint = !!state.hintsUsed[action.slideId];
      // If a hint was used on this CFU, a correct answer must NOT award
      // streak progress. The streak was already broken at hint request time;
      // we just block the increment side here.
      const newStreak = outcome.streakBroken
        ? 0
        : outcome.correct && !usedHint
          ? state.streak + 1
          : state.streak;
      return {
        ...state,
        cfuOutcomes: { ...state.cfuOutcomes, [action.slideId]: outcome },
        credits: state.credits + outcome.creditsEarned,
        shields: outcome.shieldLost ? Math.max(0, state.shields - 1) : state.shields,
        streak: newStreak,
      };
    }
    case "use-hint": {
      // Idempotent: a CFU can only "spend" a hint once. Recording it both
      // marks the slide as having consumed help (used by submit-cfu to gate
      // streak credit) and breaks the active streak immediately.
      if (state.hintsUsed[action.slideId]) return state;
      return {
        ...state,
        hintsUsed: { ...state.hintsUsed, [action.slideId]: true },
        streak: 0,
      };
    }
  }
}

// ---------- Scoring helper ---------------------------------------------------
// Maps a (correct?, partialFraction?, scoring config) triple into a CfuOutcome.

export function scoreCfu(args: {
  scoring: CfuScoring;
  /** True when the answer was perfect — single MCQ correct, all sort cards right, etc. */
  fullyCorrect: boolean;
  /** 0–1; only used when scoring.mode === "partial". 1 = perfect, 0 = nothing right. */
  fraction?: number;
}): CfuOutcome {
  const { scoring, fullyCorrect, fraction } = args;
  const mode = scoring.mode ?? "all-or-nothing";
  if (mode === "all-or-nothing") {
    return {
      correct: fullyCorrect,
      creditsEarned: fullyCorrect ? scoring.creditsOnCorrect : 0,
      shieldLost: !fullyCorrect && scoring.shieldOnWrong,
      streakBroken: !fullyCorrect && scoring.breaksStreakOnWrong,
    };
  }
  // partial
  const f = Math.max(0, Math.min(1, fraction ?? (fullyCorrect ? 1 : 0)));
  const isPerfect = f >= 0.999;
  return {
    correct: isPerfect,
    partialScore: f,
    creditsEarned: Math.round(scoring.creditsOnCorrect * f),
    shieldLost: !isPerfect && scoring.shieldOnWrong,
    streakBroken: !isPerfect && scoring.breaksStreakOnWrong,
  };
}

// ---------- Helpers ----------------------------------------------------------

const CFU_TYPES: SlideType[] = [
  "cfu-mcq",
  "cfu-multi",
  "cfu-sort",
  "cfu-order",
  "cfu-match",
  "cfu-fill",
  "cfu-label",
  "cfu-highlight",
];

export function isCfuType(t: SlideType): boolean {
  return CFU_TYPES.includes(t);
}

export function canAdvance(state: MissionState, slide: Slide): boolean {
  // Content + complete slides: always allowed.
  // CFU slides: only allowed once answered.
  if (!isCfuType(slide.type)) return true;
  return !!state.cfuOutcomes[slide.id];
}

export function accuracy(state: MissionState): number {
  const outcomes = Object.values(state.cfuOutcomes);
  if (outcomes.length === 0) return 1;
  // Use partial scores when available, else binary correctness.
  const sum = outcomes.reduce((acc, o) => acc + (o.partialScore ?? (o.correct ? 1 : 0)), 0);
  return sum / outcomes.length;
}
