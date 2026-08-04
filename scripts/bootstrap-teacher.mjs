#!/usr/bin/env node
// ============================================================================
// scripts/bootstrap-teacher.mjs
// ----------------------------------------------------------------------------
// One-shot: creates a teacher account in Supabase + flips the profile role
// to 'teacher'. Run once per teacher.
//
// Usage:
//   node scripts/bootstrap-teacher.mjs <email> <displayName> [password]
//
// If you don't pass a password, one is generated and printed.
// ============================================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

function rand() {
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 6)).join("-");
}

async function main() {
  loadEnv();
  const [, , email, displayName, passwordArg] = process.argv;
  if (!email || !displayName) {
    console.error("Usage: node scripts/bootstrap-teacher.mjs <email> <displayName> [password]");
    process.exit(1);
  }
  const password = passwordArg || rand();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  // 1. Look up existing user
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = list?.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase()) ?? null;

  if (user) {
    console.log(`User already exists (${user.id}). Updating password + display name…`);
    await admin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { full_name: displayName },
    });
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    });
    if (error) {
      console.error("Failed to create user:", error.message);
      process.exit(1);
    }
    user = created.user;
    console.log(`Created user ${user.id}.`);
  }

  // 2. Promote to teacher in profiles
  const { error: profErr } = await admin
    .from("profiles")
    .update({ role: "teacher", display_name: displayName })
    .eq("id", user.id);
  if (profErr) {
    console.error("Profile update failed:", profErr.message);
    process.exit(1);
  }

  console.log("\n✓ Teacher account ready.");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Sign in:  /login/teacher`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
