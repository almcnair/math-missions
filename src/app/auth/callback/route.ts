// OAuth callback handler. Supabase redirects here after Google sign-in;
// we exchange the code for a session, ensure a profile row exists, then
// redirect to wherever the debater was headed.
//
// Route Handlers MUST build their own response and forward the Set-Cookie
// headers that @supabase/ssr writes during exchangeCodeForSession.
// Reusing the shared createClient() from /lib/supabase/server uses
// next/headers cookies(), which can be unreliable inside a redirect from a
// GET handler. We build a request-scoped client here so cookies land on the
// redirect response.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { adminClient } from "@/lib/supabase/admin";
import { COACH_INVITE_COOKIE } from "@/app/coach/join/route";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/camp";
  // Reassignable so a valid coach-invite claim can redirect the user to
  // /coach instead of the default debater landing.
  let next = nextParam;

  // If a coach-invite cookie is present, ensure the post-OAuth landing is
  // the coach dashboard rather than the debater default. The token itself
  // is validated after profile-ensure below.
  const inviteToken = request.cookies.get(COACH_INVITE_COOKIE)?.value ?? null;
  if (inviteToken && (next === "/camp" || next === "/bridge")) {
    next = "/coach";
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // Build the redirect response up front so we can attach cookies to it.
  // We rebuild the URL just before returning in case a coach-invite claim
  // wants to override the destination (e.g. to /coach/roster).
  let redirectPath = next;
  const response = NextResponse.redirect(`${origin}${redirectPath}`);

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
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Ensure profile row exists for this user. Idempotent: first sign-in creates
  // a default "student" profile; later sign-ins are no-ops because of the
  // unique id constraint. Coach promotion happens only via the magic-link
  // invite flow below — there is no email/domain allowlist.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!existing) {
      const displayName =
        user.user_metadata.full_name ??
        user.user_metadata.name ??
        user.email?.split("@")[0] ??
        "Debater";
      await supabase.from("profiles").insert({
        id: user.id,
        email: user.email!,
        display_name: displayName,
        role: "student",
      });
    }

    // -----------------------------------------------------------------
    // Coach magic-link invite claim.
    // -----------------------------------------------------------------
    // If the visitor arrived via /coach/join?t=<token>, that route stashed
    // the token in an HttpOnly cookie. We now:
    //   1. Validate the token again server-side (defense in depth).
    //   2. If valid: promote to teacher (idempotent for existing teachers),
    //      insert class_coaches row, mark token used.
    //   3. Clear the cookie so a later sign-in doesn't accidentally re-use
    //      an already-consumed invite.
    //   4. Redirect to /coach on success, or /coach/join/expired otherwise.
    if (inviteToken) {
      const admin = adminClient();
      const { data: invite } = await admin
        .from("coach_invite_tokens")
        .select("token, class_id, email, expires_at, used_at, uses, max_uses")
        .eq("token", inviteToken)
        .maybeSingle();

      let claimReason: string | null = null;
      const now = Date.now();
      // Has THIS coach already claimed THIS token? If so, treat the second
      // click as a no-op (idempotent) rather than "expired" — they just
      // clicked their own link twice.
      let alreadyClaimed = false;

      if (invite) {
        const { data: existingClaim } = await admin
          .from("coach_invite_claims")
          .select("token")
          .eq("token", inviteToken)
          .eq("coach_id", user.id)
          .maybeSingle();
        alreadyClaimed = !!existingClaim;
      }

      if (!invite) claimReason = "unknown";
      // "Fully consumed" = every seat taken. If the current coach already
      // holds one of those seats, we still let them through (idempotent).
      else if (
        !alreadyClaimed &&
        (invite.used_at || (invite.uses ?? 0) >= (invite.max_uses ?? 1))
      )
        claimReason = "used";
      else if (new Date(invite.expires_at).getTime() < now) claimReason = "expired";
      else if (
        invite.email &&
        user.email &&
        invite.email.toLowerCase() !== user.email.toLowerCase()
      ) {
        // Token was bound to a specific email but a different Google
        // account clicked the link. Reject.
        claimReason = "email_mismatch";
      }

      if (!claimReason && invite) {
        // Promote to teacher (only if currently student; never demote admin).
        await admin
          .from("profiles")
          .update({ role: "teacher" })
          .eq("id", user.id)
          .eq("role", "student");

        // Attach to lab (idempotent via composite PK).
        await admin
          .from("class_coaches")
          .upsert(
            { class_id: invite.class_id, coach_id: user.id, added_by: user.id },
            { onConflict: "class_id,coach_id" },
          );

        // Record this claim (idempotent — composite PK on token+coach_id).
        // If it was already there, the insert no-ops via onConflict.
        const { error: claimInsertError } = await admin
          .from("coach_invite_claims")
          .upsert(
            { token: inviteToken, coach_id: user.id },
            { onConflict: "token,coach_id", ignoreDuplicates: true },
          );

        // Only bump uses + mark fully-used on a genuinely NEW claim, not on
        // an idempotent re-click of the same coach's own link.
        if (!alreadyClaimed && !claimInsertError) {
          const nextUses = (invite.uses ?? 0) + 1;
          const isFinalSeat = nextUses >= (invite.max_uses ?? 1);
          const patch: {
            uses: number;
            used_by: string;
            used_at?: string;
          } = {
            uses: nextUses,
            used_by: user.id,
          };
          if (isFinalSeat) patch.used_at = new Date().toISOString();

          await admin
            .from("coach_invite_tokens")
            .update(patch)
            .eq("token", inviteToken)
            // Guard: don't overwrite if the count moved under us (another
            // coach claimed concurrently). Matching on the pre-update `uses`
            // gives us optimistic concurrency without a serializable txn.
            .eq("uses", invite.uses ?? 0);
        }

        redirectPath = "/coach";
      } else {
        redirectPath = `/coach/join/expired?reason=${encodeURIComponent(
          claimReason ?? "unknown",
        )}`;
      }

      // Always clear the invite cookie once we've made a decision.
      response.cookies.set(COACH_INVITE_COOKIE, "", {
        path: "/",
        maxAge: 0,
      });
    }
  }

  // Rebuild the redirect if the claim flow overrode the destination.
  if (redirectPath !== next) {
    const overridden = NextResponse.redirect(`${origin}${redirectPath}`);
    response.cookies.getAll().forEach((c) => overridden.cookies.set(c));
    return overridden;
  }

  return response;
}
