// /glossary — Debate Glossary
//
// Public, searchable glossary of policy debate terms. Definitions kept at
// roughly a 5th-grade reading level.
//
// Content lives in terms.json (structured per-term fields + optional expanded
// content). This file just renders the browse UI and the expanded-card modal.
//
// Design: matches /brain-breaks and /camp — SpaceBackdrop + Header + site
// color tokens (accent-cyan / accent-magenta / accent-purple / amber).
// Client component because search + category filter + modal are interactive.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackEventOnce, trackSearchDebounced } from "@/lib/analytics";
import { SpaceBackdrop } from "@/components/Starfield";
import ToolHeader from "@/components/toolkit/ToolHeader";
import termsData from "./terms.json";

type Category =
  | "basics"
  | "speeches"
  | "evidence"
  | "argument"
  | "aff"
  | "neg"
  | "topicality"
  | "flowing"
  | "winning"
  | "culture";

type SourceKind = "curriculum" | "external" | "drafted";

type Source = { label: string; kind: SourceKind };

type Term = {
  id: string;
  term: string;
  short?: string;
  category: Category;
  emoji: string;
  def: string;
  // Expanded fields (optional in schema, but drafted for all 71 terms):
  plain?: string;
  example?: string;
  where?: string;
  watch?: string;
  related?: string[];
  sources?: Source[];
};

const TERMS: Term[] = (termsData as { terms: Term[] }).terms;

// Fast lookup by id, used by related-term chips inside the modal.
const TERMS_BY_ID: Record<string, Term> = Object.fromEntries(
  TERMS.map((t) => [t.id, t]),
);

// -------------------- Category metadata -----------------------------------

const CAT_LABEL: Record<Category, string> = {
  basics: "The Basics",
  speeches: "Speeches & Time",
  evidence: "Evidence",
  argument: "Building an Argument",
  aff: "The Affirmative Case",
  neg: "The Negative Attacks",
  topicality: "Topicality",
  flowing: "Flowing & Strategy",
  winning: "Winning the Round",
  culture: "Behavior & Culture",
};

// Tailwind-safe class strings per category. We deliberately hard-code the full
// class names so Tailwind's JIT keeps them.
const CAT_STYLES: Record<
  Category,
  { chipActive: string; chipIdle: string; badge: string; ring: string; accent: string }
> = {
  basics: {
    chipActive: "bg-accent-cyan text-bg-deep border-accent-cyan",
    chipIdle: "border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10",
    badge: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/40",
    ring: "hover:border-accent-cyan/60",
    accent: "text-accent-cyan",
  },
  speeches: {
    chipActive: "bg-accent-magenta text-bg-deep border-accent-magenta",
    chipIdle: "border-accent-magenta/40 text-accent-magenta hover:bg-accent-magenta/10",
    badge: "bg-accent-magenta/15 text-accent-magenta border-accent-magenta/40",
    ring: "hover:border-accent-magenta/60",
    accent: "text-accent-magenta",
  },
  evidence: {
    chipActive: "bg-[#F5A524] text-bg-deep border-[#F5A524]",
    chipIdle: "border-[#F5A524]/40 text-[#F5A524] hover:bg-[#F5A524]/10",
    badge: "bg-[#F5A524]/15 text-[#F5A524] border-[#F5A524]/40",
    ring: "hover:border-[#F5A524]/60",
    accent: "text-[#F5A524]",
  },
  argument: {
    chipActive: "bg-[#8B5CF6] text-bg-deep border-[#8B5CF6]",
    chipIdle: "border-[#8B5CF6]/40 text-[#8B5CF6] hover:bg-[#8B5CF6]/10",
    badge: "bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/40",
    ring: "hover:border-[#8B5CF6]/60",
    accent: "text-[#8B5CF6]",
  },
  aff: {
    chipActive: "bg-accent-cyan text-bg-deep border-accent-cyan",
    chipIdle: "border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10",
    badge: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/40",
    ring: "hover:border-accent-cyan/60",
    accent: "text-accent-cyan",
  },
  neg: {
    chipActive: "bg-accent-magenta text-bg-deep border-accent-magenta",
    chipIdle: "border-accent-magenta/40 text-accent-magenta hover:bg-accent-magenta/10",
    badge: "bg-accent-magenta/15 text-accent-magenta border-accent-magenta/40",
    ring: "hover:border-accent-magenta/60",
    accent: "text-accent-magenta",
  },
  topicality: {
    chipActive: "bg-[#F5A524] text-bg-deep border-[#F5A524]",
    chipIdle: "border-[#F5A524]/40 text-[#F5A524] hover:bg-[#F5A524]/10",
    badge: "bg-[#F5A524]/15 text-[#F5A524] border-[#F5A524]/40",
    ring: "hover:border-[#F5A524]/60",
    accent: "text-[#F5A524]",
  },
  flowing: {
    chipActive: "bg-[#8B5CF6] text-bg-deep border-[#8B5CF6]",
    chipIdle: "border-[#8B5CF6]/40 text-[#8B5CF6] hover:bg-[#8B5CF6]/10",
    badge: "bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/40",
    ring: "hover:border-[#8B5CF6]/60",
    accent: "text-[#8B5CF6]",
  },
  winning: {
    chipActive: "bg-accent-cyan text-bg-deep border-accent-cyan",
    chipIdle: "border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10",
    badge: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/40",
    ring: "hover:border-accent-cyan/60",
    accent: "text-accent-cyan",
  },
  culture: {
    chipActive: "bg-accent-magenta text-bg-deep border-accent-magenta",
    chipIdle: "border-accent-magenta/40 text-accent-magenta hover:bg-accent-magenta/10",
    badge: "bg-accent-magenta/15 text-accent-magenta border-accent-magenta/40",
    ring: "hover:border-accent-magenta/60",
    accent: "text-accent-magenta",
  },
};

