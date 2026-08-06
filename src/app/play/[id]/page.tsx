import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Mission } from "@/lib/mission-schema";
import dividingFractions from "@/content/missions/dividing-fractions-v1.json";
import ratiosIntro from "@/content/missions/ratios-intro-v1.json";
import ratiosLab from "@/content/missions/ratios-lab-v1.json";
import PlayClient from "./client";

const REGISTRY: Record<string, Mission> = {
  "dividing-fractions-v1":   dividingFractions  as Mission,
  "ratios-intro-v1":         ratiosIntro        as Mission,
  "ratios-lab-v1":           ratiosLab          as Mission,
};

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mission = REGISTRY[id];
  if (!mission) notFound();
  // Suspense boundary required because PlayClient calls useSearchParams() to
  // resolve the Home button's return target (?from=author|bridge|teacher).
  return (
    <Suspense fallback={null}>
      <PlayClient mission={mission} />
    </Suspense>
  );
}
