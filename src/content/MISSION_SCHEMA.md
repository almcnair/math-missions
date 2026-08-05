# Mission Schema v0.1 — Math Missions Academy

This is the canonical shape of a **mission**. Every mission in the platform — Inherency, Solvency, Disadvantages, the First Debate boss node, all of it — is one of these JSON documents.

The mission player reads the JSON and renders the right component for each slide type. No more hand-written HTML per mission.

---

## Top-level mission

```ts
Mission {
  id: string                // "inherency-v1" — stable, used in URLs and DB
  campaignId: string        // "foundations-of-policy-debate"
  sectorId: string          // "stock-issues"
  number: number            // 7 — display number in the campaign
  title: string             // "Inherency"
  subtitle?: string         // "Stock Issues · Mission 07"
  tagline: string           // 1–2 sentence promise on the launch card
  estimatedMinutes: number  // 12
  difficulty: "intro" | "core" | "advanced" | "boss"
  rewards: {
    credits: number         // base credits for finishing
    rankXp: number          // contribution to rank progression
  }
  unlocks: string[]         // mission IDs unlocked on completion
  prerequisites: string[]   // mission IDs that must be done first
  protectedTerms: string[]  // ["inherency","plan","resolution",...] - reinforces glossary
  slides: Slide[]           // ordered
  passingCriteria: {
    requireAllCfu: boolean       // must answer every CFU
    minCorrectCfu?: number       // optional floor for "passed" status
    shieldsAtZero: "warn" | "allow-continue"  // mockup uses allow-continue
  }
}
```

---

## Slide — discriminated union

Every slide has these common fields, plus type-specific fields.

```ts
SlideCommon {
  id: string                // "inherency-s1-hook" — stable within mission
  type: SlideType
  tag?: string              // "⟡ BRIEFING" — small label shown above content
  tagTone?: "default" | "amber" | "magenta"
}

type SlideType =
  // Content slides
  | "hook"          // narrative opener (slide 1 pattern)
  | "define"        // single-term definition card (slide 2 pattern)
  | "concept"       // multi-card explanation (slide 3 pattern)
  | "strategy"      // numbered strategy/tactics list (slide 6 pattern)
  // CFU slides (every one writes attempt rows, every one has feedback)
  | "cfu-mcq"       // multiple-choice, single correct answer
  | "cfu-multi"     // multiple-choice, multiple correct answers ("pick all that apply")
  | "cfu-sort"      // drag cards into bins / categories
  | "cfu-order"     // arrange items into the correct sequence (e.g. speaking order)
  | "cfu-match"     // match items in column A to items in column B (pairs)
  | "cfu-fill"      // fill-in-the-blank inside a sentence/paragraph
  | "cfu-label"     // drop labels onto regions of an image/diagram (e.g. flow sheet)
  | "cfu-highlight" // highlight / select word(s) inside a passage
  // Terminal
  | "complete"      // mission complete celebration (slide 8)
```

---

## Content slide variants

### `hook`
A narrative opener that drops the student into a scene. Optional sidebar diagram.

```ts
HookSlide extends SlideCommon {
  type: "hook"
  headline: string                        // can contain {{cyan: ...}} / {{amber: ...}} markup
  body: MarkdownBlock[]                   // 1–3 paragraphs
  quote?: {
    text: string
    cite: string                          // "— OPPOSING CADET, NEG TEAM"
  }
  sidebar?: SidebarBlock                  // optional right-rail diagram
}

SidebarBlock =
  | { kind: "stock-list", title: string, items: { num: string, label: string, state: "done"|"current"|"locked" }[] }
  | { kind: "image", src: string, alt: string }
  | { kind: "key-value", title: string, rows: { label: string, value: string }[] }
```

### `define`
A definition card for one key term. The protected-vocabulary moment.

