// Server-side filesystem storage for the Authoring Studio.
//
// Drafts live OUTSIDE the app source tree, in:
//   ~/Desktop/policydebate101-missions/drafts/
//
// Publishing copies the draft JSON into:
//   src/content/missions/<id>.json
//
// Filesystem-only for prototype. Trivial to swap to Supabase later by
// changing this one module's implementation.

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Mission } from "@/lib/mission-schema";

const HOME = os.homedir();
const DRAFTS_DIR = path.join(HOME, "Desktop", "policydebate101-missions", "drafts");
const PUBLISHED_DIR = path.join(process.cwd(), "src", "content", "missions");
// Mission images live in public/ so Next serves them at /mission-images/...
// This means they ship with the app and work both in dev and after deploy.
// When Supabase Storage comes online, swap this for a Storage upload and
// rewrite URLs in existing mission JSON.
const PUBLIC_IMAGES_DIR = path.join(process.cwd(), "public", "mission-images");

async function ensureDirs() {
  await fs.mkdir(DRAFTS_DIR, { recursive: true });
  await fs.mkdir(PUBLISHED_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_IMAGES_DIR, { recursive: true });
}

export interface MissionListItem {
  id: string;
  title: string;
  difficulty: string;
  sectorId: string;
  number: number;
  slideCount: number;
  estimatedMinutes: number;
  status: "draft" | "published";
  updatedAt: string;
}

