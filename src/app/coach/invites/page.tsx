// ============================================================================
// /coach/invites — Admin-only coach magic-link management.
// ----------------------------------------------------------------------------
// Lets an admin:
//   • Generate a new invite link scoped to a specific lab (class)
//   • Optionally bind the invite to a single email (rejected if a different
//     Google account clicks it)
//   • See past invites with status (pending / claimed / expired)
//   • Revoke an unused invite (sets expires_at = now())
//
// The generated URL is `${origin}/coach/join?t=<token>`. Admin copies it and
// sends via Signal / email / etc. Claim happens in /auth/callback.
// ============================================================================

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { SpaceBackdrop } from "@/components/Starfield";
import {
  createCoachInviteAction,
  revokeCoachInviteAction,
} from "./actions";
import { CopyLinkButton } from "./CopyLinkButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coach Invites · Policy Debate 101" };

type Lab = { id: string; name: string; division: string | null; level: string | null };
type Invite = {
  token: string;
  class_id: string;
  email: string | null;
  note: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  uses: number;
  max_uses: number;
};

function labLabel(lab: Lab): string {
  if (lab.division && lab.level) {
    const div = lab.division === "ms" ? "MS" : "HS";
    const level = lab.level.charAt(0).toUpperCase() + lab.level.slice(1);
    return `${div} ${level}`;
  }
  return lab.name;
}

function inviteStatus(inv: Invite): { label: string; tone: "cyan" | "warn" | "dim" } {
  const uses = inv.uses ?? 0;
  const max = inv.max_uses ?? 1;
  const seats = max > 1 ? ` ${uses}/${max}` : "";
  const fullyClaimed = !!inv.used_at || uses >= max;

  if (fullyClaimed) return { label: `CLAIMED${seats}`, tone: "cyan" };
  if (new Date(inv.expires_at).getTime() < Date.now()) {
    return { label: "EXPIRED", tone: "dim" };
  }
  return { label: `PENDING${seats}`, tone: "warn" };
}

