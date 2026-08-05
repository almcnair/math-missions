# AI Mission Authoring Guide — Math Missions

**Audience:** AI assistants (Claude, Gemini, or any coding agent) that have been asked to author a new math mission for Math Missions.

**Your job:** Produce **two files** for a single math skill:

1. `src/content/missions/<mission-id>.json` — the mission itself, valid against the schema in `src/lib/mission-schema.ts`.
2. `src/content/missions/<mission-id>.image-prompts.md` — one image-generation prompt per image slot in the mission, written for **Gemini** image generation.

That's the deliverable. Everything below tells you how to do it well.

---

## Table of contents

1. [Ground rules — read these first](#ground-rules)
2. [What a mission is](#what-a-mission-is)
3. [The slide catalog — teach slides](#slide-catalog-teach)
4. [The CFU catalog — check-for-understanding slides](#cfu-catalog)
5. [Modality-selection cheat sheet](#modality-cheat-sheet)
6. [Inline markup — the writer's toolkit](#inline-markup)
7. [Image discipline & the sibling `.image-prompts.md` file](#image-discipline)
8. [SPED-safe writing rules](#sped-safe-writing)
9. [Chunking rules](#chunking)
10. [Pacing template — the standard arc](#pacing-template)
11. [Registration — wiring the mission into the app](#registration)
12. [Validation checklist — run this before you're done](#validation)
13. [Hard don'ts](#hard-donts)

---

<a id="ground-rules"></a>
## 1. Ground rules — read these first

- **The schema is the contract.** `src/lib/mission-schema.ts` is the single source of truth for what fields exist and what types they take. If a field is not in the schema, do not invent it. If you want a feature the schema does not support, say so in a comment in your output — do not fake it.
- **The exemplar is `dividing-fractions-v1.json`.** When in doubt about structure, tone, or field usage, imitate that file. It is the only math mission that currently exists, and it is the canonical reference.
- **The `id` of the mission is a slug.** Lowercase, hyphenated, ends in `-v1` (or `-v2`, etc.). Examples: `dividing-fractions-v1`, `ratios-intro-v1`, `area-of-rectangles-v1`. The filename must match: `<id>.json`.
- **Every slide has a stable `id`.** Slide IDs are slugs too. They must be unique within a mission. Never use array indexes as IDs; the app persists attempt data keyed on slide `id` and if you rename a slide's `id` later, that attempt history is orphaned.
- **Do not invent evidence, sources, or facts.** If you don't know a fact, don't put it in a slide. If a slide needs a real-world number (e.g., a statistic in a hook), leave it as `TODO(austin)` in the copy and flag it in your delivery message.
- **You are writing for students who need SPED-safe design.** See [SPED-safe writing rules](#sped-safe-writing). Every design decision defers to that.

---

<a id="what-a-mission-is"></a>
## 2. What a mission is

A **mission** is a single self-contained lesson that teaches one math skill. A student sits down, plays through 8–13 slides in order, and comes out having (a) learned the concept, (b) demonstrated understanding through 4–6 checks-for-understanding (CFUs), and (c) received a completion screen with rewards.

Missions are JSON files. The `Mission` type in `src/lib/mission-schema.ts` is the contract. The top-level shape:

```jsonc
{
  "id": "your-skill-v1",
  "campaignId": "math-missions",
  "sectorId": "fractions",             // or "ratios", "geometry", etc. — pick the math area
  "number": 1,                          // sort order; ≤ 3 unlocked at starting rank (see src/lib/xp.ts::rankRequiredFor)
  "title": "Human Title",
  "subtitle": "Sector · Mission 01",
  "tagline": "One-line pitch with {{cyan:accent}} for the payoff.",
  "estimatedMinutes": 12,
  "difficulty": "intro" | "core" | "advanced" | "boss",
  "rewards": { "credits": 100, "rankXp": 60 },
  "unlocks": [],
  "prerequisites": [],
  "protectedTerms": ["reciprocal", "dividend", ...],   // vocabulary this mission teaches or requires
  "passingCriteria": {
    "requireAllCfu": true,
    "minCorrectCfu": 4,
    "shieldsAtZero": "warn" | "allow-continue"
  },
  "slides": [ /* array of slides in order */ ]
}
```

**Defaults for a typical `core` math mission** (change deliberately, not casually):

| Field | Default | Notes |
|---|---|---|
| `difficulty` | `"core"` | Use `"intro"` for a first-of-sector concept, `"boss"` for capstone. |
| `estimatedMinutes` | 10–15 | Real-world student time. Do not lowball; SPED students go slower and that's fine. |
| `rewards.credits` | 100 | Match difficulty roughly: intro 80, core 100, advanced 130, boss 180. |
| `rewards.rankXp` | 60 | Same idea: intro 40, core 60, advanced 90, boss 120. |
| `passingCriteria.requireAllCfu` | `true` | Students see every check; don't skip. |
| `passingCriteria.minCorrectCfu` | 4 | Out of the 5–6 CFUs in the mission. |
| `passingCriteria.shieldsAtZero` | `"allow-continue"` | Kids don't lose progress on a rough day. Locked-in Math Missions rule: **no loss/punishment mechanics.** |

---

<a id="slide-catalog-teach"></a>
## 3. The slide catalog — teach slides

There are five **teaching** slide types. They convey information; they do not check for understanding. Every teach slide has an optional `image` field (see [image discipline](#image-discipline)) and optional `tag` / `tagTone` for the small label at the top of the slide (e.g., `"◈ NEW ITEM UNLOCKED"`).

### 3.1 `hook`

**Purpose:** Open the mission with a scenario, question, or story that hooks student attention. First slide of every mission.

**Required fields:** `id`, `type: "hook"`, `headline`, `body: string[]`.

**Optional:** `quote`, `sidebar`, `image`.

**Do:** Ask a real-world question a middle-schooler cares about ("You've got ½ of a pizza…"). Set up the *why*, not the *what*. Two or three short paragraphs in `body`, not one wall.

**Don't:** Explain the math on this slide. Don't put definitions here. Save teaching for the next slides.

**Example** (from `dividing-fractions-v1.json`):

```jsonc
{
  "id": "s1-hook",
  "type": "hook",
  "tag": "◈ LEVEL 1 · WARM-UP",
  "headline": "You've got {{cyan:½ of a pizza}} left. You want to split it into {{amber:3 equal pieces}}. How much pizza is one piece?",
  "body": [
    "You already know the answer is small. Way smaller than half. Each piece is a slice *of* a half — one-sixth of the whole pizza.",
    "That's {{cyan:½ ÷ 3}}. Dividing a fraction by a whole number. And here's the wild part: the fastest way to solve it doesn't look like division at all. It looks like *multiplication*.",
    "Today's power-up: **keep–change–flip.** By the end of this mission, you'll know the move *and* the reason it works — so you can never be tricked into forgetting it."
  ],
  "image": { "src": "/mission-images/dividing-fractions-v1/hook.png", "alt": "" }
}
```

### 3.2 `define`

**Purpose:** Introduce one vocabulary term. **One term per slide.** If your mission introduces 3 terms, that's 3 define slides — never a "definitions dump" in a concept slide.

**Required:** `id`, `type: "define"`, `term`, `definition`.

**Optional:** `pronunciation`, `plainWords`, `analogy`, `image`.

**Do:** Use `definition` for the formal definition (one sentence, precise, safe to put in a textbook). Use `plainWords` for a 5th-grade retelling ("Swap the top and the bottom."). Use `analogy` for a concrete comparison the student already understands ("Think of it like a power-up in a video game…"). This three-layer structure is the single most SPED-friendly move in the app — use it every time.

**Don't:** Cram multiple terms into one define slide. Don't skip `plainWords` — the formal definition alone is often too dense for a student with a reading disability.

### 3.3 `concept`

**Purpose:** Explain a concept using a **set of small cards**. Each card is one atomic idea. This is how you chunk a multi-part concept into digestible bites without spawning a new slide for each.

**Required:** `id`, `type: "concept"`, `headline`, `cards: ConceptCard[]`.

**Optional:** `intro`, `image`.

**Each card:** `id`, `icon` (a single character/emoji), `name`, `description`, optional `example` (`{label, text}`), optional `accent` (`"cyan" | "amber" | "magenta"`).

**Do:** Use 2–4 cards per concept slide. Each card teaches one atomic move. `dividing-fractions-v1` uses this for the three moves (Keep / Change / Flip) — see slide `s4-concept-kcf`.

**Don't:** Use more than 4 cards on a single concept slide. If you have 5+ atomic ideas, split into two concept slides. Don't use `magenta` accent outside of boss/capstone missions (it's reserved).

### 3.4 `strategy`

**Purpose:** Give the student a **procedure** — an ordered list of steps or tactical advice. Use this after the concept is understood, to show *how* to apply it.

**Required:** `id`, `type: "strategy"`, `headline`, `rows: StrategyRow[]`.

**Optional:** `intro`, `image`.

**Each row:** `name` (short imperative — "Step 1 — Flip the divisor"), `description`, optional `counter` (`{label, text}` — a common trap / mistake to avoid).

**Do:** Number the steps in the `name` when order matters ("Step 1", "Step 2", …). Use `counter` to head off predictable mistakes ("COMMON TRAP: Do NOT flip the first fraction").

**Don't:** Use `strategy` for concept explanation. If it's not a procedure, use `concept`.

### 3.5 `complete`

**Purpose:** Last slide. Rewards + next-action CTA. **Every mission ends with this.**

**Required:** `id`, `type: "complete"`, `headline`, `subtext`, `rewards: CompleteReward[]`, `primaryCta`.

**Optional:** `secondaryCta`, `image`.

**Reward icons:** Use `dynamicValue` to pull real values from the runtime (`"credits"`, `"rank-delta"`, `"accuracy"`, `"unlocked-next"`). Only use `staticValue` if you literally want a fixed string.

**CTAs:** `action` can be `"next-mission"`, `"return-bridge"`, or an object `{url: "..."}`. Default primary should almost always be `"return-bridge"` and secondary `"next-mission"`.

---

<a id="cfu-catalog"></a>
## 4. The CFU catalog — check-for-understanding slides

This is the heart of the mission. A CFU (Check for Understanding) is a slide where the student **expresses their understanding**. There are **8 CFU modalities**, and part of your job as a mission author is picking the right modality for the specific thing you're checking. This section is the deepest section of this doc for that reason.

### CFU shared shape

Every CFU slide has these fields in addition to the type-specific ones:

- **`prompt`** — `{ label?, scenario?, question }`. `label` is the short header (e.g., `"QUICK CHECK"`). `scenario` is optional set-up context. `question` is the specific ask.
- **`scoring`** — `{ creditsOnCorrect, shieldOnWrong, breaksStreakOnWrong, maxAttempts?, mode? }`.
  - `shieldOnWrong: true` is default — the student loses a shield on wrong. **This is the closest thing Math Missions has to a penalty**, and per project rules (`passingCriteria.shieldsAtZero: "allow-continue"`) it never actually blocks progress.
  - `breaksStreakOnWrong` — set `true` for the "hard recall" CFUs (mcq, quick fact), `false` for "productive struggle" CFUs (order, match, fill, label, highlight) where partial credit is possible.
  - `maxAttempts` — `1` for single-shot recall CFUs, `2` for anything with partial credit.
  - `mode: "partial"` — set on `sort`, `order`, `match`, `fill`, `label`, `highlight` when partial credit should apply. Otherwise `"all-or-nothing"` or omit.
- **`feedback`** — `{ correct, wrongDefault, wrongByChoice? }`. **Every CFU must have `correct` and `wrongDefault`.** `wrongByChoice` (on `mcq` and `multi`) lets you target feedback to specific wrong answers — use it whenever a specific wrong choice reveals a specific misconception.
- **`hint?`** — Optional scaffold. `{imageUrl, altText, delaySeconds?}`. If present, the player renders a "Request Hint" button that reveals a hint image after `delaySeconds` (default 30) of waiting. Using a hint breaks the student's streak but does NOT damage shields. **Use hints on your harder CFUs** (fill, order, label) — they're the "productive struggle" scaffold.

### The 8 CFU modalities

Each entry below tells you: what the modality is, what thinking it exercises, when to use it, when NOT to, JSON shape, and a worked math example.

---

#### 4.1 `cfu-mcq` — Multiple Choice

**What it is:** Student picks **one** answer from a small set (typically 4 options).

**What thinking it exercises:** *Recognition and discrimination.* Student sees the correct answer and has to identify it among plausible distractors. Weak on production ("can you write the answer yourself?"), strong on fast recall ("can you recognize the answer?").

**When to reach for it:**
- Vocabulary checks ("What is the reciprocal of ⅖?")
- Concept recognition ("Which of these is a proper fraction?")
- "Why does this work?" conceptual questions where each wrong option is a specific misconception you want to name and correct.
- **When you have great distractors.** Distractors are the whole game. If you can't write 3 distractors that each represent a real, common student mistake, don't use MCQ — use a different modality.

**When NOT to reach for it:**
- If the correct answer is obvious ("Which one is a fraction? A. banana B. 3/4 C. Tuesday D. blue"). If a student can guess by process of elimination without knowing the math, the CFU is worthless.
- If you'd have to invent implausible distractors just to fill four options.
- As your *default* modality. It's easy to write, which means it's easy to lean on. Vary your modalities.

**JSON shape:**

```jsonc
{
  "id": "s7-cfu-mcq-reciprocal",
  "type": "cfu-mcq",
  "tag": "⚡ CHECK 01 · RECIPROCAL RECALL",
  "prompt": {
    "label": "QUICK CHECK",
    "question": "What is the reciprocal of `⅖`?"
  },
  "options": [
    { "id": "a", "letter": "A", "text": "⅖" },
    { "id": "b", "letter": "B", "text": "⁵⁄₂" },
    { "id": "c", "letter": "C", "text": "−⅖" },
    { "id": "d", "letter": "D", "text": "⁷⁄₁₀" }
  ],
  "correctOptionId": "b",
  "scoring": {
    "creditsOnCorrect": 15,
    "shieldOnWrong": true,
    "breaksStreakOnWrong": true,
    "maxAttempts": 1
  },
  "feedback": {
    "correct": { "title": "✓ FLIPPED IT", "body": ["..."] },
    "wrongByChoice": {
      "a": { "title": "✕ NOT QUITE — THAT'S THE SAME FRACTION", "body": ["..."] },
      "c": { "title": "✕ CLOSE — BUT NEGATIVE ISN'T THE MOVE", "body": ["..."] },
      "d": { "title": "✕ MISFIRE — WHERE DID THAT 7 COME FROM?", "body": ["..."] }
    },
    "wrongDefault": { "title": "✕ RECALIBRATE", "body": ["..."] }
  }
}
```

**Bad version to avoid:** MCQ where three distractors are joke options (`"D. banana"`). Every distractor should be a mistake a real student would actually make.

---

#### 4.2 `cfu-multi` — Multiple Correct (Select All That Apply)

**What it is:** Student selects **all** correct answers from a set — one, several, or all could be right.

**What thinking it exercises:** *Discrimination + completeness.* Student must not only recognize correct answers but also confidently exclude the wrong ones. Cognitively heavier than MCQ.

**When to reach for it:**
- "Which of these are equivalent fractions to ½?" (multiple correct answers exist)
- "Which of these expressions are in simplest form?" (some are, some aren't)
- Category identification when the category can legitimately contain multiple members.

**When NOT to reach for it:**
- **Sparingly for SPED students.** The "select all that apply" format is legitimately harder to parse than MCQ — students with reading or working-memory challenges often miss items. Use it when the multi-selection is *the point*, not just for variety.
- When only one answer is actually correct — that's `mcq`, not `multi`.
- When students have to hold too many options in mind (more than ~5 items).

**JSON shape:** Identical to `mcq` except `correctOptionIds` is an array and `type: "cfu-multi"`.

```jsonc
{
  "type": "cfu-multi",
  "options": [ /* … */ ],
  "correctOptionIds": ["a", "c"],
  /* … */
}
```

---

#### 4.3 `cfu-sort` — Sort Cards into Bins

**What it is:** Student drags a set of cards into labeled bins. Each card belongs in exactly one bin.

**What thinking it exercises:** *Categorization.* Student decides which category each item belongs to. Great for reinforcing definitions ("which of these are ratios and which are rates?") or for building conceptual buckets.

**When to reach for it:**
- Vocabulary sorting: "proper fraction" vs. "improper fraction" vs. "mixed number"
- Concept differentiation: "commutative property examples" vs. "associative property examples"
- Real-world classification: "ratio" vs. "rate" vs. "unit rate" with concrete examples of each.

**When NOT to reach for it:**
- If categories are fuzzy or overlap ("some of these could go in either bin"). Sort needs a **single correct home** for each card.
- If you have more than ~6 cards or more than ~4 bins. Cognitive load explodes past that.
- For teaching sequences — that's `order`, not `sort`.

**JSON shape:**

```jsonc
{
  "type": "cfu-sort",
  "bins": [
    { "id": "proper", "icon": "◆", "label": "PROPER FRACTION" },
    { "id": "improper", "icon": "◇", "label": "IMPROPER FRACTION" }
  ],
  "cards": [
    { "id": "c1", "text": "⅔", "correctBinId": "proper" },
    { "id": "c2", "text": "⁵⁄₃", "correctBinId": "improper" },
    /* … */
  ],
  "allowPartialCredit": true
}
```

---

#### 4.4 `cfu-order` — Put in Order

**What it is:** Student drags items into the correct **sequence**.

**What thinking it exercises:** *Procedural knowledge.* Student demonstrates they know the sequence of steps in an algorithm or process.

**When to reach for it:**
- Algorithms: "Put the four steps of keep–change–flip in order."
- Standard-form conversions: "Order these transformations from first to last."
- Any time the *order* of operations is the point.

**When NOT to reach for it:**
- When the order genuinely doesn't matter (e.g., listing the coordinate axes — that's `sort` or `match`).
- When there are more than ~5 items. Ordering long lists gets tedious.

**JSON shape:**

```jsonc
{
  "type": "cfu-order",
  "items": [
    { "id": "step-multiply", "text": "Multiply straight across.", "correctPosition": 4 },
    { "id": "step-keep", "text": "Keep the first fraction.", "correctPosition": 1 },
    { "id": "step-flip", "text": "Flip the second fraction.", "correctPosition": 3 },
    { "id": "step-change", "text": "Change ÷ to ×.", "correctPosition": 2 }
  ]
}
```

**Note:** `correctPosition` is **1-indexed**, not 0-indexed. First position is `1`.

---

#### 4.5 `cfu-match` — Match Pairs

**What it is:** Student pairs items from a left column with items from a right column. Each left item has exactly one right-column match.

**What thinking it exercises:** *Association.* Student demonstrates that two things belong together — a term and its definition, a problem and its solution, a formula and its use case.

**When to reach for it:**
- Term-to-definition pairing (great vocabulary reinforcement).
- Problem-to-answer pairing: "Match each division problem to its rewritten multiplication form." (`dividing-fractions-v1` slide `s9-cfu-match`.)
- Concept-to-example: "Match the property to the example that demonstrates it."

**When NOT to reach for it:**
- If items on one side can legitimately match multiple items on the other — that's not a match, that's a many-to-many mapping (schema doesn't support it).
- If you have more than 5 pairs. Working memory limit — students lose track.

**JSON shape:**

```jsonc
{
  "type": "cfu-match",
  "leftColumn": {
    "label": "DIVISION PROBLEM",
    "items": [
      { "id": "prob-1", "text": "½ ÷ ⅓", "pairId": "pair-1" },
      { "id": "prob-2", "text": "⅔ ÷ ¼", "pairId": "pair-2" }
    ]
  },
  "rightColumn": {
    "label": "REWRITTEN AS ×",
    "items": [
      { "id": "rewrite-1", "text": "½ × ³⁄₁", "pairId": "pair-1" },
      { "id": "rewrite-2", "text": "⅔ × ⁴⁄₁", "pairId": "pair-2" }
    ]
  }
}
```

**Note:** Items are paired by matching `pairId` across the two columns. `pair-1` on the left matches `pair-1` on the right.

---

#### 4.6 `cfu-fill` — Fill in the Blank

**What it is:** Student types answers into blanks in a template string.

**What thinking it exercises:** *Production and recall.* Student writes the answer themselves — no options to choose from. This is the highest-fidelity modality: if a student can fill in blanks correctly, they truly know the concept.

**When to reach for it:**
- Show-your-work solutions: "Solve `½ ÷ ¾` by filling in each step." (`dividing-fractions-v1` slide `s10-cfu-fill-solve`.)
- Numeric answers with a small set of accepted values.
- Vocabulary recall where the word must be produced, not recognized.

**When NOT to reach for it:**
- When the accepted answer has many valid spellings/forms and you can't enumerate them all. E.g., don't use `cfu-fill` for open-ended word answers unless the vocabulary is very narrow.
- Early in a mission before the student has enough scaffolding. Fill is a *demonstration* modality — put it after concept slides, not first.
- **Provide a `hint` on fill CFUs when the concept is new.** The 30-second wait before hint reveal is the pedagogical point — force time-with-the-problem, then help.

**JSON shape:**

The `template` is a string with `{{N}}` tokens marking blanks. `blanks` maps each index to accepted answers.

```jsonc
{
  "type": "cfu-fill",
  "template": "½ ÷ ¾  =  ½ × {{1}}⁄{{2}}  =  {{3}}⁄{{4}}",
  "blanks": [
    { "index": 1, "acceptedAnswers": ["4"], "hint": "The reciprocal of ¾ has this number on top." },
    { "index": 2, "acceptedAnswers": ["3"], "hint": "The reciprocal of ¾ has this number on bottom." },
    { "index": 3, "acceptedAnswers": ["4"], "hint": "Top × top: 1 × 4 = ?" },
    { "index": 4, "acceptedAnswers": ["6"], "hint": "Bottom × bottom: 2 × 3 = ?" }
  ],
  "caseSensitive": false
}
```

**Accepted answers:** List every reasonable form. For `⁴⁄₆` vs. `2/3` — decide whether you want the simplified form only, or both. The `hint` on each blank is a per-blank text hint (different from the top-level `hint` field that scaffolds with an image).

---

#### 4.7 `cfu-label` — Label the Diagram

**What it is:** Student drags labels onto specific regions of an image. Each region has a correct label.

**What thinking it exercises:** *Spatial identification.* Student demonstrates they can locate concepts on a diagram — the parts of a shape, the position of a variable, the region of a coordinate plane.

**When to reach for it:**
- "Label the numerator, denominator, and fraction bar." (with a fraction diagram)
- "Label each part of the coordinate plane."
- "Label the base, height, and hypotenuse of this right triangle."
- Any time the concept has an **inherent spatial component**.

**When NOT to reach for it:**
- Without a good image. `cfu-label` requires a diagram that is clean, correctly proportioned, and where target regions are unambiguous.
- For non-spatial concepts. Labeling a *list* of things is `sort` or `match`, not `label`.
- Without a fixed `aspectRatio`. The label CFU **requires** `image.aspectRatio` because the target coordinates are normalized (0.0–1.0) relative to that ratio.

**JSON shape:**

```jsonc
{
  "type": "cfu-label",
  "image": {
    "src": "/mission-images/your-mission-v1/labeled-fraction.png",
    "alt": "A fraction diagram with three regions",
    "aspectRatio": 1.5
  },
  "targets": [
    { "id": "t1", "x": 0.10, "y": 0.20, "width": 0.30, "height": 0.20, "correctLabelId": "numerator" },
    { "id": "t2", "x": 0.10, "y": 0.60, "width": 0.30, "height": 0.20, "correctLabelId": "denominator" },
    { "id": "t3", "x": 0.10, "y": 0.45, "width": 0.30, "height": 0.05, "correctLabelId": "fraction-bar" }
  ],
  "labels": [
    { "id": "numerator", "text": "Numerator" },
    { "id": "denominator", "text": "Denominator" },
    { "id": "fraction-bar", "text": "Fraction Bar" }
  ]
}
```

**Coordinates:** `x` and `y` are the top-left corner of the target rectangle, normalized 0–1. `width` and `height` are also normalized. So a target at `x=0.10, y=0.20, width=0.30, height=0.20` covers the region from 10%-40% horizontally and 20%-40% vertically. **You need to know the exact regions of the image to author this modality** — either commission the image first and measure, or specify precise coordinates when generating the image so you know where things end up.

---

#### 4.8 `cfu-highlight` — Highlight the Right Parts

**What it is:** Student clicks on words or spans within a text passage to highlight them. Correct answers are pre-defined.

**What thinking it exercises:** *Discrimination within context.* Student reads a passage and identifies which words/phrases match a criterion — "find every fraction in this word problem" or "highlight the operation words."

**When to reach for it:**
- "Highlight every keyword that tells you to add." (in a word-problem passage)
- "Highlight the variables in this expression."
- "Highlight the parts of this solution that are wrong." (error analysis — very powerful)

**When NOT to reach for it:**
- For short passages where the answer is trivially obvious.
- When the criterion for "correct" is ambiguous — highlight needs an unambiguous rule ("every number word" is fine, "every important word" is not).

**JSON shape:**

`mode: "words"` — each whitespace-separated token in `passage` is clickable; `correctIds` lists the word IDs.
`mode: "spans"` — you define specific spans by character index in `passage` with an `id`, and `correctIds` lists which are correct.

```jsonc
{
  "type": "cfu-highlight",
  "passage": "Sarah has 12 apples and gives away 3 apples.",
  "mode": "words",
  "correctIds": ["12", "3"]
}
```

**Note:** As of this writing, the player renders `mode: "words"` more reliably than `mode: "spans"`. Prefer `"words"` unless you specifically need span-based highlighting.

---

<a id="modality-cheat-sheet"></a>
## 5. Modality-selection cheat sheet

When you know what you want to check, jump straight to the right modality:

| The student needs to… | Reach for… | Not… |
|---|---|---|
| Recognize a term or fact among distractors | `cfu-mcq` | `cfu-fill` (too demanding for recognition) |
| Recall a term or produce a numeric answer | `cfu-fill` | `cfu-mcq` (recognition ≠ recall) |
| Choose all items that fit a category | `cfu-multi` | `cfu-mcq` |
| Categorize items into buckets | `cfu-sort` | `cfu-match` (that's pairing, not sorting) |
| Demonstrate the sequence of an algorithm | `cfu-order` | `cfu-sort` (sort has no sequence) |
| Pair terms with definitions or problems with answers | `cfu-match` | `cfu-sort` |
| Show their work on a specific problem | `cfu-fill` | `cfu-mcq` |
| Identify the parts of a diagram | `cfu-label` | `cfu-highlight` (that's for text) |
| Identify keywords in a passage | `cfu-highlight` | `cfu-label` |
| Spot an error in a worked example | `cfu-highlight` with `mode: "words"` | anything else |

**Rule of thumb for a 5–6 CFU mission:** hit at least **4 different modalities**. A mission of 5 MCQs teaches recognition and not much else. Variety in modality forces the student to *use* the concept in different mental modes, which is where learning actually happens.

---

<a id="inline-markup"></a>
## 6. Inline markup — the writer's toolkit

The app supports a tiny markup language in every string field. Do **not** use HTML. Do **not** use Markdown syntax the schema doesn't recognize.

| Token | Renders as | Use for |
|---|---|---|
| `**bold**` | **bold** | Emphasis. |
| `*italic*` | *italic* | Aside, softer emphasis. |
| `` `term` `` | **term** (cyan, semibold) | Any word from the mission's `protectedTerms` array. This is your vocabulary treatment. |
| `{{cyan: text}}` | text in cyan accent | Payoffs, key values, the "punchline" of a sentence. |
| `{{amber: text}}` | text in amber accent | Cautions, contrasts, "the tricky part." |
| `{{magenta: text}}` | text in magenta accent | **Reserved for boss/capstone missions only.** Do not use in a `core` or `intro` mission. |

**Rules:**
- Tokens do not nest well; keep them simple.
- Every math term from `protectedTerms` should be wrapped in backticks *the first several times it appears* in a mission. After it's fully learned, plain text is fine.
- Don't over-color. If every sentence has `{{cyan:...}}`, none of them do.

---

<a id="image-discipline"></a>
## 7. Image discipline & the sibling `.image-prompts.md` file

### 7.1 When to include an image

Every teach slide (`hook`, `define`, `concept`, `strategy`, `complete`) and every image-friendly CFU (`cfu-mcq`, `cfu-multi`) has an **optional** `image` field. `cfu-label` **requires** an image (with `aspectRatio`).

**Include an image when the concept is concrete and benefits from visualization:**
- Fractions (pizza slices, bar models, number lines)
- Ratios (side-by-side comparison objects)
- Geometry (shapes, angles, coordinate planes)
- Measurement (rulers, protractors, scales)
- Word problems where the scenario is a real place (a garden, a classroom, a race)

**Skip images when:**
- The concept is abstract and an image would be forced or literal (don't illustrate "reciprocal" with a picture of a mirror unless you can make the mirror-metaphor actually work visually — most of the time you can't).
- The slide is already dense (a long strategy slide with 4 rows doesn't need a picture; the words are already carrying the load).
- The image would just be decorative filler.

**Rule:** every image must earn its place. If the mission would be equally clear without it, leave it out.

### 7.2 File paths

Images live at `public/mission-images/<mission-id>/<slide-id>.<ext>`. For example, the hook image for `dividing-fractions-v1` at slide `s1-hook` would be:

```
public/mission-images/dividing-fractions-v1/s1-hook.png
```

Reference in the JSON with the `/`-rooted public path:

```jsonc
"image": {
  "src": "/mission-images/dividing-fractions-v1/s1-hook.png",
  "alt": "A pizza with half remaining, showing three cut lines"
}
```

**Filename discipline:** use the slide `id` as the filename. Do not use the Gemini default filename (e.g., `Gemini_Generated_Image_rtrjpxrtrj.png`) in production JSON — rename before shipping. This makes it possible to swap an image later without hunting through timestamped names.

**`alt` is required.** Never `""`. Write a real accessibility description of what the image shows, not the caption of what it teaches. Screen-reader users need to know what's on the screen.

### 7.3 The sibling `.image-prompts.md` file

**Every mission that has any images ships with a sibling file:**

```
src/content/missions/<mission-id>.json
src/content/missions/<mission-id>.image-prompts.md
```

Format for the sibling file:

```markdown
# Image Prompts — <Mission Title>

**Mission id:** `<mission-id>-v1`
**Image tool:** Gemini
**Style guidelines:** Dark background friendly (the app is dark-themed).
Aim for high contrast on light-colored key elements. Clean geometric shapes,
no photorealism unless the scenario demands it. Avoid text in images —
labels come from the app.

---

## s1-hook — Pizza scenario

**File to save to:** `public/mission-images/<mission-id>-v1/s1-hook.png`
**Aspect ratio:** 16:9 (roughly 1.78)
**Prompt for Gemini:**

> A single pizza on a dark wooden table, viewed from above. Half of the
> pizza has been eaten (a clean semicircle removed, leaving the other half
> intact). The remaining half is scored with three thin cut lines,
> dividing it into three equal pie-slice pieces. Warm lighting, cinematic
> style, minimal background clutter. Bright cheese and pepperoni on the
> remaining slices for high contrast against the dark table.

**Alt text (for the JSON `alt` field):**

> A pizza with half remaining, scored into three equal slices, on a dark
> wooden surface.

---

## s2-define-reciprocal — Mirror metaphor

**File to save to:** `public/mission-images/<mission-id>-v1/s2-define-reciprocal.png`
**Aspect ratio:** 1:1 (square)
**Prompt for Gemini:**

> [full prompt here]

**Alt text:**

> [alt text here]

---

<!-- one section per image slot in the mission -->
```

**Every image slot in the JSON must have a matching section in the sibling file.** If the JSON references an image, the prompts file must contain the prompt to generate it. Missing prompts are a validation failure — Austin can't reproduce or regenerate the image otherwise.

**Prompt-writing rules for Gemini:**
- Describe the composition, not just the subject. "A pizza" is not enough; "A single pizza viewed from above, half missing, three cut lines in the remaining half, dark wooden surface, warm lighting" is.
- Specify aspect ratio in the prompt itself, not just in the metadata — Gemini pays attention.
- Ask for **no embedded text**. The app renders text; images shouldn't have labels baked in.
- Match the app's dark theme. Prompt for high-contrast subjects, dark backgrounds where sensible, or transparent-ready flat illustrations.
- For math diagrams (fraction bars, number lines, coordinate planes), prompt for **clean geometric illustration, flat design, mathematical notation only where called for**. Photorealism hurts clarity on abstract math.

---

<a id="sped-safe-writing"></a>
## 8. SPED-safe writing rules

Math Missions is built for a Special Education (SPED) math classroom. Every writing decision defers to these rules:

1. **One idea per slide.** If you're teaching two things, that's two slides.
2. **Short sentences.** Aim for 12–18 words per sentence in body text. Longer sentences fragment attention.
3. **Concrete before abstract.** Introduce the concept with a real scenario, *then* generalize. Never lead with the formal definition.
4. **Every formal definition gets a `plainWords` retelling.** Non-negotiable for `define` slides.
5. **Every abstract concept gets a concrete analogy.** Use `analogy` on `define` slides; use `example` on `concept` cards.
6. **No shame, no punishment.** Wrong-answer feedback (`wrongDefault`, `wrongByChoice`) names the misconception and gives the student a way back in. Never "wrong," "incorrect," or "try harder." Use "not quite," "recalibrate," "check your flip." **Locked-in project rule:** no loss/punishment mechanics — no hearts to lose, no XP deductions, no broken streaks that block progress.
7. **Celebration is good.** On `feedback.correct` and on `complete` slides, be generous with warmth. "✓ Flipped it." "✓ Combo executed." Students who rarely feel like they win at math benefit from feeling like they win here.
8. **No peer comparison.** Never reference other students, leaderboards, or "the class average." **Locked-in project rule:** self-competition only.
9. **Use the second person.** "You've got ½ of a pizza." "You already know the answer." Direct address is engaging and reduces cognitive load.
10. **Avoid idioms and cultural references that might not land.** "Slam dunk," "curveball," "no-brainer" — cut them. Use "power-up," "move," "combo," "recipe" — game/tool metaphors travel better.

---

<a id="chunking"></a>
## 9. Chunking rules

Chunking is the single biggest lever you have for making a mission SPED-safe. Follow these:

- **A `hook` `body[]` has 2–3 paragraphs.** Never 1 wall of text. Never 5 paragraphs.
- **A `concept` slide has 2–4 cards.** More than 4 is a second concept slide.
- **A `strategy` slide has 3–5 rows.** Same rule.
- **A `define` slide teaches one term.** Never two.
- **A CFU has at most 5–6 options / items / pairs.** Working memory limit.
- **A `passage` in `cfu-highlight` is 1–3 sentences.** Never a paragraph.
- **A `fill` template has at most 4 blanks.** Beyond that, split into two `fill` CFUs.
- **A mission has 8–13 slides total.** Anything shorter probably didn't teach enough; anything longer will exhaust the student.
- **At least 4 CFUs per mission, and at most 6.** Fewer and the student didn't practice enough; more and it feels like a quiz, not a lesson.

---

<a id="pacing-template"></a>
## 10. Pacing template — the standard arc

Here's the arc that works. Adapt as needed, but this is the default:

| # | Slide type | Purpose |
|---|---|---|
| 1 | `hook` | Real-world scenario. Set up the *why*. |
| 2 | `define` | Introduce the first key term. |
| 3 | `define` *(optional)* | Introduce the second key term, if the concept needs two. |
| 4 | `concept` | The core idea, broken into 2–4 cards. |
| 5 | `concept` *(optional)* | The *why it works* — the reasoning underneath the rule. |
| 6 | `strategy` | The step-by-step procedure. |
| 7 | `cfu-mcq` | Quick recall check — did the vocab land? |
| 8 | `cfu-order` **or** `cfu-sort` | Procedural check — do they know the steps or the categories? |
| 9 | `cfu-match` **or** `cfu-fill` | Application check — can they do it themselves? |
| 10 | `cfu-fill` **or** `cfu-label` | Show-your-work / spatial check. |
| 11 | `cfu-mcq` *(concept check)* | The "why does this work?" question — the big-idea check. |
| 12 | `complete` | Rewards + CTAs. Always last. |

**This is the shape of `dividing-fractions-v1`.** Study it. Deviate deliberately, not accidentally.

---

<a id="registration"></a>
## 11. Registration — wiring the mission into the app

After you produce the JSON, the mission has to be **registered** in two places for students to see and play it:

### 11.1 The player registry

`src/app/play/[id]/page.tsx` imports every mission and puts it in a `REGISTRY` map keyed by mission `id`. To register your new mission, add an import and a line to the map:

```ts
import yourNewMission from "@/content/missions/your-new-mission-v1.json";

const REGISTRY: Record<string, Mission> = {
  // …existing entries…
  "your-new-mission-v1": yourNewMission as Mission,
};
```

**Without this, `/play/your-new-mission-v1` returns 404.**

### 11.2 The bridge's mission list

`src/app/bridge/page.tsx` has a hardcoded `missions[]` array that determines what shows up on the student home. Add your mission there with the appropriate `number` (missions with `number ≤ 3` are unlocked at starting rank).

**Note:** the authoring console (`/author`) auto-picks up any JSON in `src/content/missions/`, so it will show up there immediately — but students won't see it on `/bridge` until you add it to that array.

---

<a id="validation"></a>
## 12. Validation checklist — run this before you're done

Before you hand off a mission, check every one of these:

**Structure:**
- [ ] Mission `id` matches the filename (`<id>.json`) and ends in `-v1`.
- [ ] `campaignId` is `"math-missions"`.
- [ ] `sectorId` is a real math sector (`fractions`, `ratios`, `geometry`, `algebra`, …).
- [ ] `number` is set. If ≤ 3, mission is available at starting rank. If higher, students will need to rank up first.
- [ ] `slides` has 8–13 entries.
- [ ] First slide is `hook`. Last slide is `complete`.
- [ ] Every slide has a unique `id`.
- [ ] `protectedTerms` includes every term introduced on a `define` slide.

**CFUs:**
- [ ] At least 4 CFU slides, at most 6.
- [ ] At least 3 different CFU modalities represented.
- [ ] Every CFU has `feedback.correct` and `feedback.wrongDefault`.
- [ ] Every MCQ with strong distractors has `wrongByChoice` entries for each wrong option.
- [ ] Every CFU with partial credit has `mode: "partial"` in `scoring`.
- [ ] `passingCriteria.minCorrectCfu` is realistic (not higher than the number of CFUs).

**Images:**
- [ ] Every `image.src` points at `/mission-images/<mission-id>/<filename>`.
- [ ] Every `image.alt` is a real description, not `""`.
- [ ] `cfu-label` slides have `image.aspectRatio` set.
- [ ] The sibling `<mission-id>.image-prompts.md` exists.
- [ ] Every image referenced in the JSON has a matching prompt section in the sibling file.

**Writing:**
- [ ] Every `define` slide has both `definition` and `plainWords`.
- [ ] No sentence in `hook.body`, `concept.cards[].description`, or `strategy.rows[].description` exceeds ~25 words.
- [ ] No use of `{{magenta: ...}}` unless `difficulty: "boss"`.
- [ ] No mention of "debate," "debater," or PD101 anywhere. This is a math site.
- [ ] No mention of "Bael" anywhere in student-visible content. Locked-in project rule.
- [ ] No leaderboards, peer comparisons, or loss mechanics in any copy.

**Registration** *(if you're being asked to make the mission live, not just author the file):*
- [ ] Mission is imported and added to `REGISTRY` in `src/app/play/[id]/page.tsx`.
- [ ] Mission is added to the `missions[]` array in `src/app/bridge/page.tsx`.

---

<a id="hard-donts"></a>
## 13. Hard don'ts

- **Do not invent slide `type`s.** Only the 13 types in `Slide` (5 teach + 8 CFU + `complete`) exist. If the schema doesn't have it, don't ship it.
- **Do not invent feedback fields.** `correct`, `wrongByChoice`, `wrongDefault` — that's it. No `partiallyCorrect`, no `hint` inside feedback (hints live at the CFU top level).
- **Do not use HTML.** Inline markup only.
- **Do not add fields the schema doesn't define.** Extra fields silently break the type system.
- **Do not use debate vocabulary.** No "affirmative," "negative," "kritik," "policy," "resolution." This is a math site.
- **Do not add loss or punishment mechanics.** No hearts to lose. No XP deductions. No streaks that block progress. Locked-in project rule.
- **Do not compare students to each other.** Self-competition only. Locked-in project rule.
- **Do not skip `plainWords` on `define` slides.** Non-negotiable SPED rule.
- **Do not leave `alt=""`.** Every image needs real alt text.
- **Do not ship images with baked-in text.** Text is rendered by the app, not by the image.
- **Do not use Gemini's default filenames.** Rename to `<slide-id>.png` before referencing in JSON.

---

## Appendix: the exemplar

The single canonical example of a well-formed math mission in this repo is:

- `src/content/missions/dividing-fractions-v1.json`

When in doubt, open it and imitate its shape. It follows every rule in this document.
