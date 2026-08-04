"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import {
  createClass,
  assignStudentToClass,
  unassignStudentFromAllClasses,
  setUserRole,
  removePerson,
} from "@/lib/auth/roster";

async function requireTeacher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login/teacher?next=/coach/roster");
  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
    redirect("/login/teacher?error=Not%20a%20teacher%20account&next=/coach/roster");
  }
  return { userId: user.id, role: profile.role as "teacher" | "admin" };
}

export async function createClassAction(formData: FormData) {
  const { userId } = await requireTeacher();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await createClass({ teacherId: userId, name });
  revalidatePath("/coach/roster");
}

export async function assignStudentAction(formData: FormData) {
  await requireTeacher();
  const studentId = String(formData.get("studentId") ?? "").trim();
  const classId = String(formData.get("classId") ?? "").trim();
  if (!studentId) return;
  if (!classId) {
    await unassignStudentFromAllClasses(studentId);
  } else {
    await assignStudentToClass({ studentId, classId });
  }
  revalidatePath("/coach/roster");
}

export async function unassignStudentAction(formData: FormData) {
  await requireTeacher();
  const studentId = String(formData.get("studentId") ?? "").trim();
  if (!studentId) return;
  await unassignStudentFromAllClasses(studentId);
  revalidatePath("/coach/roster");
}

export async function setRoleAction(formData: FormData) {
  const { userId: actingUserId, role: actingRole } = await requireTeacher();
  const targetUserId = String(formData.get("userId") ?? "").trim();
  const newRole = String(formData.get("role") ?? "").trim();
  if (!targetUserId || !["student", "teacher", "admin"].includes(newRole)) return;
  // Only admins can create other admins (safety rail).
  if (newRole === "admin" && actingRole !== "admin") return;
  // A teacher can't demote themselves out of the teacher UI (would lock out).
  if (targetUserId === actingUserId && newRole === "student") return;
  await setUserRole(targetUserId, newRole as "student" | "teacher" | "admin");
  revalidatePath("/coach/roster");
}

export async function removePersonAction(formData: FormData) {
  const { userId: actingUserId } = await requireTeacher();
  const targetUserId = String(formData.get("userId") ?? "").trim();
  if (!targetUserId) return;
  // Can't delete yourself.
  if (targetUserId === actingUserId) return;
  await removePerson(targetUserId);
  revalidatePath("/coach/roster");
}
