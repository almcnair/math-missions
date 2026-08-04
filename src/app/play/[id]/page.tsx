import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Mission } from "@/lib/mission-schema";
import inherency from "@/content/missions/inherency.json";
import cfuDemo from "@/content/missions/cfu-types-demo.json";
import welcomeAboard from "@/content/missions/welcome-aboard.json";
import day1Block1 from "@/content/missions/day1_block1-v1.json";
import claimWarrantImpact from "@/content/missions/claim-warrant-impact-v1.json";
import whatIsDebate from "@/content/missions/what-is-debate-v1.json";
import speechOrder from "@/content/missions/speech-order-v1.json";
import affBasics from "@/content/missions/aff-basics-v1.json";
import disadvantages from "@/content/missions/disadvantages-v1.json";
import impactCalculus from "@/content/missions/impact-calculus-v1.json";
import PlayClient from "./client";

const REGISTRY: Record<string, Mission> = {
  "what-is-debate-v1":       whatIsDebate       as Mission,
  "claim-warrant-impact-v1": claimWarrantImpact as Mission,
  "speech-order-v1":         speechOrder        as Mission,
  "aff-basics-v1":           affBasics          as Mission,
  "disadvantages-v1":        disadvantages      as Mission,
  "impact-calculus-v1":      impactCalculus     as Mission,
  // Not on the student path but kept registered so direct URLs still resolve.
  "welcome-aboard-v1":       welcomeAboard      as Mission,
  "day1_block1-v1":          day1Block1         as Mission,
  "inherency-v1":            inherency          as Mission,
  "cfu-demo-v1":             cfuDemo            as Mission,
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
