// ============================================================================
// /auth/signout — Sign out the current user and redirect to /login.
// ----------------------------------------------------------------------------
// POST only. Any UI that signs out should submit a form to this route.
// ============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
