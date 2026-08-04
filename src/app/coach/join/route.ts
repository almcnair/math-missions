// ============================================================================
// /coach/join?t=<token> — Magic-link coach invite entry point.
// ----------------------------------------------------------------------------
// A coach receives a URL like https://policydebate101.com/coach/join?t=<token>.
// This handler:
//   1. Validates the token exists, is not used, and is not expired.
//   2. Stashes the token in a short-lived HttpOnly cookie (~15 min) so the
//      OAuth round-trip can carry it back to /auth/callback.
//   3. Builds the Google OAuth URL directly and 302s to Google — no
//      intermediate "redirecting…" page. Same code path as /auth/google,
//      inlined here so we can carry the invite cookie in one hop.
//
// The actual promotion + class_coaches insert happens in /auth/callback
// AFTER the OAuth exchange, so we know who claimed the invite.
//
// Notes:
//   • Validation is deliberately duplicated in the callback (defense in depth).
//   • If the token is bad, we redirect to /coach/join/expired instead of
//     stranding the user on a blank page.
//   • Google-account email is only compared to `email` on the token AFTER
//     the OAuth exchange (we don't know the coach's Google address here).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { adminClient } from "@/lib/supabase/admin";

// Cookie name kept in sync with /auth/callback. If you rename it, update both.
export const COACH_INVITE_COOKIE = "pd101_coach_invite";
const COOKIE_MAX_AGE_SECONDS = 15 * 60; // 15 minutes

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = (searchParams.get("t") ?? "").trim();

  if (!token) {
    return NextResponse.redirect(new URL("/coach/join/expired?reason=missing", origin));
  }

  // Look up the token with the admin client. Reads bypass RLS so this works
  // whether the visitor is signed in or not.
  const admin = adminClient();
  const { data: invite } = await admin
    .from("coach_invite_tokens")
    .select("token, expires_at, used_at, uses, max_uses")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.redirect(new URL("/coach/join/expired?reason=unknown", origin));
  }
  // Multi-use guard: reject once every seat is claimed. `used_at` is stamped
  // on the final claim (defense in depth if uses somehow lags).
  if (invite.used_at || (invite.uses ?? 0) >= (invite.max_uses ?? 1)) {
    return NextResponse.redirect(new URL("/coach/join/expired?reason=used", origin));
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/coach/join/expired?reason=expired", origin));
  }

  // Token looks good. Build the OAuth URL directly here and redirect straight
  // to Google — no HTML shim, no auto-submitting form. We inline the same
  // pattern used by /auth/google so the coach's browser makes ONE extra hop
  // (this route) before landing on Google's account chooser.
  //
  // The invite cookie AND Supabase's PKCE code_verifier cookie must both land
  // on the outgoing redirect response, so we use a "carrier" response object.
  const errorTarget = "/login/teacher";
  const carrier = NextResponse.redirect(new URL(errorTarget, origin), { status: 303 });

  // Attach the invite cookie right away so it survives even the error path.
  carrier.cookies.set(COACH_INVITE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

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
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/coach")}`,
    },
  });

  if (error || !data.url) {
    const err = encodeURIComponent(error?.message ?? "Could not start Google sign-in.");
    const failUrl = new URL(errorTarget, origin);
    failUrl.searchParams.set("error", err);
    const fail = NextResponse.redirect(failUrl, { status: 303 });
    carrier.cookies.getAll().forEach((c) => fail.cookies.set(c));
    return fail;
  }

  // Success: swap the carrier's Location to Google's URL, keep all cookies
  // (invite token + Supabase PKCE verifier).
  const go = NextResponse.redirect(data.url, { status: 303 });
  carrier.cookies.getAll().forEach((c) => go.cookies.set(c));
  return go;
}
