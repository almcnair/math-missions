// useHomeHref — role-aware destination for the "Home" / wordmark link.
//
// Problem this solves: the site wordmark and logo used to point at "/", which
// is rewritten to public/landing/index.html (the anonymous marketing page).
// Coaches and debaters clicking "Home" from /toolkit or /teacher-moves landed
// back on the sign-in landing and felt like they'd been logged out — even
// though their Supabase session was fine.
//
// Behavior:
//   - Anonymous users  → "/"        (marketing landing, unchanged)
//   - Debaters         → "/bridge"  (their dashboard)
//   - Teachers / admin → "/coach"   (their dashboard)
//
// Resolution is async (needs the session + profile row), so we return the
// safe default "/" until we know. That's the same URL as before, so nothing
// regresses while the check is in flight.
//
// Only for client components. Server components should resolve role directly.

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_HREF = "/";

export function useHomeHref(): string {
  const [href, setHref] = useState<string>(DEFAULT_HREF);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function resolve() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setHref("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      const role = profile?.role;
      if (role === "teacher" || role === "admin") {
        setHref("/coach");
      } else {
        // student, unknown, or profile row not yet created → debater bridge
        setHref("/bridge");
      }
    }

    resolve();

    // Re-resolve on auth changes (sign-in / sign-out during the session).
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      resolve();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return href;
}
