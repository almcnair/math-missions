// CopyLinkButton — clipboard copy with a brief "COPIED" confirmation.
// Extracted as a client component because `navigator.clipboard` isn't
// available in server components.

"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback: select-and-prompt if clipboard API is blocked.
      window.prompt("Copy this invite link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={[
        "px-3 py-1.5 rounded-md font-mono text-[10px] tracking-[0.2em] border transition-colors",
        copied
          ? "text-accent-cyan border-accent-cyan/60 bg-accent-cyan/10"
          : "text-text-dim border-border-mid hover:text-accent-cyan hover:border-accent-cyan/50",
      ].join(" ")}
      aria-live="polite"
    >
      {copied ? "COPIED ✓" : "COPY LINK"}
    </button>
  );
}
