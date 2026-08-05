// /login/teacher — email + password OR Google sign-in for teachers (and admins).

import Link from "next/link";
import { SpaceBackdrop } from "@/components/Starfield";
import { SigninSubmitTracker } from "./SigninTrackers";
// Form posts directly to a Route Handler for cookie reliability
// (see /auth/teacher-signin and /auth/google for the same reasoning).

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

export default async function TeacherLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
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
            <h1 className="font-display text-3xl font-bold">COACH LOGIN</h1>
          </div>

          <SigninSubmitTracker formId="teacher-signin-form" method="password" />
          <SigninSubmitTracker formId="teacher-google-form" method="google" />
          <form id="teacher-signin-form" action="/auth/teacher-signin" method="post" className="space-y-4">
            <label className="block">
              <div className="font-mono text-[10px] tracking-[0.3em] text-text-dim mb-2">
                EMAIL
              </div>
              <input
                name="email"
                type="email"
                autoFocus
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-bg-deep border border-border-mid rounded-md font-mono text-sm focus:outline-none focus:border-accent-cyan"
              />
            </label>
            <label className="block">
              <div className="font-mono text-[10px] tracking-[0.3em] text-text-dim mb-2">
                PASSWORD
              </div>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-bg-deep border border-border-mid rounded-md font-mono text-sm focus:outline-none focus:border-accent-cyan"
              />
            </label>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-accent-cyan text-bg-deep font-mono text-xs tracking-[0.3em] font-bold hover:bg-accent-cyan-soft rounded-md"
            >
              SIGN IN
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border-mid" />
            <span className="font-mono text-[10px] tracking-[0.3em] text-text-faint">OR</span>
            <div className="flex-1 h-px bg-border-mid" />
          </div>

          <form id="teacher-google-form" action="/auth/google" method="post">
            <input type="hidden" name="next" value="/coach" />
            <button
              type="submit"
              className="w-full px-6 py-3 border border-border-strong bg-bg-deep/40 hover:border-accent-cyan hover:bg-accent-cyan/10 font-mono text-xs tracking-[0.3em] rounded-md flex items-center justify-center gap-3"
            >
              <GoogleGlyph />
              SIGN IN WITH GOOGLE
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
            href="/login"
            className="font-mono text-[10px] tracking-[0.3em] text-text-faint hover:text-accent-cyan"
          >
            ← DEBATER LOGIN
          </Link>
        </div>
      </main>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
