"use client";

// DemoNameGate — captures First Name + Last-Name Initial from a demo-mode
// student before the mission starts, so the post-mission completion panel
// can prompt "LOCK IN AS [Name I] — just pick a 6-digit code".
//
// sessionStorage (not localStorage) is deliberate: classroom shared devices
// should NOT pre-fill the previous student's name on the next tab.

import { useEffect, useState } from "react";
import { SpaceBackdrop } from "@/components/Starfield";

export const DEMO_NAME_KEY = "mm:demoName";

export function readDemoName(): string | null {
  if (typeof window === "undefined") return null;
  const v = window.sessionStorage.getItem(DEMO_NAME_KEY);
  return v && v.trim() ? v : null;
}

export function DemoNameGate({ onReady }: { onReady: () => void }) {
  const [first, setFirst] = useState("");
  const [initial, setInitial] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (readDemoName()) onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const f = first.trim();
    const i = initial.trim().toUpperCase();
    if (!f) { setError("Enter your first name."); return; }
    if (!i) { setError("Add your last-name initial so your coach can tell you apart from other cadets."); return; }
    window.sessionStorage.setItem(DEMO_NAME_KEY, f + " " + i);
    onReady();
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <SpaceBackdrop />
      <main className="relative z-10 max-w-md w-full mx-4">
        <div className="relative border border-border-strong bg-bg-panel-solid/85 backdrop-blur-sm rounded-md p-8 space-y-6">
          <span className="corner tl" /><span className="corner tr" />
          <span className="corner bl" /><span className="corner br" />

          <div className="text-center space-y-3">
            <div className="font-mono text-xs tracking-[0.3em] text-accent-cyan">
              ⟡ MATH MISSIONS SPACE STATION
            </div>
            <h1 className="font-display text-3xl font-bold">CADET CHECK-IN</h1>
            <p className="text-text-dim text-sm">
              What should we call you? Add a 6-digit code at the end to save your progress — or just play through.
            </p>
          </div>

          {error && (
            <div className="border border-status-warn/50 bg-status-warn/5 rounded-md p-3 text-sm text-status-warn">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1">
              <span className="font-mono text-[10px] tracking-[0.3em] text-text-dim">FIRST NAME</span>
              <input
                type="text"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                required
                autoFocus
                autoComplete="given-name"
                autoCorrect="off"
                spellCheck={false}
                maxLength={24}
                placeholder="e.g. Jacob"
                className="w-full px-4 py-3 rounded-md bg-bg-deep border border-border-strong focus:border-accent-cyan focus:outline-none text-text-bright placeholder:text-text-faint"
              />
            </label>

            <label className="block space-y-1">
              <span className="font-mono text-[10px] tracking-[0.3em] text-text-dim">LAST-NAME INITIAL</span>
              <input
                type="text"
                value={initial}
                onChange={(e) => setInitial(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 1))}
                required
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={1}
                placeholder="S"
                className="w-full px-4 py-3 rounded-md bg-bg-deep border border-border-strong focus:border-accent-cyan focus:outline-none text-text-bright placeholder:text-text-faint uppercase tracking-[0.3em] text-center text-xl"
              />
              <span className="block font-mono text-[9px] tracking-[0.2em] text-text-faint">
                So your coach can tell cadets with the same first name apart.
              </span>
            </label>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-accent-cyan text-bg-deep font-mono text-xs tracking-[0.3em] font-bold hover:bg-accent-cyan-soft rounded-md"
            >
              START MISSION →
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
