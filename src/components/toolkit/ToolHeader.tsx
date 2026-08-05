// ToolHeader — shared chrome for every page in a Math Missions toolkit.
//
// Renders three visual layers:
//   1. Small site wordmark (MATH MISSIONS) → links home
//   2. Big collection wordmark (LAB LEADER TOOLKIT / DEBATER RESOURCES)
//      → opens a switcher scoped to THAT collection's tools
//   3. Current tool title inside the switcher trigger, if `activeToolId`
//
// Content lives in src/content/toolkit/tools.json (site + collections + tools).
// Adding a new tool = 1 JSON entry + 1 new route. Adding a new collection =
// new entry in `collections` + new hub page.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toolkitData from "@/content/toolkit/tools.json";
import { useHomeHref } from "@/lib/useHomeHref";

// -------- Types (kept local; tools.json is the source of truth) -----------

type Tone = "cyan" | "magenta" | "violet";

export type Tool = {
  id: string;
  collectionId: string;
  title: string;
  shortTitle: string;
  href: string;
  /** If true, links to this tool open in a new tab. Use for standalone
   *  static assets (e.g. self-contained HTML games under /games/*) so the
   *  hub stays open behind them. */
  newTab?: boolean;
  icon: string;
  tone: Tone;
  audience: string;
  audienceChip: string;
  description: string;
  meta?: string;
};

export type Section = { id: string; label: string; toolIds: string[] };

export type AudienceChip = { id: string; label: string };

export type Collection = {
  id: string;
  name: string;
  hubHref: string;
  tagline: string;
  audienceChips: AudienceChip[];
  sections: Section[];
};

export type ToolkitData = {
  site: { name: string; href: string };
  collections: Collection[];
  tools: Tool[];
};

export const toolkit = toolkitData as ToolkitData;

// -------- Helpers ---------------------------------------------------------

export function getCollection(collectionId: string): Collection {
  const c = toolkit.collections.find((c) => c.id === collectionId);
  if (!c) {
    throw new Error(
      `[ToolHeader] Unknown collectionId "${collectionId}". ` +
        `Known: ${toolkit.collections.map((c) => c.id).join(", ")}`
    );
  }
  return c;
}

/**
 * Tools that should appear in a collection's hub and switcher.
 *
 * A tool's home collection is its `collectionId`, but a tool can be
 * *aliased* into another collection by listing its id in that collection's
 * sections[].toolIds. This lets e.g. the glossary live primarily under
 * Debater Resources but also surface in the Lab Leader Toolkit.
 */
