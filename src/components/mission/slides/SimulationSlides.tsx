"use client";

// ============================================================================
// SIMULATION SLIDES — interactive labs
// ----------------------------------------------------------------------------
// A simulation slide is a hands-on interactive that gates advancement the same
// way any CFU does: student manipulates state, and once the target condition
// is satisfied the slide fires `onResult` with a CfuOutcome and the player
// unlocks Continue.
//
// Variants are dispatched off `slide.config.variant`. Add new variants by
// (a) adding a new *Config type to mission-schema.ts under SimulationVariant,
// (b) implementing a new inner view component here, (c) routing it below.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import {
  Atom,
  Beaker,
  RotateCcw,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  Info,
  HelpCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import type {
  SimulationSlide,
  FruitPunchRatioConfig,
  EquivalentFractionsTankConfig,
} from "@/lib/mission-schema";
import { scoreCfu, type CfuOutcome } from "../state";
import { Inline } from "@/lib/inline-markup";

// ---------- Sound FX (Web Audio) --------------------------------------------
// Muted by default (per Austin 2026-08-06). User can un-mute via the speaker
// icon; state is per-slide because sim slides are the only ones with audio.

class SoundFX {
  ctx: AudioContext | null = null;
  muted = true;
  init() {
    if (!this.ctx) {
      const AudioCtx =
        typeof window !== "undefined"
          ? window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext
          : undefined;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }
  playBubble(pitch = 400) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.8, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      /* ignore */
    }
  }
  playSuccess() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const start = this.ctx!.currentTime + idx * 0.08;
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch {
      /* ignore */
    }
  }
  playWarning() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      /* ignore */
    }
  }
}

// ---------- Math helpers -----------------------------------------------------

function gcd(a: number, b: number): number {
  if (!b) return a;
  return gcd(b, a % b);
}

// ============================================================================
// DISPATCHER — routes SimulationSlide by variant
// ============================================================================

export function SimulationSlideView({
  slide,
  onResult,
  outcome,
}: {
  slide: SimulationSlide;
  onResult: (o: CfuOutcome) => void;
  outcome?: CfuOutcome;
}) {
  // NOTE: no default case — TS will surface an unhandled variant as an
  // exhaustiveness error the moment SimulationVariant gains a second member.
  switch (slide.config.variant) {
    case "fruit-punch-ratio":
      return (
        <FruitPunchRatioLab
          slide={slide}
          config={slide.config}
          onResult={onResult}
          outcome={outcome}
        />
      );
    case "equivalent-fractions-tank":
      return (
        <EquivalentFractionsTankLab
          slide={slide}
          config={slide.config}
          onResult={onResult}
          outcome={outcome}
        />
      );
  }
}

// ============================================================================
// VARIANT 1: Fruit Punch Ratio Lab
// ----------------------------------------------------------------------------
// Student mixes cyan "Cosmic Juice" + pink "Nebula Soda" until the mixture
// matches the target ratio (and optionally the exact cup counts).
// ============================================================================

