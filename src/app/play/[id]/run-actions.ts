"use server";

// ============================================================================
// /play/[id] — mid-mission save/resume server actions
// ----------------------------------------------------------------------------
//   loadMissionRun(missionId)   → SavedRun | null
//   saveMissionRun({...})       → { ok: boolean }
//   deleteMissionRun(missionId) → { ok: boolean }
//
// All three are RLS-gated via createClient() (per-request auth-aware).
// Unauthenticated callers get a graceful null/false — the demo path at
// /play/<id>?from=demo should NOT create mission_runs rows.
//
// SavedRun is the client-reducer-friendly shape. The DB column names use
// snake_case; we map here so the client never sees SQL-isms.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type { CfuOutcome } from "@/components/mission/state";

export type SavedRun = {
  currentIndex: number;
  credits: number;
  shields: number;
  streak: number;
  cfuOutcomes: Record<string, CfuOutcome>;
  hintsUsed: Record<string, true>;
  cfuOrder: { cfuId: string; cfuType: string }[];
  lastSavedAt: string;
};

export async function loadMissionRun(missionId: string): Promise<SavedRun | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("mission_runs")
    .select("current_index, credits, shields, streak, cfu_outcomes, hints_used, cfu_order, last_saved_at")
    .eq("student_id", user.id)
    .eq("mission_id", missionId)
    .maybeSingle();

  // Table missing (migration not run yet) OR no row for this (user, mission).
  // Both treated as "no saved run" — the mission just starts fresh.
  if (error || !data) return null;

  return {
    currentIndex: Number(data.current_index) || 0,
    credits:      Number(data.credits)       || 0,
    shields:      Number(data.shields)       ?? 3,
    streak:       Number(data.streak)        || 0,
    cfuOutcomes:  (data.cfu_outcomes as Record<string, CfuOutcome>) ?? {},
    hintsUsed:    (data.hints_used   as Record<string, true>)       ?? {},
    cfuOrder:     (data.cfu_order    as { cfuId: string; cfuType: string }[]) ?? [],
    lastSavedAt:  String(data.last_saved_at ?? ""),
  };
}

export async function saveMissionRun(args: {
  missionId: string;
  run: Omit<SavedRun, "lastSavedAt">;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not-authenticated" };

  const { error } = await supabase.from("mission_runs").upsert(
    {
      student_id:    user.id,
      mission_id:    args.missionId,
      current_index: args.run.currentIndex,
      credits:       args.run.credits,
      shields:       args.run.shields,
      streak:        args.run.streak,
      cfu_outcomes:  args.run.cfuOutcomes,
      hints_used:    args.run.hintsUsed,
      cfu_order:     args.run.cfuOrder,
      last_saved_at: new Date().toISOString(),
    },
    { onConflict: "student_id,mission_id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteMissionRun(missionId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("mission_runs")
    .delete()
    .eq("student_id", user.id)
    .eq("mission_id", missionId);

  return { ok: !error };
}
