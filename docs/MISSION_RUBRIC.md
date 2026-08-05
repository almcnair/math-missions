# Mission Rubric — Math Missions

How to tell whether a mission is **Distinguished**, **Proficient**, or **Developing**.

This rubric was reverse-engineered from `what-is-debate-v1` (Mission 01), which is the gold-standard reference mission. Every new mission should aim to score **Distinguished** on every dimension. If it doesn't, fix it before shipping.

> Use the checklist at the bottom of this file as a final pass before saving a new mission JSON.

---

## How to use this rubric

When you (or a future-you, or Bael) build a mission:

1. Draft the JSON.
2. Walk through the **eight dimensions** below.
3. For each, score yourself **Distinguished / Proficient / Developing**.
4. If anything lands at Proficient or below, rewrite that piece before shipping. Distinguished is the bar.

The mission isn't done when it works. The mission is done when it would be the mission a 5th-grader **remembered three weeks later**.

---

## The 8 Dimensions

### 1. **Pedagogical Arc** — explain, then check

| Distinguished | Proficient | Developing |
|---|---|---|
| Mission opens with a **hook** that grounds the concept in a student's real life, then teaches the concept across 3–5 **content slides** (define → concept → strategy/application) *before* asking the first CFU. CFUs build from low-stakes recognition → application → big-idea synthesis. | Content comes first, but the explain-phase is thin (only 1–2 slides) before CFUs begin. | Mission jumps to CFUs early, or alternates content/CFU haphazardly. Students hit questions on material that wasn't taught yet. |

**The What-IS-Debate signature:** 4 content slides (hook, define, concept, strategy) → 6 CFUs in escalating difficulty → complete. Explanation is *front-loaded* and *rich* before any assessment.

---

### 2. **Hook Quality** — does it land?

| Distinguished | Proficient | Developing |
|---|---|---|
| Hook puts the student inside a **specific, recognizable scenario** ("you and your best friend can't agree: should your school ban phones?"). Names the tension. Promises the payoff in one line. Ends with what they'll meet today. | Hook gestures at a real situation but stays abstract ("debate is like a game"). The student isn't *in* the scene. | Hook is a definition, a fact, or a "today we will learn…" sentence. No tension, no scene, no stakes. |