```ts
DefineSlide extends SlideCommon {
  type: "define"
  term: string                            // "Inherency"
  pronunciation?: string                  // "/ɪnˈhɪərənsi/ · noun · debate"
  definition: string                      // the bold one-sentence definition
  plainWords?: string                     // "What's stopping the fix from happening on its own?"
  analogy?: string                        // "A door that's stuck..."
}
```

### `concept`
A list of cards explaining sub-types or components. (Slide 3 pattern: the 3 types of inherency.)

```ts
ConceptSlide extends SlideCommon {
  type: "concept"
  headline: string
  intro?: string                          // 1 paragraph intro
  cards: ConceptCard[]
}

ConceptCard {
  id: string                              // "structural" — useful for theming
  icon: string                            // "⛓" or path to SVG
  name: string                            // "STRUCTURAL"
  description: string                     // can use {{strong: ...}} markup
  example?: {
    label: string                         // "EXAMPLE"
    text: string
  }
  accent?: "cyan" | "amber" | "magenta"
}
```

### `strategy`
A numbered tactical list. (Slide 6 pattern: how Neg attacks your Inherency.)

```ts
StrategySlide extends SlideCommon {
  type: "strategy"
  headline: string
  intro?: string
  rows: StrategyRow[]
}

StrategyRow {
  name: string                            // "It's already happening"
  description: string                     // what the move is
  counter?: {
    label: string                         // "YOUR COUNTER"
    text: string
  }
}
```

---

## CFU slide variants

All CFU slides share scoring fields.

```ts
CfuCommon extends SlideCommon {
  prompt: {
    label?: string                        // "SCENARIO INTERCEPT"
    scenario?: string                     // context paragraph
    question: string                      // the actual question
  }
  scoring: {
    creditsOnCorrect: number              // default 15
    shieldOnWrong: boolean                // default true
    breaksStreakOnWrong: boolean          // default true
    maxAttempts?: number                  // default 1 (mockup behavior)
  }
  feedback: {
    correct: FeedbackBlock                // shown on right answer
    wrongByChoice?: Record<string, FeedbackBlock>  // option-specific wrong feedback
    wrongDefault: FeedbackBlock           // catchall wrong feedback
  }
}

FeedbackBlock {
  title: string                           // "✓ TARGET ACQUIRED" or "✕ MISFIRE — RECALIBRATE"
  body: MarkdownBlock[]
  followup?: string                       // optional "Tactical note" / "Key idea" closer
}
```

### `cfu-mcq` — Multiple choice

```ts
McqSlide extends CfuCommon {
  type: "cfu-mcq"
  options: McqOption[]
  correctOptionId: string                 // references option.id
}

McqOption {
  id: string                              // "a","b","c","d" (or stable slugs)
  letter: string                          // display letter "A"
  text: string
}
```

### `cfu-multi` — Multi-select ("pick all that apply")

```ts
MultiSlide extends CfuCommon {
  type: "cfu-multi"
  options: McqOption[]                    // same shape as MCQ
  correctOptionIds: string[]              // 2+ correct answers
  scoring: CfuCommon["scoring"] & {
    mode: "all-or-nothing" | "partial"    // partial = (correct − wrong) / total
  }
}
```

### `cfu-sort` — Drag to bins

```ts
SortSlide extends CfuCommon {
  type: "cfu-sort"
  bins: SortBin[]
  cards: SortCard[]
  allowPartialCredit: boolean             // credit per correct placement vs. all-or-nothing
}

SortBin {
  id: string                              // "structural"
  icon: string
  label: string                           // "STRUCTURAL"
  accent?: "cyan" | "amber" | "magenta"
}

SortCard {
  id: string
  text: string
  correctBinId: string                    // references SortBin.id
}
```

### `cfu-order` — Arrange in correct sequence

For things like *"Put the 1AC, 1NC, 1AR, 2NC… in speaking order"* or *"Order these steps of a disadvantage: link, internal link, impact."*

