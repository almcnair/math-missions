// /brain-breaks — Brain Breaks Wheel
//
// Classroom tool: a spinning wheel of quick brain-break activities. Click the
// wheel (or the button) to spin; when it lands on a slice, the panel on the
// right shows the activity's name and how to run it. The full deck has 24
// breaks across four categories; each wheel load shows a random 12 and the
// "New 12" button cycles through the rest without repeats.
//
// Source content: Brain-break activities adapted from Inclusion Rules
// (https://inclusionrules.com/) — cited on-page in the footer.
//
// Design: matches /camp — Header + SpaceBackdrop + card-style layout using
// the site's color tokens (accent-cyan / accent-magenta / accent-purple /
// accent-amber alias for magenta). Client component because the whole thing
// is interactive.

"use client";

import { useEffect, useRef, useState } from "react";
import { SpaceBackdrop } from "@/components/Starfield";
import ToolHeader from "@/components/toolkit/ToolHeader";

type Category = "physical" | "academic" | "social" | "games";

type Break = {
  cat: Category;
  title: string;
  how: string;
};

const BREAKS: Break[] = [
  // Physical Activity & Gross Motor
  { cat: "physical", title: "Dance Party", how: "Play any short, upbeat song and let students move freely — no choreography, just shake it out for 60–90 seconds." },
  { cat: "physical", title: "Structured Dance", how: "Lead the class in a group dance: the chicken dance, the twist, or the hand jive. Everyone follows along." },
  { cat: "physical", title: "Cardio Burst", how: "Do 25 jumping jacks, 25 'high knees,' or run in place for 30 seconds. Count out loud together." },
  { cat: "physical", title: "Chair Aerobics", how: "Stay seated and do arm punches, seated marches, side reaches, and shoulder rolls. Great for accessible movement." },
  { cat: "physical", title: "Yoga Poses & Arm Circles", how: "Try tree pose, mountain pose, or forward fold. Add slow arm circles and deep breathing for grounding." },
  { cat: "physical", title: "Conga Line", how: "Form a line, hands on shoulders, and snake through the classroom doing simple moves — knee lifts, kicks, claps." },

  // Academic & Kinesthetic
  { cat: "academic", title: "Act Out Vocabulary", how: "Pick a current vocab word. Students use their bodies (Total Physical Response) to act out the meaning. No talking." },
  { cat: "academic", title: "Air Writing", how: "Write spelling words, math facts, or draw geometric shapes in the air using BIG arm movements. Whole-body handwriting." },
  { cat: "academic", title: "Body Spelling", how: "Spell your name or a vocabulary word by making a different body pose for each letter — arms up for A, twist for T, etc." },
  { cat: "academic", title: "Who Let the Dogs Out", how: "Toss a small plush toy around the room. Whoever catches it names one thing they've learned so far today, then tosses to someone else." },

  // Social & Peer
  { cat: "social", title: "Silent Line-Up", how: "Students line up in order — by birthday, number of siblings, or house number — WITHOUT talking. Point, gesture, mime only." },
  { cat: "social", title: "Walk & Talk", how: "Grab a partner and take a one-minute walk around the room. Discuss a prompt from the teacher, or just check in with each other." },
  { cat: "social", title: "Handshake Design", how: "Partner up and design a unique 4-step handshake. Practice it. Be ready to demo to the class." },
  { cat: "social", title: "Charades", how: "Break into small groups. One person acts out a word or phrase silently; the group guesses. No talking from the actor." },
  { cat: "social", title: "Telephone", how: "Sit or stand in a circle. Whisper a short phrase to the person next to you. Pass it around. Compare the start and the end — laugh at the drift." },
  { cat: "social", title: "Rock, Paper, Scissors", how: "Quick partner tournament. Winners find new winners. Last one standing gets bragging rights." },

  // Games & Playful Movement
  { cat: "games", title: "The Wave", how: "Do 'the wave' around the room like a stadium crowd. First at normal speed, then FAST, then in slow-motion." },
  { cat: "games", title: "No-Hands Hot Potato", how: "Keep a balloon in the air using ONLY elbows, heads, knees, or shoulders. No hands allowed. Don't let it touch the floor." },
  { cat: "games", title: "Beach Ball Toss", how: "Toss a beach ball around the room. Whoever catches it answers a quick prompt from the teacher, then passes it on." },
  { cat: "games", title: "Great Wind Blows", how: "Musical-chairs style. Teacher says 'the great wind blows for anyone who…' (has sneakers, ate cereal, etc.). Anyone it applies to swaps seats." },
  { cat: "games", title: "Room Exploration", how: "Touch all 4 walls of the room and return to your seat as fast (and safely) as possible. Go!" },
  { cat: "games", title: "Limbo", how: "Hold a broom or string horizontally. Students take turns going under, leaning back. Lower it each round." },
  { cat: "games", title: "Simon Says", how: "Classic rules. Teacher (or a student) is Simon. Only follow commands prefaced with 'Simon says.' Out if you slip up." },
  { cat: "games", title: "Four Corners", how: "Label the 4 corners 1–4. Students pick a corner while one player (eyes closed) calls a number. That corner is out. Repeat." },
];

