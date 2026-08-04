// ============================================================================
// /avatar — pilot picker
// ----------------------------------------------------------------------------
// Grid of 7 expression-variant pilots + Mystery Pilot. Click to claim.
// Highlights the kid's current pick. Saves via selectPilot() server action.
// ============================================================================

import Link from "next/link";
import { redirect } from "next/navigation";
import { SpaceBackdrop } from "@/components/Starfield";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";
import { PILOT_ROSTER, portraitIdFromConfig, type PilotId } from "@/lib/avatars";
import { selectPilot } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

export default async function AvatarPickerPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_config")
    .eq("id", user.id)
    .maybeSingle();

  const currentId: PilotId = portraitIdFromConfig(profile?.avatar_config ?? {});

  return (
    <div className="relative min-h-screen">
      <SpaceBackdrop />
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="font-mono text-xs tracking-[0.3em] text-accent-cyan">
            ⟡ PILOT REGISTRATION
          </div>
          <h1 className="font-display text-4xl font-bold">PICK YOUR PILOT</h1>
          <p className="font-mono text-[11px] tracking-[0.2em] text-text-dim max-w-xl mx-auto">
            Each pilot wears the same uniform. The difference is how they show up
            in Mission Control. Pick the one that feels like you today — you can
            change later.
          </p>
        </header>

        {error && (
          <div className="max-w-xl mx-auto border border-status-warn/50 bg-status-warn/5 rounded-md p-3 text-sm text-status-warn text-center">
            {error}
          </div>
        )}

        {/* The roster grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {PILOT_ROSTER.map((pilot) => {
            const isCurrent = pilot.id === currentId;
            return (
              <form
                key={pilot.id}
                action={selectPilot}
                className={`relative flex flex-col items-center p-4 rounded-md border bg-bg-panel-solid/70 backdrop-blur-sm transition ${
                  isCurrent
                    ? "border-accent-cyan ring-2 ring-accent-cyan/40"
                    : "border-border-mid hover:border-accent-cyan/70"
                }`}
              >
                <input type="hidden" name="portraitId" value={pilot.id} />
                <Avatar
                  portraitId={pilot.id}
                  size="xl"
                  ring={isCurrent ? "cyan" : "none"}
                />
                <div className="mt-3 text-center space-y-1">
                  <div className="font-display text-sm font-bold">{pilot.label}</div>
                  <div className="font-mono text-[10px] tracking-[0.15em] text-text-dim leading-snug">
                    {pilot.blurb}
                  </div>
                </div>
                <button
                  type="submit"
                  className={`mt-3 w-full px-3 py-2 font-mono text-[10px] tracking-[0.3em] font-bold rounded-md transition ${
                    isCurrent
                      ? "bg-bg-deep border border-accent-cyan text-accent-cyan cursor-default"
                      : "bg-accent-cyan text-bg-deep hover:bg-accent-cyan-soft"
                  }`}
                  disabled={isCurrent}
                >
                  {isCurrent ? "✓ CURRENT" : "CLAIM"}
                </button>
                {isCurrent && (
                  <span className="absolute top-2 right-2 font-mono text-[9px] tracking-[0.25em] text-accent-cyan">
                    ACTIVE
                  </span>
                )}
              </form>
            );
          })}
        </section>

        {/* Footer */}
        <footer className="flex items-center justify-between pt-4">
          <Link
            href="/bridge"
            className="font-mono text-[10px] tracking-[0.3em] text-text-faint hover:text-accent-cyan"
          >
            ← BACK TO MISSION CONTROL
          </Link>
          <div className="font-mono text-[10px] tracking-[0.25em] text-text-dim">
            DEBATER: <span className="text-text-bright">{profile?.display_name ?? "—"}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
