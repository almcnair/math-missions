// ============================================================================
// /login/pin — Camp / classroom sign-in. Name + PIN.
// ----------------------------------------------------------------------------
// Camp students don't have personal email and can't use Google. This page
// is the direct name + PIN sign-in for rostered students whose accounts
// were bulk-created via scripts/create-students.mjs.
//
// The general-public front door is /login (magic link). This route is the
// specialized camp/classroom fallback — linked from the bottom of /login
// and from any handout materials that reference a PIN.
//
// Coach sign-in lives at /login/teacher.
// ============================================================================

import Link from "next/link";
import { SpaceBackdrop } from "@/components/Starfield";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string; u?: string; next?: string }>;

export default async function PinLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, u, next } = await searchParams;
  const nextValue = next && next.startsWith("/") ? next : "/camp";

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <SpaceBackdrop />
      <main className="relative z-10 max-w-md w-full mx-4 space-y-4">
        <div className="relative border border-border-strong bg-bg-panel-solid/80 backdrop-blur-sm rounded-md p-8 space-y-6">
          <span className="corner tl" /><span className="corner tr" />
          <span className="corner bl" /><span className="corner br" />

          <div className="text-center space-y-3">
            <div className="font-mono text-xs tracking-[0.3em] text-accent-cyan">
              ⟡ MATH MISSIONS SPACE STATION
            </div>
            <h1 className="font-display text-3xl font-bold">CAMP SIGN-IN</h1>
            <p className="text-text-dim text-sm">
              Type your first name and your PIN.
            </p>
          </div>

          <form action="/auth/student-signin" method="post" className="space-y-4">
            <input type="hidden" name="next" value={nextValue} />

            <label className="block space-y-1">
              <span className="font-mono text-[10px] tracking-[0.3em] text-text-dim">
                FIRST NAME
              </span>
              <input
                type="text"
                name="username"
                required
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                defaultValue={u ?? ""}
                placeholder="e.g. annabel"
                className="w-full px-4 py-3 rounded-md bg-bg-deep border border-border-strong focus:border-accent-cyan focus:outline-none text-text-bright placeholder:text-text-faint"
              />
            </label>

            <label className="block space-y-1">
              <span className="font-mono text-[10px] tracking-[0.3em] text-text-dim">
                PIN
              </span>
              <input
                type="password"
                name="pin"
                required
                inputMode="numeric"
                pattern="\d{4,8}"
                autoComplete="current-password"
                placeholder="6-digit PIN"
                className="w-full px-4 py-3 rounded-md bg-bg-deep border border-border-strong focus:border-accent-cyan focus:outline-none text-text-bright placeholder:text-text-faint tracking-widest"
              />
            </label>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-accent-cyan text-bg-deep font-mono text-xs tracking-[0.3em] font-bold hover:bg-accent-cyan-soft rounded-md"
            >
              SIGN IN
            </button>
          </form>

          {error && (
            <div className="border border-status-warn/50 bg-status-warn/5 rounded-md p-3 text-sm text-status-warn">
              {error}
            </div>
          )}

          <p className="font-mono text-[10px] tracking-[0.25em] text-text-faint text-center">
            Don&apos;t have a PIN? Ask your coach.
          </p>
        </div>

        <div className="text-center space-y-2">
          <div>
            <Link
              href="/login"
              className="font-mono text-[10px] tracking-[0.3em] text-text-faint hover:text-accent-cyan"
            >
              ← SIGN IN WITH EMAIL INSTEAD
            </Link>
          </div>
          <div>
            <Link
              href="/login/teacher"
              className="font-mono text-[10px] tracking-[0.3em] text-text-faint hover:text-accent-cyan"
            >
              COACH? SIGN IN HERE →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
