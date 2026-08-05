# Math Missions — AI Style Guide

> A one-page brief for any AI tool (image generators, copy assistants, writing models) producing assets, illustrations, or text for **policydebate101.com**. Paste the relevant section into your prompt; the assets you get back will feel like they belong on the platform.

---

## 🚀 The Platform in One Sentence

Math Missions is a **gamified training console for middle school debaters** — students log into the *CDSI Space Station*, take on "missions," and earn credits and rank by mastering one debate skill at a time.

The whole site reads like the **bridge of a friendly spaceship academy**. Think *Star Trek training simulator meets a really good math game*.

---

## 🎯 Audience

- **Grades 6–8** (ages ~11–14)
- Mixed reading levels, mixed prior knowledge of debate, mixed confidence
- Many are first-time debaters; some are nervous, some are skeptical
- Chromebook + classroom context: short attention windows, easily distracted, performing in front of peers

**This shapes everything.** Visuals must be *immediately* legible. Language must be *immediately* encouraging. Nothing should ever read as condescending, corporate, or boring.

---

## 🎨 Visual Style

### One-line prompt
> *Holographic sci-fi training console, cyan and amber glow on deep navy/black, clean geometric vector style, subtle starfield background, friendly and approachable — not military.*

### Color Palette (from the live tokens)

| Token | Hex | Use |
|---|---|---|
| Deep space bg | `#05071a` | Primary background — almost black with a blue cast |
| Panel | `#0c1430` | Slightly lighter panels, cards, UI surfaces |
| **Cyan (primary accent)** | `#00d4ff` | Glow, highlights, "good," primary CTAs, *claim/impact* moments |
| Cyan soft | `#6fe3ff` | Secondary glow, gradients |
| **Amber (secondary accent)** | `#ffa726` | Warnings, "*why* / warrant," contrast moments, second-tier highlights |
| Amber soft | `#ffc97a` | Softer amber glow |
| **Magenta** | `#ff3d9a` | **Reserved for boss / capstone / final-victory moments only.** Do not use casually. |
| Text bright | `#e6edff` | Primary text — soft white-blue |
| Text dim | `#8a9ac9` | Secondary text, captions |
| Status good | `#4ade80` | Success/correct only |
| Status warn | `#ff5c5c` | Errors/missed only |

**Glow rule:** cyan and amber both glow softly (blur + brightness halo). Backgrounds *receive* the glow; the glowing element itself stays crisp.

### Typography

- **Display / headers:** Orbitron (or Rajdhani as a friendlier fallback) — geometric, futuristic, ALL CAPS for big moments
- **UI / body:** Rajdhani — clean, readable, slightly futuristic
- **Mono / code / vocab:** JetBrains Mono — for protected terms and "data readouts"

### Composition

- **Starfield backgrounds** are signature — subtle, not busy. Think *distant stars*, not *Mario Galaxy*.
- **Geometric vector** — clean lines, defined edges, minimal gradients (glow halos are fine; muddy painterly gradients are not).
- **Holographic console feel** — slight transparency, light grid overlays, occasional "scan lines" or "data corner brackets" for UI flavor.
- **Friendly, not military.** No actual weapons, no grim/gritty sci-fi, no Warhammer 40K. This is a **training academy**, not a battleship.
- **Representation is mandatory — see the section below.** When humans appear: ~98% are people of color, ~75% are girls, with varied skin tones, hair textures, body types, hijabs/headwraps, glasses, and visible disabilities. Expressions range from *focused* to *delighted*.

### What to avoid

- ❌ Painterly / oil-painting / fantasy art styles
- ❌ Corporate stock photography (smiling-people-pointing-at-laptops)
- ❌ Realistic photo composites
- ❌ Dark/gritty/horror sci-fi
- ❌ Cluttered HUDs with 50 floating elements
- ❌ Excessive magenta (boss color only)
- ❌ Comic Sans / Papyrus / any "fun" font that isn't on the stack above

### Suggested prompt suffix

When generating images, append this to keep the house style consistent:

