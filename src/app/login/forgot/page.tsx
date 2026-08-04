// ============================================================================
// /login/forgot — Send a password-reset email.
// ============================================================================

import Link from "next/link";
import { SpaceBackdrop } from "@/components/Starfield";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  error?: string;
  sent?: string;
  email?: string;
}>;

export default async function ForgotPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, sent, email } = await searchParams;
  const sentTo = sent ?? "";

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <SpaceBackdrop />
      <main className="relative z-10 max-w-md w-full mx-4 space-y-4">
        <div className="relative border border-border-strong bg-bg-panel-solid/80 backdrop-blur-sm rounded-md p-8 space-y-6">
          <span className="corner tl" /><span className="corner tr" />
          <span className="corner bl" /><span className="corner br" />

          <div className="text-center space-y-3">
            <div className="font-mono text-xs tracking-[0.3em] text-accent-cyan">
              ⟡ POLICY DEBATE 101 SPACE STATION
            </div>
            <h1 className="font-display text-3xl font-bold">RESET PASSWORD</h1>
            <p className="text-text-dim text-sm">
              Enter your email. We&apos;ll send you a link to set a new password.
            </p>
          </div>

          {error && (
            <div className="border border-status-warn/50 bg-status-warn/5 rounded-md p-3 text-sm text-status-warn">
              {error}
            </div>
          )}

          {sentTo && !error ? (
            <div className="border border-accent-cyan/40 bg-accent-cyan/5 rounded-md p-4 space-y-2 text-center">
              <div className="font-mono text-[10px] tracking-[0.3em] text-accent-cyan">
                ✦ CHECK YOUR EMAIL
              </div>
              <p className="text-text-bright text-sm">
                If <span className="font-mono text-accent-cyan">{sentTo}</span> has an
                account, we sent a password-reset link.
              </p>
              <p className="text-text-faint text-xs">
                Didn&apos;t get it? Check spam, or try again in a minute.
              </p>
            </div>
          ) : (
            <form action="/auth/forgot-password" method="post" className="space-y-4">
              <label className="block space-y-1">
                <span className="font-mono text-[10px] tracking-[0.3em] text-text-dim">
                  EMAIL
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  autoFocus
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  defaultValue={email ?? ""}
                  placeholder="you@school.edu"
                  className="w-full px-4 py-3 rounded-md bg-bg-deep border border-border-strong focus:border-accent-cyan focus:outline-none text-text-bright placeholder:text-text-faint"
                />
              </label>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-accent-cyan text-bg-deep font-mono text-xs tracking-[0.3em] font-bold hover:bg-accent-cyan-soft rounded-md"
              >
                SEND RESET LINK
              </button>
            </form>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="font-mono text-[10px] tracking-[0.3em] text-text-faint hover:text-accent-cyan"
          >
            ← BACK TO SIGN IN
          </Link>
        </div>
      </main>
    </div>
  );
}
