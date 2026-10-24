// ============================================================================
// /signup — Self-serve student account creation. Name + 4-digit PIN.
// ----------------------------------------------------------------------------
// Austin's spec (2026-10-24): kid types their name, picks a 4-digit PIN,
// account auto-creates, they're logged in. Names must be unique — if a
// collision occurs the server bounces back with a suggestion.
//
// ⚠️ No PIN recovery. We intentionally store PINs as the Supabase auth
// password (hashed by Supabase), and if a student forgets it there is NO
// path back to their account. The warning banner on this page is load-
// bearing — it must stay prominent.
//
// Companion routes:
//   POST /auth/student-signup → creates account + signs in
//   GET  /login/pin           → returning students sign in here
// ============================================================================

import Link from "next/link";
import { SpaceBackdrop } from "@/components/Starfield";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string; name?: string }>;

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, name } = await searchParams;

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
            <h1 className="font-display text-3xl font-bold">CREATE ACCOUNT</h1>
            <p className="text-text-dim text-sm">
              Pick your pilot name and a secret 4-digit code.
            </p>
          </div>

          {/* Load-bearing warning: no PIN recovery. Must stay prominent. */}
          <div className="border border-accent-amber/60 bg-accent-amber/10 rounded-md p-4">
            <div className="font-mono text-[10px] tracking-[0.3em] text-accent-amber mb-2">
              ⚠️ WRITE THIS DOWN
            </div>
            <p className="text-text-bright text-sm leading-relaxed">
              If you forget your name <span className="font-bold">or</span> your 4-digit code,
              your coach <span className="font-bold">cannot</span> get your account back.
              You&apos;ll have to start over from scratch.
            </p>
          </div>

          <form action="/auth/student-signup" method="post" className="space-y-4">
            <label className="block space-y-1">
              <span className="font-mono text-[10px] tracking-[0.3em] text-text-dim">
                YOUR NAME
              </span>
              <input
                type="text"
                name="displayName"
                required
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={32}
                defaultValue={name ?? ""}
                placeholder="e.g. Jacob S"
                className="w-full px-4 py-3 rounded-md bg-bg-deep border border-border-strong focus:border-accent-cyan focus:outline-none text-text-bright placeholder:text-text-faint"
              />
              <span className="block font-mono text-[9px] tracking-[0.2em] text-text-faint">
                Add a last initial if you share a name with someone.
              </span>
            </label>

            <label className="block space-y-1">
              <span className="font-mono text-[10px] tracking-[0.3em] text-text-dim">
                PICK A 4-DIGIT CODE
              </span>
              <input
                type="password"
                name="pin"
                required
                inputMode="numeric"
                pattern="[0-9]{4}"
                minLength={4}
                maxLength={4}
                autoComplete="new-password"
                placeholder="····"
                className="w-full px-4 py-3 rounded-md bg-bg-deep border border-border-strong focus:border-accent-cyan focus:outline-none text-text-bright placeholder:text-text-faint tracking-[0.5em] text-center"
              />
            </label>

            <label className="block space-y-1">
              <span className="font-mono text-[10px] tracking-[0.3em] text-text-dim">
                TYPE IT AGAIN
              </span>
              <input
                type="password"
                name="pin2"
                required
                inputMode="numeric"
                pattern="[0-9]{4}"
                minLength={4}
                maxLength={4}
                autoComplete="new-password"
                placeholder="····"
                className="w-full px-4 py-3 rounded-md bg-bg-deep border border-border-strong focus:border-accent-cyan focus:outline-none text-text-bright placeholder:text-text-faint tracking-[0.5em] text-center"
              />
            </label>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-accent-cyan text-bg-deep font-mono text-xs tracking-[0.3em] font-bold hover:bg-accent-cyan-soft rounded-md"
            >
              CREATE MY ACCOUNT
            </button>
          </form>

          {error && (
            <div className="border border-status-warn/50 bg-status-warn/5 rounded-md p-3 text-sm text-status-warn">
              {error}
            </div>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/login/pin"
            className="font-mono text-[10px] tracking-[0.3em] text-text-faint hover:text-accent-cyan"
          >
            ALREADY HAVE AN ACCOUNT? SIGN IN →
          </Link>
        </div>
      </main>
    </div>
  );
}