function safeId(id: string): string {
  // allow letters, digits, dash, underscore; reject path separators
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid mission id: ${id}`);
  }
  return id;
}

// Index every JSON file in DRAFTS_DIR / PUBLISHED_DIR by the mission's
// declared `id`, so filename != id still resolves correctly. (Some legacy
// files, e.g. welcome-aboard.json with id welcome-aboard-v1, predate the
// id-matches-filename convention.) Returns a map of id → absolute file path.
async function indexMissionFiles(dir: string): Promise<Map<string, string>> {
  const idToPath = new Map<string, string>();
  const files = await fs.readdir(dir).catch(() => []);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const abs = path.join(dir, file);
    try {
      const raw = await fs.readFile(abs, "utf8");
      const m = JSON.parse(raw) as Mission;
      // Fall back to filename stem if `id` is missing in the JSON itself.
      const key = m.id ?? file.replace(/\.json$/, "");
      idToPath.set(key, abs);
    } catch {
      // skip malformed
    }
  }
  return idToPath;
}

async function findDraftPath(id: string): Promise<string | null> {
  // Fast path: id-matches-filename convention.
  const safe = safeId(id);
  const direct = path.join(DRAFTS_DIR, `${safe}.json`);
  try {
    await fs.access(direct);
    return direct;
  } catch {
    // Fallback: scan the directory looking for a file whose .id matches.
    const index = await indexMissionFiles(DRAFTS_DIR);
    return index.get(id) ?? null;
  }
}

async function findPublishedPath(id: string): Promise<string | null> {
  const safe = safeId(id);
  const direct = path.join(PUBLISHED_DIR, `${safe}.json`);
  try {
    await fs.access(direct);
    return direct;
  } catch {
    const index = await indexMissionFiles(PUBLISHED_DIR);
    return index.get(id) ?? null;
  }
}

export async function listMissions(): Promise<MissionListItem[]> {
  await ensureDirs();
  const draftFiles = await fs.readdir(DRAFTS_DIR).catch(() => []);
  const publishedFiles = await fs.readdir(PUBLISHED_DIR).catch(() => []);

  // Key by mission.id (NOT filename stem) so drafts and published-with-the
  // -same-id correctly dedupe even when one of them has a legacy filename.
  const byId = new Map<string, MissionListItem>();

  for (const file of draftFiles) {
    if (!file.endsWith(".json")) continue;
    try {
      const abs = path.join(DRAFTS_DIR, file);
      const raw = await fs.readFile(abs, "utf8");
      const m = JSON.parse(raw) as Mission;
      const id = m.id ?? file.replace(/\.json$/, "");
      const stat = await fs.stat(abs);
      byId.set(id, {
        id,
        title: m.title ?? "(untitled)",
        difficulty: m.difficulty ?? "intro",
        sectorId: m.sectorId ?? "",
        number: m.number ?? 0,
        slideCount: m.slides?.length ?? 0,
        estimatedMinutes: m.estimatedMinutes ?? 0,
        status: "draft",
        updatedAt: stat.mtime.toISOString(),
      });
    } catch {
      // skip malformed
    }
  }

  for (const file of publishedFiles) {
    if (!file.endsWith(".json")) continue;
    try {
      const abs = path.join(PUBLISHED_DIR, file);
      const raw = await fs.readFile(abs, "utf8");
      const m = JSON.parse(raw) as Mission;
      const id = m.id ?? file.replace(/\.json$/, "");
      const stat = await fs.stat(abs);
      // If a draft also exists for this id, keep the draft (it's the working copy)
      // but mark its status as published if no draft.
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          title: m.title ?? "(untitled)",
          difficulty: m.difficulty ?? "intro",
          sectorId: m.sectorId ?? "",
          number: m.number ?? 0,
          slideCount: m.slides?.length ?? 0,
          estimatedMinutes: m.estimatedMinutes ?? 0,
          status: "published",
          updatedAt: stat.mtime.toISOString(),
        });
      }
    } catch {
      // skip
    }
  }

  // Sort by play order: mission.number ascending. Missions with number=0 (the
  // internal CFU demo, or any unnumbered scratch missions) sink to the bottom.
  // Ties on number fall back to title alphabetical so the order is stable.
  return Array.from(byId.values()).sort((a, b) => {
    const an = a.number > 0 ? a.number : Number.POSITIVE_INFINITY;
    const bn = b.number > 0 ? b.number : Number.POSITIVE_INFINITY;
    if (an !== bn) return an - bn;
    return a.title.localeCompare(b.title);
  });
}

export async function readDraft(id: string): Promise<Mission | null> {
  await ensureDirs();
  // Drafts first — working copy wins over published.
  const draftPath = await findDraftPath(id);
  if (draftPath) {
    try {
      const raw = await fs.readFile(draftPath, "utf8");
      return JSON.parse(raw) as Mission;
    } catch {
      // fall through to published
    }
  }
  const pubPath = await findPublishedPath(id);
  if (pubPath) {
    try {
      const raw = await fs.readFile(pubPath, "utf8");
      return JSON.parse(raw) as Mission;
    } catch {
      return null;
    }
  }
  return null;
}

export async function writeDraft(mission: Mission): Promise<void> {
  await ensureDirs();
  const safe = safeId(mission.id);
  const draftPath = path.join(DRAFTS_DIR, `${safe}.json`);
  const pretty = JSON.stringify(mission, null, 2);
  await fs.writeFile(draftPath, pretty, "utf8");
}

export async function deleteDraft(id: string): Promise<void> {
  await ensureDirs();
  // Handles both id-matches-filename and legacy filename mismatches.
  const found = await findDraftPath(id);
  if (found) await fs.unlink(found).catch(() => {});
}

export async function deletePublished(id: string): Promise<void> {
  await ensureDirs();
  const found = await findPublishedPath(id);
  if (found) await fs.unlink(found).catch(() => {});
}

export async function publishMission(id: string): Promise<void> {
  await ensureDirs();
  const safe = safeId(id);
  // Find the draft (handles legacy filename mismatches).
  const draftPath = await findDraftPath(id);
  if (!draftPath) {
    throw new Error(`No draft found for ${id}`);
  }
  const raw = await fs.readFile(draftPath, "utf8");
  // Validate as JSON before writing to published.
  JSON.parse(raw);
  // Canonical publish path is ${id}.json. If a legacy published file exists
  // under a different filename, remove it so we don't leave duplicates.
  const canonicalPubPath = path.join(PUBLISHED_DIR, `${safe}.json`);
  const existingPubPath = await findPublishedPath(id);
  if (existingPubPath && existingPubPath !== canonicalPubPath) {
    await fs.unlink(existingPubPath).catch(() => {});
  }
  await fs.writeFile(canonicalPubPath, raw, "utf8");
}

// Save an uploaded image for a given mission. Files land under
//   public/mission-images/<mission-id>/<timestamp>_<safe-name>
// and are served from /mission-images/<mission-id>/<filename>.
//
// Content-addressed dedupe: before writing, we hash the incoming bytes and
// scan the mission's existing images. If a file with the same SHA-256 exists,
// return its URL and skip the write. This is why the /author uploader used
// to accumulate 3.2MB dupes every time a hint image was reused across CFUs
// (see scripts/dedupe-mission-images.mjs for the one-shot cleanup).
export async function saveMissionImage(
  missionId: string,
  filename: string,
  bytes: Buffer
): Promise<{ url: string; path: string }> {
  await ensureDirs();
  const safeMission = safeId(missionId);
  const missionDir = path.join(PUBLIC_IMAGES_DIR, safeMission);
  await fs.mkdir(missionDir, { recursive: true });

  // Hash the incoming bytes.
  const { createHash } = await import("node:crypto");
  const incomingHash = createHash("sha256").update(bytes).digest("hex");

  // Scan existing files in this mission's folder for a matching hash.
  const existing = await fs.readdir(missionDir).catch(() => []);
  for (const name of existing) {
    const abs = path.join(missionDir, name);
    try {
      const existingBytes = await fs.readFile(abs);
      const h = createHash("sha256").update(existingBytes).digest("hex");
      if (h === incomingHash) {
        // Byte-identical file already exists — reuse it.
        return { url: `/mission-images/${safeMission}/${name}`, path: abs };
      }
    } catch {
      // ignore unreadable entries
    }
  }

  // No match — write a new file.
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stamped = `${Date.now()}_${safe}`;
  const dest = path.join(missionDir, stamped);
  await fs.writeFile(dest, bytes);
  return { url: `/mission-images/${safeMission}/${stamped}`, path: dest };
}

// Delete an uploaded mission image by its public URL. Best-effort — missing
// files are silently ignored. Refuses anything outside PUBLIC_IMAGES_DIR.
export async function deleteMissionImage(url: string): Promise<void> {
  if (!url.startsWith("/mission-images/")) return;
  await ensureDirs();
  // Strip leading slash, resolve to absolute, ensure it stays inside PUBLIC_IMAGES_DIR.
  const rel = url.replace(/^\//, "");
  const abs = path.resolve(process.cwd(), "public", rel);
  const inside = path.relative(PUBLIC_IMAGES_DIR, abs);
  if (inside.startsWith("..") || path.isAbsolute(inside)) return;
  await fs.unlink(abs).catch(() => {});
}
