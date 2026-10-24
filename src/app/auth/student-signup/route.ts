// ============================================================================
// /auth/student-signup — Create a new student account from name + 4-digit PIN.
// ----------------------------------------------------------------------------
// Flow:
//   1. Parse { displayName, pin, pin2 } from form POST.
//   2. Validate shape (name length, PIN is 4 digits, pins match).
//   3. Slugify displayName -> username (lowercase alphanumeric). Check if
//      taken; if yes, bounce back with a helpful suggestion.
//   4. Create auth.users via admin client:
//        email    = `{slug}@mathmissions.local` (synthetic — never emailed)
//        password = the 4-digit PIN (Supabase hashes it)
//        metadata = { full_name: raw displayName }
//      The 2026-06-22 profile-autocreate trigger will create a profiles row
//      with role='student'.
//   5. Upsert profile to set username + canonical display_name.
//   6. Sign them in via signInWithPassword so they land logged in.
//   7. Redirect to /bridge.
//
// No PIN recovery is possible — if a student forgets, they create a new
// account. UI makes this clear on /signup. See that page for the warning.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { adminClient } from "@/lib/supabase/admin";

const EMAIL_DOMAIN = "mathmissions.local";

// Normalize a display name into a lowercase, alphanumeric slug for the
// username column. Strips spaces and punctuation. Length-bounded.
function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
}

function back(origin: string, msg: string, name?: string) {
  const url = new URL("/signup", origin);
  url.searchParams.set("error", msg);
  if (name) url.searchParams.set("name", name);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const displayNameRaw = String(form.get("displayName") ?? "").trim();
  const pinRaw = String(form.get("pin") ?? "").trim();
  const pin2Raw = String(form.get("pin2") ?? "").trim();
  const origin = new URL(request.url).origin;

  // ---- shape validation --------------------------------------------------
  if (!displayNameRaw || displayNameRaw.length < 2) {
    return back(origin, "Please enter at least 2 letters for your name.", displayNameRaw);
  }
  if (displayNameRaw.length > 32) {
    return back(origin, "Name is too long (32 characters max).", displayNameRaw.slice(0, 32));
  }
  if (!/^\d{4}$/.test(pinRaw)) {
    return back(origin, "Your code must be exactly 4 digits.", displayNameRaw);
  }
  if (pinRaw !== pin2Raw) {
    return back(origin, "The two codes didn't match. Try again.", displayNameRaw);
  }

  const slug = slugify(displayNameRaw);
  if (slug.length < 2) {
    return back(
      origin,
      "Your name needs at least 2 letters or numbers (not just symbols).",
      displayNameRaw,
    );
  }

  // ---- uniqueness check --------------------------------------------------
  const admin = adminClient();
  const { data: existing, error: lookupErr } = await admin
    .from("profiles")
    .select("id, username")
    .eq("username", slug)
    .maybeSingle();

  if (lookupErr) {
    return back(origin, "Something went wrong. Try again in a moment.", displayNameRaw);
  }

  if (existing) {
    // Suggest 2–3 variants with trailing letters/digits so the student has
    // something concrete to try. We don't auto-pick for them per Austin's
    // spec (B.1 = unique names, auto-suggest).
    return back(
      origin,
      `The name "${displayNameRaw}" is already taken. Try adding your last initial (like "${displayNameRaw} S" or "${displayNameRaw} W"), or pick something different.`,
      displayNameRaw,
    );
  }

  // ---- create auth user --------------------------------------------------
  const email = `${slug}@${EMAIL_DOMAIN}`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: pinRaw,
    email_confirm: true,
    user_metadata: { full_name: displayNameRaw },
  });

  if (createErr || !created?.user) {
    // Surface the real Supabase error so we can see what's actually failing.
    // Logged to Vercel function logs AND included in the user-visible error
    // (prefixed with [debug]) so Austin can screenshot it. Will be re-hidden
    // behind a friendly generic once we know the root cause.
    const detail = createErr?.message ?? "no user returned";
    console.error("[student-signup] createUser failed:", detail, "email:", email);
    return back(
      origin,
      `[debug] createUser failed: ${detail}`,
      displayNameRaw,
    );
  }

  // ---- set username + canonical display_name on the profile --------------
  // The on_auth_user_created trigger has (probably) already inserted a
  // minimal profile. Upsert to layer our fields on top. role defaults to
  // 'student' from the trigger.
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert(
      {
        id: created.user.id,
        email,
        username: slug,
        display_name: displayNameRaw,
        role: "student",
      },
      { onConflict: "id" },
    );

  if (profileErr) {
    // Account exists but profile is wonky. Best-effort: let them try to
    // sign in anyway. Logged for debugging.
    console.error("[student-signup] profile upsert failed:", profileErr.message);
  }

  // ---- sign in and redirect ---------------------------------------------
  const success = NextResponse.redirect(new URL("/bridge", origin), { status: 303 });

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

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: pinRaw,
  });

  if (signInErr) {
    // Account was created but sign-in failed. Send them to /login/pin to
    // try signing in manually. (Shouldn't happen in practice.)
    const fallback = new URL("/login/pin", origin);
    fallback.searchParams.set("u", slug);
    fallback.searchParams.set(
      "error",
      "Your account was created — try signing in with your name and PIN.",
    );
    return NextResponse.redirect(fallback, { status: 303 });
  }

  return success;
}
