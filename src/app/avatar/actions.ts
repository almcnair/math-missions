"use server";

// ============================================================================
// /avatar — server actions
// ----------------------------------------------------------------------------
// selectPilot(portraitId) — writes the chosen pilot id to profiles.avatar_config.
//   * Validates portraitId is in the known roster.
//   * Uses the authenticated supabase client so RLS enforces self-only writes.
// ============================================================================

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPilotId } from "@/lib/avatars";

export async function selectPilot(formData: FormData) {
  const portraitId = String(formData.get("portraitId") ?? "").trim();

  if (!isPilotId(portraitId)) {
    redirect(`/avatar?error=${encodeURIComponent("Unknown pilot id.")}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_config: { portraitId } })
    .eq("id", user.id);

  if (error) {
    redirect(`/avatar?error=${encodeURIComponent(error.message)}`);
  }

  // Bust the cached bridge page so the new avatar shows up immediately.
  revalidatePath("/bridge");
  revalidatePath("/avatar");

  // After picking, head to the bridge.
  redirect("/bridge?picked=1");
}
