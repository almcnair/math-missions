// ============================================================================
// <Avatar> — circular pilot-portrait avatar
// ----------------------------------------------------------------------------
// Single shared component used everywhere a student's avatar appears:
//   - Bridge HUD                /bridge
//   - Mission Player HUD        /play/[id]
//   - Login name picker         /login?code=ABC123
//   - Teacher roster table      /teacher/roster
//   - Avatar picker preview     /avatar
//
// Pure presentational. The portrait id is resolved upstream from
// profiles.avatar_config (via lib/avatars.ts helpers).
//
// Graceful failure: if the image file isn't on disk yet (Austin hasn't dropped
// generated portraits in /public/avatars/pilots/), the broken-image fallback
// shows a Mystery Pilot SVG silhouette instead. So shipping the picker before
// the art arrives still looks intentional.
// ============================================================================

"use client";

import { useState } from "react";
import { type PilotId, pilotById, pilotImageSrc } from "@/lib/avatars";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 160,
};

export type AvatarProps = {
  /** Pilot id from profiles.avatar_config.portraitId. Missing/invalid → Mystery. */
  portraitId: string | null | undefined;
  /** Preset size token or a raw pixel number. */
  size?: AvatarSize | number;
  /** Optional rank-tinted ring. */
  ring?: "none" | "cyan" | "amber" | "magenta" | "gold";
  /** Optional click handler (used by the picker grid). */
  onClick?: () => void;
  /** Title attribute (defaults to the pilot's label). */
  title?: string;
  className?: string;
};

export function Avatar({
  portraitId,
  size = "md",
  ring = "none",
  onClick,
  title,
  className = "",
}: AvatarProps) {
  const pilot = pilotById(portraitId);
  const px = typeof size === "number" ? size : SIZE_PX[size];
  const src = pilotImageSrc(pilot.id);
  const [errored, setErrored] = useState(false);

  const ringClass =
    ring === "cyan"    ? "ring-2 ring-accent-cyan/70" :
    ring === "amber"   ? "ring-2 ring-accent-amber/70" :
    ring === "magenta" ? "ring-2 ring-accent-magenta/70" :
    ring === "gold"    ? "ring-2 ring-yellow-400/80" : "";

  const interactive = onClick ? "cursor-pointer hover:brightness-110 transition" : "";

  return (
    <div
      className={`relative inline-block rounded-full overflow-hidden bg-bg-deep border border-border-mid ${ringClass} ${interactive} ${className}`}
      style={{ width: px, height: px }}
      title={title ?? pilot.label}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {errored ? (
        <MysteryFallback px={px} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={pilot.label}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}

// ---------- Helpers --------------------------------------------------------

/** Pure SVG fallback used when a portrait file is missing on disk. */
function MysteryFallback({ px }: { px: number }) {
  // Render the silhouette in flight-suit navy with a thin cyan visor line so
  // it still looks like "a pilot, identity classified" rather than a broken
  // image.
  return (
    <svg
      viewBox="0 0 64 64"
      width={px}
      height={px}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mystery Pilot"
    >
      <rect width="64" height="64" fill="#0a1628" />
      {/* shoulders */}
      <path d="M0 64 V52 Q32 36 64 52 V64 Z" fill="#1e3a8a" />
      {/* helmet */}
      <circle cx="32" cy="28" r="18" fill="#1e3a8a" stroke="#475569" strokeWidth="1" />
      {/* visor */}
      <rect x="16" y="24" width="32" height="9" rx="4" fill="#0e2a4a" stroke="#06b6d4" strokeWidth="0.8" />
      {/* visor highlight */}
      <rect x="20" y="26" width="8" height="2" rx="1" fill="#67e8f9" opacity="0.6" />
    </svg>
  );
}

/** Pulsing "PICK YOUR PILOT" prompt — used as a placeholder before a kid picks. */
export function AvatarUnpickedPrompt({ size = "md" }: { size?: AvatarSize | number }) {
  const px = typeof size === "number" ? size : SIZE_PX[size];
  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full bg-bg-deep border-2 border-dashed border-accent-cyan/60 animate-pulse"
      style={{ width: px, height: px }}
      title="Pick your pilot"
    >
      <span className="font-mono text-[10px] tracking-[0.2em] text-accent-cyan">PICK</span>
    </div>
  );
}
