// ============================================================================
// /auth/student-signin — Username + PIN sign-in for students without email.
// ----------------------------------------------------------------------------
// Flow:
//   1. Student POSTs { username, pin } from /login/student.
//   2. We look up the synthetic email stored on their profile
//      (e.g. `annabel.cdsi2026@pd101.local`) using the admin client so we
//      don't need RLS access before login.
//   3. We call supabase.auth.signInWithPassword with that synthetic email
//      and the submitted PIN. Supabase validates the password and returns
//      session cookies via @supabase/ssr's cookie plumbing.
//   4. Redirect to /camp (or ?next=...).
//
// We deliberately return the SAME generic error for "no such username" and
// "wrong PIN" so this endpoint can't be used to enumerate rostered names.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { adminClient } from "@/lib/supabase/admin";

const GENERIC_ERROR = "That name and PIN don't match. Try again.";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const usernameRaw = String(form.get("username") ?? "").trim().toLowerCase();
  const pinRaw = String(form.get("pin") ?? "").trim();
  const nextRaw = String(form.get("next") ?? "/camp").trim();
  const next = nextRaw.startsWith("/") ? nextRaw : "/camp";

  const origin = new URL(request.url).origin;

  const errorBack = (msg: string) => {
    const url = new URL("/login/student", origin);
    url.searchParams.set("error", msg);
    // Preserve the username so the student doesn't have to retype it.
    if (usernameRaw) url.searchParams.set("u", usernameRaw);
    return NextResponse.redirect(url, { status: 303 });
  };

  // Basic input validation. Kept intentionally loose — the real check is
  // Supabase Auth on signInWithPassword.
  if (!usernameRaw || !/^[a-z][a-z0-9-]{0,31}$/.test(usernameRaw)) {
    return errorBack("Please enter your first name.");
  }
  if (!/^\d{4,8}$/.test(pinRaw)) {
    return errorBack("PIN should be 4–8 digits.");
  }

  // Look up the synthetic email for this username. Admin client bypasses
  // RLS (we're pre-session, so the student has no auth.uid() yet).
  const admin = adminClient();
  const { data: profile, error: lookupError } = await admin
    .from("profiles")
    .select("email, username")
    .eq("username", usernameRaw)
    .maybeSingle();

  if (lookupError) {
    return errorBack("Something went wrong. Try again in a moment.");
  }
  if (!profile) {
    // Same generic error as wrong-PIN so we don't leak roster membership.
    return errorBack(GENERIC_ERROR);
  }

  // Build the redirect response first so cookie writes land on it.
  const success = NextResponse.redirect(new URL(next, origin), { status: 303 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            success.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: pinRaw,
  });

  if (signInError) {
    return errorBack(GENERIC_ERROR);
  }

  return success;
}
