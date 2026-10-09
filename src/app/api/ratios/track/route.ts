// Public, login-free telemetry endpoint for the /ratios game (Potion Pantry).
// Students only ever POST here (never read). Writes go through the
// service-role admin client, so no RLS policy is needed on
// public.ratios_attempts — anon/authenticated roles get zero direct access.

import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

const MAX_NAME_LENGTH = 40;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const {
    playerName,
    questId,
    questTitle,
    targetMultiplier,
    wrongAttempts,
  } = body as Record<string, unknown>;

  if (typeof playerName !== "string" || !playerName.trim()) {
    return NextResponse.json({ error: "playerName is required" }, { status: 400 });
  }
  if (typeof questId !== "number" || typeof targetMultiplier !== "number") {
    return NextResponse.json({ error: "questId and targetMultiplier must be numbers" }, { status: 400 });
  }
  if (typeof questTitle !== "string" || !questTitle.trim()) {
    return NextResponse.json({ error: "questTitle is required" }, { status: 400 });
  }

  const safeName = playerName.trim().slice(0, MAX_NAME_LENGTH);
  const safeWrongAttempts =
    typeof wrongAttempts === "number" && Number.isFinite(wrongAttempts) && wrongAttempts >= 0
      ? Math.floor(wrongAttempts)
      : 0;

  try {
    const { error } = await adminClient().from("ratios_attempts").insert({
      player_name: safeName,
      quest_id: questId,
      quest_title: questTitle.trim(),
      target_multiplier: targetMultiplier,
      wrong_attempts: safeWrongAttempts,
    });

    if (error) {
      // Table missing is the expected failure mode before the migration has
      // been run in Supabase — fail soft so the game never breaks for kids.
      console.error("ratios_attempts insert failed:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("ratios tracking error:", message);
    // Still 200 — never let telemetry failures surface to a student.
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
