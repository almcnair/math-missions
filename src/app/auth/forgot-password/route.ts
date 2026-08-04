// ============================================================================
// /auth/forgot-password — Send a password-reset email.
// ----------------------------------------------------------------------------
// Student enters email → Supabase emails a reset link → clicking the link
// lands on /auth/reset-password where they set a new password and get
// signed in.
//
// Intentionally forgiving: we never confirm whether the email exists in
// the database (to prevent enumeration). Success message reads the same
// either way. Rate-limit errors from Supabase are surfaced clearly.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const emailRaw = String(form.get("email") ?? "").trim().toLowerCase();
  const origin = new URL(request.url).origin;

  const errorBack = (msg: string) => {
    const url = new URL("/login/forgot", origin);
    url.searchParams.set("error", msg);
    if (emailRaw) url.searchParams.set("email", emailRaw);
    return NextResponse.redirect(url, { status: 303 });
  };

  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return errorBack("Please enter a valid email address.");
  }

  const sent = NextResponse.redirect(
    new URL(`/login/forgot?sent=${encodeURIComponent(emailRaw)}`, origin),
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

  const { error } = await supabase.auth.resetPasswordForEmail(emailRaw, {
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    const msg = error.message.toLowerCase().includes("rate limit")
      ? "Too many reset attempts. Try again in a few minutes."
      : "Could not send reset email. Try again in a moment.";
    return errorBack(msg);
  }

  return sent;
}