```ts
OrderSlide extends CfuCommon {
  type: "cfu-order"
  intro?: string                          // optional context above the items
  items: OrderItem[]                      // displayed shuffled, dragged into order
  scoring: CfuCommon["scoring"] & {
    mode: "all-or-nothing" | "partial"    // partial = #items in correct position / total
  }
}

OrderItem {
  id: string
  text: string
  correctPosition: number                 // 1-indexed
}
```

### `cfu-match` — Match pairs across two columns

For things like *"Match each stock issue to its definition"* or *"Match each Greek term to its English meaning."*

```ts
MatchSlide extends CfuCommon {
  type: "cfu-match"
  leftColumn: { label?: string, items: MatchItem[] }
  rightColumn: { label?: string, items: MatchItem[] }   // displayed shuffled
  scoring: CfuCommon["scoring"] & {
    mode: "all-or-nothing" | "partial"    // partial = correct pairs / total pairs
  }
}

MatchItem {
  id: string                              // "resolution", "plan", "voter"
  text: string
  pairId: string                          // both sides share the same pairId
}
```

### `cfu-fill` — Fill in the blank

A sentence or paragraph with one or more blanks. Each blank either accepts free text (checked against an answer list) or is a small dropdown from a word bank.

```ts
FillSlide extends CfuCommon {
  type: "cfu-fill"
  template: string                        // "The {{1}} is the team that proposes the {{2}}."
  blanks: FillBlank[]                     // one entry per {{n}} in template, indexed
  wordBank?: string[]                     // if present, blanks render as dropdowns
  caseSensitive: boolean                  // for free-text mode
  scoring: CfuCommon["scoring"] & {
    mode: "all-or-nothing" | "partial"    // partial = #correct blanks / total
  }
}

FillBlank {
  index: number                           // matches {{n}} in template
  acceptedAnswers: string[]               // case-folded comparison unless caseSensitive
  hint?: string                           // shown on focus, optional
}
```

### `cfu-label` — Drop labels onto a diagram

For labeling regions of an image — e.g. a flow sheet diagram, a podium layout, a debate-round seating chart.

```ts
LabelSlide extends CfuCommon {
  type: "cfu-label"
  image: { src: string, alt: string, aspectRatio: number }
  targets: LabelTarget[]                  // regions on the image
  labels: LabelChip[]                     // draggable label chips
  scoring: CfuCommon["scoring"] & {
    mode: "all-or-nothing" | "partial"
  }
}

LabelTarget {
  id: string
  // bounding box as % of image, 0–1
  x: number; y: number; width: number; height: number
  correctLabelId: string
}

LabelChip {
  id: string
  text: string                            // "1AC", "Aff Podium"
}
```

### `cfu-highlight` — Select words inside a passage

For things like *"Highlight the part of this argument that is the **link**"* or *"Click every word that names a stock issue."*

```ts
HighlightSlide extends CfuCommon {
  type: "cfu-highlight"
  passage: string                         // sentence/paragraph; renders as clickable tokens
  mode: "words" | "spans"                 // word = each token clickable; span = pre-defined selectable spans
  spans?: HighlightSpan[]                 // required when mode="spans"
  correctIds: string[]                    // ids of the correct tokens or spans
  scoring: CfuCommon["scoring"] & {
    mode: "all-or-nothing" | "partial"    // partial = (correct picks − wrong picks) / #correct
  }
}

HighlightSpan {
  id: string
  start: number                           // char offset
  end: number
}
```

---

## Terminal slide

### `complete`

```ts
CompleteSlide extends SlideCommon {
  type: "complete"
  headline: string                        // "MISSION COMPLETE"
  subtext: string                         // "You've got Inherency. The sector opens up."
  rewards: CompleteReward[]               // shown in the rewards panel
  primaryCta: { label: string, action: "next-mission" | "return-bridge" | { url: string } }
  secondaryCta?: { label: string, action: "next-mission" | "return-bridge" | { url: string } }
}

CompleteReward {
  icon: string                            // "◈" "▲" "★" "🔓"
  label: string                           // "CREDITS EARNED"
  // exactly one of:
  staticValue?: string                    // "50 CRD"
  dynamicValue?: "credits" | "rank-delta" | "accuracy" | "unlocked-next"
}
```

