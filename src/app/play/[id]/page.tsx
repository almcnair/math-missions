import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Mission } from "@/lib/mission-schema";
import dividingFractions from "@/content/missions/dividing-fractions-v1.json";
import equivalentFractions from "@/content/missions/equivalent-fractions-v1.json";
import ratiosIntro from "@/content/missions/ratios-intro-v1.json";
import ratiosLab from "@/content/missions/ratios-lab-v1.json";
import PlayClient from "./client";
import { loadMissionRun } from "./run-actions";

const REGISTRY: Record<string, Mission> = {
  "dividing-fractions-v1":      dividingFractions   as Mission,
  "equivalent-fractions-v1":    equivalentFractions as Mission,
  "ratios-intro-v1":            ratiosIntro         as Mission,
  "ratios-lab-v1":              ratiosLab           as Mission,
};

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mission = REGISTRY[id];
  if (!mission) notFound();

  // Server-side load of any saved mid-mission run for this user. Returns
  // null for anonymous (demo) visitors or when nothing is saved. Passed as
  // a prop so MissionPlayer can show the Resume? prompt on mount without
  // another round-trip.
  const savedRun = await loadMissionRun(id);

  // Suspense boundary required because PlayClient calls useSearchParams() to
  // resolve the Home button's return target (?from=author|bridge|teacher).
  return (
    <Suspense fallback={null}>
      <PlayClient mission={mission} savedRun={savedRun} />
    </Suspense>
  );
}
