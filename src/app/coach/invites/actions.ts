"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

// ---- Auth guard -----------------------------------------------------------

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login/teacher?next=/coach/invites");

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/coach?error=Admin%20only");
  }
  return user.id;
}

// ---- Token generation -----------------------------------------------------

// 32 bytes = 256 bits of entropy, URL-safe base64 (no padding).
function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

// ---- Server actions -------------------------------------------------------

export async function createCoachInviteAction(formData: FormData) {
  const adminId = await requireAdmin();
  const admin = adminClient();

  const classId = String(formData.get("class_id") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const expiresInDays = Math.max(
    1,
    Math.min(90, Number(formData.get("expires_in_days") ?? "14") || 14),
  );
  // Seats on the invite (defaults to 2 for the two-lab-leaders pattern).
  // Clamp to [1, 10] so an admin can't accidentally make an unlimited link.
  const maxUses = Math.max(
    1,
    Math.min(10, Number(formData.get("max_uses") ?? "2") || 2),
  );

  if (!classId) return;

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const token = generateInviteToken();

  await admin.from("coach_invite_tokens").insert({
    token,
    class_id: classId,
    email,
    note,
    created_by: adminId,
    expires_at: expiresAt.toISOString(),
    max_uses: maxUses,
  });

  revalidatePath("/coach/invites");
}

export async function revokeCoachInviteAction(formData: FormData) {
  await requireAdmin();
  const admin = adminClient();
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return;

  // Revoke = expire immediately. We never delete rows so the invite history
  // remains auditable (who was invited to what and when).
  await admin
    .from("coach_invite_tokens")
    .update({ expires_at: new Date().toISOString() })
    .eq("token", token)
    .is("used_at", null);

  revalidatePath("/coach/invites");
}
