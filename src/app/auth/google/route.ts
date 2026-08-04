// ============================================================================
// /auth/google — Start Google OAuth flow.
// ----------------------------------------------------------------------------
// Form POST → Supabase generates the Google authorization URL (and writes a
// PKCE code_verifier cookie) → we redirect the browser to Google's consent
// screen. The callback route reads the code_verifier cookie to complete the
// exchange, so cookies MUST land on the outgoing redirect response.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const nextRaw = String(form.get("next") ?? "/bridge").trim();
  const next = nextRaw.startsWith("/") ? nextRaw : "/bridge";

  const origin = new URL(request.url).origin;

  // Build a placeholder redirect first so setAll() has a response object to
  // write cookies onto. We'll swap the destination once we have the OAuth URL.
  const errorTarget = next.startsWith("/teacher") || next.startsWith("/author")
    ? "/login/teacher"
    : "/login";

  // Use a "carrier" response we can attach cookies to. If the OAuth call
  // succeeds we swap its Location; if it fails we redirect to the login error.
  const carrier = NextResponse.redirect(new URL(errorTarget, origin), { status: 303 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            carrier.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    const err = encodeURIComponent(error?.message ?? "Could not start Google sign-in.");
    const failUrl = new URL(errorTarget, origin);
    failUrl.searchParams.set("error", err);
    // Reuse the carrier so any partial cookies still make it back.
    const fail = NextResponse.redirect(failUrl, { status: 303 });
    carrier.cookies.getAll().forEach((c) => fail.cookies.set(c));
    return fail;
  }

  // Success: swap the carrier's Location to Google's URL, keep the cookies.
  const go = NextResponse.redirect(data.url, { status: 303 });
  carrier.cookies.getAll().forEach((c) => go.cookies.set(c));
  return go;
}
