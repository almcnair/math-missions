// SigninTrackers — tiny client-side helpers that fire analytics events
// when the teacher login forms submit. Keeps the surrounding page a server
// component. See src/lib/analytics.ts for the underlying track() wrapper.
//
// Added 2026-07-08 with the Vercel Analytics rollout.

"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

// Attaches a submit listener to the sibling form by ID.
export function SigninSubmitTracker({
  formId,
  method,
}: {
  formId: string;
  method: "password" | "google";
}) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const onSubmit = () => {
      trackEvent("coach_signin_attempt", { method });
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [formId, method]);
  return null;
}
