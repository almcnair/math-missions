// One-off: find + optionally delete a user by email substring.
// Usage:
//   node scripts/find-orphan-user.mjs austin
//   node scripts/find-orphan-user.mjs austin --delete
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, "");
}

const needle = (process.argv[2] ?? "").toLowerCase();
const doDelete = process.argv.includes("--delete");
if (!needle) { console.error("usage: find-orphan-user.mjs <email-substring> [--delete]"); process.exit(1); }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
if (error) { console.error(error); process.exit(1); }

const matches = data.users.filter(u => (u.email ?? "").toLowerCase().includes(needle));
console.log(`Found ${matches.length} matching users:`);
for (const u of matches) {
  console.log(`  ${u.id}  ${u.email}  confirmed=${!!u.email_confirmed_at}  created=${u.created_at}`);
}

if (doDelete) {
  for (const u of matches) {
    // Delete profile row first (FK to auth.users)
    const { error: pe } = await supabase.from("profiles").delete().eq("id", u.id);
    if (pe) console.log(`  profile delete ${u.email}: ${pe.message}`);
    const { error: ue } = await supabase.auth.admin.deleteUser(u.id);
    console.log(`  auth delete ${u.email}: ${ue ? ue.message : "OK"}`);
  }
}
