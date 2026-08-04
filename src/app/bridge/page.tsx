// The Debater Bridge — inside-the-ship, post-login home base.
//
// Server-side rank: rank_xp on the profile is the cumulative sum of best_rank_xp
// across all mission_progress rows (i.e. completed missions). RANKS in xp.ts
// is the source of truth; this page just renders.
//
// Layout (locked 2026-06-24):
//   - Welcome line ("Welcome to the bridge, {name}.")
//   - Rank chip with progress bar to next rank
//   - Single CTA: Launch Next Mission (= next mission in linear order the
//     debater hasn't finished yet)
//   - YOUR PATH: full mission list with status icons
//       ✓ complete   ▶ in progress / next   ○ available   🔒 locked by rank

import Link from "next/link";
import claimWarrantImpact from "@/content/missions/claim-warrant-impact-v1.json";
import whatIsDebate from "@/content/missions/what-is-debate-v1.json";
import speechOrder from "@/content/missions/speech-order-v1.json";
import affBasics from "@/content/missions/aff-basics-v1.json";
import disadvantages from "@/content/missions/disadvantages-v1.json";
import impactCalculus from "@/content/missions/impact-calculus-v1.json";
import type { Mission } from "@/lib/mission-schema";
import { SpaceBackdrop } from "@/components/Starfield";
import { DebaterNav } from "@/components/DebaterNav";
import { Avatar } from "@/components/Avatar";
import { portraitIdFromConfig, MYSTERY_PILOT_ID } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";
import { rankFor, nextRankName, RANKS, rankRequiredFor } from "@/lib/xp";

export const dynamic = "force-dynamic";

// The cfu-types-demo mission is a dev artifact — intentionally not in the
// public path. Add new missions here in the order debaters should play them.
// Publicly-live missions only (2026-07-02): the first four intro/core lessons.
// welcome-aboard, day1_block1, and inherency are still registered in
// /play/[id]/page.tsx (accessible by direct URL) but are not on the student path.
const missions: Mission[] = [
  whatIsDebate        as Mission,
  claimWarrantImpact  as Mission,
  speechOrder         as Mission,
  affBasics           as Mission,
  disadvantages       as Mission,
  impactCalculus      as Mission,
].sort((a, b) => a.number - b.number);

type ProgressRow = {
  mission_id: string;
  best_credits: number;
  ever_perfect: boolean;
  attempts: number;
};

async function loadProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, credits, rank_xp, avatar_config")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: progress } = await supabase
    .from("mission_progress")
    .select("mission_id, best_credits, ever_perfect, attempts")
    .eq("student_id", user.id);

  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("class_id")
    .eq("student_id", user.id)
    .limit(1);

  return {
    name: profile.display_name as string,
    credits: profile.credits as number,
    rankXp: profile.rank_xp as number,
    avatarConfig: profile.avatar_config as unknown,
    progress: (progress ?? []) as ProgressRow[],
    hasClass: (enrollmentRows ?? []).length > 0,
  };
}

// ---------- Tiny presentational pieces (kept in-file to avoid churn) -------

function RankChip({
  name,
  rankXp,
  completedCount,
}: {
  name: string;
  rankXp: number;
  completedCount: number;
}) {
  // Find current rank index + next threshold for the progress bar.
  const currentIdx = (() => {
    let idx = 0;
    for (let i = 0; i < RANKS.length; i++) if (rankXp >= RANKS[i].xp) idx = i;
    return idx;
  })();
  const current = RANKS[currentIdx];
  const next    = RANKS[currentIdx + 1] ?? null;
  const nextName = nextRankName(rankXp);

  const floor = current.xp;
  const ceil  = next?.xp ?? current.xp;
  const span  = Math.max(ceil - floor, 1);
  const filled = next ? Math.min(rankXp - floor, span) : span;
  const pct = Math.round((filled / span) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between font-mono text-[10px] tracking-[0.3em] text-text-dim">
        <span>RANK · <span className="text-accent-amber">{name}</span></span>
        {next && nextName ? (
          <span>
            {Math.max(next.xp - rankXp, 0)} TO <span className="text-accent-cyan">{nextName}</span>
          </span>
        ) : (
          <span className="text-accent-cyan">MAX RANK</span>
        )}
      </div>
      <div className="h-2 rounded-full bg-bg-deep border border-border-mid overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent-cyan to-accent-amber transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="font-mono text-[10px] tracking-[0.25em] text-text-faint">
        {completedCount} MISSION{completedCount === 1 ? "" : "S"} COMPLETE
      </div>
    </div>
  );
}

