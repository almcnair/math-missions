"use server";

import { revalidatePath } from "next/cache";
import type { Mission } from "@/lib/mission-schema";
import {
  listMissions,
  readDraft,
  writeDraft,
  deleteDraft,
  deletePublished,
  deleteMissionImage,
  publishMission,
  type MissionListItem,
} from "./storage";
import { deployMission, type DeployResult } from "./deploy";

export async function actionList(): Promise<MissionListItem[]> {
  return listMissions();
}

export async function actionRead(id: string): Promise<Mission | null> {
  return readDraft(id);
}

export async function actionSave(mission: Mission): Promise<{ ok: true }> {
  // Light validation — schema-shape check we'll harden later.
  if (!mission.id) throw new Error("mission.id required");
  if (!mission.title) throw new Error("mission.title required");
  if (!Array.isArray(mission.slides)) throw new Error("mission.slides required");
  await writeDraft(mission);
  revalidatePath("/author");
  return { ok: true };
}

// Delete the mission everywhere it lives. Removes the draft (if any) and
// the published copy (if any). Designed to make the "Delete mission" button
// in the sidebar do what users actually expect — a published-only mission
// would otherwise reappear in the list because the old delete only touched
// drafts.
export async function actionDelete(id: string): Promise<{ ok: true }> {
  await deleteDraft(id);
  await deletePublished(id);
  revalidatePath("/author");
  revalidatePath("/");
  return { ok: true };
}

export async function actionPublish(id: string): Promise<{ ok: true }> {
  await publishMission(id);
  revalidatePath("/author");
  revalidatePath("/");
  return { ok: true };
}

// One-shot deploy: publish to disk + register in bridge/registry + git push.
// Returns a per-step result so the UI can show which steps ran vs. were
// skipped vs. failed. See src/lib/author/deploy.ts for step-by-step logic.
export async function actionDeploy(id: string): Promise<DeployResult> {
  const result = await deployMission(id);
  revalidatePath("/author");
  revalidatePath("/");
  return result;
}

// Delete an uploaded mission image by its public URL (e.g.
// "/mission-images/inherency-v1/123_foo.jpg"). Silently no-ops on missing
// files or URLs outside the mission images directory.
export async function actionDeleteImage(url: string): Promise<{ ok: true }> {
  await deleteMissionImage(url);
  return { ok: true };
}
