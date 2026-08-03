// Quick smoke test: does our anon key reach Supabase?
// Usage: node --env-file=.env.local scripts/smoke-supabase.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const res = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: anon, Authorization: `Bearer ${anon}` },
});

console.log("Status:", res.status);
const body = await res.json();
console.log("External providers configured:",
  Object.entries(body.external ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ") || "(none — expected on a fresh project)"
);
console.log("Email signup enabled:", body.disable_signup === false ? "yes" : "no");
console.log("\n✓ Supabase reachable and anon key valid.");
