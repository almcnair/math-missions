// Content slides — hook, define, concept, strategy, complete.
// CFU slides live in their own file (CfuSlides.tsx).

import type {
  HookSlide,
  DefineSlide,
  ConceptSlide,
  StrategySlide,
  CompleteSlide,
  ConceptCard,
  StrategyRow,
  MissionImage,
} from "@/lib/mission-schema";
import { Inline, Paragraphs } from "@/lib/inline-markup";

// ---------- Shared image view ----------------------------------------------
// Renders an optional MissionImage with caption. Aspect-ratio-aware so the
// frame doesn't jump while the image loads.
export function MissionImageView({
  image,
  className = "",
}: {
  image: MissionImage | undefined;
  className?: string;
}) {
  if (!image?.src) return null;
  const ratioStyle = image.aspectRatio
    ? { aspectRatio: String(image.aspectRatio) }
    : undefined;
  return (
    <figure className={`mission-image ${className}`}>
      <div
        className="relative overflow-hidden rounded-md border border-border-mid bg-bg-panel-solid/40"
        style={ratioStyle}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.src}
          alt={image.alt}
          className="w-full h-full object-contain"
        />
      </div>
      {image.caption && (
        <figcaption className="mt-2 text-sm text-text-dim italic text-center leading-relaxed">
          {image.caption}
        </figcaption>
      )}
    </figure>
  );
}

const tagToneClass = {
  default: "text-accent-cyan",
  amber: "text-accent-amber",
  magenta: "text-accent-magenta",
} as const;

function SlideTag({ tag, tone }: { tag?: string; tone?: keyof typeof tagToneClass }) {
  if (!tag) return null;
  return (
    <div className={`font-mono text-xs tracking-[0.18em] ${tagToneClass[tone ?? "default"]}`}>
      {tag}
    </div>
  );
}

// ---------- Hook ------------------------------------------------------------

export function HookSlideView({ slide }: { slide: HookSlide }) {
  return (
    <div className="grid lg:grid-cols-[2fr_1fr] gap-10">
      <div className="space-y-6">
        <SlideTag tag={slide.tag} tone={slide.tagTone} />
        <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
          <Inline>{slide.headline}</Inline>
        </h1>
        <MissionImageView image={slide.image} />
        <div className="max-w-prose space-y-4 text-lg leading-relaxed text-text-bright">
          <Paragraphs>{slide.body}</Paragraphs>
        </div>
        {slide.quote && (
          <blockquote className="relative border-l-2 border-accent-amber bg-accent-amber/5 rounded-r-md pl-6 pr-5 py-4 my-6">
            <span className="absolute -left-1.5 -top-2 text-3xl text-accent-amber/60 font-display">&ldquo;</span>
            <p className="italic text-text-bright text-lg leading-relaxed">{slide.quote.text}</p>
            <footer className="not-italic font-mono text-xs tracking-[0.18em] text-accent-amber mt-3">
              {slide.quote.cite}
            </footer>
          </blockquote>
        )}
      </div>
      {slide.sidebar && <SidebarRender sidebar={slide.sidebar} />}
    </div>
  );
}

