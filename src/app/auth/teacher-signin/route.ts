// /auth/teacher-signin — Teacher email+password sign-in via Route Handler.
// Same cookie-reliability reason as student-signin.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "").trim();
  const origin = new URL(request.url).origin;

  const errorBack = (msg: string) => {
    const url = new URL("/login/teacher", origin);
    url.searchParams.set("error", msg);
    return NextResponse.redirect(url, { status: 303 });
  };

  if (!email || !password) return errorBack("Email and password required.");

  const response = NextResponse.redirect(new URL("/coach", origin), { status: 303 });

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

  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return errorBack("Wrong email or password.");
  }

  // Verify the account is actually a teacher.
  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
    await supabase.auth.signOut();
    return errorBack("That account is not a teacher account.");
  }

  // Flush cookies before returning the redirect.
  await supabase.auth.getUser();
  return response;
}
