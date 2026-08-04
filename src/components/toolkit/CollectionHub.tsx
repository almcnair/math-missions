// CollectionHub — shared hub UI for any Policy Debate 101 toolkit collection.
//
// Renders the ToolHeader (with the given collectionId), a gradient hero using
// the collection's name/tagline, audience filter chips, and a sectioned card
// grid. The `/toolkit` (Lab Leader) and `/resources` (Debater) hubs both use
// this — the only difference is which collectionId they pass in.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { trackEventOnce } from "@/lib/analytics";
import { SpaceBackdrop } from "@/components/Starfield";
import ToolHeader, {
  toolkit,
  getCollection,
  getToolsForCollection,
  type Tool,
} from "@/components/toolkit/ToolHeader";

type Tone = "cyan" | "magenta" | "violet";

const TONE: Record<
  Tone,
  {
    border: string;
    borderHover: string;
    icoWrap: string;
    icoText: string;
    go: string;
    glow: string;
  }
> = {
  cyan: {
    border: "border-accent-cyan/25",
    borderHover: "hover:border-accent-cyan/70",
    icoWrap: "bg-accent-cyan/10 border-accent-cyan/40",
    icoText: "text-accent-cyan",
    go: "text-accent-cyan",
    glow: "hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(34,211,238,0.35)]",
  },
  magenta: {
    border: "border-accent-magenta/25",
    borderHover: "hover:border-accent-magenta/70",
    icoWrap: "bg-accent-magenta/10 border-accent-magenta/40",
    icoText: "text-accent-magenta",
    go: "text-accent-magenta",
    glow: "hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(236,93,158,0.35)]",
  },
  violet: {
    border: "border-accent-violet/30",
    borderHover: "hover:border-accent-violet/70",
    icoWrap: "bg-accent-violet/15 border-accent-violet/50",
    icoText: "text-[#B8A6FF]",
    go: "text-[#B8A6FF]",
    glow: "hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(107,92,165,0.45)]",
  },
};

// -------- Props -----------------------------------------------------------

type CollectionHubProps = {
  collectionId: string;
  /** Optional callout copy for the bottom "MORE COMING" strip. */
  moreComingNote?: string;
};

// -------- Component -------------------------------------------------------

