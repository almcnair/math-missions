// PIN-gated CSV export for the Teacher Math Guide (/ratios/teacher).
// Same PIN as src/app/api/ratios/teacher/route.ts (default 1550).

import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

const DEFAULT_PIN = "1550";

function pinIsValid(pin: string | null): boolean {
  const expected = process.env.TEACHER_MATH_GUIDE_PIN || DEFAULT_PIN;
  return pin !== null && pin === expected;
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin");

  if (!pinIsValid(pin)) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  let data: unknown[] | null = null;
  try {
    const result = await adminClient()
      .from("ratios_attempts")
      .select("player_name, quest_id, quest_title, target_multiplier, wrong_attempts, completed_at")
      .order("completed_at", { ascending: false });

    if (result.error) {
      console.error("ratios_attempts export select failed:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    data = result.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("ratios_attempts export fetch threw:", message, stack);
    return NextResponse.json({ error: message }, { status: 500 });
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

  const header = [
    "Student Name",
    "Quest #",
    "Quest Title",
    "Target Multiplier",
    "Wrong Attempts Before Success",
    "Completed At",
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.player_name),
        csvEscape(row.quest_id),
        csvEscape(row.quest_title),
        csvEscape(row.target_multiplier),
        csvEscape(row.wrong_attempts),
        csvEscape(row.completed_at),
      ].join(",")
    );
  }

  const csv = lines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ratios-game-stats.csv"',
    },
  });
}
