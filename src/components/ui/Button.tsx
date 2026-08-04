"use client";

/**
 * Shared Button component for policydebate101.com.
 *
 * Goals (2026-07-08):
 *   1. Every click has an immediate visual response (`:active` press
 *      animation) so users never wonder if the site heard them.
 *   2. Async actions show an inline spinner + swap the label, and the
 *      button becomes non-interactive while pending — no more accidental
 *      double-submits.
 *   3. One consistent look across primary/secondary/ghost/danger surfaces
 *      so we can migrate the site's ad-hoc buttons over time.
 *
 * Use this for imperative buttons (onClick handlers). For `<form action={...}>`
 * server actions, prefer `<SubmitButton>` in the same directory — it wires
 * `useFormStatus()` into `pending` automatically.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** When true, show spinner + pendingLabel and disable the button. */
  pending?: boolean;
  /** Label shown while pending. Defaults to "Loading…". */
  pendingLabel?: string;
  /** Optional icon rendered before the label (hidden while pending). */
  leadingIcon?: ReactNode;
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent-cyan/15 border-accent-cyan/60 text-accent-cyan hover:bg-accent-cyan/25 hover:border-accent-cyan",
  secondary:
    "bg-bg-panel-solid/60 border-border-strong text-text-bright hover:bg-bg-panel-solid hover:border-border-bright",
  ghost:
    "bg-transparent border-border-faint text-text-dim hover:text-text-bright hover:border-border-strong",
  danger:
    "bg-red-500/10 border-red-500/50 text-red-300 hover:bg-red-500/20 hover:border-red-500 hover:text-red-200",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[11px] tracking-[0.16em]",
  md: "h-10 px-4 text-xs tracking-[0.14em]",
  lg: "h-12 px-6 text-sm tracking-[0.18em]",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    pending = false,
    pendingLabel,
    leadingIcon,
    disabled,
    className = "",
    children,
    type,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || pending;
  return (
    <button
      ref={ref}
      // Default to type="button" so a Button inside a form doesn't
      // accidentally submit. SubmitButton overrides this to "submit".
      type={type ?? "button"}
      disabled={isDisabled}
      aria-busy={pending || undefined}
      className={[
        // base layout + typography
        "inline-flex items-center justify-center gap-2 rounded-lg border font-mono uppercase",
        "transition-all duration-150 select-none",
        // hover / press feedback (the whole point of this component)
        "hover:-translate-y-[1px]",
        "active:translate-y-0 active:scale-[0.97] active:brightness-90",
        // disabled + pending kill the hover/press motion
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "disabled:hover:translate-y-0 disabled:active:scale-100 disabled:active:brightness-100",
        // keyboard focus ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep",
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {pending ? (
        <>
          <Spinner />
          <span>{pendingLabel ?? "Loading…"}</span>
        </>
      ) : (
        <>
          {leadingIcon}
          {children}
        </>
      )}
    </button>
  );
});

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
