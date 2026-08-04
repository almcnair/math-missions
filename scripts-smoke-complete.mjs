// Smoke test: inline the XP math so we don't depend on TS imports.
// Mirrors src/lib/xp.ts exactly (cross-check by hand).

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const STREAK_BONUS_PER_CFU = 5;
const STREAK_BONUS_THRESHOLD = 3;
const PERFECT_RUN_BONUS_PCT = 0.25;

function computeBreakdown({ cfuEntries, totalCfuSlides, rankXpReward }) {
  const baseCredits = cfuEntries.reduce((a, e) => a + e.creditsAwarded, 0);
  let streak = 0, streakBonus = 0;
  for (const e of [...cfuEntries].sort((a,b)=>a.order-b.order)) {
    if (e.correct) {
      if (streak >= STREAK_BONUS_THRESHOLD) streakBonus += STREAK_BONUS_PER_CFU;
      streak += 1;
    } else { streak = 0; }
  }
  const answeredAll = cfuEntries.length === totalCfuSlides && totalCfuSlides > 0;
  const allCorrect = cfuEntries.every(e => e.correct);
  const perfectRun = answeredAll && allCorrect;
  const perfectBonus = perfectRun ? Math.round((baseCredits + streakBonus) * PERFECT_RUN_BONUS_PCT) : 0;
  const totalCredits = baseCredits + streakBonus + perfectBonus;
  const accuracy = cfuEntries.length === 0 ? 1
    : cfuEntries.reduce((a,e)=>a+(e.partialScore ?? (e.correct?1:0)),0) / cfuEntries.length;
  return { baseCredits, streakBonus, perfectBonus, totalCredits, rankXp: rankXpReward, perfectRun, accuracy };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, svc, { auth: { persistSession: false } });

const DAPHNE = "68c0c912-3bfb-4e99-8d37-09cb28ee37b2";
const mission = JSON.parse(fs.readFileSync("src/content/missions/welcome-aboard.json", "utf8"));

const cfuSlides = mission.slides.filter(s => s.type.startsWith("cfu-"));
const cfuEntries = cfuSlides.map((s, i) => ({
  cfuId: s.id, correct: true, creditsAwarded: s.scoring.creditsOnCorrect, order: i + 1,
}));
const totalCfuSlides = cfuSlides.length;

const breakdown = computeBreakdown({
  cfuEntries, totalCfuSlides, rankXpReward: mission.rewards.rankXp ?? 0,
});
console.log("--- computed breakdown ---");
console.log(JSON.stringify(breakdown, null, 2));

for (const e of cfuEntries) {
  const slide = cfuSlides.find(s => s.id === e.cfuId);
  const { error } = await sb.from("cfu_attempts").insert({
    student_id: DAPHNE, mission_id: mission.id,
    cfu_id: e.cfuId, cfu_type: slide.type,
    is_correct: true, partial_score: null,
    credits_earned: e.creditsAwarded, attempt_number: 1,
    raw_response: { smoke: true },
  });
  if (error) { console.error("cfu_attempts insert error:", error); process.exit(1); }
}
console.log("✅ logged", cfuEntries.length, "cfu_attempts");

const now = new Date().toISOString();
const { error: upErr } = await sb.from("mission_progress").upsert({
  student_id: DAPHNE, mission_id: mission.id,
  best_score: breakdown.accuracy,
  best_credits: breakdown.totalCredits,
  best_bonus_credits: breakdown.streakBonus + breakdown.perfectBonus,
  best_rank_xp: breakdown.rankXp,
  ever_perfect: breakdown.perfectRun,
  attempts: 1,
  first_completed_at: now, last_completed_at: now,
});
if (upErr) { console.error("mission_progress upsert error:", upErr); process.exit(1); }
console.log("✅ upserted mission_progress");

const { data: rows } = await sb.from("mission_progress").select("best_credits,best_rank_xp").eq("student_id", DAPHNE);
const totalCredits = rows.reduce((a,r)=>a+(r.best_credits??0),0);
const totalXp = rows.reduce((a,r)=>a+(r.best_rank_xp??0),0);
const { error: pErr } = await sb.from("profiles").update({ credits: totalCredits, rank_xp: totalXp }).eq("id", DAPHNE);
if (pErr) { console.error("profile update error:", pErr); process.exit(1); }
console.log(`✅ profile updated: credits=${totalCredits} rank_xp=${totalXp}`);
