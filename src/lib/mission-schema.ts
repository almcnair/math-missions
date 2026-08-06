// ============================================================================
// MISSION SCHEMA — TypeScript types
// ----------------------------------------------------------------------------
// Canonical contract for mission JSON files.
// Spec lives at: ~/Desktop/debate-spaceship-mockup/schema/MISSION_SCHEMA.md
// Reference data: ~/Desktop/debate-spaceship-mockup/schema/inherency.json
//                 ~/Desktop/debate-spaceship-mockup/schema/cfu-types-demo.json
//
// Rules of thumb:
//   - These types ARE the contract. Don't drift the JSON without updating here.
//   - All IDs are stable string slugs, not indexes.
//   - Inline markup tokens: **bold** *italic* `term` {{cyan|amber|magenta: ...}}
//   - Magenta is reserved for boss/capstone moments only.
// ============================================================================

// ---------- Mission ----------------------------------------------------------

export interface Mission {
  id: string;
  campaignId: string;
  sectorId: string;
  number: number;
  title: string;
  subtitle?: string;
  tagline: string;
  estimatedMinutes: number;
  difficulty: "intro" | "core" | "advanced" | "boss";
  rewards: { credits: number; rankXp: number };
  unlocks: string[];
  prerequisites: string[];
  protectedTerms: string[];
  passingCriteria: {
    requireAllCfu: boolean;
    minCorrectCfu?: number;
    shieldsAtZero: "warn" | "allow-continue";
  };
  slides: Slide[];
}

// ---------- Slide discriminated union ----------------------------------------

export type Slide =
  | HookSlide
  | DefineSlide
  | ConceptSlide
  | StrategySlide
  | McqSlide
  | MultiSlide
  | SortSlide
  | OrderSlide
  | MatchSlide
  | FillSlide
  | LabelSlide
  | HighlightSlide
  | SimulationSlide
  | CompleteSlide;

export type SlideType = Slide["type"];

interface SlideCommon {
  id: string;
  tag?: string;
  tagTone?: "default" | "amber" | "magenta";
}

// ---------- Shared image ---------------------------------------------------
//
// Used for inline slide images (hook/define/concept/strategy/complete/MCQ/
// multi) and for the cfu-label background. `src` is a URL — either a path
// served from /public (e.g. "/mission-images/inherency-v1/foo.jpg") or a
// remote URL. `aspectRatio` is width / height; if unset, the image renders
// at natural size capped by container width.

export interface MissionImage {
  src: string;
  alt: string;
  caption?: string;
  aspectRatio?: number;
}

// ---------- Content slides ---------------------------------------------------

export interface HookSlide extends SlideCommon {
  type: "hook";
  headline: string;
  body: string[];
  quote?: { text: string; cite: string };
  sidebar?: SidebarBlock;
  image?: MissionImage;
}

export type SidebarBlock =
  | {
      kind: "stock-list";
      title: string;
      items: { num: string; label: string; state: "done" | "current" | "locked" }[];
    }
  | { kind: "image"; src: string; alt: string }
  | { kind: "key-value"; title: string; rows: { label: string; value: string }[] };

export interface DefineSlide extends SlideCommon {
  type: "define";
  term: string;
  pronunciation?: string;
  definition: string;
  plainWords?: string;
  analogy?: string;
  image?: MissionImage;
}

export interface ConceptSlide extends SlideCommon {
  type: "concept";
  headline: string;
  intro?: string;
  cards: ConceptCard[];
  image?: MissionImage;
}

export interface ConceptCard {
  id: string;
  icon: string;
  name: string;
  description: string;
  example?: { label: string; text: string };
  accent?: "cyan" | "amber" | "magenta";
}

export interface StrategySlide extends SlideCommon {
  type: "strategy";
  headline: string;
  intro?: string;
  rows: StrategyRow[];
  image?: MissionImage;
}

export interface StrategyRow {
  name: string;
  description: string;
  counter?: { label: string; text: string };
}

// ---------- CFU shared -------------------------------------------------------

interface CfuCommon extends SlideCommon {
  prompt: {
    label?: string;
    scenario?: string;
    question: string;
  };
  scoring: CfuScoring;
  feedback: {
    correct: FeedbackBlock;
    wrongByChoice?: Record<string, FeedbackBlock>;
    wrongDefault: FeedbackBlock;
  };
  /**
   * Optional scaffold hint for productive-struggle support.
   *
   * When present, the player renders a "Request Hint" button on this CFU.
   * The student must wait `delaySeconds` (default 30) before the scaffold
   * image is revealed; this delay is the pedagogical point — it forces time
   * with the problem before help arrives. Using a hint breaks the student's
   * streak (cost) but does NOT damage shields. One hint per attempt.
   *
   * `altText` is required for screen-reader users.
   */
  hint?: CfuHint;
}

export interface CfuHint {
  imageUrl: string;
  altText: string;
  /** Defaults to 30 if unset. */
  delaySeconds?: number;
}

export interface CfuScoring {
  creditsOnCorrect: number;
  shieldOnWrong: boolean;
  breaksStreakOnWrong: boolean;
  maxAttempts?: number;
  mode?: "all-or-nothing" | "partial";
}

export interface FeedbackBlock {
  title: string;
  body: string[];
  followup?: string;
}

// ---------- CFU types --------------------------------------------------------

export interface McqOption {
  id: string;
  letter: string;
  text: string;
}

export interface McqSlide extends CfuCommon {
  type: "cfu-mcq";
  options: McqOption[];
  correctOptionId: string;
  image?: MissionImage;
}

export interface MultiSlide extends CfuCommon {
  type: "cfu-multi";
  options: McqOption[];
  correctOptionIds: string[];
  image?: MissionImage;
}

