"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MissionPlayer } from "@/components/mission/MissionPlayer";
import type { Mission } from "@/lib/mission-schema";
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

export default function PlayClient({ mission }: { mission: Mission }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const target = RETURN_TARGETS[from] ?? "/bridge";

  // Fire game_started once when a mission mounts. Not dedupe-guarded so
  // legitimate restarts of the same mission (reload, replay from bridge)
  // do count — that's the interesting signal.
  useEffect(() => {
    trackEvent("game_started", { missionId: mission.id, from: from || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <MissionPlayer mission={mission} onExit={() => router.push(target)} />;
}
