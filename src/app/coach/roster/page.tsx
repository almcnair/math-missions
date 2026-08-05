// ============================================================================
// /coach/roster — Class + people management. Coach-only.
// (Route was /teacher/roster before 2026-07-03; kept live via redirect.)
// ----------------------------------------------------------------------------
// Two sections:
//   1. CLASSES — create classes, see enrolled debaters per class.
//   2. PEOPLE — every profile on the platform, with controls to change role
//      and assign to a class. New Google signups land here as unassigned
//      students; the coach flips their class and (rarely) their role.
// ============================================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { SpaceBackdrop } from "@/components/Starfield";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import {
  listClassesForTeacher,
  listStudentsForClass,
  listAllPeople,
} from "@/lib/auth/roster";
import { rankFor } from "@/lib/xp";
import { Avatar } from "@/components/Avatar";
import { portraitIdFromConfig } from "@/lib/avatars";
import {
  createClassAction,
  assignStudentAction,
  unassignStudentAction,
  setRoleAction,
  removePersonAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login/teacher?next=/coach/roster");

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
    redirect("/login/teacher?error=Not%20a%20teacher%20account&next=/coach/roster");
  }

  const classes = await listClassesForTeacher(user.id);
  const rosters = await Promise.all(
    classes.map(async (c) => ({
      class: c,
      students: await listStudentsForClass(c.id),
    })),
  );

  const people = await listAllPeople();
  // Available class options for the assign dropdown: this teacher's classes.
  const classOptions = classes.map((c) => ({ id: c.id, name: c.name, join_code: c.join_code }));

  return (
    <div className="relative min-h-screen">
      <SpaceBackdrop />
      <main className="relative z-10 max-w-6xl mx-auto px-8 py-12 space-y-10">

        <header className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="font-mono text-xs tracking-[0.3em] text-accent-cyan">
              ⟡ MATH MISSIONS SPACE STATION · COMMAND DECK
            </div>
            <h1 className="font-display text-4xl font-black">ROSTER</h1>
            <p className="text-text-dim text-sm">
              Logged in as <span className="text-text-bright">{profile.display_name}</span>.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-5 font-mono text-[10px] tracking-[0.3em]">
              <Link href="/coach" className="text-text-dim hover:text-accent-cyan">
                ← DASHBOARD
              </Link>
              {profile.role === "admin" && (
                <Link href="/coach/invites" className="text-text-dim hover:text-accent-cyan">
                  INVITES
                </Link>
              )}
              <Link href="/toolkit" className="text-text-dim hover:text-accent-cyan">
                LAB LEADER TOOLKIT
              </Link>
              <Link href="/author" className="text-text-dim hover:text-accent-cyan">
                MISSION BUILDER
              </Link>
            </nav>
            <form action="/auth/signout" method="post">
              <button className="font-mono text-[10px] tracking-[0.3em] text-text-dim hover:text-accent-cyan">
                SIGN OUT
              </button>
            </form>
          </div>
        </header>

        {/* Create class */}
        <section className="border border-border-mid bg-bg-panel-solid/40 rounded-md p-5">
          <div className="font-mono text-[10px] tracking-[0.3em] text-text-dim mb-3">
            CREATE NEW CLASS
          </div>
          <form action={createClassAction} className="flex gap-3">
            <input
              name="name"
              type="text"
              required
              placeholder="e.g. Period 4 — 7th Grade"
              className="flex-1 px-4 py-2 bg-bg-deep border border-border-mid rounded-md font-mono text-sm focus:outline-none focus:border-accent-cyan"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-accent-cyan text-bg-deep font-mono text-xs tracking-[0.3em] font-bold hover:bg-accent-cyan-soft rounded-md"
            >
              CREATE
            </button>
          </form>
        </section>

        {/* Classes */}
        {rosters.length === 0 && (
          <div className="text-center text-text-dim text-sm py-6">
            No classes yet. Create one above.
          </div>
        )}

        {rosters.map(({ class: cls, students }) => (
          <section key={cls.id} className="space-y-4 border border-border-mid bg-bg-panel-solid/40 rounded-md p-6">
            <header className="flex items-baseline justify-between gap-4">
              <div>
                <div className="font-display text-2xl font-bold">{cls.name}</div>
                <div className="font-mono text-[11px] tracking-[0.25em] text-text-dim mt-1">
                  CLASS CODE · <span className="text-accent-cyan text-lg tracking-[0.4em]">{cls.join_code}</span>
                </div>
              </div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-text-faint">
                {students.length} DEBATER{students.length === 1 ? "" : "S"}
              </div>
            </header>

            {students.length === 0 && (
              <p className="text-text-dim text-sm">
                No debaters in this class yet. Assign them from the People section below.
              </p>
            )}

            {students.length > 0 && (
              <div className="space-y-1">
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 font-mono text-[9px] tracking-[0.3em] text-text-faint pb-2 border-b border-border-mid">
                  <span></span>
                  <span>NAME</span>
                  <span>EMAIL</span>
                  <span>RANK</span>
                  <span>CRD</span>
                </div>
                {students.map((s) => {
                  const rank = rankFor(s.rank_xp);
                  const pilotId = portraitIdFromConfig(s.avatar_config);
                  return (
                    <div
                      key={s.id}
                      className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center py-2 border-b border-border-mid/40"
                    >
                      <Avatar portraitId={pilotId} size="sm" />
                      <span className="font-display font-bold">{s.display_name}</span>
                      <span className="font-mono text-[10px] text-text-dim truncate">{s.email}</span>
                      <span className="font-mono text-[10px] tracking-[0.25em] text-accent-amber">{rank.name}</span>
                      <span className="font-mono text-sm text-accent-cyan">{s.credits}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}

        {/* People directory */}
        <section className="space-y-4 border border-border-mid bg-bg-panel-solid/40 rounded-md p-6">
          <header className="flex items-baseline justify-between gap-4">
            <div>
              <div className="font-display text-2xl font-bold">PEOPLE</div>
              <p className="font-mono text-[10px] tracking-[0.25em] text-text-dim mt-1">
                EVERYONE ON THE STATION · {people.length} PROFILE{people.length === 1 ? "" : "S"}
              </p>
            </div>
          </header>

          {people.length === 0 && (
            <p className="text-text-dim text-sm">
              No profiles yet. Users appear here after they sign in with Google.
            </p>
          )}

          {people.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1.5fr_1.5fr_0.9fr_1.4fr_auto] gap-3 font-mono text-[9px] tracking-[0.3em] text-text-faint pb-2 border-b border-border-mid">
                <span>NAME</span>
                <span>EMAIL</span>
                <span>ROLE</span>
                <span>CLASS</span>
                <span></span>
              </div>
              {people.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-[1.5fr_1.5fr_0.9fr_1.4fr_auto] gap-3 items-center py-2 border-b border-border-mid/40"
                >
                  <span className="font-display font-bold truncate">{p.display_name}</span>
                  <span className="font-mono text-[10px] text-text-dim truncate">{p.email}</span>
                  <form action={setRoleAction} className="flex items-center gap-1">
                    <input type="hidden" name="userId" value={p.id} />
                    <select
                      name="role"
                      defaultValue={p.role}
                      className="bg-bg-deep border border-border-mid rounded px-2 py-1 font-mono text-[10px] tracking-[0.2em] focus:outline-none focus:border-accent-cyan"
                    >
                      <option value="student">student</option>
                      <option value="teacher">teacher</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      type="submit"
                      className="font-mono text-[9px] tracking-[0.25em] text-text-faint hover:text-accent-cyan"
                      title="Save role"
                    >
                      SAVE
                    </button>
                  </form>
                  <div className="flex items-center gap-2">
                    {p.role === "student" ? (
                      <>
                        <form action={assignStudentAction} className="flex items-center gap-1 min-w-0">
                          <input type="hidden" name="studentId" value={p.id} />
                          <select
                            name="classId"
                            defaultValue={p.classes[0]?.id ?? ""}
                            className="bg-bg-deep border border-border-mid rounded px-2 py-1 font-mono text-[10px] tracking-[0.2em] focus:outline-none focus:border-accent-cyan max-w-[140px]"
                          >
                            <option value="">— unassigned —</option>
                            {classOptions.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="font-mono text-[9px] tracking-[0.25em] text-text-faint hover:text-accent-cyan"
                            title="Assign"
                          >
                            SET
                          </button>
                        </form>
                        {p.classes.length > 0 && (
                          <form action={unassignStudentAction}>
                            <input type="hidden" name="studentId" value={p.id} />
                            <button
                              type="submit"
                              className="font-mono text-[9px] tracking-[0.25em] text-text-faint hover:text-status-warn"
                              title="Remove from all classes"
                            >
                              CLEAR
                            </button>
                          </form>
                        )}
                      </>
                    ) : (
                      <span className="font-mono text-[10px] text-text-faint">—</span>
                    )}
                  </div>
                  <form action={removePersonAction}>
                    <input type="hidden" name="userId" value={p.id} />
                    <button
                      type="submit"
                      className="font-mono text-[9px] tracking-[0.25em] text-text-faint hover:text-status-warn"
                      title="Permanently delete this account"
                    >
                      REMOVE
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
