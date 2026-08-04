#!/usr/bin/env node
// Quick diagnostic: list auth.users + profiles + most recent classes.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {}
}
loadEnv();
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: list } = await admin.auth.admin.listUsers({ perPage: 50 });
console.log(`\n=== auth.users (${list.users.length}) ===`);
for (const u of list.users) {
  console.log(`  ${u.id.slice(0, 8)}…  ${u.email}`);
}

const { data: profiles } = await admin
  .from("profiles")
  .select("id, display_name, email, role, pin_set, pin_locked_at, primary_class_id")
  .order("created_at", { ascending: false });
console.log(`\n=== profiles (${profiles?.length ?? 0}) ===`);
for (const p of profiles ?? []) {
  console.log(`  ${p.id.slice(0, 8)}…  role=${p.role}  pin_set=${p.pin_set}  locked=${p.pin_locked_at ? "Y" : "n"}  class=${p.primary_class_id ? p.primary_class_id.slice(0,8)+"…" : "—"}  ${p.display_name}  <${p.email}>`);
}

const { data: classes } = await admin
  .from("classes")
  .select("id, name, join_code, teacher_id");
console.log(`\n=== classes (${classes?.length ?? 0}) ===`);
for (const c of classes ?? []) {
  console.log(`  ${c.id.slice(0,8)}…  ${c.join_code}  "${c.name}"  teacher=${c.teacher_id.slice(0,8)}…`);
}
console.log();
