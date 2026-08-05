// DebaterNav — shared post-login navigation for debaters.
//
// Renders three tabs (TODAY / MISSIONS / RESOURCES) plus the site wordmark
// and a HOME link. Highlights the current tab based on the pathname.
//
// Mount this at the top of every gated debater page: /camp, /bridge,
// /play/[id], and (as a compact variant) inside the Resources hub if we
// want the same chrome there.

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useHomeHref } from "@/lib/useHomeHref";

type Tab = {
  href: string;
  label: string;
  matchPrefixes: string[];
};

const TABS: Tab[] = [
  { href: "/camp",      label: "Today",     matchPrefixes: ["/camp"] },
  { href: "/bridge",    label: "Missions",  matchPrefixes: ["/bridge", "/play"] },
  { href: "/resources", label: "Resources", matchPrefixes: ["/resources", "/glossary"] },
];

function isActive(pathname: string, tab: Tab): boolean {
  return tab.matchPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function DebaterNav() {
  const pathname = usePathname() ?? "";
  const homeHref = useHomeHref();

  return (
    <header className="border-b border-border-mid/50 bg-bg-panel-solid/40 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand — points to the viewer's dashboard (coach → /coach,
            debater → /bridge, anonymous → /). See useHomeHref. */}
        <Link href={homeHref} className="flex items-center gap-2 shrink-0 group">
          <Image
            src="/brand/logo-mascot.png"
            alt="Math Missions"
            width={40}
            height={40}
            className="h-9 w-9"
            priority
          />
          <span className="hidden sm:inline font-mono text-[10px] tracking-[0.3em] text-text-dim group-hover:text-accent-cyan transition-colors">
            MATH MISSIONS
          </span>
        </Link>

        {/* Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Debater navigation">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  "px-3 sm:px-4 py-1.5 rounded-md font-display text-xs sm:text-sm font-bold tracking-wider transition-colors",
                  active
                    ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40"
                    : "text-text-dim hover:text-text-bright border border-transparent",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                {tab.label.toUpperCase()}
              </Link>
            );
          })}
        </nav>

        {/* Right side — placeholder for user menu later */}
        <div className="shrink-0 w-9" aria-hidden />
      </div>
    </header>
  );
}
