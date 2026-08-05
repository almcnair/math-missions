// ============================================================================
// /coach — Command Deck (coach dashboard, landing after teacher sign-in)
// ----------------------------------------------------------------------------
// Role: teacher | admin (enforced by middleware).
//
// v1 is a card grid — the "where do I want to go today" page. Each card is a
// destination with a live count where meaningful (classes, students, moves,
// missions). Recent-activity feed + quick actions are v2.
//
// Layout matches /coach/roster (space station chrome, corner brackets,
// mono display type). Everything is Server Component; card counts come
// from Supabase admin client (bypasses RLS since we've already verified
// role in middleware).
// ============================================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { SpaceBackdrop } from "@/components/Starfield";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import movesData from "@/content/lab-leaders/moves.json";

// Missions currently published to /bridge. Bump when a new lesson goes live.
// Kept as a constant here (rather than a JSON index) because /bridge itself
// hardcodes the ordered list of imports; single source of truth is over there,
// this is just a display number.
const PUBLISHED_MISSION_COUNT = 4;

export const dynamic = "force-dynamic";

// -------- Data ------------------------------------------------------------

async function loadDashboardData(userId: string) {
  const admin = adminClient();

  const [classesRes, studentsRes, teachersRes] = await Promise.all([
    admin.from("classes").select("id", { count: "exact", head: true }).eq("teacher_id", userId),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    admin.from("profiles").select("id", { count: "exact", head: true }).in("role", ["teacher", "admin"]),
  ]);

  return {
    classCount: classesRes.count ?? 0,
    studentCount: studentsRes.count ?? 0,
    teacherCount: teachersRes.count ?? 0,
    moveCount: Array.isArray((movesData as { moves?: unknown[] }).moves)
      ? (movesData as { moves: unknown[] }).moves.length
      : 0,
    missionCount: PUBLISHED_MISSION_COUNT,
  };
}

// -------- Page ------------------------------------------------------------

export default async function CoachDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Middleware already gates this, but defense-in-depth: if somehow no user,
  // send them to teacher login.
  if (!user) redirect("/login/teacher?next=/coach");

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  // Middleware should have caught this, but belt-and-suspenders.
  if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
    redirect("/bridge");
  }

  const data = await loadDashboardData(user.id);

  return (
    <div className="relative min-h-screen">
      <SpaceBackdrop />
      <main className="relative z-10 max-w-6xl mx-auto px-8 py-12 space-y-10">

        {/* Header */}
        <header className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="font-mono text-xs tracking-[0.3em] text-accent-cyan">
              ⟡ MATH MISSIONS SPACE STATION · COMMAND DECK
            </div>
            <h1 className="font-display text-4xl font-black">
              WELCOME BACK, {profile.display_name?.toUpperCase() ?? "COACH"}
            </h1>
            <p className="text-text-dim text-sm">
              Everything you need to run the classroom lives here.
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="font-mono text-[10px] tracking-[0.3em] text-text-dim hover:text-accent-cyan">
              SIGN OUT
            </button>
          </form>
        </header>

        {/* Card grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <CommandCard
            href="/coach/roster"
            icon="👥"
            title="ROSTER"
            tone="cyan"
            stat={`${data.classCount} class${data.classCount === 1 ? "" : "es"} · ${data.studentCount} debater${data.studentCount === 1 ? "" : "s"}`}
            description="Create classes, assign debaters, promote coaches. Every profile on the station lives here."
            cta="Open Roster"
          />

          <CommandCard
            href="/toolkit"
            icon="🧰"
            title="LAB LEADER TOOLKIT"
            tone="magenta"
            stat={`${data.moveCount} teacher moves · brain breaks · more`}
            description="Adult-facing tools for the room — teacher moves with scripts, brain-break wheel for resets, and more."
            cta="Open Toolkit"
          />

          <CommandCard
            href="/resources"
            icon="📚"
            title="DEBATER RESOURCES"
            tone="violet"
            stat="Glossary · slide decks · more"
            description="Student-facing hub — glossary, class slide decks, and graphic organizers. Point your debaters here."
            cta="Browse Resources"
          />

          <CommandCard
            href="/bridge"
            icon="🎯"
            title="MISSIONS"
            tone="cyan"
            stat={`${data.missionCount} published`}
            description="See what your debaters see — the student mission bridge. Great for previewing before class."
            cta="View Missions"
          />

          <CommandCard
            href="/author"
            icon="✍️"
            title="MISSION BUILDER"
            tone="magenta"
            stat="Author + publish"
            description="Draft new missions, edit slides, publish to the bridge. Local dev only — not available on production."
            cta="Open Builder"
          />

          <CommandCard
            href="/glossary"
            icon="📖"
            title="STUDENT TOOLS"
            tone="violet"
            stat="Public"
            description="Quick links to the tools debaters use directly. Anyone can view these — no login required."
            cta="Open Glossary"
          />
        </section>

        {/* Footer footnote */}
        <footer className="pt-6 border-t border-border-mid/30">
          <p className="font-mono text-[10px] tracking-[0.25em] text-text-faint">
            {data.teacherCount} coach{data.teacherCount === 1 ? "" : "es"} on the station · you can promote debaters to coach from the Roster page
          </p>
        </footer>

      </main>
    </div>
  );
}

// -------- CommandCard -----------------------------------------------------

type Tone = "cyan" | "magenta" | "violet";

const TONE_CLASSES: Record<Tone, { border: string; text: string; hover: string; glow: string }> = {
  cyan:    { border: "border-accent-cyan/30",    text: "text-accent-cyan",    hover: "hover:border-accent-cyan",    glow: "hover:shadow-[0_0_30px_-10px_rgba(6,182,212,0.5)]" },
  magenta: { border: "border-accent-magenta/30", text: "text-accent-magenta", hover: "hover:border-accent-magenta", glow: "hover:shadow-[0_0_30px_-10px_rgba(217,70,239,0.5)]" },
  violet:  { border: "border-accent-violet/30",  text: "text-accent-violet",  hover: "hover:border-accent-violet",  glow: "hover:shadow-[0_0_30px_-10px_rgba(139,92,246,0.5)]" },
};

function CommandCard({
  href,
  icon,
  title,
  tone,
  stat,
  description,
  cta,
}: {
  href: string;
  icon: string;
  title: string;
  tone: Tone;
  stat: string;
  description: string;
  cta: string;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <Link
      href={href}
      className={`group relative flex flex-col justify-between gap-5 border ${t.border} ${t.hover} ${t.glow} bg-bg-panel-solid/40 backdrop-blur-sm rounded-md p-6 transition-all min-h-[210px]`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="text-3xl leading-none">{icon}</div>
          <div className={`font-mono text-[9px] tracking-[0.3em] ${t.text} opacity-80`}>
            {stat}
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className={`font-display text-lg font-bold tracking-[0.15em] ${t.text}`}>
            {title}
          </h3>
          <p className="text-text-dim text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <div className={`font-mono text-[10px] tracking-[0.3em] ${t.text} opacity-70 group-hover:opacity-100 transition-opacity`}>
        {cta} →
      </div>
    </Link>
  );
}
