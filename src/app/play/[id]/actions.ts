"use server";

// ============================================================================
// Mission play — server actions
// ----------------------------------------------------------------------------
//   logCfuAttempt(...)    — fire-and-forget log of a single CFU answer
//   completeMission(...)  — called when the player reaches the complete slide:
//                           runs server-side XP math, upserts mission_progress
//                           best-only, increments profile credits/rank_xp.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { computeBreakdown, countCfuSlides, type RunSummary, type XpBreakdown } from "@/lib/xp";
import type { Mission } from "@/lib/mission-schema";

// ---------- logCfuAttempt ---------------------------------------------------

export type LogCfuArgs = {
  missionId: string;
  cfuId: string;
  cfuType: string;
  isCorrect: boolean;
  partialScore?: number;
  creditsEarned: number;
  attemptNumber: number;
  rawResponse?: unknown;
};

export async function logCfuAttempt(args: LogCfuArgs): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not-authenticated" };

  const { error } = await supabase.from("cfu_attempts").insert({
    student_id: user.id,
    mission_id: args.missionId,
    cfu_id: args.cfuId,
    cfu_type: args.cfuType,
    is_correct: args.isCorrect,
    partial_score: args.partialScore ?? null,
    credits_earned: args.creditsEarned,
    attempt_number: args.attemptNumber,
    raw_response: args.rawResponse ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------- completeMission -------------------------------------------------

export type CompleteMissionResult = {
  ok: boolean;
  error?: string;
  breakdown?: XpBreakdown;
  /** Whether this run beat the student's previous best (and so wrote new credits/xp). */
  newBest?: boolean;
  /** Cumulative profile state AFTER this completion. */
  profileAfter?: {
    credits: number;
    rank_xp: number;
    streak: number;
  };
};

export async function completeMission(args: {
  mission: Mission;
  runSummary: Omit<RunSummary, "rankXpReward" | "totalCfuSlides">;
}): Promise<CompleteMissionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not-authenticated" };

  const totalCfuSlides = countCfuSlides(args.mission);
  const rankXpReward = args.mission.rewards.rankXp ?? 0;

  // Authoritative XP math runs on the server (never trust the client number).
  const breakdown = computeBreakdown({
    ...args.runSummary,
    totalCfuSlides,
    rankXpReward,
  });

  // Read previous best (if any).
  const { data: existing, error: readErr } = await supabase
    .from("mission_progress")
    .select("*")
    .eq("student_id", user.id)
    .eq("mission_id", args.mission.id)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };

  const now = new Date().toISOString();
  const previousBestCredits = existing?.best_credits ?? 0;
  const previousBestXp      = existing?.best_rank_xp ?? 0;
  const newBest             = breakdown.totalCredits > previousBestCredits;

  // Best-only fields: only ever go UP.
  const nextBest = {
    best_score:         Math.max(Number(existing?.best_score ?? 0),         breakdown.accuracy),
    best_credits:       Math.max(previousBestCredits,                       breakdown.totalCredits),
    best_bonus_credits: Math.max(Number(existing?.best_bonus_credits ?? 0), breakdown.streakBonus + breakdown.perfectBonus),
    best_rank_xp:       Math.max(previousBestXp,                            breakdown.rankXp),
    ever_perfect:       (existing?.ever_perfect ?? false) || breakdown.perfectRun,
    attempts:           (existing?.attempts ?? 0) + 1,
    first_completed_at: existing?.first_completed_at ?? now,
    last_completed_at:  now,
  };

  const { error: upsertErr } = await supabase
    .from("mission_progress")
    .upsert({
      student_id: user.id,
      mission_id: args.mission.id,
      ...nextBest,
    });
  if (upsertErr) return { ok: false, error: upsertErr.message };

  // Profile cumulative credits/xp = best across all missions (recomputed from
  // mission_progress so it stays consistent even when replays happen).
  const { data: allProgress, error: aggErr } = await supabase
    .from("mission_progress")
    .select("best_credits, best_rank_xp")
    .eq("student_id", user.id);
  if (aggErr) return { ok: false, error: aggErr.message };

  const totalCredits = (allProgress ?? []).reduce((acc, r) => acc + (r.best_credits ?? 0), 0);
  const totalRankXp  = (allProgress ?? []).reduce((acc, r) => acc + (r.best_rank_xp  ?? 0), 0);

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ credits: totalCredits, rank_xp: totalRankXp })
    .eq("id", user.id);
  if (profileErr) return { ok: false, error: profileErr.message };

  // Read the streak from the profile (we don't mutate streak from this action
  // — that lives in mission-state for now; future: persist cross-mission).
  const { data: profileAfter } = await supabase
    .from("profiles")
    .select("credits, rank_xp, streak")
    .eq("id", user.id)
    .single();

  return {
    ok: true,
    breakdown,
    newBest,
    profileAfter: profileAfter ?? { credits: totalCredits, rank_xp: totalRankXp, streak: 0 },
  };
}
