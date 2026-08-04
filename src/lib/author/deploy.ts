// ============================================================================
// Deploy — one-shot "make this mission live on policydebate101.com"
// ----------------------------------------------------------------------------
// The Publish button writes JSON to disk. Deploy does the *other* three things
// that have to happen for a mission to actually show up for students:
//
//   1. Register the mission in src/app/bridge/page.tsx  (missions[] array)
//        → makes it visible on the student bridge, sorted by mission.number.
//   2. Register the mission in src/app/play/[id]/page.tsx  (REGISTRY object)
//        → makes /play/<mission-id> resolve instead of 404.
//   3. git add + commit + push to origin/main
//        → Vercel picks up the push and auto-deploys in ~60s.
//
// The registry edits are STRING-BASED, not AST. That's deliberate — the files
// have a predictable shape and I'd rather fail loudly than rewrite them wrong.
// If either file's pattern has drifted, we throw and refuse to proceed.
//
// Idempotent: safe to run twice. Skips whatever's already done.
//
// Dev-only: /author (and by extension anything it calls) is 404'd in
// production by middleware, so this file will never execute on Vercel.
// ============================================================================

import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readDraft, publishMission } from "./storage";

const execFileAsync = promisify(execFile);

const REPO_ROOT = process.cwd();
const BRIDGE_PATH   = path.join(REPO_ROOT, "src/app/bridge/page.tsx");
const REGISTRY_PATH = path.join(REPO_ROOT, "src/app/play/[id]/page.tsx");

export type DeployStep = {
  name: string;
  status: "ok" | "skipped" | "error";
  detail?: string;
};

export type DeployResult = {
  ok: boolean;
  missionId: string;
  steps: DeployStep[];
  commitSha?: string;
  errorMessage?: string;
};

// Turn "disadvantages-v1" into "disadvantagesV1" for the JS identifier.
function toCamel(id: string): string {
  return id
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[0-9]/, "_$&"); // don't start with a digit
}

// Add an import line just after the last matching existing mission import.
// If the exact import is already there, return the source unchanged.
function addMissionImport(src: string, id: string, varName: string): string {
  const importLine = `import ${varName} from "@/content/missions/${id}.json";`;
  if (src.includes(importLine)) return src;

  // Anchor: last existing `import <thing> from "@/content/missions/...json";`.
  const re = /^import\s+\S+\s+from\s+"@\/content\/missions\/[^"]+\.json";?$/gm;
  let lastEnd = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd === -1) {
    throw new Error(
      "Could not find any '@/content/missions/*.json' imports to anchor to. " +
      "Registry file shape has drifted; refusing to edit."
    );
  }
  return src.slice(0, lastEnd) + "\n" + importLine + src.slice(lastEnd);
}

// Append a mission to the bridge page's `missions[]` array.
function addToBridgeMissionsArray(src: string, varName: string): { next: string; changed: boolean } {
  // Match the whole `const missions: Mission[] = [ ... ].sort(...)` block.
  const re = /(const\s+missions:\s*Mission\[\]\s*=\s*\[)([\s\S]*?)(\]\.sort\(\(a,\s*b\)\s*=>\s*a\.number\s*-\s*b\.number\)\);)/m;
  const match = src.match(re);
  if (!match) {
    throw new Error(
      "Could not find `const missions: Mission[] = [ ... ].sort((a,b)=>a.number-b.number);` " +
      "in bridge/page.tsx. Shape has drifted; refusing to edit."
    );
  }
  const [full, head, body, tail] = match;
  // Already registered?
  const entryRe = new RegExp(`\\b${varName}\\b\\s+as\\s+Mission`);
  if (entryRe.test(body)) return { next: src, changed: false };

  // Preserve existing indentation (find any "  X as Mission," line).
  const indentMatch = body.match(/^([ \t]+)\S+\s+as\s+Mission,/m);
  const indent = indentMatch ? indentMatch[1] : "  ";
  const newEntry = `${indent}${varName.padEnd(20)}as Mission,\n`;

  // Insert before the closing bracket line. `body` already ends with a newline
  // after the last entry; append the new entry to body.
  const trimmedBody = body.endsWith("\n") ? body : body + "\n";
  const nextBlock = `${head}${trimmedBody}${newEntry}${tail}`;
  return { next: src.replace(full, nextBlock), changed: true };
}