export default function CollectionHub({
  collectionId,
  moreComingNote,
}: CollectionHubProps) {
  const collection = getCollection(collectionId);
  const collectionTools = getToolsForCollection(collectionId);
  const [chip, setChip] = useState<string>("all");

  const filteredIds = useMemo(() => {
    if (chip === "all") return new Set(collectionTools.map((t) => t.id));
    return new Set(
      collectionTools.filter((t) => t.audienceChip === chip).map((t) => t.id)
    );
  }, [chip, collectionTools]);

  const displayTitle = titleCase(collection.name);

  // Scroll cue: only render when there's content below the initial
  // viewport, and hide once the user has scrolled near the bottom of
  // the page. Copy: "SCROLL FOR MORE" (Austin picked this 2026-07-08).
  const [showScrollCue, setShowScrollCue] = useState(false);
  useEffect(() => {
    const check = () => {
      const doc = document.documentElement;
      const hasOverflow = doc.scrollHeight > window.innerHeight + 40;
      const nearBottom =
        window.innerHeight + window.scrollY >= doc.scrollHeight - 80;
      setShowScrollCue(hasOverflow && !nearBottom);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [collectionTools.length, chip]);

  return (
    <div className="relative min-h-screen text-text-bright">
      <SpaceBackdrop />
      <div className="relative z-10">
        <ToolHeader
          collectionId={collectionId}
          activeToolId={null}
          maxWidth="max-w-6xl"
        />

        <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-4 pb-8 md:pt-6 md:pb-10">
          {/* Hero — compact pass v2 (2026-07-08). Flattened all
              sections into one grid because /resources has one card
              per section and /toolkit's section splits (For the
              Adults / In the Classroom / Preview / Reference) were
              creating stair-stepped rows that hid cards below the
              fold. Sections removed; audience chip filter now does
              the sorting job. Hero further compressed so the first
              row of cards lands above the fold on standard laptops. */}
          <section className="mb-4 md:mb-5">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="font-display font-black tracking-[0.06em] text-2xl sm:text-3xl md:text-4xl leading-none bg-gradient-to-r from-accent-cyan to-accent-magenta bg-clip-text text-transparent m-0">
                {displayTitle}
              </h1>
              <div className="font-mono text-[10px] tracking-[0.32em] uppercase text-accent-cyan">
                Classroom-Ready · Free · No Login
              </div>
            </div>
            <p className="mt-2 max-w-3xl text-text-dim text-sm leading-relaxed">
              {collection.tagline}
            </p>
          </section>

          {/* Filter chips (only render if more than one) */}
          {collection.audienceChips.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {collection.audienceChips.map((c) => {
                const on = chip === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setChip(c.id)}
                    className={`font-mono text-[10px] tracking-[0.28em] uppercase px-3 py-1.5 rounded-full border transition-colors ${
                      on
                        ? "border-border-mid text-accent-cyan bg-accent-cyan/[0.08]"
                        : "border-border-faint text-text-dim hover:text-accent-cyan hover:border-border-mid"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Flat grid — all cards from every section, filtered by
              chip. Preserves the section order from tools.json so
              the visual order still reflects author intent, but
              without visible section headers. */}
          {(() => {
            const allTools: Tool[] = collection.sections.flatMap((sec) =>
              sec.toolIds
                .map((id) => collectionTools.find((t) => t.id === id))
                .filter((t): t is Tool => Boolean(t))
                .filter((t) => filteredIds.has(t.id))
            );
            if (allTools.length === 0) return null;
            return (
              <section className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allTools.map((t) => {
                    const tone = TONE[t.tone as Tone];
                    // Static-asset tools (games under /public/games/*) open
                    // in a new tab via <a>, so the hub stays open behind
                    // them. Everything else uses <Link> for SPA nav.
                    const CardTag = t.newTab ? "a" : Link;
                    const cardProps = t.newTab
                      ? { target: "_blank" as const, rel: "noopener noreferrer" }
                      : {};
                    return (
                      <CardTag
                        key={t.id}
                        href={t.href}
                        {...cardProps}
                        onClick={() =>
                          trackEventOnce(
                            `tool_opened:${t.id}`,
                            "tool_opened",
                            { toolId: t.id, collectionId },
                          )
                        }
                        // Press feedback added 2026-07-08: the whole
                        // card is the click target for tool navigation,
                        // so we want an immediate :active response the
                        // moment the user commits. Combined with the
                        // NextTopLoader in layout.tsx, a click now shows
                        // (a) card presses down, (b) top progress bar
                        // starts, (c) SPA nav resolves — no more dead
                        // clicks that make users mash the card twice.
                        className={`group relative overflow-hidden rounded-2xl border bg-bg-panel-solid/40 p-5 pt-5 transition-all duration-150 ${tone.border} ${tone.borderHover} ${tone.glow} hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] active:brightness-95`}
                      >
                        <div
                          className="pointer-events-none absolute inset-0 rounded-2xl"
                          style={{
                            background:
                              "linear-gradient(160deg, rgba(34,211,238,0.06), transparent 55%)",
                          }}
                        />
                        <div className="relative">
                          <div className="flex items-center justify-between mb-4">
                            <div
                              className={`grid h-11 w-11 place-items-center rounded-xl border text-xl ${tone.icoWrap} ${tone.icoText}`}
                              aria-hidden
                            >
                              {t.icon}
                            </div>
                            <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-text-faint border border-border-faint rounded-full px-2 py-1">
                              {t.audience}
                            </div>
                          </div>
                          <h3 className="font-display font-bold tracking-[0.08em] text-lg text-text-bright m-0 mb-2">
                            {t.title}
                          </h3>
                          <p className="text-text-dim text-sm leading-relaxed m-0 mb-5">
                            {t.description}
                          </p>
                          <div className="pt-3 border-t border-dashed border-border-faint flex items-center justify-between">
                            <span className="font-mono text-[9px] tracking-[0.24em] uppercase text-text-faint">
                              {t.meta ?? ""}
                            </span>
                            <span
                              className={`font-mono text-[10px] tracking-[0.28em] uppercase ${tone.go}`}
                            >
                              {t.newTab ? "Open ↗" : "Open →"}
                            </span>
                          </div>
                        </div>
                      </CardTag>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* Footer note */}
          {moreComingNote && (
            <div className="mt-10 rounded-xl border border-border-faint bg-bg-panel-solid/40 px-5 py-4 font-mono text-[11px] tracking-[0.14em] text-text-dim">
              <span className="text-accent-cyan tracking-[0.2em]">
                MORE COMING →
              </span>{" "}
              {moreComingNote}
            </div>
          )}

          {/* Cross-link to sibling collection */}
          <CrossLink currentCollectionId={collectionId} />

          {/* Small privacy link at the bottom of every hub */}
          <div className="mt-10 pt-6 border-t border-border-faint text-center">
            <Link
              href="/privacy"
              className="font-mono text-[10px] tracking-[0.28em] uppercase text-text-faint hover:text-accent-cyan"
            >
              Privacy
            </Link>
          </div>
        </main>

        {/* Scroll-for-more cue. Fixed to bottom of viewport, pulses,
            fades once user reaches (or nears) the bottom of the page.
            Only renders when the page actually has content below the
            initial fold — so on /resources (3 cards) it won't appear;
            on /toolkit (5 cards) it will pulse until dismissed by
            scroll. Added 2026-07-08 alongside the hero shrink. */}
        <div
          aria-hidden={!showScrollCue}
          className={`pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-center justify-center gap-3 px-4 pb-3 pt-6 font-mono text-[10px] tracking-[0.32em] uppercase text-accent-cyan transition-opacity duration-300 ${
            showScrollCue ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(to top, rgba(5,9,20,0.92) 45%, rgba(5,9,20,0))",
          }}
        >
          <span className="animate-bounce" style={{ animationDuration: "1.6s" }}>
            ▼
          </span>
          <span>Scroll for more</span>
          <span className="animate-bounce" style={{ animationDuration: "1.6s" }}>
            ▼
          </span>
        </div>
      </div>
    </div>
  );
}

// -------- Cross-link between sibling collections --------------------------

function CrossLink({ currentCollectionId }: { currentCollectionId: string }) {
  const others = toolkit.collections.filter((c) => c.id !== currentCollectionId);
  if (others.length === 0) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {others.map((c) => (
        <Link
          key={c.id}
          href={c.hubHref}
          className="font-mono text-[10px] tracking-[0.28em] uppercase text-text-dim hover:text-accent-cyan border border-border-faint hover:border-border-mid rounded-full px-3.5 py-2 transition-colors"
        >
          → {titleCase(c.name)}
        </Link>
      ))}
    </div>
  );
}

// -------- Utilities -------------------------------------------------------

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
