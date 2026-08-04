#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, "");
}

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const NAMES = ["annabel","annie","anupam","arya","christa","eleanora","henry","kavya","joash","steven","khongorzul","val","rebecca","grayson","daniel","olivia","sharanya","agastya"];

const { data, error } = await s
  .from("profiles")
  .select("id, username, email, display_name, role, created_at")
  .in("username", NAMES)
  .order("username");

if (error) { console.error(error); process.exit(1); }
console.log(`Found ${data.length} rows:\n`);
for (const r of data) {
  console.log(`  ${(r.username ?? "").padEnd(12)} ${r.email.padEnd(40)} role=${r.role} created=${r.created_at.slice(0,10)}`);
}
