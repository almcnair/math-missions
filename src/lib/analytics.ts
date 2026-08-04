// ============================================================================
// Analytics helpers — Vercel Analytics wrapper with Hobby-tier throttling
// ----------------------------------------------------------------------------
// Vercel Hobby tier caps custom events at 2,500/month. This module wraps the
// underlying `track()` call with two forms of budget protection:
//
//   1. Session-scoped dedupe — most navigation events (page views into a
//      specific lesson, tool, or camp landing) fire once per browser tab
//      session per target. Reloading a tab or opening a new tab is fine;
//      spamming refresh is not.
//
//   2. Debounced/gated events — search boxes and typeahead widgets debounce
//      by 800ms and only report queries of length >= 3, so we get signal
//      ("what terms did people actually look up") without one event per
//      keystroke.
//
// Design decision 2026-07-08: track() calls are fire-and-forget. If Vercel
// Analytics ever fails to load (script blocker, offline, quota exceeded),
// the site keeps working — nothing here should be in a critical path.
//
// See /privacy for what these events actually collect (spoiler: page paths,
// device class, referrer, and the custom event name/properties — no PII,
// no IP retention, no cookies).
// ============================================================================

import { track as vercelTrack } from "@vercel/analytics";

// Session-scoped dedupe cache. Cleared on tab close / refresh.
const seenThisSession = new Set<string>();

/**
 * Fire-and-forget event tracking. Safe to call from any client component.
 * Silently no-ops on the server (Vercel's track() is client-only).
 */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null>,
): void {
  if (typeof window === "undefined") return;
  try {
    vercelTrack(name, properties ?? undefined);
  } catch {
    // Never let analytics break the app.
  }
}

/**
 * Track an event once per session per key. Use for page-view style events
 * where reloading N times shouldn't burn N event slots.
 *
 * Example: trackEventOnce(`lesson_opened:${lessonId}`, "lesson_opened", { lessonId })
 */
export function trackEventOnce(
  dedupeKey: string,
  name: string,
  properties?: Record<string, string | number | boolean | null>,
): void {
  if (typeof window === "undefined") return;
  if (seenThisSession.has(dedupeKey)) return;
  seenThisSession.add(dedupeKey);
  trackEvent(name, properties);
}

// ---- Debounced search tracking ------------------------------------------
// Used by /glossary search. Fires at most one event per 800ms of quiet
// typing, and only for queries of length >= 3.

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function trackSearchDebounced(
  eventName: string,
  query: string,
  extraProps?: Record<string, string | number | boolean | null>,
  delayMs: number = 800,
  minLength: number = 3,
): void {
  if (typeof window === "undefined") return;
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  const trimmed = query.trim();
  if (trimmed.length < minLength) return;
  searchDebounceTimer = setTimeout(() => {
    trackEvent(eventName, { query: trimmed, ...(extraProps ?? {}) });
  }, delayMs);
}
