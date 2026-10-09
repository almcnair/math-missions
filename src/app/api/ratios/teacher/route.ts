// PIN-gated read endpoint for the Teacher Math Guide (/ratios/teacher).
// Default PIN is 1550; override with TEACHER_MATH_GUIDE_PIN in env if needed.
// Uses the service-role admin client — this table has no RLS policies, so
// this route is the only way to read it.

import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

const DEFAULT_PIN = "1550";

function pinIsValid(pin: string | null): boolean {
  const expected = process.env.TEACHER_MATH_GUIDE_PIN || DEFAULT_PIN;
  return pin !== null && pin === expected;
}

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin");

  if (!pinIsValid(pin)) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const { data, error } = await adminClient()
    .from("ratios_attempts")
    .select("player_name, quest_id, quest_title, target_multiplier, wrong_attempts, completed_at")
    .order("completed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    player_name: string;
    quest_id: number;
    quest_title: string;
    target_multiplier: number;
    wrong_attempts: number;
    completed_at: string;
  };

  const rows = (data ?? []) as Row[];

  // Aggregate per student
  const byPlayer = new Map<
    string,
    {
      playerName: string;
      questsCompleted: number;
      totalWrongAttempts: number;
      lastCompletedAt: string;
      quests: { questId: number; questTitle: string; targetMultiplier: number; wrongAttempts: number; completedAt: string }[];
    }
  >();

  for (const row of rows) {
    const existing = byPlayer.get(row.player_name);
    const questEntry = {
      questId: row.quest_id,
      questTitle: row.quest_title,
      targetMultiplier: row.target_multiplier,
      wrongAttempts: row.wrong_attempts,
      completedAt: row.completed_at,
    };
    if (existing) {
      existing.questsCompleted += 1;
      existing.totalWrongAttempts += row.wrong_attempts;
      if (row.completed_at > existing.lastCompletedAt) {
        existing.lastCompletedAt = row.completed_at;
      }
      existing.quests.push(questEntry);
    } else {
      byPlayer.set(row.player_name, {
        playerName: row.player_name,
        questsCompleted: 1,
        totalWrongAttempts: row.wrong_attempts,
        lastCompletedAt: row.completed_at,
        quests: [questEntry],
      });
    }
  }

  const students = Array.from(byPlayer.values()).sort(
    (a, b) => new Date(b.lastCompletedAt).getTime() - new Date(a.lastCompletedAt).getTime()
  );

  const summary = {
    totalStudents: students.length,
    totalCompletions: rows.length,
    totalWrongAttempts: rows.reduce((sum, r) => sum + r.wrong_attempts, 0),
  };

  return NextResponse.json({ summary, students });
}