export default async function Bridge() {
  const profile = await loadProfile();

  // Not signed in — keep the existing prompt, but simpler.
  if (!profile) {
    return (
      <div className="relative min-h-screen">
        <SpaceBackdrop />
        <DebaterNav />
        <main className="relative z-10 max-w-4xl mx-auto px-8 py-16 space-y-8">
          <header className="space-y-3">
            <div className="font-mono text-xs tracking-[0.3em] text-accent-cyan">
              ⟡ POLICY DEBATE 101 SPACE STATION · MISSION CONTROL
            </div>
            <h1 className="font-display text-5xl font-black">SIGN IN TO BOARD</h1>
            <p className="text-text-dim">
              Your missions, rank, and progress live in Mission Control.
            </p>
          </header>
          <a
            href="/login?next=%2Fbridge"
            className="inline-block px-5 py-3 bg-accent-cyan text-bg-deep font-mono text-xs tracking-[0.3em] font-bold hover:bg-accent-cyan-soft"
          >
            SIGN IN
          </a>
        </main>
      </div>
    );
  }

  const rankXp = profile.rankXp;
  const rank = rankFor(rankXp);
  const pilotId = portraitIdFromConfig(profile.avatarConfig);
  const pilotPickedYet = pilotId !== MYSTERY_PILOT_ID;
  const progressByMission = new Map(profile.progress.map((p) => [p.mission_id, p] as const));

  // Status decisions per mission. Linear "next" = first mission in the ordered
  // list that the debater hasn't completed yet.
  const completedIds = new Set(profile.progress.map((p) => p.mission_id));
  const firstUnfinished = missions.find((m) => !completedIds.has(m.id)) ?? null;

  type Status =
    | { kind: "complete"; prog: ProgressRow }
    | { kind: "next"; prog: ProgressRow | undefined }
    | { kind: "available"; prog: ProgressRow | undefined }
    | { kind: "locked"; lockedBy: { xp: number; name: string }; prog: ProgressRow | undefined };

  function statusFor(m: Mission): Status {
    const prog = progressByMission.get(m.id);
    if (completedIds.has(m.id)) return { kind: "complete", prog: prog! };
    const lock = rankRequiredFor(m.number);
    if (lock && rankXp < lock.xp) return { kind: "locked", lockedBy: lock, prog };
    if (firstUnfinished && m.id === firstUnfinished.id) return { kind: "next", prog };
    return { kind: "available", prog };
  }

  return (
    <div className="relative min-h-screen">
      <SpaceBackdrop />
      <DebaterNav />
      <main className="relative z-10 max-w-4xl mx-auto px-8 py-12 space-y-10">

        {/* Welcome header */}
        <header className="flex items-start gap-5">
          <Link
            href="/avatar"
            title={pilotPickedYet ? "Change pilot" : "Pick your pilot"}
            className="shrink-0"
          >
            <Avatar
              portraitId={pilotId}
              size="xl"
              ring={pilotPickedYet ? "cyan" : "none"}
              className={pilotPickedYet ? "" : "animate-pulse"}
            />
          </Link>
          <div className="flex-1 space-y-3">
            <div className="font-mono text-xs tracking-[0.3em] text-accent-cyan">
              ⟡ POLICY DEBATE 101 SPACE STATION · MISSION CONTROL
            </div>
            <h1 className="font-display text-4xl font-black">
              Welcome to Mission Control, {profile.name.split(" ")[0]}.
            </h1>
            <p className="text-text-dim">
              This is your home base for policy debate. Start a mission below —
              each one builds a skill you&apos;ll use in real rounds.
            </p>
            {!profile.hasClass && (
              <div className="inline-flex items-center gap-2 border border-border-mid bg-bg-panel-solid/60 rounded-md px-3 py-1.5">
                <span className="font-mono text-[10px] tracking-[0.3em] text-accent-amber">
                  🛰️ NO CLASS ASSIGNED
                </span>
                <span className="font-mono text-[10px] tracking-[0.25em] text-text-faint">
                  · YOUR COACH WILL ADD YOU SOON
                </span>
              </div>
            )}
            {!pilotPickedYet && (
              <Link
                href="/avatar"
                className="inline-block font-mono text-[10px] tracking-[0.3em] text-accent-cyan hover:text-accent-cyan-soft border-b border-dashed border-accent-cyan/60"
              >
                👤 PICK YOUR PILOT →
              </Link>
            )}
          </div>
        </header>

        {/* Rank chip */}
        <section className="border border-accent-cyan/40 bg-bg-panel-solid/50 rounded-md px-6 py-5 relative">
          <span className="corner tl" /><span className="corner tr" />
          <span className="corner bl" /><span className="corner br" />
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <RankChip
                name={rank.name}
                rankXp={profile.rankXp}
                completedCount={profile.progress.length}
              />
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <div className="font-mono text-[10px] tracking-[0.3em] text-text-dim">TOTAL CRD</div>
                <div className="font-display text-2xl font-bold text-accent-cyan">{profile.credits}</div>
              </div>
              <form action="/auth/signout" method="post" className="self-center">
                <button className="font-mono text-[10px] tracking-[0.3em] text-text-dim hover:text-accent-cyan">
                  SIGN OUT
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Single CTA: Launch Next Mission */}
        {firstUnfinished ? (
          <Link
            href={`/play/${firstUnfinished.id}`}
            className="relative block border border-accent-cyan bg-accent-cyan/10 hover:bg-accent-cyan/20 rounded-md p-6 transition-colors"
          >
            <span className="corner tl" /><span className="corner tr" />
            <span className="corner bl" /><span className="corner br" />
            <div className="flex items-center justify-between gap-6">
              <div>
                <div className="font-mono text-[10px] tracking-[0.3em] text-accent-cyan">
                  ▶ LAUNCH NEXT MISSION
                </div>
                <div className="font-display text-2xl font-bold mt-1">
                  Mission {String(firstUnfinished.number).padStart(2, "0")} · {firstUnfinished.title}
                </div>
                <div className="text-text-dim text-sm mt-1">{firstUnfinished.tagline}</div>
              </div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-text-dim text-right whitespace-nowrap">
                {firstUnfinished.slides.length} SLIDES<br />
                ~{firstUnfinished.estimatedMinutes} MIN<br />
                +{firstUnfinished.rewards.credits} CRD
              </div>
            </div>
          </Link>
        ) : (
          <div className="border border-accent-amber/40 bg-bg-panel-solid/50 rounded-md px-6 py-5 text-center">
            <div className="font-mono text-[10px] tracking-[0.3em] text-accent-amber">
              ⟡ ALL CURRENT MISSIONS COMPLETE
            </div>
            <div className="text-text-dim text-sm mt-2">
              New missions deploy soon. Hold steady, {rank.name}.
            </div>
          </div>
        )}

        {/* YOUR PATH */}
        <section className="space-y-3">
          <div className="font-mono text-xs tracking-[0.3em] text-text-dim">YOUR PATH</div>
          <ul className="space-y-2">
            {missions.map((m) => {
              const s = statusFor(m);
              const num = String(m.number).padStart(2, "0");

              // Common content (number + title) — varies by status below.
              const numTitle = (
                <>
                  <span className="font-mono text-xs tracking-[0.25em] text-text-faint w-10 shrink-0">
                    {num}
                  </span>
                  <span className="font-display font-bold flex-1 truncate">{m.title}</span>
                </>
              );

              if (s.kind === "complete") {
                return (
                  <li key={m.id}>
                    <Link
                      href={`/play/${m.id}`}
                      className="flex items-center gap-4 px-4 py-3 rounded-md border border-border-mid hover:border-accent-cyan bg-bg-panel-solid/30 transition-colors"
                    >
                      <span className="text-accent-cyan text-lg">✓</span>
                      {numTitle}
                      <span className="font-mono text-[10px] tracking-[0.25em] text-accent-cyan whitespace-nowrap">
                        COMPLETE · {s.prog.best_credits} CRD{s.prog.ever_perfect ? " · ★" : ""}
                      </span>
                    </Link>
                  </li>
                );
              }

              if (s.kind === "next") {
                return (
                  <li key={m.id}>
                    <Link
                      href={`/play/${m.id}`}
                      className="flex items-center gap-4 px-4 py-3 rounded-md border border-accent-cyan/60 bg-accent-cyan/5 hover:bg-accent-cyan/15 transition-colors"
                    >
                      <span className="text-accent-cyan text-lg">▶</span>
                      {numTitle}
                      <span className="font-mono text-[10px] tracking-[0.25em] text-accent-cyan whitespace-nowrap">
                        NEXT UP
                      </span>
                    </Link>
                  </li>
                );
              }

              if (s.kind === "available") {
                return (
                  <li key={m.id}>
                    <Link
                      href={`/play/${m.id}`}
                      className="flex items-center gap-4 px-4 py-3 rounded-md border border-border-mid hover:border-accent-cyan bg-bg-panel-solid/30 transition-colors"
                    >
                      <span className="text-text-dim text-lg">○</span>
                      {numTitle}
                      <span className="font-mono text-[10px] tracking-[0.25em] text-text-faint whitespace-nowrap">
                        AVAILABLE
                      </span>
                    </Link>
                  </li>
                );
              }

              // locked
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-md border border-border-mid bg-bg-panel-solid/20 opacity-60 cursor-not-allowed"
                  aria-disabled
                  title={`Reach ${s.lockedBy.name} to unlock`}
                >
                  <span className="text-text-faint text-lg">🔒</span>
                  {numTitle}
                  <span className="font-mono text-[10px] tracking-[0.25em] text-text-faint whitespace-nowrap">
                    REACH {s.lockedBy.name}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Cross-link to Resources / Glossary */}
        <Link
          href="/glossary"
          className="block border border-border-mid/60 hover:border-accent-cyan bg-bg-panel-solid/40 hover:bg-accent-cyan/5 rounded-lg px-6 py-4 transition-colors"
        >
          <div className="font-mono text-[10px] tracking-[0.3em] text-text-dim mb-1">
            → NEED A REFRESHER
          </div>
          <div className="font-display text-base font-bold text-text-bright">
            Look up a debate term in the Glossary
          </div>
        </Link>
      </main>
    </div>
  );
}
