// ============================================================================
// /auth/debater-signin — Email + password sign-in AND sign-up for debaters.
// ----------------------------------------------------------------------------
// Single form → single route. Strategy:
//   1. Try signInWithPassword. If it succeeds → done, redirect to next.
//   2. If sign-in fails with 'Invalid login credentials', try signUp. If
//      the sign-up succeeds AND returns a session → done, redirect to next.
//   3. Any other failure → redirect back to /login with a clear error.
//
// This gives the student ONE form ("email + password + button") that works
// whether they're new or returning. No email confirmation flow, no magic
// links, no PINs — just password auth.
//
// Requires: Supabase Auth → "Confirm email" must be OFF for this project,
// otherwise signUp returns a user with no session and the student sits in
// limbo. If confirm-email is on, we surface a clear error naming the fix.
//
// Same Route-Handler-with-createServerClient pattern as
// /auth/teacher-signin so cookies land on the redirect response.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { adminClient } from "@/lib/supabase/admin";

const MIN_PASSWORD_LEN = 6;

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const emailRaw = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const nextRaw = String(form.get("next") ?? "/bridge").trim();
  const next = nextRaw.startsWith("/") ? nextRaw : "/bridge";

  const origin = new URL(request.url).origin;

  const errorBack = (msg: string, extra: Record<string, string> = {}) => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", msg);
    if (emailRaw) url.searchParams.set("email", emailRaw);
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
    return NextResponse.redirect(url, { status: 303 });
  };

  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return errorBack("Please enter a valid email address.");
  }
  if (!password) {
    return errorBack("Please enter a password.");
  }
  if (password.length < MIN_PASSWORD_LEN) {
    return errorBack(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
  }

  // Build the "success" response up-front so @supabase/ssr can attach
  // session cookies to it.
  const response = NextResponse.redirect(new URL(next, origin), { status: 303 });

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
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // ---------------------------------------------------------------------
  // Step 1: try to sign in.
  // ---------------------------------------------------------------------
  const signIn = await supabase.auth.signInWithPassword({
    email: emailRaw,
    password,
  });

  if (signIn.data.user && !signIn.error) {
    // Flush cookies and go.
    await supabase.auth.getUser();
    return response;
  }

  // ---------------------------------------------------------------------
  // Step 2: sign-in failed. If it's "invalid credentials", this could be
  // a brand-new user OR a returning user with a typo. We attempt signUp
  // — if the email doesn't exist yet, this creates it; if it does exist,
  // signUp errors out and we surface "wrong password."
  // ---------------------------------------------------------------------
  const isInvalidCreds =
    signIn.error?.message?.toLowerCase().includes("invalid login credentials") ?? false;

  if (!isInvalidCreds) {
    // Some other failure (rate limit, service down, etc). Surface it.
    return errorBack(signIn.error?.message ?? "Sign-in failed. Please try again.");
  }

  const signUp = await supabase.auth.signUp({
    email: emailRaw,
    password,
    options: {
      // Land on /auth/callback for the (hopefully unused) confirm-email path.
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (signUp.error) {
    const msg = signUp.error.message.toLowerCase();

    // Email already registered → user typed the wrong password on step 1.
    if (
      msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("user already registered")
    ) {
      return errorBack("Wrong password for that email. Try again.");
    }
    if (msg.includes("rate limit")) {
      return errorBack("Too many attempts. Try again in a few minutes.");
    }
    return errorBack(signUp.error.message);
  }

  // If the project has "Confirm email" turned ON, signUp returns a user
  // but NO session. That means the student would sit here with no cookie
  // and think we're broken. Flag it clearly.
  if (!signUp.data.session) {
    return errorBack(
      "Account created, but sign-in is blocked by an email-confirmation setting. Ask the site owner to turn off 'Confirm email' in Supabase Auth.",
    );
  }

  // Sign-up succeeded WITH a session. Ensure a profile row exists so the
  // app's role-aware nav and RLS policies have something to hang off.
  // Idempotent: if the DB trigger already created a profile, the upsert
  // is a no-op via primary-key conflict.
  const userId = signUp.data.user?.id;
  if (userId) {
    const admin = adminClient();
    const displayName = emailRaw.split("@")[0] || "Debater";
    await admin.from("profiles").upsert(
      {
        id: userId,
        email: emailRaw,
        display_name: displayName,
        role: "student",
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  }

  // Flush cookies onto the response and go.
  await supabase.auth.getUser();
  return response;
}