export interface SortSlide extends CfuCommon {
  type: "cfu-sort";
  bins: SortBin[];
  cards: SortCard[];
  allowPartialCredit: boolean;
}

export interface SortBin {
  id: string;
  icon: string;
  label: string;
  accent?: "cyan" | "amber" | "magenta";
}

export interface SortCard {
  id: string;
  text: string;
  correctBinId: string;
}

export interface OrderSlide extends CfuCommon {
  type: "cfu-order";
  intro?: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  text: string;
  correctPosition: number;
}

export interface MatchSlide extends CfuCommon {
  type: "cfu-match";
  leftColumn: { label?: string; items: MatchItem[] };
  rightColumn: { label?: string; items: MatchItem[] };
}

export interface MatchItem {
  id: string;
  text: string;
  pairId: string;
}

export interface FillSlide extends CfuCommon {
  type: "cfu-fill";
  template: string;
  blanks: FillBlank[];
  wordBank?: string[];
  caseSensitive: boolean;
}

export interface FillBlank {
  index: number;
  acceptedAnswers: string[];
  hint?: string;
}

export interface LabelSlide extends CfuCommon {
  type: "cfu-label";
  image: MissionImage & { aspectRatio: number };
  targets: LabelTarget[];
  labels: LabelChip[];
}

export interface LabelTarget {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  correctLabelId: string;
}

export interface LabelChip {
  id: string;
  text: string;
}

export interface HighlightSlide extends CfuCommon {
  type: "cfu-highlight";
  passage: string;
  mode: "words" | "spans";
  spans?: HighlightSpan[];
  correctIds: string[];
}

export interface HighlightSpan {
  id: string;
  start: number;
  end: number;
}

// ---------- Simulation (interactive lab) -------------------------------------
//
// Hands-on interactive slide. The variant discriminator lets us add new lab
// shapes over time (number line, fraction bar, area model, etc.) without
// exploding the SlideType union. Each variant carries its own config shape.
//
// Advancement is gated exactly like any CFU: the sim reports a CfuOutcome
// via `onResult` once the student hits the target, then Continue unlocks.

export type SimulationVariant = FruitPunchRatioConfig;

export interface FruitPunchRatioConfig {
  variant: "fruit-punch-ratio";
  /** Target cups of juice (cyan ingredient). */
  targetJuice: number;
  /** Target cups of soda (pink ingredient). */
  targetSoda: number;
  /** Max total cups the chamber can hold. */
  maxCapacity: number;
  /**
   * If true, student must land the exact (targetJuice, targetSoda) pair
   * to complete (used for scaling missions where the total matters).
   * If false, ANY equivalent ratio that matches counts (2:1, 4:2, 6:3...).
   */
  requireExactAmount: boolean;
  /** Human-readable instruction shown under the question banner. */
  instruction: string;
  /** Coach-mode hint revealed by the "NEED A HINT?" accordion. */
  hint: string;
}

export interface SimulationSlide extends SlideCommon {
  type: "cfu-simulation";
  prompt: {
    label?: string;
    question: string;
  };
  scoring: CfuScoring;
  feedback: {
    correct: FeedbackBlock;
    wrongDefault: FeedbackBlock;
  };
  config: SimulationVariant;
}

// ---------- Complete ---------------------------------------------------------

export interface CompleteSlide extends SlideCommon {
  type: "complete";
  headline: string;
  subtext: string;
  rewards: CompleteReward[];
  primaryCta: CompleteCta;
  secondaryCta?: CompleteCta;
  image?: MissionImage;
}

export interface CompleteReward {
  icon: string;
  label: string;
  staticValue?: string;
  dynamicValue?: "credits" | "rank-delta" | "accuracy" | "unlocked-next";
}

export type CompleteCta = {
  label: string;
  action: "next-mission" | "return-bridge" | { url: string };
};

// ---------- Attempt logging (DB shape, NOT in mission JSON) ------------------

export interface Attempt {
  id: string;
  studentId: string;
  classId: string;
  missionId: string;
  slideId: string;
  type: Exclude<SlideType, "hook" | "define" | "concept" | "strategy" | "complete">;
  // Note: cfu-simulation is included in the CFU union above via SlideType.
  // AttemptDetails for it lives in the union below.
  correct: boolean;
  details: AttemptDetails;
  startedAt: string;
  submittedAt: string;
  timeSpentMs: number;
}

export type AttemptDetails =
  | { chosenOptionId: string }
  | { chosenOptionIds: string[] }
  | { placements: { cardId: string; binId: string; correct: boolean }[]; misplacementCount: number }
  | { order: { itemId: string; position: number; correct: boolean }[] }
  | { pairs: { leftId: string; rightId: string; correct: boolean }[] }
  | { blanks: { index: number; value: string; correct: boolean }[] }
  | { placements: { labelId: string; targetId: string; correct: boolean }[] }
  | { picked: string[] }
  | { simulation: { variant: string; finalState: Record<string, number>; attempts: number } };

export interface Completion {
  id: string;
  studentId: string;
  classId: string;
  missionId: string;
  finishedAt: string;
  creditsEarned: number;
  accuracy: number;
  shieldsRemaining: number;
  attemptIds: string[];
}

// ---------- Helper: identify CFU slides --------------------------------------

export function isCfuSlide(slide: Slide): slide is
  | McqSlide
  | MultiSlide
  | SortSlide
  | OrderSlide
  | MatchSlide
  | FillSlide
  | LabelSlide
  | HighlightSlide
  | SimulationSlide {
  return slide.type.startsWith("cfu-");
}