export function getToolsForCollection(collectionId: string): Tool[] {
  const collection = toolkit.collections.find((c) => c.id === collectionId);
  const referencedIds = new Set<string>(
    collection ? collection.sections.flatMap((s) => s.toolIds) : []
  );
  const seen = new Set<string>();
  const out: Tool[] = [];
  for (const t of toolkit.tools) {
    const belongs = t.collectionId === collectionId || referencedIds.has(t.id);
    if (belongs && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}

// -------- Props -----------------------------------------------------------

type ToolHeaderProps = {
  /** id of the collection this page belongs to (e.g. "lab-leader", "debater"). */
  collectionId: string;
  /** id of the tool currently displayed, e.g. "glossary". Pass null on the hub. */
  activeToolId?: string | null;
  /** Optional container width override. Defaults to max-w-5xl to match tool pages. */
  maxWidth?: "max-w-4xl" | "max-w-5xl" | "max-w-6xl";
};

// -------- Component -------------------------------------------------------

export default function ToolHeader({
  collectionId,
  activeToolId = null,
  maxWidth = "max-w-5xl",
}: ToolHeaderProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Role-aware Home destination. Falls back to toolkit.site.href ("/") for
  // anonymous viewers; coaches jump to /coach, debaters to /bridge.
  const homeHref = useHomeHref();

  const collection = getCollection(collectionId);
  const collectionTools = getToolsForCollection(collectionId);

  const active = activeToolId
    ? collectionTools.find((t) => t.id === activeToolId) ?? null
    : null;
  const currentLabel = active ? active.title : collection.name;

  // Close the switcher on outside click + Esc.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="relative z-20 border-b border-border-mid/50 bg-bg-panel-solid/40">
      <div
        className={`mx-auto ${maxWidth} px-4 sm:px-6 py-4 flex items-center justify-between gap-4`}
      >
        {/* Left: logo + wordmark + switcher */}
        <div className="flex items-center gap-3">
          <Link href={homeHref} aria-label="Home" className="shrink-0 inline-block">
            <Image
              src="/brand/logo-mascot.png"
              alt={`${toolkit.site.name} mascot`}
              width={56}
              height={56}
              className="h-12 w-12 md:h-14 md:w-14"
              priority
            />
          </Link>

          <div className="relative flex flex-col leading-none" ref={wrapRef}>
            <Link
              href={homeHref}
              className="font-mono text-[9px] tracking-[0.32em] text-text-faint uppercase hover:text-accent-cyan transition-colors self-start"
            >
              {toolkit.site.name}
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="mt-1 inline-flex items-center gap-2 rounded-md font-display font-bold text-lg tracking-[0.14em] text-accent-cyan hover:text-accent-cyan-soft transition-colors self-start"
            >
              <span>{currentLabel}</span>
              <span
                className={`text-[10px] opacity-70 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
                aria-hidden
              >
                ▼
              </span>
            </button>

            {open && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-3 min-w-[300px] max-w-[92vw] rounded-xl border border-border-mid bg-bg-panel-solid p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] z-40"
              >
                <div className="px-2.5 pt-2 pb-1.5 font-mono text-[9px] tracking-[0.3em] uppercase text-text-faint">
                  Jump to a tool
                </div>

                <SwitcherItem
                  href={collection.hubHref}
                  icon="◧"
                  label={`${titleCase(collection.name)} Home`}
                  sub="All Tools"
                  active={!activeToolId}
                  onClick={() => setOpen(false)}
                />
                <div className="my-1.5 h-px bg-border-faint mx-1" />

                {collectionTools.map((t) => (
                  <SwitcherItem
                    key={t.id}
                    href={t.href}
                    icon={t.icon}
                    label={t.shortTitle}
                    sub={t.audience}
                    active={t.id === activeToolId}
                    newTab={t.newTab}
                    onClick={() => setOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: home link */}
        <Link
          href={toolkit.site.href}
          className="font-mono text-[10px] tracking-[0.3em] text-text-dim hover:text-accent-cyan transition-colors shrink-0"
        >
          ← HOME
        </Link>
      </div>
    </header>
  );
}

// -------- Switcher item ---------------------------------------------------

function SwitcherItem({
  href,
  icon,
  label,
  sub,
  active,
  newTab,
  onClick,
}: {
  href: string;
  icon: string;
  label: string;
  sub: string;
  active?: boolean;
  newTab?: boolean;
  onClick?: () => void;
}) {
  // Same escape hatch as CollectionHub: <a target="_blank"> for static-asset
  // tools so we don't try to SPA-navigate to a bare HTML file.
  const Tag = newTab ? "a" : Link;
  const extra = newTab
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};
  return (
    <Tag
      href={href}
      role="menuitem"
      onClick={onClick}
      {...extra}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
        active
          ? "bg-accent-cyan/10 text-accent-cyan"
          : "text-text-bright hover:bg-accent-cyan/[0.06]"
      }`}
    >
      <span
        className={`grid h-7 w-7 place-items-center rounded-md border text-[13px] ${
          active
            ? "border-border-mid bg-accent-cyan/10"
            : "border-border-faint bg-accent-cyan/[0.04]"
        }`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-ui font-semibold text-[14px] tracking-[0.03em]">
          {label}
        </span>
        <span className="font-mono text-[9px] tracking-[0.24em] uppercase text-text-faint mt-0.5">
          {sub}
        </span>
      </span>
    </Tag>
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