---

## Inline markup convention

Inside any `headline`, `body`, or `description` string, the player understands a tiny markup language so curriculum writers don't have to touch HTML:

| Markup                  | Renders as                          |
|-------------------------|-------------------------------------|
| `**bold**`              | `<strong>bold</strong>`             |
| `*italic*`              | `<em>italic</em>`                   |
| `` `term` ``            | `<strong class="key-term">term</strong>` (for protected vocab) |
| `{{cyan: text}}`        | `<span class="highlight-cyan">text</span>` |
| `{{amber: text}}`       | `<span class="highlight-amber">text</span>` |
| `{{magenta: text}}`     | `<span class="highlight-magenta">text</span>` (boss only) |

`body` fields accept an array of these strings — one per paragraph — so the player wraps each in `<p>`.

---

## Attempt logging

For every CFU, the player writes one row to the backend:

```ts
Attempt {
  studentId: string
  classId: string
  missionId: string
  slideId: string
  type: "cfu-mcq" | "cfu-sort" | ...
  correct: boolean
  details: {
    // for mcq:
    chosenOptionId?: string
    // for sort:
    placements?: { cardId: string, binId: string, correct: boolean }[]
    misplacementCount?: number
  }
  startedAt: string  // ISO
  submittedAt: string
  timeSpentMs: number
}
```

This single table is what powers the teacher dashboard's **item analysis** ("80% of Period 4 missed CFU 1").

And one row per finished mission:

```ts
Completion {
  studentId: string
  classId: string
  missionId: string
  finishedAt: string
  creditsEarned: number
  accuracy: number          // 0–1
  shieldsRemaining: number
  attemptIds: string[]
}
```

---

## Shields and streak — lifecycle (locked in v0.1)

- **Shields** reset to **3** at the start of every mission.
- **Streak** persists across missions on the student's profile.
- Wrong CFU answer → lose 1 shield, streak resets to 0.
- Right CFU answer → no shield change, streak +1.
- Shields hitting 0 does NOT block progress (matches mockup behavior). It's visible/social pressure, not a gate.

## What this schema does NOT cover yet (deliberately)

These are flagged for v0.2 once we have the v0.1 player working:

- **Branching / adaptive paths** (wrong answer → remediation slide). Mockup doesn't do this; add later.
- **Speech / audio slides** (e.g. listen to a 1AC). Add when needed.
- **Open-ended writing CFUs** with teacher review queue.
- **Boss debate node** — the First Debate. Probably its own mission type, not just another slide type.
- **Cosmetic / Quartermaster** items earned per mission.
- **Localization** — single-language for now.

---

## Why this shape

A few decisions worth flagging:

1. **Slides are typed, not free-form.** A `concept` slide is not a `hook` slide. This means the player can render each correctly, the schema can validate, and a future authoring UI can show the right form per type. The mockup mixes these by hand in HTML — the JSON makes the structure explicit.

2. **Feedback lives on the CFU, not in a separate dictionary.** The mockup has `getCorrectFeedback(slideNum)` switch statements — that doesn't scale past one mission. Co-locating feedback with the CFU keeps each mission self-contained.

3. **Tiny markup, not full Markdown or HTML.** Markdown is overkill and lets writers do things that break the design system. Raw HTML lets them do worse. The 6 tokens above cover everything the mockup actually uses.

4. **Stable IDs everywhere.** Slide IDs and option IDs are slugs, not indexes. This means you can reorder slides without breaking historical attempt data — critical when you iterate on missions mid-semester.

5. **Scoring is per-CFU, not per-mission.** Different CFUs can be worth different credits. The mockup has 15 for MCQ and 20 for the sort game — already true.
