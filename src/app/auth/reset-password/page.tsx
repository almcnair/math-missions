// ============================================================================
// /auth/reset-password — Set a new password after clicking the reset link.
// ----------------------------------------------------------------------------
// Supabase's resetPasswordForEmail sends a link like:
//   https://<site>/auth/reset-password#access_token=...&refresh_token=...&type=recovery
// The tokens land in the URL FRAGMENT (not query string), so we need
// client-side JS to read them, establish a session, then let the user
// set a new password via updateUser.
// ============================================================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { SpaceBackdrop } from "@/components/Starfield";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    // Supabase JS auto-parses the URL fragment on page load and sets the
    // session for password-recovery flows via detectSessionInUrl. Once
    // that finishes we can check for a live session.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
      } else {
        // Give the SDK a beat to parse the hash and retry once.
        setTimeout(async () => {
          const retry = await supabase.auth.getSession();
          if (retry.data.session) setReady(true);
          else setError("This reset link is invalid or expired. Request a new one.");
        }, 500);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/bridge");
    router.refresh();
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
              ⟡ POLICY DEBATE 101 SPACE STATION
            </div>
            <h1 className="font-display text-3xl font-bold">NEW PASSWORD</h1>
            <p className="text-text-dim text-sm">
              Set a new password to finish resetting.
            </p>
          </div>

          {error && (
            <div className="border border-status-warn/50 bg-status-warn/5 rounded-md p-3 text-sm text-status-warn">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1">
              <span className="font-mono text-[10px] tracking-[0.3em] text-text-dim">
                NEW PASSWORD
              </span>
              <input
                type="password"
                required
                minLength={6}
                autoFocus
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!ready || submitting}
                className="w-full px-4 py-3 rounded-md bg-bg-deep border border-border-strong focus:border-accent-cyan focus:outline-none text-text-bright placeholder:text-text-faint disabled:opacity-50"
              />
            </label>

            <button
              type="submit"
              disabled={!ready || submitting}
              className="w-full px-6 py-3 bg-accent-cyan text-bg-deep font-mono text-xs tracking-[0.3em] font-bold hover:bg-accent-cyan-soft rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "SAVING…" : ready ? "SET PASSWORD & SIGN IN" : "LOADING…"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
