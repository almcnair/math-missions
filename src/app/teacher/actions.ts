// ============================================================================
// Server actions for /teacher — student roster management.
// ----------------------------------------------------------------------------
// All actions call requireTeacher() first, which:
//   - checks there is a Supabase session
//   - checks the caller's profile.role is 'teacher' or 'admin'
// The middleware role gate is the primary defense; requireTeacher() is
// belt-and-suspenders in case a route handler is ever reached with a stale
// session or a client-side navigation quirk.
// ============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

// Username: starts with a letter, 3-32 chars, lowercase letters/digits/._-
const USERNAME_RE = /^[a-z][a-z0-9._-]{2,31}$/;
// PIN: 6 digits. Matches Supabase Auth's default 6-char password minimum
// so we don't have to reconfigure auth settings. Loosen later if desired.
const PIN_RE = /^\d{6}$/;

const STUDENT_EMAIL_DOMAIN = "math.local";

async function requireTeacher(): Promise<{ userId: string; role: "teacher" | "admin" }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/teacher");
  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
    redirect("/practice");
  }
  return { userId: user.id, role: profile.role as "teacher" | "admin" };
}

export type ActionResult = {
  ok: boolean;
  message?: string;
  // On successful student creation we return the credentials so the teacher
  // can write them down before the flash disappears.
  createdStudent?: {
    username: string;
    pin: string;
    displayName: string;
  };
};

export async function createStudentAction(formData: FormData): Promise<ActionResult> {
  await requireTeacher();

  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();

  if (!USERNAME_RE.test(usernameRaw)) {
    return {
      ok: false,
      message:
        "Username must be 3–32 characters, start with a letter, and use only lowercase letters, digits, or . _ -",
    };
  }
  if (!displayName || displayName.length > 80) {
    return { ok: false, message: "Display name is required (max 80 characters)." };
  }
  if (!PIN_RE.test(pin)) {
    return { ok: false, message: "PIN must be exactly 6 digits." };
  }

  const admin = adminClient();

  // Precheck: username must be unique (case-insensitive).
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", usernameRaw)
    .maybeSingle();
  if (existing) {
    return { ok: false, message: `Username "${usernameRaw}" is already taken.` };
  }

  const email = `${usernameRaw}@${STUDENT_EMAIL_DOMAIN}`;

  // Create the auth.users row. The on-insert trigger will create the
  // matching public.profiles row (role='student', display_name from
  // metadata or email prefix, coins=0, avatar_config={}).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true, // synthetic emails — skip the email verification step
    user_metadata: { display_name: displayName, username: usernameRaw },
  });

  if (createErr || !created?.user) {
    return {
      ok: false,
      message: createErr?.message ?? "Could not create the student account.",
    };
  }

  // Patch the profile row: set username + display_name explicitly. The
  // trigger sets display_name from metadata if the trigger reads it, but
  // we don't rely on that — write it directly.
  const { error: patchErr } = await admin
    .from("profiles")
    .update({
      username: usernameRaw,
      display_name: displayName,
    })
    .eq("id", created.user.id);

  if (patchErr) {
    // Auth user exists but profile patch failed. Clean up so we don't
    // leave an orphaned/half-configured account.
    await admin.auth.admin.deleteUser(created.user.id);
    return {
      ok: false,
      message: `Created auth user, but could not save profile: ${patchErr.message}`,
    };
  }

  revalidatePath("/teacher");
  return {
    ok: true,
    createdStudent: { username: usernameRaw, pin, displayName },
  };
}

export async function resetPinAction(formData: FormData): Promise<ActionResult> {
  await requireTeacher();

  const studentId = String(formData.get("student_id") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();

  if (!studentId) return { ok: false, message: "Missing student id." };
  if (!PIN_RE.test(pin)) {
    return { ok: false, message: "PIN must be exactly 6 digits." };
  }

  const admin = adminClient();

  // Confirm the target is actually a student (don't let this be used to
  // rewrite a teacher's password).
  const { data: target } = await admin
    .from("profiles")
    .select("id, role, username, display_name")
    .eq("id", studentId)
    .maybeSingle();
  if (!target) return { ok: false, message: "Student not found." };
  if (target.role !== "student") {
    return { ok: false, message: "Can only reset PINs for student accounts." };
  }

  const { error } = await admin.auth.admin.updateUserById(studentId, {
    password: pin,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/teacher");
  return {
    ok: true,
    createdStudent: {
      username: target.username ?? "(no username)",
      pin,
      displayName: target.display_name,
    },
  };
}

export async function deleteStudentAction(formData: FormData): Promise<ActionResult> {
  const { userId: actingUserId } = await requireTeacher();

  const studentId = String(formData.get("student_id") ?? "").trim();
  if (!studentId) return { ok: false, message: "Missing student id." };
  if (studentId === actingUserId) {
    return { ok: false, message: "You can't delete your own account." };
  }

  const admin = adminClient();

  // Confirm target is a student.
  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", studentId)
    .maybeSingle();
  if (!target) return { ok: false, message: "Student not found." };
  if (target.role !== "student") {
    return {
      ok: false,
      message: "This UI only deletes student accounts. Use SQL for teacher/admin removal.",
    };
  }

  // Delete the auth.users row. on delete cascade removes the profile row.
  const { error } = await admin.auth.admin.deleteUser(studentId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/teacher");
  return { ok: true };
}
