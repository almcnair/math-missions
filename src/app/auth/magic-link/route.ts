// ============================================================================
// /auth/magic-link — Send a passwordless magic link to a student email.
// ----------------------------------------------------------------------------
// Student types email → Supabase emails a one-click sign-in link → clicking
// the link lands on /auth/callback which exchanges the code and ensures a
// student profile row (same path as Google OAuth). No password, no OAuth
// consent screen, no Google-Workspace-admin problems. Works with any email
// address, including @cps.edu accounts that block third-party OAuth.
//
// This route is intentionally forgiving: it never confirms whether an email
// exists in the database (Supabase treats sign-in and sign-up the same for
// magic links, which is fine — first click creates the account, second click
// signs in). We just tell the student "check your email."
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const emailRaw = String(form.get("email") ?? "").trim().toLowerCase();
  const nextRaw = String(form.get("next") ?? "/camp").trim();
  const next = nextRaw.startsWith("/") ? nextRaw : "/camp";

  const origin = new URL(request.url).origin;

  const errorBack = (msg: string) => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", msg);
    return NextResponse.redirect(url, { status: 303 });
  };

  // Very light validation — Supabase will do the real work.
  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return errorBack("Please enter a valid email address.");
  }

  // Carrier response for cookie plumbing (magic-link sign-in itself doesn't
  // set session cookies here — the session is created when the student
  // clicks the link and hits /auth/callback — but @supabase/ssr still needs
  // a response object to write to).
  const sent = NextResponse.redirect(
    new URL(`/login?sent=${encodeURIComponent(emailRaw)}`, origin),
    { status: 303 },
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            sent.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithOtp({
    email: emailRaw,
    options: {
      // Auto-create the account on first click. Students are new users; we
      // don't want to force a separate sign-up step.
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    // Rate-limit errors are the common failure mode ("Email rate limit
    // exceeded" from Supabase's built-in mailer). Surface a clean message.
    const msg = error.message.toLowerCase().includes("rate limit")
      ? "Too many sign-in attempts. Try again in a few minutes."
      : "Could not send the sign-in email. Try again in a moment.";
    return errorBack(msg);
  }

  return sent;
}
