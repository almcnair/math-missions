// ============================================================================
// /login — Debater login. Email + password.
// ----------------------------------------------------------------------------
// One form, one button. Route (/auth/debater-signin) tries sign-in first;
// if the email doesn't exist yet, it creates the account and signs the
// student in the same request. No confirmation email, no magic link, no
// PIN — just password auth.
//
// If the student is already signed in when they hit this page, we
// short-circuit to /bridge so returning students don't see the form.
//
// Rostered camp students who still remember their PIN can use /login/pin.
// Coaches sign in at /login/teacher.
// ============================================================================

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SpaceBackdrop } from "@/components/Starfield";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  error?: string;
  next?: string;
  email?: string;
}>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, next, email } = await searchParams;
  const nextValue = next && next.startsWith("/") ? next : "/bridge";

  // Already signed in? Bounce straight to /bridge.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(nextValue);
  }

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
            <h1 className="font-display text-3xl font-bold">DEBATER LOGIN</h1>
            <p className="text-text-dim text-sm">
              Sign in or create an account.
            </p>
          </div>

          {error && (
            <div className="border border-status-warn/50 bg-status-warn/5 rounded-md p-3 text-sm text-status-warn">
              {error}
            </div>
          )}

          <form action="/auth/debater-signin" method="post" className="space-y-4">
            <input type="hidden" name="next" value={nextValue} />

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

            <label className="block space-y-1">
              <span className="font-mono text-[10px] tracking-[0.3em] text-text-dim">
                PASSWORD
              </span>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                autoComplete="current-password"
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 rounded-md bg-bg-deep border border-border-strong focus:border-accent-cyan focus:outline-none text-text-bright placeholder:text-text-faint"
              />
            </label>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-accent-cyan text-bg-deep font-mono text-xs tracking-[0.3em] font-bold hover:bg-accent-cyan-soft rounded-md"
            >
              SIGN IN / SIGN UP
            </button>

            <div className="text-center">
              <Link
                href="/login/forgot"
                className="font-mono text-[10px] tracking-[0.3em] text-text-faint hover:text-accent-cyan"
              >
                FORGOT PASSWORD? →
              </Link>
            </div>
          </form>

          <p className="font-mono text-[10px] tracking-[0.25em] text-text-faint text-center">
            Returning? Same email + password.<br />
            New? We&apos;ll create your account automatically.
          </p>
        </div>

        <div className="text-center space-y-2">
          <div>
            <Link
              href="/login/pin"
              className="font-mono text-[10px] tracking-[0.3em] text-text-faint hover:text-accent-cyan"
            >
              CAMP STUDENT WITH A PIN? SIGN IN HERE →
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