function SidebarRender({ sidebar }: { sidebar: NonNullable<HookSlide["sidebar"]> }) {
  // Defensive: malformed sidebars (missing kind, wrong shape) should not
  // crash the whole page. Render nothing and warn instead.
  if (!sidebar || typeof sidebar !== "object") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = sidebar as any;
  if (!sb.kind) {
    if (typeof window !== "undefined") {
      console.warn("[SidebarRender] sidebar is missing `kind`; skipping render", sb);
    }
    return null;
  }
  if (sidebar.kind === "stock-list") {
    return (
      <aside className="relative border border-border-mid bg-bg-panel-solid/60 backdrop-blur-sm rounded-md p-5">
        <span className="corner tl" /><span className="corner tr" />
        <span className="corner bl" /><span className="corner br" />
        <div className="font-mono text-xs tracking-[0.18em] text-accent-cyan mb-4"><Inline>{sidebar.title}</Inline></div>
        <ul className="space-y-2">
          {sidebar.items.map((it) => (
            <li
              key={it.num}
              className={`flex items-center gap-3 text-sm font-mono ${
                it.state === "done"    ? "text-text-bright" :
                it.state === "current" ? "text-accent-amber" :
                                         "text-text-faint"
              }`}
            >
              <span className="opacity-60">{it.num}</span>
              <span className="font-ui font-medium"><Inline>{it.label}</Inline></span>
              {it.state === "current" && <span className="ml-auto text-xs tracking-[0.18em]">◀ NOW</span>}
            </li>
          ))}
        </ul>
      </aside>
    );
  }
  if (sidebar.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={sidebar.src} alt={sidebar.alt} className="rounded-md border border-border-mid" />
    );
  }
  return (
    <aside className="border border-border-mid bg-bg-panel-solid/60 rounded-md p-5">
      <div className="font-mono text-xs tracking-[0.18em] text-accent-cyan mb-3"><Inline>{sidebar.title}</Inline></div>
      <dl className="space-y-2 text-sm">
        {(sidebar.rows ?? []).map((r, i) => (
          <div key={i} className="flex justify-between gap-4">
            <dt className="text-text-dim"><Inline>{r.label}</Inline></dt>
            <dd><Inline>{r.value}</Inline></dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

// ---------- Define ----------------------------------------------------------

export function DefineSlideView({ slide }: { slide: DefineSlide }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <SlideTag tag={slide.tag} tone={slide.tagTone} />
      <div className="inline-block font-mono text-xs tracking-[0.18em] text-accent-amber border border-accent-amber/40 px-3 py-1 rounded-sm">
        DEFINITION
      </div>
      <h1 className="font-display text-6xl font-black">
        <span className="text-accent-cyan key-term">{slide.term}</span>
      </h1>
      {slide.pronunciation && (
        <p className="font-mono text-sm text-text-dim">{slide.pronunciation}</p>
      )}
      <div className="relative border border-border-strong bg-bg-panel-solid/70 rounded-md p-6">
        <span className="corner tl" /><span className="corner tr" />
        <span className="corner bl" /><span className="corner br" />
        <p className="max-w-prose text-xl leading-relaxed">
          <Inline>{slide.definition}</Inline>
        </p>
      </div>
      <MissionImageView image={slide.image} />
      <div className="grid md:grid-cols-2 gap-4 pt-2">
        {slide.plainWords && (
          <div className="border border-border-faint rounded-md p-4">
            <div className="font-mono text-xs tracking-[0.18em] text-accent-cyan mb-2">IN PLAIN WORDS</div>
            <p className="text-lg leading-relaxed text-text-bright"><Inline>{slide.plainWords}</Inline></p>
          </div>
        )}
        {slide.analogy && (
          <div className="border border-border-faint rounded-md p-4">
            <div className="font-mono text-xs tracking-[0.18em] text-accent-amber mb-2">THINK OF IT LIKE</div>
            <p className="text-lg leading-relaxed text-text-bright"><Inline>{slide.analogy}</Inline></p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Concept ---------------------------------------------------------

const accentBorder: Record<NonNullable<ConceptCard["accent"]>, string> = {
  cyan: "border-accent-cyan/50",
  amber: "border-accent-amber/50",
  magenta: "border-accent-magenta/50",
};

export function ConceptSlideView({ slide }: { slide: ConceptSlide }) {
  return (
    <div className="space-y-6">
      <SlideTag tag={slide.tag} tone={slide.tagTone} />
      <h1 className="font-display text-3xl lg:text-4xl font-bold">
        <Inline>{slide.headline}</Inline>
      </h1>
      {slide.intro && (
        <p className="max-w-prose text-lg leading-relaxed text-text-bright"><Inline>{slide.intro}</Inline></p>
      )}
      <MissionImageView image={slide.image} />
      <div className="grid md:grid-cols-3 gap-4">
        {slide.cards.map((c) => (
          <div
            key={c.id}
            className={`relative border ${c.accent ? accentBorder[c.accent] : "border-border-mid"} bg-bg-panel-solid/60 rounded-md p-5 space-y-3`}
          >
            <span className="corner tl" /><span className="corner tr" />
            <span className="corner bl" /><span className="corner br" />
            <div className="text-3xl">{c.icon}</div>
            <div className="font-display font-bold tracking-wider">{c.name}</div>
            <p className="text-base leading-relaxed text-text-bright"><Inline>{c.description}</Inline></p>
            {c.example && (
              <div className="mt-3 rounded-md border border-accent-amber/25 bg-accent-amber/5 px-3 py-2.5">
                <div className="font-mono text-xs tracking-[0.15em] text-accent-amber mb-1">{c.example.label}</div>
                <p className="text-sm leading-relaxed text-text-bright italic"><Inline>{c.example.text}</Inline></p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Strategy --------------------------------------------------------

export function StrategySlideView({ slide }: { slide: StrategySlide }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SlideTag tag={slide.tag} tone={slide.tagTone} />
      <h1 className="font-display text-3xl lg:text-4xl font-bold">
        <Inline>{slide.headline}</Inline>
      </h1>
      {slide.intro && (
        <p className="max-w-prose text-lg leading-relaxed text-text-bright"><Inline>{slide.intro}</Inline></p>
      )}
      <MissionImageView image={slide.image} />
      <ol className="space-y-4 pt-2">
        {slide.rows.map((row, i) => (
          <StrategyRowView key={i} row={row} num={i + 1} />
        ))}
      </ol>
    </div>
  );
}

function StrategyRowView({ row, num }: { row: StrategyRow; num: number }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-5 border border-border-faint bg-bg-panel-solid/40 rounded-md p-5">
      <div className="font-display text-3xl font-black text-accent-cyan">
        {String(num).padStart(2, "0")}
      </div>
      <div className="space-y-2">
        <div className="font-display font-bold text-lg">
          <Inline>{row.name}</Inline>
        </div>
        <p className="text-base leading-relaxed text-text-bright"><Inline>{row.description}</Inline></p>
        {row.counter && (
          <div className="mt-3 rounded-md border border-accent-amber/25 bg-accent-amber/5 px-3 py-2.5 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-baseline">
            <span className="font-mono text-xs tracking-[0.15em] text-accent-amber whitespace-nowrap">
              {row.counter.label}
            </span>
            <p className="text-base leading-relaxed text-text-bright"><Inline>{row.counter.text}</Inline></p>
          </div>
        )}
      </div>
    </li>
  );
}

// ---------- Complete --------------------------------------------------------

export type CompleteDynamics = {
  credits: number;
  accuracy: number;
  unlockedNext?: string;
  rankDelta?: string;
  /** Optional XP breakdown injected once the server-side scoring resolves. */
  xp?: {
    baseCredits: number;
    streakBonus: number;
    perfectBonus: number;
    totalCredits: number;
    rankXp: number;
    perfectRun: boolean;
    newBest: boolean;
    profileTotalCredits: number;
    profileRankXp: number;
    /** Profile rank XP BEFORE this completion. Used to detect rank crossings. */
    previousRankXp: number;
    rankName: string;
  };
  /** While we wait for the server action — "SAVING…" badge. */
  saving?: boolean;
  /** Surface a network failure but don't block the UI. */
  saveError?: string;
};

export function CompleteSlideView({
  slide,
  dynamics,
  onPrimary,
  onSecondary,
}: {
  slide: CompleteSlide;
  dynamics: CompleteDynamics;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  function valueFor(r: typeof slide.rewards[number]): string {
    if (r.staticValue) return r.staticValue;
    switch (r.dynamicValue) {
      case "credits":       return `${dynamics.xp?.totalCredits ?? dynamics.credits} CRD`;
      case "accuracy":      return `${Math.round(dynamics.accuracy * 100)}%`;
      case "unlocked-next": return dynamics.unlockedNext ?? "—";
      case "rank-delta":    return dynamics.rankDelta ?? "+1";
      default:              return "—";
    }
  }
  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 py-8">
      <div className="font-mono text-xs tracking-[0.18em] text-accent-cyan">⟡ TRANSMISSION CLEAR</div>
      <h1 className="font-display text-6xl font-black tracking-tight">{slide.headline}</h1>
      <p className="text-lg leading-relaxed text-text-bright"><Inline>{slide.subtext}</Inline></p>
      <MissionImageView image={slide.image} className="max-w-md mx-auto" />

      <XpBreakdownPanel dynamics={dynamics} />

      <div className="border border-border-strong bg-bg-panel-solid/70 rounded-md p-6 space-y-4 text-left">
        {slide.rewards.map((r, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="text-2xl w-10 text-center">{r.icon}</div>
            <div className="flex-1">
              <div className="font-mono text-xs tracking-[0.18em] text-text-dim">{r.label}</div>
              <div className="font-display font-bold text-lg text-accent-cyan">{valueFor(r)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-center pt-4">
        {slide.secondaryCta && (
          <button
            onClick={onSecondary}
            className="px-6 py-3 border border-border-mid font-mono text-xs tracking-[0.18em] hover:bg-bg-panel-solid"
          >
            {slide.secondaryCta.label}
          </button>
        )}
        <button
          onClick={onPrimary}
          className="px-6 py-3 bg-accent-cyan text-bg-deep font-mono text-xs tracking-[0.18em] font-bold hover:bg-accent-cyan-soft"
        >
          {slide.primaryCta.label}
        </button>
      </div>
    </div>
  );
}

// ---------- XP Breakdown Panel ---------------------------------------------
// Shown on the complete slide once the server-side XP math returns. Renders
// a graceful loading state while saving and a soft error tray on failure.

function XpBreakdownPanel({ dynamics }: { dynamics: CompleteDynamics }) {
  if (dynamics.saveError) {
    // Demo / hiring-manager path: unauthenticated users hit the complete
    // slide and `completeMission` returns `not-authenticated`. That's the
    // expected happy path for the public demo, not a broken save — render
    // it as a soft "sign up to save" CTA instead of a red error tray.
    if (dynamics.saveError === "not-authenticated") {
      return (
        <div className="border border-accent-cyan/60 bg-accent-cyan/10 rounded-md p-4 text-left">
          <div className="font-mono text-xs tracking-[0.18em] text-accent-cyan">◈ DEMO RUN COMPLETE</div>
          <div className="text-sm leading-relaxed text-text-bright mt-1">
            Nice work — you finished the mission!
          </div>
          <div className="text-sm leading-relaxed text-text-dim mt-1">
            <a href="/login" className="underline text-accent-cyan hover:text-accent-cyan/80">Create an account</a> to save your XP, unlock more missions, and track your progress.
          </div>
        </div>
      );
    }
    return (
      <div className="border border-accent-amber/60 bg-accent-amber/10 rounded-md p-4 text-left">
        <div className="font-mono text-xs tracking-[0.18em] text-accent-amber">⚠ XP SAVE FAILED</div>
        <div className="text-sm leading-relaxed text-text-bright mt-1">{dynamics.saveError}</div>
        <div className="text-sm leading-relaxed text-text-dim mt-1">Your run still counted locally — try again later or sign in fresh.</div>
      </div>
    );
  }

  if (!dynamics.xp) {
    return (
      <div className="border border-border-mid bg-bg-panel-solid/40 rounded-md p-4 text-left flex items-center gap-3">
        <span className="inline-block w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
        <div>
          <div className="font-mono text-xs tracking-[0.18em] text-text-dim">CALCULATING XP</div>
          <div className="text-sm text-text-bright/80">Banking your run with mission control…</div>
        </div>
      </div>
    );
  }

  const xp = dynamics.xp;
  const lines = [
    { label: "BASE CREDITS",        value: `+${xp.baseCredits}` },
    ...(xp.streakBonus > 0  ? [{ label: "STREAK BONUS",   value: `+${xp.streakBonus}`,  accent: "amber" as const }] : []),
    ...(xp.perfectBonus > 0 ? [{ label: "PERFECT RUN +25%", value: `+${xp.perfectBonus}`, accent: "amber" as const }] : []),
  ];

  return (
    <div className="border border-accent-cyan/60 bg-bg-panel-solid/80 rounded-md p-6 text-left space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs tracking-[0.18em] text-accent-cyan">⟡ XP REPORT</div>
        {xp.newBest && (
          <div className="font-mono text-xs tracking-[0.18em] text-accent-amber border border-accent-amber/60 rounded px-2 py-0.5">
            ★ NEW BEST
          </div>
        )}
        {!xp.newBest && (
          <div className="font-mono text-xs tracking-[0.18em] text-text-dim">
            REPLAY — BEST-OF-RUN STILL COUNTS
          </div>
        )}
      </div>

      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between border-b border-border-faint/40 pb-1.5">
            <span className="font-mono text-sm tracking-[0.15em] text-text-dim">{line.label}</span>
            <span className={`font-display font-bold ${
              "accent" in line && line.accent === "amber" ? "text-accent-amber" : "text-text-bright"
            }`}>{line.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2">
          <span className="font-mono text-sm tracking-[0.15em] text-accent-cyan">RUN TOTAL</span>
          <span className="font-display font-black text-2xl text-accent-cyan">+{xp.totalCredits} CRD</span>
        </div>
      </div>

      <div className="border-t border-border-faint/40 pt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="font-mono text-xs tracking-[0.15em] text-text-dim">RANK</div>
          <div className="font-display font-bold text-sm text-accent-amber mt-0.5">{xp.rankName}</div>
        </div>
        <div>
          <div className="font-mono text-xs tracking-[0.15em] text-text-dim">TOTAL CRD</div>
          <div className="font-display font-bold text-sm text-text-bright mt-0.5">{xp.profileTotalCredits}</div>
        </div>
        <div>
          <div className="font-mono text-xs tracking-[0.15em] text-text-dim">RANK XP</div>
          <div className="font-display font-bold text-sm text-text-bright mt-0.5">{xp.profileRankXp}</div>
        </div>
      </div>
    </div>
  );
}