function fmt(dt: string): string {
  return new Date(dt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function CoachInvitesPage() {
  // Auth: admin only.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login/teacher?next=/coach/invites");

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/coach?error=Admin%20only");
  }

  // Load labs (any class row — this page manages the whole site) and invites.
  const [{ data: labs }, { data: invites }] = await Promise.all([
    admin
      .from("classes")
      .select("id, name, division, level")
      .order("division", { ascending: true, nullsFirst: false })
      .order("level", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    admin
      .from("coach_invite_tokens")
      .select(
        "token, class_id, email, note, created_at, expires_at, used_at, used_by, uses, max_uses",
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const labList = (labs ?? []) as Lab[];
  const inviteList = (invites ?? []) as Invite[];

  // Build the invite URL origin from the request headers (works locally and
  // on Vercel without hardcoding).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const originUrl = `${proto}://${host}`;

  const labById = new Map(labList.map((l) => [l.id, l]));

  return (
    <div className="relative min-h-screen">
      <SpaceBackdrop />
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-10">
        <header className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="font-mono text-xs tracking-[0.3em] text-accent-cyan">
              ⟡ COACH INVITES · ADMIN
            </div>
            <h1 className="font-display text-4xl font-black">INVITES</h1>
            <p className="text-text-dim text-sm">
              Generate a magic link to onboard a coach into a specific lab. The
              coach signs in with their Google account and is auto-added.
            </p>
          </div>
          <nav className="flex items-center gap-5 font-mono text-[10px] tracking-[0.3em]">
            <Link href="/coach" className="text-text-dim hover:text-accent-cyan">
              ← DASHBOARD
            </Link>
            <Link href="/coach/roster" className="text-text-dim hover:text-accent-cyan">
              ROSTER
            </Link>
          </nav>
        </header>

        {/* Create invite */}
        <section className="border border-border-mid bg-bg-panel-solid/40 rounded-md p-6">
          <div className="font-mono text-[10px] tracking-[0.3em] text-text-dim mb-4">
            CREATE INVITE LINK
          </div>
          <form action={createCoachInviteAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="font-mono text-[10px] tracking-[0.2em] text-text-faint">LAB</span>
              <select
                name="class_id"
                required
                className="w-full px-3 py-2 bg-bg-deep border border-border-mid rounded-md font-mono text-sm focus:outline-none focus:border-accent-cyan"
              >
                <option value="">— Select lab —</option>
                {labList.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {labLabel(lab)}
                    {lab.name !== labLabel(lab) ? ` (${lab.name})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-mono text-[10px] tracking-[0.2em] text-text-faint">
                BOUND EMAIL (OPTIONAL)
              </span>
              <input
                name="email"
                type="email"
                placeholder="coach@example.org"
                className="w-full px-3 py-2 bg-bg-deep border border-border-mid rounded-md font-mono text-sm focus:outline-none focus:border-accent-cyan"
              />
            </label>

            <label className="space-y-1">
              <span className="font-mono text-[10px] tracking-[0.2em] text-text-faint">
                EXPIRES IN
              </span>
              <select
                name="expires_in_days"
                defaultValue="14"
                className="w-full px-3 py-2 bg-bg-deep border border-border-mid rounded-md font-mono text-sm focus:outline-none focus:border-accent-cyan"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-mono text-[10px] tracking-[0.2em] text-text-faint">
                SEATS
              </span>
              <select
                name="max_uses"
                defaultValue="2"
                className="w-full px-3 py-2 bg-bg-deep border border-border-mid rounded-md font-mono text-sm focus:outline-none focus:border-accent-cyan"
              >
                <option value="1">1 coach</option>
                <option value="2">2 coaches (paired lab)</option>
                <option value="3">3 coaches</option>
                <option value="4">4 coaches</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-mono text-[10px] tracking-[0.2em] text-text-faint">
                NOTE (OPTIONAL)
              </span>
              <input
                name="note"
                type="text"
                placeholder="Coach Stringer — CDSI 2026"
                className="w-full px-3 py-2 bg-bg-deep border border-border-mid rounded-md font-mono text-sm focus:outline-none focus:border-accent-cyan"
              />
            </label>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-accent-cyan text-bg-deep font-mono text-xs tracking-[0.3em] font-bold hover:bg-accent-cyan-soft rounded-md"
              >
                GENERATE LINK
              </button>
            </div>
          </form>

          <p className="mt-4 font-mono text-[10px] tracking-[0.2em] text-text-faint leading-relaxed">
            One link, multiple seats: default 2 lets both lab leaders claim the
            same invite. Bind to an email only if a single specific coach should
            claim it.
          </p>
        </section>

        {/* Invite list */}
        <section className="space-y-3">
          <div className="font-mono text-[10px] tracking-[0.3em] text-text-dim">
            RECENT INVITES ({inviteList.length})
          </div>

          {inviteList.length === 0 && (
            <div className="border border-border-mid/50 bg-bg-panel-solid/20 rounded-md p-6 text-center">
              <p className="text-text-dim text-sm">No invites yet. Generate one above.</p>
            </div>
          )}

          <div className="space-y-2">
            {inviteList.map((inv) => {
              const status = inviteStatus(inv);
              const lab = labById.get(inv.class_id);
              const url = `${originUrl}/coach/join?t=${inv.token}`;
              const toneClass =
                status.tone === "cyan"
                  ? "text-accent-cyan border-accent-cyan/40 bg-accent-cyan/5"
                  : status.tone === "warn"
                    ? "text-status-warn border-status-warn/40 bg-status-warn/5"
                    : "text-text-faint border-border-mid bg-bg-panel-solid/20";

              return (
                <div
                  key={inv.token}
                  className="border border-border-mid rounded-md p-4 bg-bg-panel-solid/30 flex flex-wrap items-center gap-3"
                >
                  <span
                    className={`shrink-0 px-2 py-1 rounded font-mono text-[9px] tracking-[0.25em] border ${toneClass}`}
                  >
                    {status.label}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm">
                      <span className="text-text-bright">
                        {lab ? labLabel(lab) : "(deleted lab)"}
                      </span>
                      {inv.email && (
                        <span className="text-text-faint"> → {inv.email}</span>
                      )}
                    </div>
                    {inv.note && (
                      <div className="font-mono text-[10px] text-text-faint mt-0.5">
                        {inv.note}
                      </div>
                    )}
                    <div className="font-mono text-[9px] tracking-[0.15em] text-text-faint mt-1">
                      Created {fmt(inv.created_at)} · Expires {fmt(inv.expires_at)}
                      {inv.used_at && <> · Claimed {fmt(inv.used_at)}</>}
                    </div>
                  </div>

                  {status.tone === "warn" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <CopyLinkButton url={url} />
                      <form action={revokeCoachInviteAction}>
                        <input type="hidden" name="token" value={inv.token} />
                        <button
                          type="submit"
                          className="px-3 py-1.5 border border-border-mid rounded-md font-mono text-[10px] tracking-[0.2em] text-text-dim hover:text-status-warn hover:border-status-warn/50"
                        >
                          REVOKE
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
