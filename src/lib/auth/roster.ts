// ============================================================================
// Roster + people management — teacher-side operations.
// ============================================================================
//
// Server-only. All calls bypass RLS via the admin client. The caller is
// responsible for verifying the requester is a teacher (server actions do
// this via requireTeacher()).
// ============================================================================

import { adminClient } from "@/lib/supabase/admin";

// ---------- Class creation --------------------------------------------------

export async function createClass(args: { teacherId: string; name: string }) {
  const admin = adminClient();
  const { data: codeRow, error: codeErr } = await admin.rpc("generate_join_code");
  if (codeErr || !codeRow) throw new Error(`Could not generate join code: ${codeErr?.message}`);
  const joinCode = codeRow as unknown as string;

  const { data, error } = await admin
    .from("classes")
    .insert({ teacher_id: args.teacherId, name: args.name, join_code: joinCode })
    .select("id, name, join_code")
    .single();
  if (error || !data) throw new Error(`Failed to create class: ${error?.message}`);
  return data as { id: string; name: string; join_code: string };
}

export async function listClassesForTeacher(teacherId: string) {
  const admin = adminClient();
  const { data } = await admin
    .from("classes")
    .select("id, name, join_code, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: true });
  return (data ?? []) as Array<{ id: string; name: string; join_code: string; created_at: string }>;
}

// ---------- Enrollment (assign a student to a class) ------------------------

export async function assignStudentToClass(args: {
  studentId: string;
  classId: string;
  // If true, remove existing enrollments before adding the new one so the
  // student ends up in exactly one class. Default true (single-class model).
  exclusive?: boolean;
}) {
  const admin = adminClient();
  const exclusive = args.exclusive ?? true;

  if (exclusive) {
    await admin
      .from("enrollments")
      .delete()
      .eq("student_id", args.studentId);
  }

  const { error } = await admin
    .from("enrollments")
    .insert({ class_id: args.classId, student_id: args.studentId });
  if (error && error.code !== "23505") {
    throw new Error(`Failed to enroll: ${error.message}`);
  }
}

export async function unassignStudentFromAllClasses(studentId: string) {
  const admin = adminClient();
  await admin.from("enrollments").delete().eq("student_id", studentId);
}

// ---------- Roster reads ----------------------------------------------------

export async function listStudentsForClass(classId: string) {
  const admin = adminClient();
  const { data: enrollments } = await admin
    .from("enrollments")
    .select("student_id")
    .eq("class_id", classId);
  const ids = (enrollments ?? []).map((e) => e.student_id as string);
  if (ids.length === 0) return [];

  const { data } = await admin
    .from("profiles")
    .select("id, display_name, email, rank_xp, credits, avatar_config, created_at")
    .in("id", ids)
    .eq("role", "student")
    .order("display_name", { ascending: true });

  return (data ?? []) as Array<{
    id: string;
    display_name: string;
    email: string;
    rank_xp: number;
    credits: number;
    avatar_config: unknown;
    created_at: string;
  }>;
}

// All profiles + their current enrollment(s). Used by the people-management UI.
export async function listAllPeople() {
  const admin = adminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, email, role, rank_xp, avatar_config, created_at")
    .order("created_at", { ascending: false });

  const { data: enrollments } = await admin
    .from("enrollments")
    .select("student_id, class_id, classes(id, name, join_code)");

  const enrollmentsByStudent = new Map<string, Array<{ id: string; name: string; join_code: string }>>();
  for (const row of enrollments ?? []) {
    const cls = (row as { classes?: { id: string; name: string; join_code: string } | { id: string; name: string; join_code: string }[] }).classes;
    const clsObj = Array.isArray(cls) ? cls[0] : cls;
    if (!clsObj) continue;
    const list = enrollmentsByStudent.get(row.student_id as string) ?? [];
    list.push(clsObj);
    enrollmentsByStudent.set(row.student_id as string, list);
  }

  return (profiles ?? []).map((p) => ({
    id: p.id as string,
    display_name: p.display_name as string,
    email: p.email as string,
    role: p.role as "student" | "teacher" | "admin",
    rank_xp: p.rank_xp as number,
    avatar_config: p.avatar_config,
    created_at: p.created_at as string,
    classes: enrollmentsByStudent.get(p.id as string) ?? [],
  }));
}

// ---------- Role management -------------------------------------------------

export async function setUserRole(userId: string, role: "student" | "teacher" | "admin") {
  const admin = adminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw new Error(`Failed to set role: ${error.message}`);
}

// ---------- Delete a person -------------------------------------------------

export async function removePerson(userId: string) {
  const admin = adminClient();
  // Cascades: auth.users -> profiles -> enrollments, attempts, completions, etc.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Failed to delete user: ${error.message}`);
}