// Category → color (uses hex directly because SVG fill needs literal values,
// not Tailwind classes). Amber alias = magenta in the site palette, so we pick
// a distinct color for "academic" to avoid two magenta groups.
const CAT_COLOR: Record<Category, string> = {
  physical: "#22D3EE", // accent-cyan
  academic: "#F5A524", // amber (distinct from magenta)
  social:   "#EC5D9E", // accent-magenta
  games:    "#8B5CF6", // purple
};

const CAT_LABEL: Record<Category, string> = {
  physical: "Physical",
  academic: "Academic",
  social:   "Social",
  games:    "Games",
};

const WHEEL_SIZE = 12;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Wheel SVG -----------------------------------------------------

const R = 190;              // outer radius
const R_LABEL_INNER = 62;   // where the label anchors near the hub

function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(rad), r * Math.sin(rad)];
}

function WheelSvg({ items }: { items: Break[] }) {
  const slice = 360 / items.length;
  return (
    <svg
      viewBox="-200 -200 400 400"
      role="img"
      aria-label="Brain breaks spinning wheel"
      className="block w-full h-full"
    >
      {/* Slices */}
      {items.map((b, i) => {
        const a0 = i * slice;
        const a1 = (i + 1) * slice;
        const [x0, y0] = polar(R, a0);
        const [x1, y1] = polar(R, a1);
        const large = slice > 180 ? 1 : 0;
        const d = `M 0 0 L ${x0.toFixed(3)} ${y0.toFixed(3)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(3)} ${y1.toFixed(3)} Z`;
        return (
          <path
            key={`s-${i}`}
            d={d}
            fill={CAT_COLOR[b.cat]}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={1.2}
          />
        );
      })}

      {/* Labels — always upright. Right half reads outward from hub;
          left half is flipped so glyphs stay right-side-up. */}
      {items.map((b, i) => {
        const mid = i * slice + slice / 2;
        const rightSide = mid < 180;
        const groupTransform = rightSide ? `rotate(${mid - 90})` : `rotate(${mid + 90})`;
        const anchor = rightSide ? "start" : "end";
        const x = rightSide ? R_LABEL_INNER : -R_LABEL_INNER;
        let t = b.title;
        const maxChars = 20;
        if (t.length > maxChars) t = t.slice(0, maxChars - 1) + "…";
        return (
          <g key={`l-${i}`} transform={groupTransform}>
            <text
              x={x}
              y={0}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill="#0b0d1a"
              fontFamily="var(--font-ui), ui-sans-serif, system-ui, sans-serif"
              fontWeight={800}
              fontSize={15}
              letterSpacing="0.02em"
            >
              {t}
            </text>
          </g>
        );
      })}

      {/* Inner ring for depth */}
      <circle r={38} fill="#0b0d1a" stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
    </svg>
  );
}

// ---------- Page ---------------------------------------------------------

// Draw WHEEL_SIZE from the pool, refilling with a fresh shuffle when needed.
// Pulled out of the component so it's not recreated per render and can be
// used inside lazy state initializers.
function drawActive(currentPool: Break[]): { active: Break[]; pool: Break[] } {
  let p = currentPool;
  if (p.length < WHEEL_SIZE) {
    const tail = p.slice();
    const fresh = shuffle(BREAKS);
    if (tail.length) {
      // Push any tail-duplicates to the end so we don't immediately repeat.
      const tailTitles = new Set(tail.map((b) => b.title));
      fresh.sort((a, b) => {
        const aTail = tailTitles.has(a.title) ? 1 : 0;
        const bTail = tailTitles.has(b.title) ? 1 : 0;
        return aTail - bTail;
      });
    }
    p = tail.concat(fresh);
  }
  return { active: p.slice(0, WHEEL_SIZE), pool: p.slice(WHEEL_SIZE) };
}

type Deck = { active: Break[]; pool: Break[] };

