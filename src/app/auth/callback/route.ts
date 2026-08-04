// ============================================================================
// /auth/callback — Magic-link callback.
// ----------------------------------------------------------------------------
// Supabase redirects here after the teacher clicks their magic link. We
// exchange the code for a session, then redirect them into the app.
//
// The auto-create trigger on auth.users already inserts a matching row in
// public.profiles, so we don't need to do that here. But we DO need to
// forward Set-Cookie headers onto our redirect response — @supabase/ssr
// writes session cookies during exchangeCodeForSession and Route Handlers
// must build their own response for those to land.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/teacher";
  const next = nextParam.startsWith("/") ? nextParam : "/teacher";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Sign-in link is missing a code.")}`,
    );
  }

  const response = NextResponse.redirect(`${origin}${next}`);

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return response;
}
