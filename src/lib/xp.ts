// ============================================================================
// XP / credits math
// ----------------------------------------------------------------------------
// Pure functions. No I/O. Easy to test.
//
// Locked rules (Austin, 2026-06-22):
//   - Base credits per CFU = scoring.creditsOnCorrect (partial credit scales).
//     This is already computed during play and accumulated into state.credits.
//   - Streak bonus: +5 credits per CFU correctly answered while running
//     streak >= 3 (the streak BEFORE awarding the bonus must be >= 3).
//   - Perfect-run bonus: +25% of (base credits + streak bonus) if the run
//     had a CFU on every CFU slide AND every CFU was correct on the FIRST
//     attempt. "First attempt" = each CFU answered exactly once this run.
//   - Rank XP = mission.rewards.rankXp on completion (not multiplied).
//   - Best-only: completeMission() upserts; only takes the max for each
//     summary number, so replaying a mission worse never downgrades you.
// ============================================================================

import type { Mission } from "./mission-schema";

export const STREAK_BONUS_PER_CFU = 5;
export const STREAK_BONUS_THRESHOLD = 3;
export const PERFECT_RUN_BONUS_PCT = 0.25;

export type CfuRunEntry = {
  cfuId: string;
  correct: boolean;
  partialScore?: number;
  /** Base credits awarded (already partial-scaled). */
  creditsAwarded: number;
  /** Sequence in which this CFU was answered in the run (1-indexed). */
  order: number;
};

export type RunSummary = {
  missionId: string;
  cfuEntries: CfuRunEntry[];
  /** Total CFU slides in the mission. */
  totalCfuSlides: number;
  /** Mission JSON used for rank-xp + reward credits. */
  rankXpReward: number;
};

export type XpBreakdown = {
  baseCredits: number;
  streakBonus: number;
  perfectBonus: number;
  totalCredits: number;
  rankXp: number;
  perfectRun: boolean;
  /** 0..1 fraction of CFUs correct (uses partial scores when present). */
  accuracy: number;
};

export function computeBreakdown(summary: RunSummary): XpBreakdown {
  const { cfuEntries, totalCfuSlides, rankXpReward } = summary;

  const baseCredits = cfuEntries.reduce((acc, e) => acc + e.creditsAwarded, 0);

  // Streak bonus: walk entries in order, track running streak, award when
  // a correct answer comes while streak >= threshold.
  let streak = 0;
  let streakBonus = 0;
  for (const entry of [...cfuEntries].sort((a, b) => a.order - b.order)) {
    if (entry.correct) {
      if (streak >= STREAK_BONUS_THRESHOLD) {
        streakBonus += STREAK_BONUS_PER_CFU;
      }
      streak += 1;
    } else {
      streak = 0;
    }
  }

  // Perfect-run bonus: every CFU slide was answered AND every entry was correct.
  const answeredAll = cfuEntries.length === totalCfuSlides && totalCfuSlides > 0;
  const allCorrect = cfuEntries.every((e) => e.correct);
  const perfectRun = answeredAll && allCorrect;
  const perfectBonus = perfectRun
    ? Math.round((baseCredits + streakBonus) * PERFECT_RUN_BONUS_PCT)
    : 0;

  const totalCredits = baseCredits + streakBonus + perfectBonus;

  const accuracySum = cfuEntries.reduce(
    (acc, e) => acc + (e.partialScore ?? (e.correct ? 1 : 0)),
    0,
  );
  const accuracy = cfuEntries.length === 0 ? 1 : accuracySum / cfuEntries.length;

  return {
    baseCredits,
    streakBonus,
    perfectBonus,
    totalCredits,
    rankXp: rankXpReward,
    perfectRun,
    accuracy,
  };
}

/** Count CFU slides in a mission. */
export function countCfuSlides(mission: Mission): number {
  return mission.slides.filter((s) => s.type.startsWith("cfu-")).length;
}

// ---------- Rank thresholds --------------------------------------------------
// Simple band system. Rank XP is the cumulative count of missions completed
// (rankXpReward usually = 1). Lets the UI label a profile with a rank name.

type Rank = { xp: number; name: string };
// Ranks are *roles a Debater can earn* (not the unit-noun "Debater" itself).
// Naming is plain English / space-station fleet vocabulary so a middle
// schooler immediately understands the progression. Updated 2026-06-26: dropped
// CAPTAIN tier, COMMANDER is now the endgame rank.
//   Cadet     — start (just signed in)
//   Pilot     — first promotion (3 missions complete; hooks them early)
//   Officer   — mid-program (7 missions)
//   Commander — endgame (12 missions; top of the ladder)
export const RANKS: ReadonlyArray<Rank> = [
  { xp: 0,   name: "CADET" },
  { xp: 3,   name: "PILOT" },
  { xp: 7,   name: "OFFICER" },
  { xp: 12,  name: "COMMANDER" },
];

export function rankFor(xp: number): { name: string; nextXp: number | null } {
  let current: Rank = RANKS[0];
  let nextXp: number | null = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].xp) {
      current = RANKS[i];
      nextXp = i + 1 < RANKS.length ? RANKS[i + 1].xp : null;
    }
  }
  return { name: current.name, nextXp };
}

// Next rank name (for UI like "2/3 missions to PILOT").
export function nextRankName(xp: number): string | null {
  for (let i = 0; i < RANKS.length; i++) {
    if (xp < RANKS[i].xp) return RANKS[i].name;
  }
  return null;
}

// Detect a rank-up that just happened.
// Returns the rank crossed (e.g. PILOT) when previousXp was below its threshold
// AND newXp meets or exceeds it. Returns null if no threshold was crossed.
// If multiple thresholds were crossed in one completion (rare — would need a
// big rankXpReward), returns the HIGHEST one crossed so the ceremony lands on
// the most impressive promotion.
export function rankCrossed(
  previousXp: number,
  newXp: number,
): { name: string; xp: number } | null {
  let crossed: Rank | null = null;
  for (const r of RANKS) {
    if (r.xp === 0) continue; // CADET isn't a promotion
    if (previousXp < r.xp && newXp >= r.xp) crossed = r;
  }
  return crossed;
}

// Which rank gates a given mission? A mission becomes unlockable once the
// debater meets the rank requirement (or it has no requirement). Today every
// mission is gated only by linear order via the path list on /bridge, but this
// helper lets future content require a rank explicitly.
export function rankRequiredFor(missionNumber: number): { xp: number; name: string } | null {
  // Free up through mission 3 (Cadet), Pilot unlocks 4-7, Officer 8-12, Commander 13+.
  if (missionNumber <= 3)  return null;
  if (missionNumber <= 7)  return { xp: 3,  name: "PILOT" };
  if (missionNumber <= 12) return { xp: 7,  name: "OFFICER" };
  return { xp: 12, name: "COMMANDER" };
}
