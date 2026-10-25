"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MissionPlayer } from "@/components/mission/MissionPlayer";
import { DemoNameGate, readDemoName } from "@/components/mission/DemoNameGate";
import type { Mission } from "@/lib/mission-schema";
import type { SavedRun } from "./run-actions";
import { trackEvent } from "@/lib/analytics";

// Home button routing.
//
// The mission player can be opened from a few places: the student Bridge,
// the Authoring Console preview, or a direct link. Routing Home back to "/"
// dumps the user on the public marketing landing ("Sign in to launch...")
// which looks identical to a sign-out — even though the Supabase session is
// still intact. The fix: respect a `?from=` query param, otherwise fall back
// to `/bridge` (the signed-in student home), never `/`.
//
// Allowed `from` values are whitelisted so we don't open an open-redirect.
const RETURN_TARGETS: Record<string, string> = {
  author: "/author",
  bridge: "/bridge",
  teacher: "/coach/roster",
  coach: "/coach",
  roster: "/coach/roster",
  // Public / hiring-manager demo entry from the landing page. Home returns
  // to "/" (marketing) instead of the auth-gated /bridge so an unauthed
  // demo user doesn't get bounced into a sign-in wall on exit.
  demo: "/",
};

export default function PlayClient({ mission, savedRun }: { mission: Mission; savedRun: SavedRun | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const target = RETURN_TARGETS[from] ?? "/bridge";

  // Demo-mode cadet check-in: capture First Name + Last Initial BEFORE the
  // mission starts, so the completion panel can offer "LOCK IN AS [Name I]".
  // Non-demo entries (bridge, author, coach) skip the gate entirely.
  const isDemo = from === "demo";
  const [demoReady, setDemoReady] = useState(!isDemo);
  useEffect(() => {
    if (isDemo && readDemoName()) setDemoReady(true);
  }, [isDemo]);

  // Fire game_started once when the mission ACTUALLY starts (post-gate for
  // demo mode). Not dedupe-guarded so legitimate restarts do count.
  useEffect(() => {
    if (isDemo && !demoReady) return;
    trackEvent("game_started", { missionId: mission.id, from: from || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoReady]);

  if (isDemo && !demoReady) {
    return <DemoNameGate onReady={() => setDemoReady(true)} />;
  }

  return <MissionPlayer mission={mission} savedRun={savedRun} onExit={() => router.push(target)} />;
}
