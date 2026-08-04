#!/usr/bin/env node
// ============================================================================
// dedupe-mission-images.mjs
// ----------------------------------------------------------------------------
// One-shot cleanup for duplicate mission-images accumulated by the Authoring
// Console. For each mission folder under public/mission-images/, groups files
// by SHA-256, picks the OLDEST file (lowest timestamp prefix) as canonical,
// rewrites every JSON reference to that hash to point at the canonical file,
// and trashes the duplicates.
//
// Duplicates are moved to ~/.Trash via /usr/bin/trash if available, otherwise
// mv to a timestamped .trash-<ts>/ dir under the repo. Never rm.
//
// Usage:
//   node scripts/dedupe-mission-images.mjs             # dry-run (default)
//   node scripts/dedupe-mission-images.mjs --apply     # actually do it
// ============================================================================

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const REPO = path.resolve(new URL("..", import.meta.url).pathname);
const IMAGES_DIR = path.join(REPO, "public/mission-images");
const MISSIONS_DIR = path.join(REPO, "src/content/missions");
const DRAFTS_DIR = path.join(MISSIONS_DIR, "drafts");

const APPLY = process.argv.includes("--apply");

async function sha256(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

// "1783181619442_Impact_Calc.png" → 1783181619442
function timestampFromFilename(name) {
  const m = name.match(/^(\d+)_/);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

function trashPath(dest) {
  // Try common `trash` locations, then fall back to mv into .trash-<ts>/.
  const candidates = [
    "/usr/bin/trash",
    "/usr/local/bin/trash",
    "/opt/homebrew/bin/trash",
  ];
  for (const bin of candidates) {
    try {
      execFileSync(bin, [dest], { stdio: "pipe" });
      return "trashed";
    } catch {
      // try next
    }
  }
  // Fallback: mv into .trash-<ts>/ next to the repo.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const stash = path.join(REPO, `.trash-${stamp}`);
  const target = path.join(stash, path.basename(dest));
  execFileSync("mkdir", ["-p", stash]);
  execFileSync("mv", [dest, target]);
  return `moved to ${path.relative(REPO, target)}`;
}

async function loadMissionFiles() {
  const files = [];
  for (const dir of [MISSIONS_DIR, DRAFTS_DIR]) {
    try {
      const entries = await fs.readdir(dir);
      for (const e of entries) {
        if (e.endsWith(".json")) files.push(path.join(dir, e));
      }
    } catch {}
  }
  return files;
}

// Deep string-replace inside a JSON value.
function replaceUrls(obj, mapping) {
  if (typeof obj === "string") {
    return mapping[obj] ?? obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((v) => replaceUrls(v, mapping));
  }
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = replaceUrls(v, mapping);
    }
    return out;
  }
  return obj;
}

async function main() {
  console.log(`\n${APPLY ? "🔧 APPLY MODE" : "🔍 DRY-RUN (pass --apply to execute)"}\n`);

  const missionDirs = await fs.readdir(IMAGES_DIR, { withFileTypes: true });
  const missionJsonPaths = await loadMissionFiles();
  const missionJsonBodies = new Map();
  for (const p of missionJsonPaths) {
    missionJsonBodies.set(p, await fs.readFile(p, "utf8"));
  }

  let totalReclaimed = 0;
  let totalTrashed = 0;
  const urlRemap = {}; // old public URL → new public URL

  for (const entry of missionDirs) {
    if (!entry.isDirectory()) continue;
    const missionId = entry.name;
    const dirAbs = path.join(IMAGES_DIR, missionId);
    const files = await fs.readdir(dirAbs);
    if (files.length === 0) continue;

    // Group by hash.
    const byHash = new Map();
    for (const f of files) {
      const abs = path.join(dirAbs, f);
      const stat = await fs.stat(abs).catch(() => null);
      if (!stat || !stat.isFile()) continue;
      const h = await sha256(abs);
      if (!byHash.has(h)) byHash.set(h, []);
      byHash.get(h).push({ name: f, abs, size: stat.size });
    }

    for (const [hash, group] of byHash) {
      if (group.length < 2) continue;
      // Sort by timestamp ASC; keep the OLDEST as canonical.
      group.sort((a, b) => timestampFromFilename(a.name) - timestampFromFilename(b.name));
      const [keep, ...drop] = group;
      const keepUrl = `/mission-images/${missionId}/${keep.name}`;

      console.log(`\n[${missionId}] hash=${hash.slice(0, 12)}…`);
      console.log(`  KEEP  ${keep.name}  (${(keep.size / 1024 / 1024).toFixed(2)} MB)`);
      for (const d of drop) {
        const dropUrl = `/mission-images/${missionId}/${d.name}`;
        console.log(`  DROP  ${d.name}  → remap to canonical`);
        urlRemap[dropUrl] = keepUrl;
        totalReclaimed += d.size;
      }
    }
  }

  if (Object.keys(urlRemap).length === 0) {
    console.log("\n✓ No duplicates found. Nothing to do.\n");
    return;
  }

  // Update JSON files.
  console.log(`\n--- JSON updates ---`);
  const jsonChanges = [];
  for (const [jsonPath, body] of missionJsonBodies) {
    const parsed = JSON.parse(body);
    const updated = replaceUrls(parsed, urlRemap);
    const nextBody = JSON.stringify(updated, null, 2);
    if (nextBody !== body) {
      // Count how many URL substitutions happened.
      let count = 0;
      for (const [oldUrl] of Object.entries(urlRemap)) {
        const matches = body.split(oldUrl).length - 1;
        count += matches;
      }
      console.log(`  ${path.relative(REPO, jsonPath)}: ${count} references remapped`);
      jsonChanges.push({ path: jsonPath, body: nextBody });
    }
  }

  // Delete/trash duplicate files.
  console.log(`\n--- File cleanup ---`);
  const toDelete = [];
  for (const entry of missionDirs) {
    if (!entry.isDirectory()) continue;
    const missionId = entry.name;
    const dirAbs = path.join(IMAGES_DIR, missionId);
    const files = await fs.readdir(dirAbs).catch(() => []);
    for (const f of files) {
      const publicUrl = `/mission-images/${missionId}/${f}`;
      if (publicUrl in urlRemap) {
        toDelete.push(path.join(dirAbs, f));
      }
    }
  }
  console.log(`  ${toDelete.length} files staged for trash`);

  console.log(`\n--- Summary ---`);
  console.log(`  Files to trash:     ${toDelete.length}`);
  console.log(`  Disk to reclaim:    ${(totalReclaimed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  JSON files touched: ${jsonChanges.length}`);

  if (!APPLY) {
    console.log(`\nDry-run only. Re-run with --apply to execute.\n`);
    return;
  }

  console.log(`\n🔧 Applying...`);
  for (const { path: p, body } of jsonChanges) {
    await fs.writeFile(p, body, "utf8");
  }
  for (const f of toDelete) {
    const disposition = trashPath(f);
    totalTrashed++;
  }
  console.log(`\n✓ Done. ${totalTrashed} files trashed, ${jsonChanges.length} JSON files rewritten.`);
  console.log(`  Reclaimed ~${(totalReclaimed / 1024 / 1024).toFixed(2)} MB.\n`);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
