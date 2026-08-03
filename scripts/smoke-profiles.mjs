// Smoke test: is the profiles table present, and does anon-key access hit RLS?
// Usage: node --env-file=.env.local scripts/smoke-profiles.mjs

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
  headers: { apikey: anon, Authorization: `Bearer ${anon}` },
});

const body = await res.text();
console.log("Status:", res.status);
console.log("Body:", body);
console.log();

// Expected results:
//   • 200 with []   → table exists; RLS lets anon read (should NOT happen)
//   • 200 with rows → table exists; RLS lets anon read (should NOT happen)
//   • 401           → PostgREST rejected the request (usually bad key)
//   • 404           → table missing
//   • Any other 4xx → check the JSON body for a hint
//
// With our RLS ("own profile read" requires auth.uid() = id), anon should get
// 200 [] — anon is treated as a valid but unauthenticated principal, so
// SELECT hits the RLS filter and returns zero rows. Table missing would be
// a 404 with "relation \"public.profiles\" does not exist".

if (res.status === 200) {
  const rows = JSON.parse(body);
  if (rows.length === 0) {
    console.log("✓ profiles table exists and RLS is filtering anon reads to zero rows (expected).");
  } else {
    console.log("⚠ profiles table exists but anon read returned rows — RLS may be misconfigured.");
  }
} else if (res.status === 404) {
  console.log("✗ profiles table missing (404).");
} else {
  console.log(`? Unexpected status ${res.status}.`);
}
