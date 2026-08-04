#!/usr/bin/env node
// ============================================================================
// scripts/create-students.mjs
// ----------------------------------------------------------------------------
// Bulk-create camp students with synthetic email + shared PIN.
//
// Prerequisite: run supabase/migrations/2026-07-15_student_pin_auth.sql in
// the Supabase SQL editor first (adds profiles.username).
//
// Usage:
//   node scripts/create-students.mjs
//   node scripts/create-students.mjs --dry-run
//   node scripts/create-students.mjs --pin 654321
//   node scripts/create-students.mjs --cohort cdsi2027
//
// Idempotent: if a username already exists we skip it and print SKIP.
// ============================================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---------- config ----------------------------------------------------------

const DEFAULT_PIN = "123456";
const DEFAULT_COHORT = "cdsi2026";
const EMAIL_DOMAIN = "pd101.local";

// Roster (first names). Update this list to add / remove students.
const ROSTER = [
  "Annabel",
  "Annie",
  "Anupam",
  "Arya",
  "Christa",
  "Eleanora",
  "Henry",
  "Kavya",
  "Joash",
  "Steven",
  "Khongorzul",
  "Val",
  "Rebecca",
  "Grayson",
  "Daniel",
  "Olivia",
  "Sharanya",
  "Agastya",
];

// ---------- env -------------------------------------------------------------

function loadEnv() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* fine — env may already be set */
  }
}

// ---------- args ------------------------------------------------------------

function parseArgs(argv) {
  const args = { dryRun: false, pin: DEFAULT_PIN, cohort: DEFAULT_COHORT };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--pin") args.pin = argv[++i];
    else if (a === "--cohort") args.cohort = argv[++i];
    else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

// ---------- helpers ---------------------------------------------------------

function usernameFor(firstName) {
  return firstName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function emailFor(username, cohort) {
  return `${username}.${cohort}@${EMAIL_DOMAIN}`;
}

// ---------- main ------------------------------------------------------------

async function main() {
  loadEnv();
  const { dryRun, pin, cohort } = parseArgs(process.argv);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  if (!/^\d{4,8}$/.test(pin)) {
    console.error(`PIN must be 4-8 digits. Got: ${pin}`);
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Sanity: does profiles.username exist? If the migration hasn't been run,
  // bail loudly with the exact command the user needs. (Skipped on --dry-run
  // so you can preview the plan before applying the migration.)
  if (!dryRun) {
    const { error: probeError } = await supabase
      .from("profiles")
      .select("username")
      .limit(1);
    if (probeError && /column.*username.*does not exist/i.test(probeError.message)) {
      console.error(
        "profiles.username column is missing. Run this migration first in the Supabase SQL editor:\n" +
          "  supabase/migrations/2026-07-15_student_pin_auth.sql",
      );
      process.exit(1);
    }
  }

  console.log(
    `\n${dryRun ? "[DRY RUN] " : ""}Creating ${ROSTER.length} students ` +
      `(cohort=${cohort}, pin=${pin})\n`,
  );

  const results = [];

  for (const firstName of ROSTER) {
    const username = usernameFor(firstName);
    const email = emailFor(username, cohort);
    const displayName = firstName.trim();

    if (dryRun) {
      console.log(`  [dry] ${displayName.padEnd(14)} → ${email}  (username: ${username})`);
      continue;
    }

    // Skip if this username already exists.
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .maybeSingle();

    if (existing) {
      console.log(`  SKIP  ${displayName.padEnd(14)} — username '${username}' already exists`);
      results.push({ username, status: "skipped" });
      continue;
    }

    // Create the auth user with the synthetic email + PIN as password.
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: pin,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });

    if (createError || !created?.user) {
      console.error(`  FAIL  ${displayName.padEnd(14)} — ${createError?.message ?? "unknown"}`);
      results.push({ username, status: "failed" });
      continue;
    }

    // Insert / upsert the profile row. The 2026-06-22 profile-autocreate
    // trigger may have already inserted a minimal row; upsert to be safe
    // and layer our fields on top.
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: created.user.id,
          email,
          display_name: displayName,
          username,
          role: "student",
        },
        { onConflict: "id" },
      );

    if (profileError) {
      console.error(`  FAIL  ${displayName.padEnd(14)} — profile: ${profileError.message}`);
      results.push({ username, status: "failed" });
      continue;
    }

    console.log(`  OK    ${displayName.padEnd(14)} → ${username}`);
    results.push({ username, status: "created" });
  }

  if (!dryRun) {
    const created = results.filter((r) => r.status === "created").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const failed = results.filter((r) => r.status === "failed").length;
    console.log(`\nDone. created=${created} skipped=${skipped} failed=${failed}\n`);
    if (failed > 0) process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