const CAT_ORDER: Category[] = [
  "basics",
  "speeches",
  "evidence",
  "argument",
  "aff",
  "neg",
  "topicality",
  "flowing",
  "winning",
  "culture",
];

// -------------------- Term Modal ----------------------------------------

function TermModal({
  term,
  onClose,
  onOpenId,
}: {
  term: Term;
  onClose: () => void;
  onOpenId: (id: string) => void;
}) {
  const s = CAT_STYLES[term.category];
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Focus the dialog when it opens (for screen readers).
  useEffect(() => {
    dialogRef.current?.focus();
  }, [term.id]);

  const relatedTerms = (term.related ?? [])
    .map((id) => TERMS_BY_ID[id])
    .filter(Boolean) as Term[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`term-modal-title-${term.id}`}
      onClick={(e) => {
        // Backdrop click closes.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl my-4 sm:my-8 rounded-2xl border border-border-mid/60 bg-bg-panel-solid shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header inside the modal */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-border-mid/40 bg-bg-panel-solid/95 backdrop-blur rounded-t-2xl">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-3xl leading-none shrink-0 mt-0.5" aria-hidden="true">
              {term.emoji}
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2
                  id={`term-modal-title-${term.id}`}
                  className="font-display text-xl sm:text-2xl font-bold text-text-bright leading-tight"
                >
                  {term.term}
                </h2>
                {term.short ? (
                  <span className="font-mono text-xs text-text-dim tracking-widest">
                    {term.short}
                  </span>
                ) : null}
              </div>
              <span
                className={`mt-1 inline-block rounded-md border px-2 py-0.5 text-[10px] font-mono tracking-[0.2em] ${s.badge}`}
              >
                {CAT_LABEL[term.category].toUpperCase()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-border-mid/60 px-2.5 py-1 text-xs font-mono text-text-dim hover:text-text-bright hover:border-text-bright/60 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-5 space-y-5">
          {/* One-liner (bigger, feature-y) */}
          <p className="text-base sm:text-lg text-text-bright leading-relaxed">
            {term.def}
          </p>

          {term.plain ? (
            <Section label="In plain English">
              <p className="text-text-bright/90 leading-relaxed">{term.plain}</p>
            </Section>
          ) : null}

          {term.example ? (
            <Section label="Example in a round" accent={s.accent}>
              <p className="text-text-bright/90 leading-relaxed italic">
                {term.example}
              </p>
            </Section>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {term.where ? (
              <Section label="Where you'll see it">
                <p className="text-text-bright/90 text-sm leading-relaxed">
                  {term.where}
                </p>
              </Section>
            ) : null}
            {term.watch ? (
              <Section label="Watch out">
                <p className="text-text-bright/90 text-sm leading-relaxed">
                  {term.watch}
                </p>
              </Section>
            ) : null}
          </div>

          {relatedTerms.length > 0 ? (
            <Section label="Related">
              <div className="flex flex-wrap gap-2">
                {relatedTerms.map((r) => {
                  const rs = CAT_STYLES[r.category];
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onOpenId(r.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-mono tracking-wider transition-colors ${rs.chipIdle}`}
                    >
                      <span className="mr-1">{r.emoji}</span>
                      {r.term}
                    </button>
                  );
                })}
              </div>
            </Section>
          ) : null}

          {term.sources && term.sources.length > 0 ? (
            <div className="pt-2 border-t border-border-mid/40">
              <p className="text-[10px] font-mono tracking-[0.2em] text-text-dim uppercase mb-1">
                Sources
              </p>
              <ul className="text-xs text-text-dim space-y-0.5">
                {term.sources.map((src, i) => (
                  <li key={i}>
                    {src.kind === "curriculum" ? "📘 " :
                     src.kind === "external"   ? "🔗 " : "✍️ "}
                    {src.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
  accent,
}: {
  label: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div>
      <p
        className={`text-[10px] font-mono tracking-[0.25em] uppercase mb-1.5 ${
          accent ?? "text-text-dim"
        }`}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

// -------------------- Page ----------------------------------------------

// Normalizes a string for search: lowercase + strip diacritics + collapse
// whitespace. Kept simple on purpose.
function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function GlossaryPage() {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<Category | "all">("all");
  // Lazy init: read the URL hash on first render so /glossary#kritik opens
  // that term without needing a post-mount setState.
  const [openId, setOpenId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.location.hash.replace(/^#/, "").trim().toLowerCase();
    return raw && TERMS_BY_ID[raw] ? raw : null;
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep the modal in sync with the URL when the user changes the hash
  // (back button, pasted link, manual edit). This effect only subscribes;
  // it doesn't set state at mount time.
  useEffect(() => {
    const onHashChange = () => {
      const raw = window.location.hash.replace(/^#/, "").trim().toLowerCase();
      if (raw && TERMS_BY_ID[raw]) {
        setOpenId(raw);
      } else if (!raw) {
        setOpenId(null);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // When we open/close a modal, sync the URL hash without adding history entries.
  const openTerm = useCallback((id: string) => {
    setOpenId(id);
    // Session-scoped dedupe so re-opening a term doesn't burn budget.
    trackEventOnce(`glossary_term_opened:${id}`, "glossary_term_opened", { termId: id });
    if (typeof window !== "undefined") {
      const newUrl = `${window.location.pathname}${window.location.search}#${id}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  const closeModal = useCallback(() => {
    setOpenId(null);
    if (typeof window !== "undefined") {
      const newUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  // Filter + group.
  const { grouped, matchCount, letterIndex } = useMemo(() => {
    const q = normalize(query.trim());
    const filtered = TERMS.filter((t) => {
      if (activeCat !== "all" && t.category !== activeCat) return false;
      if (!q) return true;
      const hay = normalize(
        `${t.term} ${t.short ?? ""} ${t.def} ${t.plain ?? ""}`,
      );
      return hay.includes(q);
    });

    // Sort alphabetically within each category. Sort by the display term.
    const byCat = new Map<Category, Term[]>();
    for (const t of filtered) {
      const list = byCat.get(t.category) ?? [];
      list.push(t);
      byCat.set(t.category, list);
    }
    for (const list of byCat.values()) {
      list.sort((a, b) => a.term.localeCompare(b.term));
    }

    // Build the alphabetical jump-bar based on ALL terms (not filtered) so the
    // A–Z bar is stable. Highlight which letters currently have visible matches.
    const allFirstLetters = new Set(
      TERMS.map((t) => t.term.charAt(0).toUpperCase()),
    );
    const activeFirstLetters = new Set(
      filtered.map((t) => t.term.charAt(0).toUpperCase()),
    );
    const letters: { letter: string; active: boolean; present: boolean }[] = [];
    for (let i = 0; i < 26; i++) {
      const L = String.fromCharCode(65 + i);
      letters.push({
        letter: L,
        present: allFirstLetters.has(L),
        active: activeFirstLetters.has(L),
      });
    }

    return { grouped: byCat, matchCount: filtered.length, letterIndex: letters };
  }, [query, activeCat]);

  function jumpToLetter(letter: string) {
    // Find the first visible card whose term starts with this letter and
    // scroll to it. Uses the id we stamp on each card.
    const el = document.querySelector<HTMLElement>(
      `[data-first-letter="${letter}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Give a little breathing room under the sticky search bar.
      window.scrollBy({ top: -100, behavior: "smooth" });
    }
  }

  // Stamp data-first-letter only on the FIRST card of each starting letter
  // (in visible order). We compute that inline while rendering.
  const seenLetters = new Set<string>();

  const openTermObject = openId ? TERMS_BY_ID[openId] ?? null : null;

  return (
    <div className="relative min-h-screen bg-bg-deep text-text-bright">
      <SpaceBackdrop />
      <ToolHeader collectionId="debater" activeToolId="glossary" />

      <main className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
        {/* Intro */}
        <section className="mb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-text-bright">
            Debate Glossary
          </h1>
          <p className="mt-2 text-text-dim">
            Every policy debate word we use, explained in plain English. Type
            in the box to search — or tap any card for a fuller explanation
            with examples and common mistakes.
          </p>
        </section>

        {/* Sticky search + filter */}
        <section className="sticky top-2 z-20 mb-6 rounded-2xl border border-border-mid/60 bg-bg-panel-solid/85 backdrop-blur-md p-3 sm:p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Search terms or definitions…"
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                // Debounced (800ms) + min 3 chars — see src/lib/analytics.ts.
                // Signal: what terms are people looking up? Noise-free.
                trackSearchDebounced("glossary_search", v);
              }}
              className="flex-1 rounded-xl border border-border-mid/60 bg-bg-deep/60 px-4 py-3 text-base text-text-bright placeholder:text-text-dim focus:outline-none focus:border-accent-cyan/70 focus:ring-2 focus:ring-accent-cyan/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="font-mono text-[10px] tracking-[0.25em] text-text-dim hover:text-accent-cyan transition-colors"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCat("all")}
              className={`rounded-full border px-3 py-1 text-xs font-mono tracking-wider transition-colors ${
                activeCat === "all"
                  ? "bg-text-bright text-bg-deep border-text-bright"
                  : "border-border-mid/60 text-text-dim hover:text-text-bright hover:border-text-bright/60"
              }`}
            >
              ALL
            </button>
            {CAT_ORDER.map((c) => {
              const active = activeCat === c;
              const s = CAT_STYLES[c];
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCat(c)}
                  className={`rounded-full border px-3 py-1 text-xs font-mono tracking-wider transition-colors ${
                    active ? s.chipActive : s.chipIdle
                  }`}
                >
                  {CAT_LABEL[c].toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* Alphabet jump bar */}
          <div className="mt-3 flex flex-wrap gap-1">
            {letterIndex.map(({ letter, active, present }) => (
              <button
                key={letter}
                type="button"
                onClick={() => active && jumpToLetter(letter)}
                disabled={!active}
                className={`w-7 h-7 text-xs font-mono rounded transition-colors ${
                  active
                    ? "text-accent-cyan hover:bg-accent-cyan/10 border border-accent-cyan/30"
                    : present
                    ? "text-text-dim/40 border border-border-mid/30 cursor-not-allowed"
                    : "text-text-dim/20 border border-transparent cursor-not-allowed"
                }`}
                aria-label={`Jump to ${letter}`}
              >
                {letter}
              </button>
            ))}
          </div>

          <div className="mt-2 text-xs text-text-dim font-mono">
            {matchCount} {matchCount === 1 ? "term" : "terms"}
            {query.trim() ? ` matching "${query.trim()}"` : ""}
            {activeCat !== "all" ? ` in ${CAT_LABEL[activeCat]}` : ""}
          </div>
        </section>

        {/* Results */}
        {matchCount === 0 ? (
          <div className="rounded-2xl border border-border-mid/60 bg-bg-panel-solid/60 p-8 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-text-bright font-semibold">
              No terms matched.
            </p>
            <p className="text-text-dim text-sm mt-1">
              Try a different word, or clear the filter to see everything.
            </p>
          </div>
        ) : (
          CAT_ORDER.filter((c) => grouped.has(c)).map((cat) => {
            const items = grouped.get(cat)!;
            const s = CAT_STYLES[cat];
            return (
              <section key={cat} className="mb-8">
                <h2 className="mb-3 flex items-center gap-2">
                  <span
                    className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-mono tracking-[0.2em] ${s.badge}`}
                  >
                    {CAT_LABEL[cat].toUpperCase()}
                  </span>
                  <span className="text-text-dim text-xs font-mono">
                    {items.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((t) => {
                    const first = t.term.charAt(0).toUpperCase();
                    const stampFirst = !seenLetters.has(first);
                    if (stampFirst) seenLetters.add(first);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        data-first-letter={stampFirst ? first : undefined}
                        onClick={() => openTerm(t.id)}
                        className={`text-left rounded-2xl border border-border-mid/60 bg-bg-panel-solid/60 p-4 transition-colors ${s.ring} focus:outline-none focus:border-accent-cyan/60`}
                      >
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                          <h3 className="font-display font-bold text-lg text-text-bright leading-tight">
                            <span className="mr-2" aria-hidden="true">{t.emoji}</span>
                            {t.term}
                            {t.short ? (
                              <span className="ml-2 font-mono text-xs text-text-dim tracking-widest">
                                {t.short}
                              </span>
                            ) : null}
                          </h3>
                        </div>
                        <p className="text-sm text-text-bright/90 leading-relaxed">
                          {t.def}
                        </p>
                        <p className="mt-2 text-[10px] font-mono tracking-[0.2em] text-text-dim/70">
                          TAP FOR MORE →
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        {/* Footer note */}
        <footer className="mt-10 pt-6 border-t border-border-mid/40 text-xs text-text-dim">
          <p>
            Core terms adapted from the CDSI 2026 Debate Glossary. Additional
            entries drafted for Math Missions at a middle-school reading
            level. Suggestions for more? Tell your coach.
          </p>
          <p className="mt-3">
            <a href="/privacy" className="hover:text-accent-cyan">Privacy</a>
          </p>
        </footer>
      </main>

      {openTermObject ? (
        <TermModal
          term={openTermObject}
          onClose={closeModal}
          onOpenId={openTerm}
        />
      ) : null}
    </div>
  );
}
