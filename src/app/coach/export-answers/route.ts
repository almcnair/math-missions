// ============================================================================
// /coach/export-answers — CSV export of every CFU answer, teacher/admin only.
// ----------------------------------------------------------------------------
// Austin's ask (2026-10-23): "I just want to be able to print out a spreadsheet
// with the students name they gave and if they answered correctly."
//
// GET route handler — hitting the URL kicks off a .csv download.
// Columns: Student Name, Email, Mission, Question #, Correct?, When
//
// Data lives in public.cfu_attempts (one row per answered CFU) joined to
// public.profiles for the display name. We do the join in JS to avoid
// depending on Supabase's FK-relationship syntax, which is finicky.
//
// Question numbers come from each mission's JSON — we count CFU-type slides
// in slide order (Q1, Q2, Q3...). Non-CFU slides are skipped. If a CFU id
// can't be resolved (mission removed, slide renamed), we fall back to the
// raw cfu_id so the row still exports.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import dividingFractions from "@/content/missions/dividing-fractions-v1.json";
import equivalentFractions from "@/content/missions/equivalent-fractions-v1.json";
import ratiosIntro from "@/content/missions/ratios-intro-v1.json";
import ratiosLab from "@/content/missions/ratios-lab-v1.json";
import type { Mission } from "@/lib/mission-schema";

export const dynamic = "force-dynamic";

const MISSIONS: Record<string, Mission> = {
  "dividing-fractions-v1":   dividingFractions   as Mission,
  "equivalent-fractions-v1": equivalentFractions as Mission,
  "ratios-intro-v1":         ratiosIntro         as Mission,
  "ratios-lab-v1":           ratiosLab           as Mission,
};

function buildMissionIndex(): Map<string, { missionTitle: string; questionNumber: number }> {
  const index = new Map<string, { missionTitle: string; questionNumber: number }>();
  for (const [missionId, mission] of Object.entries(MISSIONS)) {
    let qNum = 0;
    for (const slide of mission.slides) {
      if (typeof slide.type === "string" && slide.type.startsWith("cfu-")) {
        qNum++;
        index.set(`${missionId}:${slide.id}`, {
          missionTitle: mission.title,
          questionNumber: qNum,
        });
      }
    }
  }
  return index;
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Not authenticated. Sign in as a coach first.", { status: 401 });
  }

  const admin = adminClient();
  const { data: me } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || (me.role !== "teacher" && me.role !== "admin")) {
    return new NextResponse("Forbidden — coach access only.", { status: 403 });
  }

  const { data: attempts, error: attemptsErr } = await admin
    .from("cfu_attempts")
    .select("student_id, mission_id, cfu_id, is_correct, partial_score, created_at")
    .order("created_at", { ascending: true });

  if (attemptsErr) {
    return new NextResponse(`Export failed: ${attemptsErr.message}`, { status: 500 });
  }

  const studentIds = Array.from(new Set((attempts ?? []).map((a) => a.student_id as string)));
  const profilesById = new Map<string, { display_name: string | null; email: string | null }>();

  if (studentIds.length > 0) {
    const { data: profiles, error: profilesErr } = await admin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", studentIds);
    if (profilesErr) {
      return new NextResponse(`Export failed: ${profilesErr.message}`, { status: 500 });
    }
    for (const p of profiles ?? []) {
      profilesById.set(p.id as string, {
        display_name: (p.display_name as string | null) ?? null,
        email: (p.email as string | null) ?? null,
      });
    }
  }

  const missionIndex = buildMissionIndex();

  const header = ["Student Name", "Email", "Mission", "Question #", "Correct?", "When"];
  const rows: string[] = [header.map(csvCell).join(",")];

  for (const a of attempts ?? []) {
    const profile = profilesById.get(a.student_id as string);
    const name = profile?.display_name ?? "(unknown student)";
    const email = profile?.email ?? "";

    const meta = missionIndex.get(`${a.mission_id}:${a.cfu_id}`);
    const missionTitle = meta?.missionTitle ?? String(a.mission_id);
    const questionCol = meta ? `Q${meta.questionNumber}` : String(a.cfu_id);

    let correct: string;
    if (a.is_correct) {
      correct = "✓";
    } else if (a.partial_score != null && Number(a.partial_score) > 0) {
      correct = `partial (${Math.round(Number(a.partial_score) * 100)}%)`;
    } else {
      correct = "✗";
    }

    const when = new Date(a.created_at as string).toLocaleString("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    rows.push([name, email, missionTitle, questionCol, correct, when].map(csvCell).join(","));
  }

  const csv = rows.join("\n") + "\n";
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="math-missions-answers-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
