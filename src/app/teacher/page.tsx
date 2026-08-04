// ============================================================================
// /teacher — Teacher dashboard shell.
// ----------------------------------------------------------------------------
// v0 scope:
//   - List every student (role='student'), sorted by created_at desc.
//   - Add-student form (username + display name + PIN).
//   - Per-row: reset PIN, delete.
//
// Later:
//   - Assignments, class groupings, progress dashboards, session review.
//
// This is admin-facing UI — the sped-math-ui rules don't apply here.
// Dense is fine.
// ============================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { TeacherDashboardClient } from "./ui";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  // Middleware already gates this route, but double-check the role in
  // case of a stale session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/teacher");

  const admin = adminClient();

  const { data: me } = await admin
    .from("profiles")
    .select("id, role, display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!me || (me.role !== "teacher" && me.role !== "admin")) {
    redirect("/practice");
  }

  const { data: students, error: listErr } = await admin
    .from("profiles")
    .select("id, username, display_name, email, coins, created_at")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  return (
    <TeacherDashboardClient
      teacher={{ id: me.id, displayName: me.display_name, email: me.email }}
      students={students ?? []}
      listError={listErr?.message ?? null}
    />
  );
}
