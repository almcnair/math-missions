// ============================================================================
// /auth/teacher-signin — Teacher magic-link request.
// ----------------------------------------------------------------------------
// Teacher submits email from /login. We send them a Supabase magic link
// (email OTP) that lands on /auth/callback. On callback we ensure their
// profile row exists (auto-create trigger handles this, but we sanity-check).
//
// This route intentionally does NOT check whether the email is already
// enrolled as a teacher. If Austin invited a colleague, they'll get promoted
// to teacher after clicking. If a random person tries, they'll land as a
// student with no teacher powers — the /teacher role gate keeps them out.
//
// Later we may add an invite-token flow (see PD101 /coach/join) to
// restrict who can become a teacher. For now: anyone can request a link,
// but the role gate is the actual security boundary.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const nextRaw = String(form.get("next") ?? "").trim();
  const next = nextRaw.startsWith("/") ? nextRaw : "/teacher";

  const origin = new URL(request.url).origin;

  const errorBack = (msg: string) => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", msg);
    if (email) url.searchParams.set("email", email);
    if (next && next !== "/teacher") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorBack("Please enter a valid email address.");
  }
  // Guard against the synthetic student email domain.
  if (email.endsWith("@math.local")) {
    return errorBack("Please use your real email address.");
  }

  // We build the request-scoped server client (no cookie writes expected
  // during signInWithOtp, but keep the plumbing consistent).
  const response = NextResponse.redirect(
    new URL(
      `/login?sent=1${next && next !== "/teacher" ? `&next=${encodeURIComponent(next)}` : ""}`,
      origin,
    ),
    { status: 303 },
  );

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

  const callbackUrl = new URL("/auth/callback", origin);
  if (next && next !== "/teacher") callbackUrl.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      // We don't want to auto-create Supabase auth users from the login
      // form — but for a first-teacher bootstrap, Austin needs SOME way in.
      // Leaving shouldCreateUser: true for now; revisit when invite tokens
      // land.
      shouldCreateUser: true,
    },
  });

  if (error) {
    return errorBack("Could not send sign-in link. Try again in a moment.");
  }

  return response;
}
