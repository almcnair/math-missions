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
  CheckCircle2,
  AlertTriangle,
  Info,
  HelpCircle,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";
import type {
  SimulationSlide,
  FruitPunchRatioConfig,
  FruitPunchPalette,
  EquivalentFractionsTankConfig,
} from "@/lib/mission-schema";
import { scoreCfu, type CfuOutcome } from "../state";
import { Inline } from "@/lib/inline-markup";

// Fallback palette — preserves the classic cyan/pink Cosmic Juice / Nebula
// Soda look for missions that don't set `config.palette`.
const DEFAULT_FRUIT_PUNCH_PALETTE: FruitPunchPalette = {
  juice: { name: "Cosmic Juice", hex: "#22d3ee", rgb: [34, 211, 238] },
  soda: { name: "Nebula Soda", hex: "#f472b6", rgb: [244, 114, 182] },
};

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

  const palette = config.palette ?? DEFAULT_FRUIT_PUNCH_PALETTE;
  const juiceName = palette.juice.name;
  const sodaName = palette.soda.name;

  const [juiceCups, setJuiceCups] = useState(0);
  const [sodaCups, setSodaCups] = useState(0);
  const [muted, setMuted] = useState(true); // default mute per Austin 2026-08-06
  const [showHint, setShowHint] = useState(false);

  const sfxRef = useRef<SoundFX | null>(null);
  // Lazy-init SoundFX in an effect (avoids react-hooks/refs "access during
  // render" complaint on React 19). Sync `muted` on every change.
  useEffect(() => {
    if (!sfxRef.current) sfxRef.current = new SoundFX();
    sfxRef.current.muted = muted;
  }, [muted]);

  // ---- Derived math ------------------------------------------------------
  const totalCups = juiceCups + sodaCups;

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

  // Simplified target ratio for the mission-brief card (e.g. 4:2 → 2:1).
  const targetGCD = gcd(config.targetJuice, config.targetSoda);
  const targetSimpJuice = config.targetJuice / targetGCD;
  const targetSimpSoda = config.targetSoda / targetGCD;

  // ---- Nudge: figure out WHAT is wrong and say so kindly ---------------
  // Fires while the student is still mixing (not-yet-solved states only).
  // Order matters: more-specific diagnoses first.
  type Nudge = { headline: string; reason: string };
  function buildNudge(): Nudge | null {
    if (totalCups === 0) return null;
    if (isSolved) return null;

    const wantJuiceMore = config.targetJuice > config.targetSoda;
    const wantSodaMore = config.targetSoda > config.targetJuice;

    // 1) Ratio right, wrong total (only possible when requireExactAmount).
    if (isRatioMatch && config.requireExactAmount && !isExactTargetAmount) {
      const targetTotal = config.targetJuice + config.targetSoda;
      if (totalCups < targetTotal) {
        return {
          headline: "Right recipe — keep going!",
          reason: `Your ratio is perfect, but you only have ${totalCups} cups. The mission needs exactly ${targetTotal} cups total. Add more of BOTH ingredients — same ratio.`,
        };
      }
      return {
        headline: "Right recipe — back off a little!",
        reason: `Your ratio is perfect, but you have ${totalCups} cups. The mission needs exactly ${targetTotal} cups total. Remove some of BOTH ingredients — same ratio.`,
      };
    }

    // 2) Only one ingredient added (common early state).
    if (juiceCups === 0 && sodaCups > 0) {
      return {
        headline: `Almost there — add some ${juiceName}!`,
        reason: `A ratio compares TWO things. You've got soda but no juice yet. The target is ${targetSimpJuice} : ${targetSimpSoda} — that means you need both.`,
      };
    }
    if (sodaCups === 0 && juiceCups > 0) {
      return {
        headline: `Almost there — add some ${sodaName}!`,
        reason: `A ratio compares TWO things. You've got juice but no soda yet. The target is ${targetSimpJuice} : ${targetSimpSoda} — that means you need both.`,
      };
    }

    // 3) Directional nudge: too much of one ingredient vs the target.
    // Compare yours to target via cross-multiply direction:
    //   juice/soda > tJuice/tSoda  ⇔  juice*tSoda > soda*tJuice
    const yoursIsJuiceHeavier =
      juiceCups * config.targetSoda > sodaCups * config.targetJuice;
    const yoursIsSodaHeavier =
      sodaCups * config.targetJuice > juiceCups * config.targetSoda;

    if (yoursIsJuiceHeavier) {
      // Student has too much juice for the target ratio.
      const flavorNote = wantSodaMore
        ? "This mission wants MORE soda than juice — flip your thinking."
        : "You've got more juice than the recipe calls for.";
      return {
        headline: "Keep going — you're close!",
        reason: `${flavorNote} Try adding more ${sodaName}, or take a cup of ${juiceName} back out. Target: ${targetSimpJuice} : ${targetSimpSoda}.`,
      };
    }
    if (yoursIsSodaHeavier) {
      const flavorNote = wantJuiceMore
        ? "This mission wants MORE juice than soda — flip your thinking."
        : "You've got more soda than the recipe calls for.";
      return {
        headline: "Keep going — you're close!",
        reason: `${flavorNote} Try adding more ${juiceName}, or take a cup of ${sodaName} back out. Target: ${targetSimpJuice} : ${targetSimpSoda}.`,
      };
    }

    return null;
  }
  const nudge = buildNudge();

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

  return (
    <div className="space-y-4">
      {/* Question banner — level label + short prompt only. Target ratio
          lives in the mission-brief card below, not restated here. */}
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
      </div>

      {/* Lab workspace — 12-col grid, 2 rows on desktop.
          - Top-left  (cols 1-5, row 1): MIX THIS RATIO brief
          - Bottom-left (cols 1-5, row 2): INGREDIENTS LAB
          - Right (cols 6-12, rows 1-2): BEAKER (large, spans full height) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[auto_1fr] gap-4 items-stretch relative">
        {/* TOP-LEFT: MISSION BRIEF — what ratio to mix. */}
        <div
          className="lg:col-span-5 lg:row-start-1 bg-bg-panel/80 border-2 rounded-2xl p-4 text-center flex flex-col justify-center"
          style={{
            borderColor: `${palette.juice.hex}80`,
            boxShadow: `0 0 25px ${palette.juice.hex}26`,
          }}
        >
          <div
            className="text-[10px] sm:text-xs font-mono uppercase tracking-widest mb-2"
            style={{ color: palette.juice.hex }}
          >
            MIX THIS RATIO
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
            <div className="flex flex-col items-center">
              <span
                className="text-4xl sm:text-5xl font-black tracking-wider leading-none"
                style={{ color: palette.juice.hex }}
              >
                {targetSimpJuice}
              </span>
              <span
                className="text-[10px] sm:text-xs font-mono mt-1 uppercase"
                style={{ color: palette.juice.hex, opacity: 0.85 }}
              >
                {juiceName}
              </span>
            </div>
            <span className="text-4xl sm:text-5xl font-black text-text-dim">:</span>
            <div className="flex flex-col items-center">
              <span
                className="text-4xl sm:text-5xl font-black tracking-wider leading-none"
                style={{ color: palette.soda.hex }}
              >
                {targetSimpSoda}
              </span>
              <span
                className="text-[10px] sm:text-xs font-mono mt-1 uppercase"
                style={{ color: palette.soda.hex, opacity: 0.85 }}
              >
                {sodaName}
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-text-dim">
            {targetSimpJuice} {targetSimpJuice === 1 ? "cup" : "cups"} of {juiceName} for every {targetSimpSoda} {targetSimpSoda === 1 ? "cup" : "cups"} of {sodaName}
          </p>
          {config.requireExactAmount && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/50 border border-amber-500/50 text-amber-300 text-xs font-mono self-center">
              <AlertTriangle className="w-3.5 h-3.5" />
              Total: exactly {config.targetJuice + config.targetSoda} cups
            </div>
          )}
        </div>

        {/* BOTTOM-LEFT: Ingredient Controls */}
        <div className="lg:col-span-5 lg:row-start-2 bg-bg-panel/80 border border-border-mid rounded-2xl p-4 flex flex-col gap-4 shadow-xl relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{
              background: `linear-gradient(to right, ${palette.juice.hex}, ${palette.soda.hex})`,
            }}
          />
          <div className="flex items-center justify-between border-b border-border-mid pb-2">
            <span
              className="text-xs font-mono uppercase tracking-widest flex items-center gap-1.5"
              style={{ color: palette.juice.hex }}
            >
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

          {/* Juice ingredient row — palette-driven color */}
          <IngredientRow
            label={juiceName}
            color={palette.juice.hex}
            cups={juiceCups}
            maxCapacity={config.maxCapacity}
            disabled={answered}
            atMax={totalCups >= config.maxCapacity}
            onAdd={() => handleAddJuice(1)}
            onSub={() => handleAddJuice(-1)}
          />

          {/* Soda ingredient row — palette-driven color */}
          <IngredientRow
            label={sodaName}
            color={palette.soda.hex}
            cups={sodaCups}
            maxCapacity={config.maxCapacity}
            disabled={answered}
            atMax={totalCups >= config.maxCapacity}
            onAdd={() => handleAddSoda(1)}
            onSub={() => handleAddSoda(-1)}
          />

          {/* NUDGE — lives under ingredients so it doesn't cover the beaker.
              Fires only while mixing (not-yet-solved). No shame, just why. */}
          {!answered && nudge && (
            <div
              key={`${nudge.headline}|${nudge.reason}`}
              className="rounded-lg border border-amber-500/50 bg-amber-950/40 p-3 flex items-start gap-2 shadow-inner animate-nudge-in"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-bold text-amber-300 leading-tight">
                  {nudge.headline}
                </div>
                <div className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                  {nudge.reason}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Beaker reactor — spans BOTH rows so it's the biggest thing on screen. */}
        <div className="lg:col-span-7 lg:row-span-2 bg-bg-panel/80 border border-border-mid rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center relative min-h-[420px] lg:min-h-[520px] shadow-2xl overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${palette.juice.hex}14 0%, transparent 70%)`,
            }}
          />

          <div className="relative w-48 sm:w-64 md:w-72 h-72 sm:h-80 md:h-[26rem] border-x-4 border-b-4 border-border-mid/60 rounded-b-3xl bg-bg-deep/80 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-sm overflow-hidden flex flex-col justify-end">
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

            {/* Fluid fill — gradient interpolates between juice.rgb and soda.rgb
                weighted by the current cup proportion. Top of the fluid shows
                the pure juice color, bottom shows the blend. */}
            {totalCups > 0 ? (
              (() => {
                const jR = palette.juice.rgb[0];
                const jG = palette.juice.rgb[1];
                const jB = palette.juice.rgb[2];
                const sR = palette.soda.rgb[0];
                const sG = palette.soda.rgb[1];
                const sB = palette.soda.rgb[2];
                const jPct = juicePercent / 100;
                const sPct = sodaPercent / 100;
                const mixR = Math.round(jR * jPct + sR * sPct);
                const mixG = Math.round(jG * jPct + sG * sPct);
                const mixB = Math.round(jB * jPct + sB * sPct);
                return (
                  <div
                    className="w-full transition-all duration-500 ease-out relative overflow-hidden"
                    style={{
                      height: `${(totalCups / config.maxCapacity) * 100}%`,
                      background: `linear-gradient(180deg, rgba(${jR}, ${jG}, ${jB}, 0.85) 0%, rgba(${mixR}, ${mixG}, ${mixB}, 0.9) 100%)`,
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
                );
              })()
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-text-dim font-mono text-xs z-10">
                <Beaker className="w-8 h-8 stroke-[1.5] mb-2 text-text-dim/70 animate-bounce" />
                <span>REACTOR EMPTY</span>
                <span className="text-[10px] text-text-dim/70 mt-1">ADD INGREDIENTS TO MIX</span>
              </div>
            )}
          </div>
        </div>

        {/* SUCCESS OVERLAY — full-panel celebration over the workspace. */}
        {answered && outcome?.correct && (
          <div className="absolute inset-0 z-40 rounded-2xl bg-bg-deep/95 backdrop-blur-sm border-2 border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.4)] p-5 sm:p-8 flex flex-col items-center justify-center text-center overflow-hidden animate-success-in">
            {/* Confetti burst */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => {
                const colors = ["#22d3ee", "#f472b6", "#34d399", "#fbbf24", "#a78bfa"];
                const color = colors[i % colors.length];
                const left = (i * 37) % 100;
                const delay = (i % 6) * 0.08;
                const duration = 1.4 + (i % 4) * 0.25;
                return (
                  <div
                    key={i}
                    className="absolute top-0 w-2 h-3 animate-confetti"
                    style={{
                      left: `${left}%`,
                      background: color,
                      animationDelay: `${delay}s`,
                      animationDuration: `${duration}s`,
                      transform: `rotate(${i * 27}deg)`,
                    }}
                  />
                );
              })}
            </div>

            <div className="relative flex flex-col items-center gap-3 max-w-xl">
              <div className="flex items-center gap-2 text-emerald-400">
                <Sparkles className="w-6 h-6 animate-pulse" />
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>

              <h3 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-emerald-300 tracking-wider uppercase">
                {slide.feedback.correct.title || "Great mix!"}
              </h3>

              <div className="space-y-2 mt-1">
                {slide.feedback.correct.body.map((line, i) => (
                  <p key={i} className="text-sm sm:text-base text-text-bright leading-relaxed">
                    <Inline>{line}</Inline>
                  </p>
                ))}
                {slide.feedback.correct.followup && (
                  <p className="text-xs sm:text-sm text-text-dim italic mt-2">
                    <Inline>{slide.feedback.correct.followup}</Inline>
                  </p>
                )}
              </div>

              <p className="text-[11px] font-mono text-emerald-400/80 uppercase tracking-widest mt-3">
                ↓ Press Continue to keep going ↓
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hint accordion — collapsed by default, only place "help" lives now. */}
      {!answered && (
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
        @keyframes successIn {
          0% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-success-in { animation: successIn 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes confetti {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
        }
        .animate-confetti { animation: confetti ease-in forwards; }
        @keyframes nudgeIn {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-nudge-in { animation: nudgeIn 0.2s ease-out; }
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
// Palette-driven: `color` is a hex string; the row derives border, glow,
// label, badge, fill bar, and "add" button styling from it via inline style
// (Tailwind can't do arbitrary-hex-with-alpha classes at runtime). The
// subtract button stays neutral so it doesn't visually compete with add.

function IngredientRow({
  label,
  color,
  cups,
  maxCapacity,
  disabled,
  atMax,
  onAdd,
  onSub,
}: {
  label: string;
  color: string;
  cups: number;
  maxCapacity: number;
  disabled: boolean;
  atMax: boolean;
  onAdd: () => void;
  onSub: () => void;
}) {
  // Hex alphas (append to a 6-digit hex): 4d≈30%, 66≈40%, 26≈15%, 1a≈10%.
  const borderCol = `${color}4d`;
  const badgeBg = `${color}1a`;
  const badgeBorder = `${color}66`;
  const glow = `0 0 15px ${color}14`;
  const dotGlow = `0 0 8px ${color}`;
  const fillGlow = `0 0 10px ${color}`;
  const addBtnGlow = `0 0 12px ${color}66`;

  return (
    <div
      className="space-y-2 bg-bg-deep/60 p-3.5 rounded-xl border"
      style={{ borderColor: borderCol, boxShadow: glow }}
    >
      <div className="flex justify-between items-center">
        <label
          className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          style={{ color }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: color, boxShadow: dotGlow }}
          />
          {label}
        </label>
        <span
          className="font-mono font-extrabold text-sm px-2 py-0.5 rounded border"
          style={{ color, background: badgeBg, borderColor: badgeBorder }}
        >
          {cups} {cups === 1 ? "CUP" : "CUPS"}
        </span>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSub}
          disabled={cups === 0 || disabled}
          className="w-10 h-10 rounded-lg bg-bg-panel-solid hover:bg-bg-panel disabled:opacity-30 disabled:hover:bg-bg-panel-solid font-bold text-lg border border-border-mid transition-all active:scale-95 flex items-center justify-center"
          style={{ color }}
        >
          -
        </button>
        <div className="flex-1 bg-bg-deep rounded-lg h-3 overflow-hidden p-0.5 border border-border-mid">
          <div
            className="h-full rounded-sm transition-all duration-300"
            style={{
              width: `${(cups / maxCapacity) * 100}%`,
              background: `linear-gradient(to right, ${color}cc, ${color})`,
              boxShadow: fillGlow,
            }}
          />
        </div>
        <button
          onClick={onAdd}
          disabled={atMax || disabled}
          className="w-10 h-10 rounded-lg font-bold text-lg border transition-all active:scale-95 flex items-center justify-center disabled:opacity-30 text-bg-deep"
          style={{
            background: color,
            borderColor: color,
            boxShadow: addBtnGlow,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