**The What-IS-Debate signature:** Opens with a phone-ban argument between friends. Names the problem (yelling louder doesn't settle it). Then names the solution (debate). Then names today's payoff (game, players, prize).

---

### 3. **Vocabulary Pedagogy** — protected terms get the treatment

| Distinguished | Proficient | Developing |
|---|---|---|
| Every protected vocab term gets a **`define` slide** with: a one-sentence formal definition, a *plain-words* gloss, an **analogy** to something the student already knows, and visual reinforcement (image or strong emoji anchor). The term then reappears across CFUs and feedback. | Terms are defined inline in prose or in a single bulleted slide. Analogies are missing or weak. Some terms aren't reinforced after introduction. | Terms appear in CFUs without being formally defined, or are defined in passing without a plain-words layer. |

**The What-IS-Debate signature:** Slide 2 fully defines *policy debate* with a one-line definition, plain-words ("Not a fight. Not yelling. A *game*…"), and a *video game / boss fight* analogy. Then `affirmative`, `negative`, `judge` each get a card in the concept slide with example dialogue.

---

### 4. **Visual & Emoji Anchoring** — every screen earns an image

| Distinguished | Proficient | Developing |
|---|---|---|
| Every content slide has either an `image` field pointing to a real branded illustration OR a strong emoji anchor (✅ 🛡️ ⚖️ 🎮 etc.) used **consistently** as a mnemonic for that concept across the whole mission. CFUs reuse the same emojis as recall cues. Hints exist on the hard CFUs with image reveals. | Some slides have images or emojis, but they're decorative — not anchored to specific concepts. Emoji use is inconsistent (e.g. ✅ for Aff in one slide, 👍 in another). | Mission is mostly walls of text. Emojis are sprinkled randomly or absent. No hint images on hard CFUs. |

**The What-IS-Debate signature:** ✅ = Aff, 🛡️ = Neg, ⚖️ = Judge, 🎮 = game, 🏆 = prize. These reappear in CFU prompts, options, and feedback. Hint images are wired to the harder CFUs.

> **Rule of thumb:** if a concept is worth a vocab term, it's worth an emoji anchor. Pick the emoji once. Reuse it everywhere.

---

### 5. **CFU Variety & Layering** — at least 4 different formats

| Distinguished | Proficient | Developing |
|---|---|---|
| Mission uses **at least 4 different CFU types** (e.g. mcq, match, sort, fill, order, multi). The mix moves from low-stakes recall → application → synthesis. The final CFU is a "big idea check" that requires combining everything. | 2–3 CFU types, but the harder applications are skipped or replaced with more multiple choice. | All CFUs are MCQ. No drag/match/sort/order interactions. No synthesis question. |

**The What-IS-Debate signature:** 6 CFUs across 4 types — `mcq`, `match`, `sort`, `fill` — ending on a synthesis MCQ ("what makes debate *different* from arguing at lunch?").

---

### 6. **Wrong-Answer Feedback** — per-choice, not generic

| Distinguished | Proficient | Developing |
|---|---|---|
| Every distractor in every MCQ gets its **own `wrongByChoice` feedback** that names the specific misconception ("that's both teams together," "that's the topic, not the structure") and corrects it without scolding. Correct feedback has a `followup` "Pro move" line that gives a strategy nugget. | MCQs have `wrongDefault` only, or `wrongByChoice` for some options but not all. Correct feedback rarely has a `followup`. | All wrong answers route to one generic "Try again" or "Wrong." Correct feedback is just "Right!" |

**The What-IS-Debate signature:** Every MCQ has `wrongByChoice` for every distractor. Every correct feedback has a `followup` Pro Move. Wrong feedback teaches; it doesn't punish.

---

### 7. **Voice & Brand Discipline** — it sounds like Math Missions

| Distinguished | Proficient | Developing |
|---|---|---|
| Mission stays in the space-station / tactical-game register without overdoing it. Uses approved cyan/amber accent markup. Uses the term **"Debate Partner"** (never "co-pilot," "wingman," or "buddy"). Calls each unit a **"mission"** (never "lesson" or "quiz"). Magenta is reserved for boss moments only. Tag labels follow the `⚡ TACTICAL DRILL · CFU 0X` pattern. | Voice is mostly on-brand but slips ("today's lesson," "your buddy") in a few spots. Cyan/amber used but inconsistently mapped to Aff/Neg. | Voice reads like a generic textbook. Brand vocabulary missing. Random color highlights. |

**The What-IS-Debate signature:** Cyan = Aff / good move / key concept. Amber = Neg / warning / wrong move. Magenta is absent (correctly — this isn't a boss). "Debate Partner" appears verbatim. Tags follow the standard pattern. Eyebrow language is "MISSION BRIEFING," not "lesson briefing."

> **Brand locks (2026-06-26 / 2026-06-27 / 2026-06-29):**
> - The platform is **Math Missions**. Never "CDSI" in user-facing copy.
> - The student's teammate is the **Debate Partner**. Never "co-pilot."
> - Each content-unit is a **Mission**. Never "lesson" or "quiz."
> - **Analogies stay in the space-station register.** Starship ops, mission briefings, tactical drills, comms protocols, fleet maneuvers, sci-fi crew dynamics. Sports metaphors are allowed *sparingly* — only when nothing space-flavored lands as cleanly. Default question: *"what would a starship cadet recognize?"*

---

### 8. **Scoring & Difficulty Calibration** — credits match effort

| Distinguished | Proficient | Developing |
|---|---|---|
| Higher-cognitive CFUs (sort, match, fill, synthesis MCQ) award **more credits** than recall MCQs. Easy CFUs are 1-attempt, harder applied ones get **2 attempts with partial credit**. Hard CFUs have a **hint** wired. `breaksStreakOnWrong` is set thoughtfully (true for recall, false for partial-credit applied work). Total mission credits ≈ stated reward. | Credit values are inconsistent or all identical. Attempt counts don't match difficulty. Some hard CFUs lack hints. | All CFUs award the same credits and the same attempts. No hints anywhere. Total reward doesn't add up. |

**The What-IS-Debate signature:** Recall MCQs = 15 credits / 1 attempt / breaks streak. Match & fill = 20 credits / 2 attempts / partial credit / doesn't break streak. Sort = 25 credits / 2 attempts / partial. Hints on the harder CFUs. Total ≈ 110 CFU credits + 100 completion = 210 max, well above the 100 base reward (room for partial credit).

---

## Pre-Ship Checklist

Before saving a mission as final, walk this list. Every box should be checked.

**Structure**
- [ ] Has a `hook` slide that puts the student in a specific scene.
- [ ] Has a `define` slide for every protected vocab term (or one slide covering several terms with full treatment).
- [ ] Has at least one `concept` or `strategy` slide that explains *application*, not just terminology.
- [ ] Has **at least 4 content slides** before the first CFU.
- [ ] Has **at least 4 different CFU types**.
- [ ] Has a `complete` slide with rewards that match the mission's stated payoff.

**Vocabulary**
- [ ] Every protected term in `protectedTerms[]` actually appears on the mission's `complete` slide rewards.
- [ ] Every protected term has a plain-words gloss somewhere in the mission.
- [ ] At least one term has an analogy on its define slide.

**Visual / Emoji**
- [ ] Each major concept has a designated emoji used consistently across slides and CFUs.
- [ ] Hook and define slides have either `image` or strong emoji anchors.
- [ ] Hard CFUs (match, sort, fill, synthesis) have a `hint` block.

**Feedback**
- [ ] Every MCQ distractor has its own entry in `wrongByChoice`.
- [ ] Every `correct` feedback has a `followup` Pro Move / Memory Trick / Tactical Note.
- [ ] No wrong feedback shames or scolds — every one teaches.

**Voice & Brand**
- [ ] Mentions **"Debate Partner"** (never "co-pilot" / "buddy" / "wingman").
- [ ] Calls itself a **"Mission"** (never "lesson" / "quiz" / "assessment").
- [ ] Uses **cyan = Aff / key concept**, **amber = Neg / warning** consistently.
- [ ] Uses magenta **only** if this is a boss/capstone mission.
- [ ] Tag labels follow `⚡ TACTICAL DRILL · CFU 0X` or similar standard pattern.

**Scoring**
- [ ] Recall CFUs are 1-attempt, 15 credits, break streak.
- [ ] Applied CFUs are 2-attempt, 20–25 credits, partial credit, don't break streak.
- [ ] `passingCriteria.minCorrectCfu` is set (≈ 60–70% of total CFUs).
- [ ] `shieldsAtZero` is `"allow-continue"`.

**Final sanity**
- [ ] If a 5th-grader played this mission and three weeks later you asked them "what does X mean?", they could answer using the emoji anchor or analogy from this mission.

If every box is checked, it's a Distinguished mission. Ship it.

---

## Anti-patterns (instant downgrade to Developing)

These will tank a mission regardless of how good the rest is:

- **"As you learned earlier…"** — never teach a concept *only* in feedback. Teach it in a content slide first.
- **CFU-first missions** — a mission that opens with a question before defining its terms is broken.
- **One emoji per slide, never reused** — emojis are mnemonics. If 🛡️ means Neg on slide 3, it means Neg on slide 11.
- **Distractor recycling** — using "all of the above" or "none of the above" as distractors. Lazy and untestable.
- **Generic correct feedback** — "Great job!" with no Pro Move, Memory Trick, or follow-up insight wastes the highest-engagement moment in the whole CFU.
- **Co-pilot drift** — referring to the Debate Partner as a "co-pilot," "wingman," "buddy," or "teammate." Brand lock. Fix on sight.
- **Lesson drift** — calling the unit a "lesson," "quiz," or "assessment" in user-facing copy.

---

_Source mission: `what-is-debate-v1.json`. Update this rubric if a future mission demonstrates a new dimension worth scoring on — but the bar is *the same as* `what-is-debate-v1`, not "whatever this newer mission did."_
