// ============================================================================
// AVATAR SYSTEM — v1
// ----------------------------------------------------------------------------
// Pilot-portrait avatars. v1 is a fixed roster of 8 distinct pilots + a
// Mystery Pilot fallback. Each profile picks one via `avatar_config.portraitId`.
//
// Image files live in /public/avatars/pilots/. Filename matches the `file`
// field below. If a file is missing OR the saved portraitId is unknown, we
// fall back to the Mystery Pilot SVG silhouette rendered inside <Avatar>.
//
// Decision log:
//   - 2026-06-25 (Path B, retired): Single pilot character, 7 expression variants.
//   - 2026-06-27 (Path A, current): 8 distinct pilots, unified blue/silver
//     uniform, representation matrix balanced across gender presentation, skin
//     tone, hair texture/style, plus one robot wildcard for kids who'd rather
//     not be a person at all. Mystery Pilot is the universal opt-out and the
//     default for new profiles.
//   - Style anchor: docs/AVATAR_GENERATION.md. `pilot-marcus.jpeg` is the
//     canonical reference; all other portraits must match its style, uniform,
//     framing, lighting, and background treatment.
//   - `avatar_config jsonb` schema was provisioned from day 1 (schema.sql).
//     v1 stores `{ portraitId }`; future versions can add frame color, animations,
//     accessories, alt uniforms, etc. without a migration.
// ============================================================================

export const MYSTERY_PILOT_ID = "mystery" as const;

export type PilotId =
  | "mystery"
  | "marcus"
  | "kamika"
  | "vega"
  | "diego"
  | "amara"
  | "theo"
  | "iris"
  | "rio"
  | "nine";

export type Pilot = {
  id: PilotId;
  label: string;          // Short title for the picker grid
  blurb: string;          // One-liner shown on hover/selection
  file: string;           // filename in /public/avatars/pilots/
};

// ---------- The roster -----------------------------------------------------
//
// Ordering: Mystery Pilot first (it's the default), then 8 distinct pilots.
// The `id` is the persistence contract — never rename an id after kids have
// picked. Labels and blurbs are safe to revise.

export const PILOT_ROSTER: ReadonlyArray<Pilot> = [
  {
    id: "mystery",
    label: "Mystery Pilot",
    blurb: "Visor down. Identity classified.",
    file: "mystery.jpeg",
  },
  {
    id: "marcus",
    label: "Marcus",
    blurb: "Steady hands on the console. Always says good morning.",
    file: "pilot-marcus.jpeg",
  },
  {
    id: "kamika",
    label: "Commander Kamika",
    blurb: "Senior officer on deck. Purple-and-bronze means she's earned it.",
    file: "pilot-kamika.jpeg",
  },
  {
    id: "vega",
    label: "Cadet Vega",
    blurb: "Squadron Omicron-7. Knows every console on the bridge.",
    file: "pilot-vega.jpeg",
  },
  {
    id: "diego",
    label: "Diego",
    blurb: "Easygoing in the chair, sharp on the mic.",
    file: "pilot-diego.jpeg",
  },
  {
    id: "amara",
    label: "Amara",
    blurb: "Composed under pressure. Never raises her voice.",
    file: "pilot-amara.jpeg",
  },
  {
    id: "theo",
    label: "Theo",
    blurb: "Half-grin says he already saw the punchline coming.",
    file: "pilot-theo.jpeg",
  },
  {
    id: "iris",
    label: "Iris",
    blurb: "Eyes wide, questions ready. First to volunteer.",
    file: "pilot-iris.jpeg",
  },
  {
    id: "rio",
    label: "Rio",
    blurb: "Quiet, exact, three moves ahead of the bridge.",
    file: "pilot-rio.jpeg",
  },
  {
    id: "nine",
    label: "Nine",
    blurb: "Bridge unit NINE. Visor smiles in cyan.",
    file: "pilot-nine.jpeg",
  },
];

// ---------- Helpers --------------------------------------------------------

/** All valid pilot ids (used to validate save payloads). */
export const PILOT_IDS = new Set<PilotId>(PILOT_ROSTER.map((p) => p.id));

export function isPilotId(value: unknown): value is PilotId {
  return typeof value === "string" && PILOT_IDS.has(value as PilotId);
}

/** Look up a pilot by id. Falls back to Mystery Pilot if id is unknown/missing. */
export function pilotById(id: string | null | undefined): Pilot {
  if (id && isPilotId(id)) {
    const found = PILOT_ROSTER.find((p) => p.id === id);
    if (found) return found;
  }
  // Mystery is always at index 0 in the roster.
  return PILOT_ROSTER[0];
}

/** Read a portraitId out of an avatar_config jsonb payload (defensive). */
export function portraitIdFromConfig(config: unknown): PilotId {
  if (config && typeof config === "object" && "portraitId" in config) {
    const id = (config as { portraitId: unknown }).portraitId;
    if (isPilotId(id)) return id;
  }
  return MYSTERY_PILOT_ID;
}

/** Path the <Avatar> component points <img src> at. */
export function pilotImageSrc(id: PilotId): string {
  const pilot = pilotById(id);
  return `/avatars/pilots/${pilot.file}`;
}
