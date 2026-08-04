// Admin Supabase client — uses the service role key, BYPASSES RLS.
//
// ⚠️ NEVER import this from a Client Component. The service role key has
// full database access. Use this ONLY in:
//   - Route Handlers (src/app/**/route.ts)
//   - Server Actions (functions marked "use server")
//   - Server-only helpers
//
// Use cases in Math Missions:
//   1. Student login — looking up the synthetic email for a given username
//      BEFORE the student has an auth.uid() (RLS would block them).
//   2. Teacher roster management — creating student accounts + resetting
//      PINs via the Supabase auth admin API.
//
// Regular DB reads/writes that happen on behalf of a logged-in user should
// keep using the per-request client from "@/lib/supabase/server" so RLS
// enforces authorization.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// We don't have generated schema types yet; type the admin client loosely
// so callers can interact with arbitrary tables without compile errors.
// RLS is bypassed at runtime by the service role anyway.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: SupabaseClient<any, any, any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adminClient(): SupabaseClient<any, any, any> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