export default function BrainBreaksPage() {
  // Lazy initializer: build the initial wheel once, no effect needed.
  const [deck, setDeck] = useState<Deck>(() => drawActive([]));
  const { active, pool } = deck;
  const [result, setResult] = useState<Break | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement | null>(null);

  function spin() {
    if (spinning || active.length !== WHEEL_SIZE) return;
    setSpinning(true);
    setResult(null);

    const idx = Math.floor(Math.random() * WHEEL_SIZE);
    const slice = 360 / WHEEL_SIZE;
    const target = 360 - (idx * slice + slice / 2);
    const spins = 6;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = ((target - currentMod) + 360) % 360;
    const next = rotation + spins * 360 + delta;
    setRotation(next);

    window.setTimeout(() => {
      setResult(active[idx]);
      setSpinning(false);
    }, 5700);
  }

  function newWheel() {
    if (spinning) return;
    // Snap rotation back to 0 without animating
    if (wheelRef.current) {
      wheelRef.current.style.transition = "none";
    }
    setRotation(0);
    setResult(null);
    setDeck(drawActive(pool));
    // Re-enable transition on next tick
    window.setTimeout(() => {
      if (wheelRef.current) wheelRef.current.style.transition = "";
    }, 30);
  }

  // Space/Enter to spin (avoid interfering with buttons themselves).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.code === "Space" || e.code === "Enter") && document.activeElement === document.body) {
        e.preventDefault();
        spin();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, spinning, rotation]);

  return (
    <main className="relative min-h-screen bg-bg-deep text-text-bright overflow-x-hidden">
      <SpaceBackdrop />
      <ToolHeader collectionId="lab-leader" activeToolId="brain-breaks" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 py-8 md:py-12">
        <div className="text-center mb-8">
          <div className="font-mono text-[11px] tracking-[0.35em] text-accent-cyan mb-2">
            ● CLASSROOM TOOL
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-accent-magenta to-accent-cyan bg-clip-text text-transparent">
            Brain Breaks Wheel
          </h1>
          <p className="mt-3 text-text-dim text-sm md:text-base max-w-2xl mx-auto">
            Click the wheel (or the button) to spin. Whatever it lands on — do it.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 items-start">
          {/* Wheel column */}
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-[520px] aspect-square mx-auto">
              {/* Pointer */}
              <div
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 -top-1.5 z-20"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "18px solid transparent",
                  borderRight: "18px solid transparent",
                  borderTop: "30px solid #fff",
                  filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.5))",
                }}
              />
              {/* Outer ring */}
              <div
                className="w-full h-full rounded-full p-[10px] shadow-2xl"
                style={{
                  background:
                    "conic-gradient(from 0deg, rgba(236,93,158,0.6), rgba(139,92,246,0.6), rgba(34,211,238,0.6), rgba(236,93,158,0.6))",
                }}
              >
                {/* Rotating wheel */}
                <div
                  ref={wheelRef}
                  onClick={spin}
                  className="w-full h-full rounded-full bg-bg-deep cursor-pointer"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: "transform 5.6s cubic-bezier(0.14, 0.72, 0.10, 1.00)",
                  }}
                >
                  {active.length === WHEEL_SIZE && <WheelSvg items={active} />}
                </div>
              </div>
              {/* Hub */}
              <button
                type="button"
                onClick={spin}
                disabled={spinning}
                aria-label="Spin the wheel"
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[74px] h-[74px] rounded-full font-display text-[11px] font-bold tracking-[0.15em] text-bg-deep disabled:cursor-not-allowed"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, #fff, #d8dbf0 60%, #9aa0c9)",
                  boxShadow:
                    "0 8px 24px rgba(0,0,0,0.55), inset 0 -6px 12px rgba(0,0,0,0.15)",
                }}
              >
                SPIN
              </button>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={spin}
                disabled={spinning}
                className="px-5 py-3 rounded-lg font-display font-bold tracking-wider text-sm text-white bg-gradient-to-r from-accent-magenta to-[#8B5CF6] shadow-[0_10px_30px_rgba(236,93,158,0.35)] hover:translate-y-[-1px] hover:shadow-[0_14px_34px_rgba(236,93,158,0.45)] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                🎡 SPIN THE WHEEL
              </button>
              <button
                type="button"
                onClick={newWheel}
                disabled={spinning}
                className="px-5 py-3 rounded-lg font-display font-bold tracking-wider text-sm text-text-bright border border-border-mid/60 bg-bg-panel hover:bg-bg-panel-solid/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔀 NEW 12
              </button>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-text-dim">
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CAT_COLOR.physical }} /> Physical
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CAT_COLOR.academic }} /> Academic
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CAT_COLOR.social }} /> Social
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CAT_COLOR.games }} /> Games
              </span>
            </div>
          </div>

          {/* Result column */}
          <aside
            aria-live="polite"
            className="rounded-2xl border border-border-mid/50 bg-bg-panel-solid/40 p-6 min-h-[340px] flex flex-col gap-3 backdrop-blur-sm"
          >
            {!result ? (
              <div className="m-auto text-center text-text-dim">
                Give it a spin — your brain break will show up here with instructions.
              </div>
            ) : (
              <>
                <span
                  className="self-start inline-block font-mono text-[11px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full font-bold text-bg-deep"
                  style={{ background: CAT_COLOR[result.cat] }}
                >
                  {CAT_LABEL[result.cat]}
                </span>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-text-bright leading-tight">
                  {result.title}
                </h2>
                <div className="text-text-bright text-base leading-relaxed">
                  <strong className="text-accent-cyan">How to do it: </strong>
                  {result.how}
                </div>
              </>
            )}
          </aside>
        </div>

        <div className="mt-12 text-center text-text-dim text-xs font-mono tracking-widest">
          BRAIN BREAKS SOURCED FROM{" "}
          <a
            href="https://inclusionrules.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-cyan hover:text-accent-magenta transition-colors underline underline-offset-4"
          >
            INCLUSIONRULES.COM
          </a>
        </div>
      </div>
    </main>
  );
}