function FruitPunchRatioLab({
  slide,
  config,
  onResult,
  outcome,
}: {
  slide: SimulationSlide;
  config: FruitPunchRatioConfig;
  onResult: (o: CfuOutcome) => void;
  outcome?: CfuOutcome;
}) {
  const answered = !!outcome;

  const [juiceCups, setJuiceCups] = useState(0);
  const [sodaCups, setSodaCups] = useState(0);
  const [muted, setMuted] = useState(true); // default mute per Austin 2026-08-06
  const [showHint, setShowHint] = useState(false);
  const [showMathInspector, setShowMathInspector] = useState(true);

  const sfxRef = useRef<SoundFX | null>(null);
  // Lazy-init SoundFX in an effect (avoids react-hooks/refs "access during
  // render" complaint on React 19). Sync `muted` on every change.
  useEffect(() => {
    if (!sfxRef.current) sfxRef.current = new SoundFX();
    sfxRef.current.muted = muted;
  }, [muted]);

  // ---- Derived math ------------------------------------------------------
  const totalCups = juiceCups + sodaCups;
  const commonDivisor = totalCups > 0 ? gcd(juiceCups, sodaCups) : 1;
  const simplifiedJuice = totalCups > 0 && commonDivisor > 0 ? juiceCups / commonDivisor : 0;
  const simplifiedSoda = totalCups > 0 && commonDivisor > 0 ? sodaCups / commonDivisor : 0;

  const targetGCD = gcd(config.targetJuice, config.targetSoda);
  const targetSimpJuice = config.targetJuice / targetGCD;
  const targetSimpSoda = config.targetSoda / targetGCD;

  // Cross-multiply ratio equivalence check: a/b == c/d ⇔ a*d == c*b
  const isRatioMatch =
    totalCups > 0 &&
    juiceCups * config.targetSoda === sodaCups * config.targetJuice;
  const isExactTargetAmount =
    juiceCups === config.targetJuice && sodaCups === config.targetSoda;
  const isSolved = config.requireExactAmount
    ? isRatioMatch && isExactTargetAmount
    : isRatioMatch;

  const juicePercent = totalCups > 0 ? (juiceCups / totalCups) * 100 : 50;
  const sodaPercent = totalCups > 0 ? (sodaCups / totalCups) * 100 : 50;

  // ---- Solve detection: fire onResult exactly once -----------------------
  // Track wrong "commits" for coach analytics via attempts count. We don't
  // deduct shields for wrong tinkering because the whole point of a sim is
  // safe experimentation; scoring config on the slide can override that
  // (shieldOnWrong=true will cost a shield if they hit Continue while wrong,
  // which we don't currently allow anyway — Continue is gated).
  const attemptCountRef = useRef(0);
  useEffect(() => {
    if (isSolved && !answered) {
      attemptCountRef.current += 1;
      sfxRef.current?.playSuccess();
      onResult(scoreCfu({ scoring: slide.scoring, fullyCorrect: true }));
    }
  }, [isSolved, answered, onResult, slide.scoring]);

  // ---- Handlers ----------------------------------------------------------
  function handleAddJuice(delta: number) {
    if (answered) return;
    const next = Math.max(0, Math.min(config.maxCapacity - sodaCups, juiceCups + delta));
    if (next !== juiceCups) {
      setJuiceCups(next);
      sfxRef.current?.playBubble(delta > 0 ? 500 : 300);
    }
  }
  function handleAddSoda(delta: number) {
    if (answered) return;
    const next = Math.max(0, Math.min(config.maxCapacity - juiceCups, sodaCups + delta));
    if (next !== sodaCups) {
      setSodaCups(next);
      sfxRef.current?.playBubble(delta > 0 ? 650 : 350);
    }
  }
  function handleReset() {
    if (answered) return;
    setJuiceCups(0);
    setSodaCups(0);
    sfxRef.current?.playWarning();
  }

  // ---- Wrong-mixture message -------------------------------------------
  const overRatio =
    totalCups > 0 && juiceCups / (sodaCups || 1) > config.targetJuice / config.targetSoda;

  return (
    <div className="space-y-4">
      {/* Question banner — matches CfuFrame typography */}
      <div className="space-y-3">
        {slide.prompt.label && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-cyan/10 border border-accent-cyan/40 text-accent-cyan text-xs font-mono tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
            {slide.prompt.label}
          </div>
        )}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-snug text-text-bright">
          <Inline>{slide.prompt.question}</Inline>
        </h2>
        <p className="text-xs sm:text-sm text-text-dim flex items-start gap-2">
          <Info className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
          <span>{config.instruction}</span>
        </p>
      </div>

      {/* Lab workspace grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT: Ingredient Controls */}
        <div className="lg:col-span-4 bg-bg-panel/80 border border-border-mid rounded-2xl p-4 flex flex-col gap-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-pink-500" />
          <div className="flex items-center justify-between border-b border-border-mid pb-2">
            <span className="text-xs font-mono text-accent-cyan uppercase tracking-widest flex items-center gap-1.5">
              <Beaker className="w-4 h-4" /> INGREDIENTS LAB
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMuted((m) => !m)}
                className="text-text-dim hover:text-accent-cyan transition-colors"
                title={muted ? "Un-mute sound effects" : "Mute sound effects"}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleReset}
                disabled={answered}
                className="text-text-dim hover:text-accent-cyan text-xs flex items-center gap-1 transition-colors disabled:opacity-30"
                title="Reset chamber"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>

          {/* Cosmic Juice (cyan) */}
          <IngredientRow
            label="Cosmic Juice"
            accent="cyan"
            cups={juiceCups}
            maxCapacity={config.maxCapacity}
            disabled={answered}
            atMax={totalCups >= config.maxCapacity}
            onAdd={() => handleAddJuice(1)}
            onSub={() => handleAddJuice(-1)}
          />

          {/* Nebula Soda (pink) */}
          <IngredientRow
            label="Nebula Soda"
            accent="pink"
            cups={sodaCups}
            maxCapacity={config.maxCapacity}
            disabled={answered}
            atMax={totalCups >= config.maxCapacity}
            onAdd={() => handleAddSoda(1)}
            onSub={() => handleAddSoda(-1)}
          />

          {/* Capacity gauge */}
          <div className="bg-bg-deep/80 p-2.5 rounded-lg border border-border-mid flex justify-between items-center text-xs font-mono">
            <span className="text-text-dim">CHAMBER CAPACITY:</span>
            <span
              className={`font-bold ${
                totalCups === config.maxCapacity ? "text-amber-400" : "text-text-bright"
              }`}
            >
              {totalCups} / {config.maxCapacity} CUPS
            </span>
          </div>
        </div>

        {/* CENTER: Beaker reactor */}
        <div className="lg:col-span-4 bg-bg-panel/80 border border-border-mid rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[280px] shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0%,transparent_70%)] pointer-events-none" />

          <div className="relative w-40 sm:w-48 h-56 sm:h-64 border-x-4 border-b-4 border-border-mid/60 rounded-b-3xl bg-bg-deep/80 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-sm overflow-hidden flex flex-col justify-end">
            {/* Tick marks */}
            <div className="absolute left-2 top-4 bottom-4 w-4 flex flex-col justify-between items-start pointer-events-none z-20 text-[9px] font-mono text-text-dim">
              {Array.from({ length: config.maxCapacity }).map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2.5 h-[1px] bg-text-dim" />
                  <span>{config.maxCapacity - i}</span>
                </div>
              ))}
            </div>

            {/* Exact-amount target marker (scaling missions) */}
            {config.requireExactAmount && (
              <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400/80 z-20 flex justify-end pr-2 pointer-events-none"
                style={{
                  bottom: `${((config.targetJuice + config.targetSoda) / config.maxCapacity) * 100}%`,
                }}
              >
                <span className="text-[9px] font-mono bg-amber-950/90 text-amber-300 px-1 rounded border border-amber-500/50">
                  TARGET: {config.targetJuice + config.targetSoda} CUPS
                </span>
              </div>
            )}

            {/* Fluid fill */}
            {totalCups > 0 ? (
              <div
                className="w-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{
                  height: `${(totalCups / config.maxCapacity) * 100}%`,
                  background: `linear-gradient(180deg, rgba(34, 211, 238, 0.8) 0%, rgba(${Math.round(
                    244 * (sodaPercent / 100),
                  )}, ${Math.round(
                    63 * (sodaPercent / 100) + 180 * (juicePercent / 100),
                  )}, ${Math.round(212 * (juicePercent / 100) + 94 * (sodaPercent / 100))}, 0.9) 100%)`,
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-2 bg-white/40 animate-pulse" />
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {Array.from({ length: Math.min(12, totalCups * 3) }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full bg-white/30 animate-bubble"
                      style={{
                        width: `${(i % 3) * 3 + 4}px`,
                        height: `${(i % 3) * 3 + 4}px`,
                        left: `${(i * 17) % 85 + 8}%`,
                        bottom: "-10px",
                        animationDuration: `${1.5 + (i % 4) * 0.5}s`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-text-dim font-mono text-xs z-10">
                <Beaker className="w-8 h-8 stroke-[1.5] mb-2 text-text-dim/70 animate-bounce" />
                <span>REACTOR EMPTY</span>
                <span className="text-[10px] text-text-dim/70 mt-1">ADD INGREDIENTS TO MIX</span>
              </div>
            )}
          </div>

          {/* Status badge */}
          <div className="mt-3 text-center min-h-[28px]">
            {totalCups === 0 ? (
              <span className="text-xs font-mono text-text-dim">Awaiting mixture injection…</span>
            ) : isSolved ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                PERFECT FUEL RATIO!
              </div>
            ) : isRatioMatch && config.requireExactAmount ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                RATIO OK — but wrong total volume
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                {overRatio ? "TOO DENSE! (Too much Juice)" : "TOO FIZZY! (Too much Soda)"}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Telemetry */}
        <div className="lg:col-span-4 bg-bg-panel/80 border border-border-mid rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-border-mid pb-2">
            <span className="text-xs font-mono text-fuchsia-400 uppercase tracking-widest flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4" /> RATIO TELEMETRY
            </span>
            <button
              onClick={() => setShowMathInspector((v) => !v)}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-deep hover:bg-bg-deep/60 text-text-dim border border-border-mid"
            >
              {showMathInspector ? "HIDE MATH" : "SHOW MATH"}
            </button>
          </div>

          {/* Target vs Current */}
          <div className="grid grid-cols-2 gap-2 text-center font-mono">
            <div className="bg-bg-deep/90 p-3 rounded-xl border border-accent-cyan/30">
              <span className="text-[10px] text-text-dim block mb-1">TARGET RATIO</span>
              <span className="text-xl font-black text-accent-cyan tracking-wider">
                {config.targetJuice} : {config.targetSoda}
              </span>
              <span className="text-[10px] text-accent-cyan/70 block mt-0.5">
                ({targetSimpJuice} : {targetSimpSoda} simplified)
              </span>
            </div>
            <div
              className={`p-3 rounded-xl border transition-all ${
                totalCups === 0
                  ? "bg-bg-deep/50 border-border-mid text-text-dim"
                  : isSolved
                    ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                    : "bg-bg-deep border-border-mid text-text-bright"
              }`}
            >
              <span className="text-[10px] text-text-dim block mb-1">YOUR MIXTURE</span>
              <span className="text-xl font-black tracking-wider">
                {juiceCups} : {sodaCups}
              </span>
              <span className="text-[10px] opacity-80 block mt-0.5">
                {totalCups > 0 ? `(${simplifiedJuice} : ${simplifiedSoda} simplified)` : "0 : 0"}
              </span>
            </div>
          </div>

          {/* Math inspector */}
          {showMathInspector && (
            <div className="bg-bg-deep/80 p-3 rounded-xl border border-border-mid space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-border-mid/60 pb-2">
                <span className="text-text-dim font-mono text-[11px]">FRACTION FORM:</span>
                <div className="flex items-center gap-2 font-mono">
                  <div className="flex flex-col items-center">
                    <span className="text-accent-cyan font-bold">{juiceCups}</span>
                    <div className="w-full h-[1px] bg-text-dim my-0.5" />
                    <span className="text-pink-400 font-bold">{sodaCups}</span>
                  </div>
                  {totalCups > 0 && commonDivisor > 1 && (
                    <>
                      <span className="text-text-dim">=</span>
                      <div className="flex flex-col items-center">
                        <span className="text-accent-cyan font-bold">{simplifiedJuice}</span>
                        <div className="w-full h-[1px] bg-accent-cyan my-0.5" />
                        <span className="text-pink-300 font-bold">{simplifiedSoda}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-text-dim">
                  <span>JUICE: {juicePercent.toFixed(0)}%</span>
                  <span>SODA: {sodaPercent.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-bg-deep overflow-hidden flex border border-border-mid">
                  <div
                    className="bg-accent-cyan transition-all duration-300"
                    style={{ width: `${juicePercent}%` }}
                  />
                  <div
                    className="bg-pink-500 transition-all duration-300"
                    style={{ width: `${sodaPercent}%` }}
                  />
                </div>
              </div>

              <div className="bg-accent-cyan/10 p-2 rounded border border-accent-cyan/20 text-[11px] text-accent-cyan/90 leading-tight">
                <span className="font-bold text-accent-cyan">UNIT RATE: </span>
                {sodaCups > 0 ? (
                  <>
                    You have <strong>{(juiceCups / sodaCups).toFixed(1)}</strong> cups of Juice for every <strong>1</strong> cup of Soda.
                  </>
                ) : (
                  <>Add at least 1 cup of Soda to calculate unit rate.</>
                )}
              </div>
            </div>
          )}

          {/* Hint accordion */}
          <div>
            <button
              onClick={() => setShowHint((v) => !v)}
              className="w-full flex items-center justify-between text-xs text-amber-400/90 hover:text-amber-300 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/30 p-2 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-1.5 font-mono">
                <HelpCircle className="w-3.5 h-3.5" /> NEED A HINT?
              </span>
              <span>{showHint ? "▲" : "▼"}</span>
            </button>
            {showHint && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs leading-relaxed">
                {config.hint}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success feedback banner (shows after ratio is solved) */}
      {answered && outcome?.correct && (
        <div className="rounded-md border border-status-good bg-status-good/10 p-4">
          <div className="flex items-start gap-2">
            <Atom className="w-5 h-5 text-status-good shrink-0 mt-0.5 animate-spin-slow" />
            <div className="flex-1">
              <div className="font-display font-bold text-status-good text-sm tracking-wider uppercase mb-1">
                {slide.feedback.correct.title}
              </div>
              {slide.feedback.correct.body.map((line, i) => (
                <p key={i} className="text-sm text-text-bright leading-relaxed">
                  <Inline>{line}</Inline>
                </p>
              ))}
              {slide.feedback.correct.followup && (
                <p className="text-sm text-text-dim mt-2 italic">
                  <Inline>{slide.feedback.correct.followup}</Inline>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes bubble {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-200px) scale(1.2); opacity: 0; }
        }
        .animate-bubble { animation: bubble infinite ease-in-out; }
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spinSlow 12s linear infinite; }
      `}</style>
    </div>
  );
}

// ============================================================================
// VARIANT 2: Equivalent Fractions Tank
// ----------------------------------------------------------------------------
// Student sees a TARGET fuel tank filled to targetNum/targetDenom. They pick
// a multiplier which cuts YOUR tank into (targetDenom * multiplier) slices.
// Clicking a slice fills fuel up to that slice (clicking the same slice again
// backs off by one). Solve = fill matches an equivalent fraction of the
// target, i.e. filled === targetNum * multiplier.
//
// Design notes vs. the standalone Desktop prototype:
//   - No internal HUD (shields/streak/credits/level dots/HOME button). The
//     Math Missions shell already renders those; duplicating them fights the
//     real economy.
//   - No success modal or manual "START SHIP" submit. Solve is auto-detected
//     the moment the ratio matches (same UX as FruitPunchRatioLab). Continue
//     unlocks via CfuOutcome.
//   - Palette recolored to site tokens (bg-panel / accent-cyan / pink-500 /
//     border-mid) instead of the prototype's raw cyan/pink hexes.
//   - Mechanics preserved: multiplier buttons, click-to-fill slice grid,
//     live equation preview, target/your-tank visual, alignment guide when
//     equivalent.
// ============================================================================

function EquivalentFractionsTankLab({
  slide,
  config,
  onResult,
  outcome,
}: {
  slide: SimulationSlide;
  config: EquivalentFractionsTankConfig;
  onResult: (o: CfuOutcome) => void;
  outcome?: CfuOutcome;
}) {
  const answered = !!outcome;

  // Default multiplier: first allowed value.
  const [multiplier, setMultiplier] = useState<number>(
    config.allowedMultipliers[0] ?? 1,
  );
  const [filled, setFilled] = useState(0);
  const [muted, setMuted] = useState(true);
  const [showHint, setShowHint] = useState(false);

  const sfxRef = useRef<SoundFX | null>(null);
  useEffect(() => {
    if (!sfxRef.current) sfxRef.current = new SoundFX();
    sfxRef.current.muted = muted;
  }, [muted]);

  // ---- Derived math ------------------------------------------------------
  const totalSlices = config.targetDenom * multiplier;
  const targetFillPct = (config.targetNum / config.targetDenom) * 100;
  const yourFillPct = totalSlices > 0 ? (filled / totalSlices) * 100 : 0;

  // Equivalent iff filled * targetDenom === targetNum * totalSlices
  // (cross-multiply, integer-safe; avoids float precision issues).
  const isEquivalent =
    filled > 0 && filled * config.targetDenom === config.targetNum * totalSlices;

  const multiplierOk =
    config.requireMultiplier === undefined ||
    multiplier === config.requireMultiplier;

  const isSolved = isEquivalent && multiplierOk;

  // Simplify displayed fraction (for the "YOUR TANK" readout parity).
  const displayGCD = filled > 0 ? gcd(filled, totalSlices) : 1;
  const simpNum = displayGCD > 0 ? filled / displayGCD : 0;
  const simpDenom = displayGCD > 0 ? totalSlices / displayGCD : 0;

  const attemptCountRef = useRef(0);
  useEffect(() => {
    if (isSolved && !answered) {
      attemptCountRef.current += 1;
      sfxRef.current?.playSuccess();
      onResult(scoreCfu({ scoring: slide.scoring, fullyCorrect: true }));
    }
  }, [isSolved, answered, onResult, slide.scoring]);

  // ---- Handlers ----------------------------------------------------------
  function handleSelectMultiplier(m: number) {
    if (answered) return;
    if (m === multiplier) return;
    setMultiplier(m);
    setFilled(0); // reset fill when slice count changes
    sfxRef.current?.playBubble(800);
  }
  function handleSliceClick(idx: number) {
    if (answered) return;
    // Click slice N → fill up to N+1. Click again at same edge → back off by 1.
    const targetFill = idx + 1;
    const next = filled === targetFill ? targetFill - 1 : targetFill;
    if (next !== filled) {
      setFilled(next);
      sfxRef.current?.playBubble(300 + next * 35);
    }
  }
  function handleReset() {
    if (answered) return;
    setFilled(0);
    sfxRef.current?.playWarning();
  }

  // ---- Wrong-mixture status --------------------------------------------
  const yourRatio = totalSlices > 0 ? filled / totalSlices : 0;
  const targetRatio = config.targetNum / config.targetDenom;
  const overFilled = filled > 0 && yourRatio > targetRatio;
  const underFilled = filled > 0 && yourRatio < targetRatio;

  return (
    <div className="space-y-4">
      {/* Question banner */}
      <div className="space-y-3">
        {slide.prompt.label && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-cyan/10 border border-accent-cyan/40 text-accent-cyan text-xs font-mono tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
            {slide.prompt.label}
          </div>
        )}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-snug text-text-bright">
          <Inline>{slide.prompt.question}</Inline>
        </h2>
        <p className="text-xs sm:text-sm text-text-dim flex items-start gap-2">
          <Info className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
          <span>{config.instruction}</span>
        </p>
      </div>

      {/* Tanks panel */}
      <div className="bg-bg-panel/80 border border-border-mid rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-pink-500" />

        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-border-mid pb-2 mb-4">
          <span className="text-xs font-mono text-accent-cyan uppercase tracking-widest flex items-center gap-1.5">
            <Beaker className="w-4 h-4" /> FUEL TANK CALIBRATION
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted((m) => !m)}
              className="text-text-dim hover:text-accent-cyan transition-colors"
              title={muted ? "Un-mute sound effects" : "Mute sound effects"}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleReset}
              disabled={answered}
              className="text-text-dim hover:text-accent-cyan text-xs flex items-center gap-1 transition-colors disabled:opacity-30"
              title="Empty tank"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Empty
            </button>
          </div>
        </div>

        {/* TARGET TANK */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
            <span className="text-text-dim flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_6px_#f43f5e]" />
              TARGET TANK
            </span>
            <span className="font-extrabold text-accent-cyan text-base sm:text-lg">
              {config.targetNum} / {config.targetDenom}
            </span>
          </div>
          <div className="relative h-12 sm:h-14 w-full rounded-xl bg-bg-deep border border-border-mid overflow-hidden flex shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all duration-300"
              style={{ width: `${targetFillPct}%` }}
            />
            <div className="absolute inset-0 flex w-full h-full pointer-events-none">
              {Array.from({ length: config.targetDenom }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 border-r border-border-mid/60 last:border-r-0 h-full"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Multiplier picker + live equation */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-dim py-3 border-y border-border-mid/60 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono uppercase tracking-wider text-text-dim">
              Slice each part into:
            </span>
            <div className="flex items-center gap-1.5">
              {config.allowedMultipliers.map((m) => {
                const active = m === multiplier;
                return (
                  <button
                    key={m}
                    onClick={() => handleSelectMultiplier(m)}
                    disabled={answered}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold border transition-all ${
                      active
                        ? "bg-accent-cyan/20 border-accent-cyan text-accent-cyan shadow-[0_0_10px_rgba(6,182,212,0.35)]"
                        : "bg-bg-deep/80 border-border-mid text-text-dim hover:text-accent-cyan hover:border-accent-cyan/50"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {m}x
                  </button>
                );
              })}
            </div>
          </div>
          <div className="font-mono font-semibold text-text-bright text-sm">
            {config.targetNum}/{config.targetDenom} ×{" "}
            <span className="text-pink-400">
              {multiplier}/{multiplier}
            </span>{" "}
            ={" "}
            <span className="text-accent-cyan">
              {config.targetNum * multiplier}/{totalSlices}
            </span>
          </div>
        </div>

        {/* YOUR TANK (clickable) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
            <span className="text-text-dim flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_6px_#22d3ee]" />
              YOUR TANK
              <span className="hidden sm:inline text-[10px] text-text-dim/70">
                (click to fill)
              </span>
            </span>
            <span
              className={`font-extrabold text-base sm:text-lg transition-colors ${
                isSolved ? "text-emerald-400" : "text-pink-400"
              }`}
            >
              {filled} / {totalSlices}
              {filled > 0 && displayGCD > 1 && (
                <span className="ml-2 text-[10px] text-text-dim font-mono">
                  = {simpNum}/{simpDenom}
                </span>
              )}
            </span>
          </div>

          <div className="relative h-14 sm:h-16 w-full rounded-xl bg-bg-deep border-2 border-accent-cyan/50 overflow-hidden flex shadow-2xl group">
            {/* Fluid */}
            <div
              className={`h-full transition-all duration-200 ${
                isSolved
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.5)]"
                  : "bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
              }`}
              style={{ width: `${yourFillPct}%` }}
            />

            {/* Alignment guide: green vertical line at target ratio when solved */}
            {isSolved && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-30 pointer-events-none shadow-[0_0_12px_#34d399]"
                style={{ left: `${targetFillPct}%` }}
              >
                <div className="absolute top-1 -translate-x-1/2 bg-emerald-400 text-bg-deep text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                  ✓ EQUIVALENT
                </div>
              </div>
            )}

            {/* Clickable slice overlay */}
            <div className="absolute inset-0 flex w-full h-full z-10">
              {Array.from({ length: totalSlices }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSliceClick(i)}
                  disabled={answered}
                  aria-label={`Slice ${i + 1} of ${totalSlices}`}
                  className="flex-1 border-r border-border-mid/60 last:border-r-0 h-full hover:bg-accent-cyan/10 transition-colors disabled:cursor-not-allowed disabled:hover:bg-transparent"
                />
              ))}
            </div>
          </div>

          <p className="text-[11px] text-accent-cyan/80 text-center font-medium pt-1">
            Click a slice to fill up to it. Click the same slice again to empty one back.
          </p>
        </div>

        {/* Status banner */}
        <div className="mt-4 py-2 px-4 rounded-xl bg-bg-deep border border-border-mid text-center">
          {filled === 0 ? (
            <span className="text-xs sm:text-sm text-text-dim">
              Awaiting fuel. Click Your Tank to start filling.
            </span>
          ) : isSolved ? (
            <span className="text-xs sm:text-sm font-bold text-emerald-400">
              MATCH FOUND — {config.targetNum}/{config.targetDenom} = {filled}/{totalSlices}
            </span>
          ) : isEquivalent && !multiplierOk ? (
            <span className="text-xs sm:text-sm text-amber-300">
              Fill is equivalent, but this mission needs a specific multiplier. Try{" "}
              <span className="font-mono font-bold">{config.requireMultiplier}x</span>.
            </span>
          ) : overFilled ? (
            <span className="text-xs sm:text-sm text-pink-400">
              Too much fuel. Click further left to empty back.
            </span>
          ) : underFilled ? (
            <span className="text-xs sm:text-sm text-amber-300">
              Not enough fuel yet. Click further right to add more.
            </span>
          ) : (
            <span className="text-xs sm:text-sm text-text-dim">Keep filling.</span>
          )}
        </div>

        {/* Hint */}
        <div className="mt-3">
          <button
            onClick={() => setShowHint((v) => !v)}
            className="w-full flex items-center justify-between text-xs text-amber-400/90 hover:text-amber-300 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/30 p-2 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-1.5 font-mono">
              <HelpCircle className="w-3.5 h-3.5" /> NEED A HINT?
            </span>
            <span>{showHint ? "▲" : "▼"}</span>
          </button>
          {showHint && (
            <div className="mt-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs leading-relaxed">
              {config.hint}
            </div>
          )}
        </div>
      </div>

      {/* Success feedback banner */}
      {answered && outcome?.correct && (
        <div className="rounded-md border border-status-good bg-status-good/10 p-4">
          <div className="flex items-start gap-2">
            <Atom className="w-5 h-5 text-status-good shrink-0 mt-0.5 animate-spin-slow" />
            <div className="flex-1">
              <div className="font-display font-bold text-status-good text-sm tracking-wider uppercase mb-1">
                {slide.feedback.correct.title}
              </div>
              {slide.feedback.correct.body.map((line, i) => (
                <p key={i} className="text-sm text-text-bright leading-relaxed">
                  <Inline>{line}</Inline>
                </p>
              ))}
              {slide.feedback.correct.followup && (
                <p className="text-sm text-text-dim mt-2 italic">
                  <Inline>{slide.feedback.correct.followup}</Inline>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Ingredient control row ------------------------------------------

function IngredientRow({
  label,
  accent,
  cups,
  maxCapacity,
  disabled,
  atMax,
  onAdd,
  onSub,
}: {
  label: string;
  accent: "cyan" | "pink";
  cups: number;
  maxCapacity: number;
  disabled: boolean;
  atMax: boolean;
  onAdd: () => void;
  onSub: () => void;
}) {
  const styles =
    accent === "cyan"
      ? {
          border: "border-accent-cyan/30",
          shadow: "shadow-[0_0_15px_rgba(6,182,212,0.05)]",
          textStrong: "text-accent-cyan",
          textSoft: "text-accent-cyan/80",
          dot: "bg-accent-cyan shadow-[0_0_8px_#22d3ee]",
          badgeBg: "bg-accent-cyan/10",
          badgeBorder: "border-accent-cyan/40",
          fillGradient: "bg-gradient-to-r from-cyan-600 to-cyan-400",
          fillShadow: "shadow-[0_0_10px_#22d3ee]",
          addBtn:
            "bg-accent-cyan hover:bg-accent-cyan-soft text-bg-deep border-accent-cyan-soft shadow-[0_0_12px_rgba(6,182,212,0.4)]",
          subBtnText: "text-accent-cyan",
        }
      : {
          border: "border-pink-500/30",
          shadow: "shadow-[0_0_15px_rgba(244,63,94,0.05)]",
          textStrong: "text-pink-400",
          textSoft: "text-pink-300",
          dot: "bg-pink-500 shadow-[0_0_8px_#f43f5e]",
          badgeBg: "bg-pink-500/10",
          badgeBorder: "border-pink-500/40",
          fillGradient: "bg-gradient-to-r from-pink-600 to-pink-400",
          fillShadow: "shadow-[0_0_10px_#f43f5e]",
          addBtn:
            "bg-pink-500 hover:bg-pink-400 text-bg-deep border-pink-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]",
          subBtnText: "text-pink-300",
        };

  return (
    <div className={`space-y-2 bg-bg-deep/60 p-3.5 rounded-xl border ${styles.border} ${styles.shadow}`}>
      <div className="flex justify-between items-center">
        <label className={`text-xs font-bold ${styles.textSoft} uppercase tracking-wider flex items-center gap-2`}>
          <span className={`w-2.5 h-2.5 rounded-full ${styles.dot}`} />
          {label}
        </label>
        <span
          className={`font-mono ${styles.textStrong} font-extrabold text-sm ${styles.badgeBg} px-2 py-0.5 rounded border ${styles.badgeBorder}`}
        >
          {cups} {cups === 1 ? "CUP" : "CUPS"}
        </span>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSub}
          disabled={cups === 0 || disabled}
          className={`w-10 h-10 rounded-lg bg-bg-panel-solid hover:bg-bg-panel disabled:opacity-30 disabled:hover:bg-bg-panel-solid ${styles.subBtnText} font-bold text-lg border border-border-mid transition-all active:scale-95 flex items-center justify-center`}
        >
          -
        </button>
        <div className="flex-1 bg-bg-deep rounded-lg h-3 overflow-hidden p-0.5 border border-border-mid">
          <div
            className={`h-full ${styles.fillGradient} rounded-sm transition-all duration-300 ${styles.fillShadow}`}
            style={{ width: `${(cups / maxCapacity) * 100}%` }}
          />
        </div>
        <button
          onClick={onAdd}
          disabled={atMax || disabled}
          className={`w-10 h-10 rounded-lg ${styles.addBtn} font-bold text-lg border transition-all active:scale-95 flex items-center justify-center disabled:opacity-30`}
        >
          +
        </button>
      </div>
    </div>
  );
}
