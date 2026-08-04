// ============================================================================
// Middleware — auth gating + role-based route protection
// ----------------------------------------------------------------------------
// Runs on every request (minus static assets). Handles two things:
//
//   1. AUTH GATE — non-public routes require a Supabase session. Anonymous
//      requests redirect to /login?next=<original-path>.
//
//   2. ROLE GATE — /teacher/* requires role='teacher' or 'admin'. Students
//      who paste a /teacher URL get bounced back to /practice.
//
// Public routes: /, /login/*, /auth/*, /api/public/*. Everything else is
// gated. As Math Missions grows we may add marketing pages here.
//
// Cookie handling: Supabase's session refresh rotates cookies during
// getUser(); we forward those onto the redirect response so the refreshed
// token actually reaches the browser (otherwise the next request looks
// logged out again). This bit is subtle — PD101 learned it the painful way.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Prefix match. Root "/" is handled separately.
const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/api/public",
];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Auth not configured — pass everything through (dev fallback).
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isPublic = isPublicRoute(pathname);

  // ---- Auth gate --------------------------------------------------------
  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  // ---- Role gate: /teacher/* is teacher/admin only ---------------------
  if (user && pathname.startsWith("/teacher")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role;
    if (role !== "teacher" && role !== "admin") {
      const bounce = request.nextUrl.clone();
      bounce.pathname = "/practice";
      bounce.search = "";
      const redirect = NextResponse.redirect(bounce);
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)"],
};
