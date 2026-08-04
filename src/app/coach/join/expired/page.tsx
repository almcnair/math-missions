// ============================================================================
// /coach/join/expired — Landing for invalid / used / expired coach invites.
// ----------------------------------------------------------------------------
// Reached from /coach/join (before OAuth) or /auth/callback (after OAuth
// exchange) when a magic-link invite can't be honoured. Copy is deliberately
// friendly — the coach did nothing wrong, they just need a fresh link.
// ============================================================================

import Link from "next/link";
import { SpaceBackdrop } from "@/components/Starfield";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ reason?: string }>;

const REASON_COPY: Record<string, { title: string; body: string }> = {
  missing: {
    title: "INVITE LINK INCOMPLETE",
    body:
      "That link is missing its invite code. Ask the person who invited you to send you a fresh link.",
  },
  unknown: {
    title: "INVITE LINK NOT RECOGNIZED",
    body:
      "We don't have a record of that invite. It may have been revoked. Ask your organizer for a new link.",
  },
  used: {
    title: "INVITE ALREADY CLAIMED",
    body:
      "That invite link has already been used to sign up a coach account. If that wasn't you, contact your organizer.",
  },
  expired: {
    title: "INVITE LINK EXPIRED",
    body:
      "That invite link has expired. Ask the person who invited you to send you a fresh one.",
  },
  email_mismatch: {
    title: "WRONG GOOGLE ACCOUNT",
    body:
      "This invite was sent to a specific email address, and the Google account you signed in with doesn't match. Sign out of Google, then click the invite link again and use the invited address.",
  },
};

export default async function CoachInviteExpiredPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { reason } = await searchParams;
  const copy = REASON_COPY[reason ?? ""] ?? REASON_COPY.unknown;

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <SpaceBackdrop />
      <main className="relative z-10 max-w-md w-full mx-4">
        <div className="relative border border-border-strong bg-bg-panel-solid/80 backdrop-blur-sm rounded-md p-8 space-y-5">
          <span className="corner tl" /><span className="corner tr" />
          <span className="corner bl" /><span className="corner br" />

          <div className="space-y-2">
            <div className="font-mono text-[10px] tracking-[0.3em] text-status-warn">
              ⟡ COACH INVITE · UNAVAILABLE
            </div>
            <h1 className="font-display text-2xl font-bold">{copy.title}</h1>
          </div>

          <p className="text-text-dim text-sm leading-relaxed">{copy.body}</p>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/"
              className="text-center px-4 py-2 border border-border-mid rounded-md font-mono text-[10px] tracking-[0.3em] text-text-dim hover:text-accent-cyan hover:border-accent-cyan/50 transition-colors"
            >
              ← BACK TO HOME
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