// Add an entry to the /play/[id] REGISTRY object.
function addToPlayRegistry(src: string, id: string, varName: string): { next: string; changed: boolean } {
  const re = /(const\s+REGISTRY:\s*Record<string,\s*Mission>\s*=\s*\{)([\s\S]*?)(\n\};)/m;
  const match = src.match(re);
  if (!match) {
    throw new Error(
      "Could not find `const REGISTRY: Record<string, Mission> = { ... };` " +
      "in play/[id]/page.tsx. Shape has drifted; refusing to edit."
    );
  }
  const [full, head, body, tail] = match;
  // Already registered? Match on quoted key.
  const keyRe = new RegExp(`"${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:`);
  if (keyRe.test(body)) return { next: src, changed: false };

  // Match existing entries' indentation and use their column-alignment style.
  const indentMatch = body.match(/^([ \t]+)"[^"]+":/m);
  const indent = indentMatch ? indentMatch[1] : "  ";
  // Pad the quoted key to align with existing entries (approximate — 26 wide
  // covers the current longest key "claim-warrant-impact-v1":).
  const quotedKey = `"${id}":`;
  const padded = quotedKey.padEnd(26);
  const newEntry = `\n${indent}${padded} ${varName} as Mission,`;

  // Insert just before the closing "\n};" tail.
  const nextBlock = `${head}${body}${newEntry}${tail}`;
  return { next: src.replace(full, nextBlock), changed: true };
}

// Shell out to git. Uses execFile (not exec) — argv only, no shell.
async function git(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: REPO_ROOT, maxBuffer: 8 * 1024 * 1024 });
  return stdout.trim();
}

export async function deployMission(id: string): Promise<DeployResult> {
  const steps: DeployStep[] = [];
  const varName = toCamel(id);

  try {
    // 0. Validate the mission actually exists (draft or published).
    const mission = await readDraft(id);
    if (!mission) {
      throw new Error(`Mission "${id}" not found on disk.`);
    }

    // 1. Ensure it's published to src/content/missions/<id>.json.
    //    publishMission requires a draft; if the mission has already been
    //    published-and-the-draft-deleted, publishMission will throw. In that
    //    case, skip — the published file already exists.
    try {
      await publishMission(id);
      steps.push({ name: "Publish to disk", status: "ok" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("No draft found")) {
        steps.push({ name: "Publish to disk", status: "skipped", detail: "already published" });
      } else {
        throw e;
      }
    }

    // 2. Register in bridge/page.tsx.
    {
      const src = await fs.readFile(BRIDGE_PATH, "utf8");
      let next = addMissionImport(src, id, varName);
      const bridgeResult = addToBridgeMissionsArray(next, varName);
      next = bridgeResult.next;
      if (next !== src) {
        await fs.writeFile(BRIDGE_PATH, next, "utf8");
        steps.push({
          name: "Register in /bridge",
          status: "ok",
          detail: bridgeResult.changed ? "added to missions[]" : "import added",
        });
      } else {
        steps.push({ name: "Register in /bridge", status: "skipped", detail: "already registered" });
      }
    }

    // 3. Register in play/[id]/page.tsx.
    {
      const src = await fs.readFile(REGISTRY_PATH, "utf8");
      let next = addMissionImport(src, id, varName);
      const regResult = addToPlayRegistry(next, id, varName);
      next = regResult.next;
      if (next !== src) {
        await fs.writeFile(REGISTRY_PATH, next, "utf8");
        steps.push({
          name: "Register in /play/[id]",
          status: "ok",
          detail: regResult.changed ? "added to REGISTRY" : "import added",
        });
      } else {
        steps.push({ name: "Register in /play/[id]", status: "skipped", detail: "already registered" });
      }
    }

    // 4. Git: check for changes, commit, push.
    const status = await git("status", "--porcelain");
    if (!status) {
      steps.push({ name: "Git commit + push", status: "skipped", detail: "nothing to commit" });
      return { ok: true, missionId: id, steps };
    }

    // Stage everything currently modified. We intentionally include any
    // uploaded mission images and JSON changes — the assumption is the
    // Authoring Console is the only writer, so anything unstaged is intended.
    await git("add", "-A");
    await git("commit", "-m", `publish: ${id} via Authoring Console`);
    steps.push({ name: "Commit", status: "ok" });

    // Push. Non-interactive — if the remote asks for a password we'll hang;
    // Austin's remote uses HTTPS via macOS Keychain so this should be silent.
    await git("push", "origin", "HEAD:main");
    const commitSha = await git("rev-parse", "--short", "HEAD");
    steps.push({ name: "Push to origin/main", status: "ok", detail: `commit ${commitSha}` });

    return { ok: true, missionId: id, steps, commitSha };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    steps.push({ name: "FAILED", status: "error", detail: errorMessage });
    return { ok: false, missionId: id, steps, errorMessage };
  }
}