> *Style: holographic sci-fi training console UI, deep navy space background (#05071a) with subtle starfield, glowing cyan (#00d4ff) and amber (#ffa726) accents, clean geometric vector illustration, friendly and approachable tone, ages 11–14, no weapons, no military aesthetic. 3:2 aspect ratio.*
>
> *Character representation (mandatory): when humans appear, ~98% are people of color (Black, Latina/o, Asian, Indigenous, Middle Eastern, mixed-race) and ~75% are girls. Vary skin tones, hair textures, body types, hijabs/headwraps, glasses, and visible disabilities. Never default to white or male as the "main" character.*

---

## 🌍 Representation Mandate

**This is non-negotiable.** Across all art generated for this platform:

- **~98% of characters are people of color** — Black, Latino/a, Asian, Indigenous, Middle Eastern, mixed-race. Vary specifically; don't homogenize.
- **~75% of characters are girls.** When a single character is the focal point, default to a girl unless the scenario specifically requires otherwise.
- **Vary everything else too:** skin tones (light brown to deep brown to dark), hair textures (curly, coily, braided, locs, straight, wavy, hijabs, headwraps, buzzcuts), body types (slim, average, plus-size, athletic), glasses, visible disabilities (wheelchairs, hearing aids, prosthetics, mobility aids), neurodivergence cues where appropriate.
- **Never tokenize.** Diverse characters are the *default*, not the special case. A white boy can appear, but he is the exception, not the rule.
- **Audit yourself.** If you generate four images in a row and they're all light-skinned or all boys, scrap them and regenerate. The mandate is not "on average across the whole platform" — it's *in every batch*.

**Why it matters:** Austin teaches a diverse middle school student body. Students learn better when they see themselves in the material. Debate has historically been overwhelmingly white and male; this platform is part of changing that — starting at the visual layer.

**For prompting specifics, copy-paste patterns, and troubleshooting**, see the **Representation Mandate** section at the top of `AI_IMAGE_PROMPT_COOKBOOK.md`.

---

## ✍️ Voice & Copy Style

### Tone

- **Encouraging, always.** Even when a student gets something wrong, the feedback says *"close — here's the move,"* never *"incorrect."*
- **Confident, not condescending.** Speak *to* middle schoolers, not *down* at them. They can handle real debate vocabulary — we just define it the first time we use it.
- **Playful, not silly.** Humor lands when it's smart (Monty Python quote, pizza arguments, "30 seconds to save recess"). Avoid kiddie-cringe ("Hey buddies! Let's learn about WORDS!").
- **Action-forward.** Verbs over nouns. *"Spot the warrant"* beats *"identification of warrants."*
- **Sci-fi flavor, applied sparingly.** "Mission," "tactical drill," "target acquired," "recalibrate" — yes. Forcing every sentence into Star Trek dialect — no.

### Reading level

- **Aim for grade 6–7 reading level** for instructional copy.
- **Short sentences.** Long ones lose them. Break into multiple lines when in doubt.
- **Define vocabulary on first use.** Especially the *protectedTerms* list of each mission.
- **One idea per slide.** If a slide has two big ideas, it's actually two slides.

### Feedback patterns

**When students get it right:**
- ✓ TARGET ACQUIRED
- ✓ LOCKED IN
- ✓ CLEAN HIT
- Then: a *pro tip* or *next-level move* — never just "good job." Reward correctness with **more knowledge**, not empty praise.

**When students get it wrong:**
- ✕ MISFIRE — RECALIBRATE
- ✕ CLOSE — BUT NOT QUITE
- ✕ THAT'S A DIFFERENT MOVE
- Then: explain *why* their answer was tempting (validating their thinking) and *what the actual move is*. Never make them feel stupid.

### Words we use

| Instead of… | Say… |
|---|---|
| Opinion | Claim |
| Evidence / proof | Warrant |
| Consequence / result | Impact |
| Question | Tactical drill / quick check |
| Lesson | Mission |
| Wrong | Misfire / recalibrate |
| Score | Credits / rank XP |
| Test | Field assessment |
| Practice | Training run / drill |
| Topic | Sector |

### Inline markup conventions

Writers use these inline tokens (the platform parses them):

- `**bold**` — emphasis
- `*italic*` — quoted speech, examples, "soft" emphasis
- `` `term` `` — protected vocabulary (renders as code/data style)
- `{{cyan: ...}}` — cyan glow highlight (claims, impacts, "good moves")
- `{{amber: ...}}` — amber glow highlight (warrants, "why," contrast)
- `{{magenta: ...}}` — **boss/capstone moments only.** Don't use in normal lessons.

### Voice examples (steal these)

**Headline (cyan accent moment):**
> *"Every argument that {{cyan: wins}} has three parts. Every argument that {{amber: loses}} is missing one of them."*

**Pro tip after a correct answer:**
> *"**Pro move:** When you're prepping a speech, write out C-W-I in three separate lines *before* you write any sentences. It forces you to actually have all three."*

**Gentle correction:**
> *"\"Opinion, evidence, conclusion\" is what an English teacher might say. In debate, we use {{cyan: claim, warrant, impact}} — same idea, sharper words."*

---

## 🧭 The Quick Vibe Check

Before shipping any asset or copy, ask:

1. **Would a 6th grader look at this and lean in?** Or skim past?
2. **Would a 13-year-old call this cringe?** If yes, soften the kid-speak.
3. **Does it teach, or just decorate?** Every visual should reinforce the concept; every line should move the student forward.
4. **Is the tone encouraging?** Even corrections should feel like a coach in your corner, not a teacher with a red pen.
5. **Does it look like it belongs on the bridge of a friendly spaceship?** If you squinted and saw a corporate slide deck, start over.

---

*Last updated: 2026-06-25. Keep this in sync with `src/app/globals.css` color tokens and the brand PDF.*
