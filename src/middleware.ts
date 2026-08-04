// ============================================================================
// Middleware — auth gating + role-based route protection
// ----------------------------------------------------------------------------
// Runs on every request (minus static assets). Handles three things:
//
//   1. /author PROD LOCKDOWN — the Authoring Studio writes to the local
//      filesystem; on Vercel the FS is read-only, so we 404 /author on prod.
//
//   2. AUTH GATE — non-public routes require a Supabase session. Anonymous
//      requests redirect to /login?next=<original-path>.
//
//   3. ROLE GATE — /coach/* requires role='teacher' or 'admin'. Students who
//      paste a /coach URL get bounced to /bridge.
//
// Public routes: /, /landing/*, /glossary, /brain-breaks, /toolkit,
// /resources, /teacher-moves, /games/*, /login, /auth/*, /api/public/*.
// Everything else is gated.
//
// Cookie handling: Supabase's session refresh rotates cookies during
// getUser(); we forward those onto the redirect response so the refreshed
// token actually reaches the browser (otherwise the next request looks
// logged out again).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Prefix match. Root "/" is handled separately.
const PUBLIC_PREFIXES = [
  "/landing",
  "/glossary",
  "/brain-breaks",
  "/toolkit",
  "/resources",
  "/teacher-moves",
  "/games",
  "/login",
  "/auth",
  "/api/public",
  // 2026-07-08: /privacy is the site's data-collection notice, linked
  // from landing + in-app footers. Must be reachable without login.
  "/privacy",
  // Coach magic-link invite entry point and its "expired" landing.
  // Anonymous visitors must be able to click the invite URL, and the
  // expired page must render even for users who never became a teacher.
  "/coach/join",
];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ---- /author production lockdown --------------------------------------
  if (process.env.VERCEL_ENV === "production" && pathname.startsWith("/author")) {
    return new NextResponse("Not found", { status: 404 });
  }

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

  const { data: { user } } = await supabase.auth.getUser();
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

  // ---- Role gate: /coach/* is teacher/admin only -----------------------
  // Exempts /coach/join/* — that path is the magic-link invite claim flow
  // and MUST be reachable by students (and even anonymous visitors, though
  // they're handled by the public-route branch above).
  if (user && pathname.startsWith("/coach") && !pathname.startsWith("/coach/join")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role;
    if (role !== "teacher" && role !== "admin") {
      const bounce = request.nextUrl.clone();
      bounce.pathname = "/bridge";
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
