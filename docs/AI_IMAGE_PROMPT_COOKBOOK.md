# Policy Debate 101 — AI Image Prompt Cookbook

> Drop-in prompts for generating slide images that look like they belong on **policydebate101.com**. Each recipe is structured for **ChatGPT/DALL-E, Midjourney, or Stable Diffusion** — paste the whole block, swap the `[BRACKETED]` parts for your specific concept, and go.
>
> Pair this with `AI_STYLE_GUIDE.md`. The style guide is the *why*; this is the *what to type*.

---

## 🌍 Representation Mandate (read this first)

**This is non-negotiable.** Across all art generated for this platform:

- **~98% of characters are people of color** — Black, Latino/a, Asian, Indigenous, Middle Eastern, mixed-race, etc. Vary specifically, don't homogenize.
- **~75% of characters are girls.** When a single character is the focal point, default to a girl unless the scenario specifically requires otherwise.
- **Vary everything else too:** skin tones (light brown to deep brown to dark), hair textures (curly, coily, braided, locs, straight, wavy, hijabs, headwraps, buzzcuts), body types (slim, average, plus-size, athletic), glasses, visible disabilities (wheelchairs, hearing aids, prosthetics, mobility aids), neurodivergence cues where appropriate.
- **Never tokenize.** Diverse characters are the *default*, not the special case. A white boy can appear, but he is the exception, not the rule.
- **Audit yourself.** If you generate four images in a row and they're all light-skinned or all boys, scrap them and regenerate. The mandate is not "on average across the whole platform" — it's *in every batch*.

**Why:** Austin teaches a diverse middle school student body. Students learn better when they see themselves in the material. Debate has historically been overwhelmingly white and male; this platform is part of changing that — starting at the visual layer.

**Prompt patterns that work:**

```
...a Black girl middle schooler with box braids and glasses,
confident expression, leaning into a podium microphone...
```

```
...three middle schoolers working at a console: a Latina girl with
curly hair, a South Asian girl wearing a hijab, and an Indigenous
boy with long hair tied back...
```

```
...a plus-size East Asian girl with short hair and a hearing aid,
mid-speech, expression focused...
```

**Prompt patterns to avoid:**

- ❌ "a middle school student" (defaults to white boy in most models)
- ❌ "a diverse group of students" (too vague — models lean tokenizing)
- ❌ Generating without specifying — *always* name the character's race, gender, and a distinguishing detail

---

## 🧱 The House Style Suffix

**Append this to every prompt** for consistency. (Without it, you'll get drift between assets.)

```
Style: holographic sci-fi training console UI, deep navy/black space
background (#05071a) with subtle distant starfield, glowing cyan
(#00d4ff) and amber (#ffa726) accents, clean geometric vector
illustration, slight transparency and scan-line texture, friendly
approachable academy tone (not military, not gritty), no weapons,
ages 11-14 audience. 3:2 aspect ratio, 1536x1024.

Character representation (mandatory): when humans appear, ~98% are
people of color (Black, Latino/a, Asian, Indigenous, Middle Eastern,
mixed-race) and ~75% are girls. Vary skin tones, hair textures, body
types, hijabs/headwraps, glasses, and visible disabilities across
assets. Never default to white or male as the "main" character.
```

**Quick variations:**
- Wider hero shot? Change to `16:9, 1792x1008`.
- Square sidebar icon? `1:1, 1024x1024` and drop "wide composition" cues.
- Need motion? Append `Render as a looping GIF, 2-3 seconds, smooth seamless loop.`

---

## 📖 The Recipes

Each recipe gives you:
- **When to use it** (which slide type it's for)
- **Prompt template** (copy, fill in brackets, paste)
- **Alt text template** (for accessibility — fill the same brackets)
- **Aspect ratio recommendation**

---

### 🎬 Recipe 1 — Hook Slide (set the stakes)

**Use for:** `hook` slides. Opening of a mission. Should make a student lean forward.

**Prompt:**
```
A dramatic comic-book-style opening scene illustrating: [SITUATION,
e.g. "a middle school principal at a podium announcing the
cancellation of recess to a stunned crowd of students"]. Cinematic
angle, slight motion lines, emotionally clear faces, diverse middle
school students ages 11-14. The scene is rendered as if projected on
a holographic training console — soft cyan glow around the edges of
the projection, amber highlight on the most important element. Subtle
starfield bleeds in at the corners.

[append House Style Suffix]
```

**Alt text template:**
> "Comic-style scene of [SITUATION], projected on a holographic training console."

**Aspect ratio:** 3:2 (1536×1024)

---

### 📐 Recipe 2 — Define Slide (vocabulary card)

**Use for:** `define` slides. One word, one big visual. The image should *be* the metaphor.

**Prompt:**
```
A clean geometric vector illustration of [METAPHOR FOR THE TERM, e.g.
"a glowing speech bubble with a single bold word inside, hovering
above a hand holding a microphone"]. The metaphor visually explains
the concept of "[TERM]" — [ONE-LINE DEFINITION]. Centered composition,
plenty of negative space, the metaphor object glowing cyan, secondary
details in amber. No text labels in the image itself.

[append House Style Suffix]
```

**Alt text template:**
> "Geometric illustration of [METAPHOR], representing the concept of [TERM]."

**Aspect ratio:** 3:2 (1536×1024) or 1:1 (1024×1024) if used as a sidebar

---

### 🃏 Recipe 3 — Concept Slide (multi-part diagram)

**Use for:** `concept` slides where the lesson has 2–4 named pieces (e.g., the three parts of an argument, the four stock issues).

**Prompt:**
```
A horizontal diagram showing [N] connected components representing
"[CONCEPT, e.g. the three layers of an argument]". From left to right:
1) [COMPONENT 1] - represented as [VISUAL METAPHOR 1], glowing cyan
2) [COMPONENT 2] - represented as [VISUAL METAPHOR 2], glowing amber
3) [COMPONENT 3] - represented as [VISUAL METAPHOR 3], glowing cyan
Each component is a clean geometric shape with a glowing halo. Thin
connecting lines or arrows between them. Floating data-bracket UI
corners suggest a holographic console readout. No text labels in
the image itself (labels will be added by the slide).

[append House Style Suffix]
```

**Alt text template:**
> "Diagram of [N] connected components representing [CONCEPT]: [list each component]."

**Aspect ratio:** 16:9 (1792×1008) — diagrams read best wide

---

### ⚔️ Recipe 4 — Strategy Slide (comparison / what breaks)

**Use for:** `strategy` slides that compare options OR diagnose failure modes ("what happens when X is missing").

**Prompt:**
```
A horizontal split-panel illustration showing [N] versions of the
same scenario, each broken in a different way. Panel 1: [BROKEN
STATE 1, e.g. "a sandwich with only a top bun, floating crumbs
falling"]. Panel 2: [BROKEN STATE 2]. Panel 3: [BROKEN STATE 3].
Each panel uses the same color treatment (cyan + amber glow on
deep navy). Slightly comedic — the broken states should look
absurd, not menacing. Each panel is framed by thin holographic UI
brackets like a data readout.

[append House Style Suffix]
```

**Alt text template:**
> "Three-panel illustration showing [SCENARIO] broken in different ways: [panel 1], [panel 2], [panel 3]."

**Aspect ratio:** 16:9 (1792×1008)

---

### 🎯 Recipe 5 — CFU Scenario (illustrate the question)

**Use for:** `cfu-mcq`, `cfu-multi` — when a quick-check question describes a scenario the student needs to *see* to evaluate.

**Prompt:**
```
A single clear illustration of: [SCENARIO, e.g. "a confident middle
school debater at a podium making an argument, with a thought bubble
showing only the words of their argument floating above them"].
The character is [SPECIFY: race + gender + one detail — e.g. "a Black
girl with box braids and a denim jacket" or "a Latina girl with curly
hair and glasses"], ages 11-14, drawn in clean geometric vector style
with friendly proportions. Default to a girl of color — see the
Representation Mandate. The scene hints at what's missing or wrong —
visually framed so a student can spot the issue. Cyan glow on the
speaker, amber accent on the most important visual cue. Holographic
console framing.

[append House Style Suffix]
```

**Alt text template:**
> "Illustration of [SCENARIO], showing [WHAT TO NOTICE]."

**Aspect ratio:** 3:2 (1536×1024)

---

### 🏆 Recipe 6 — Complete Slide (mission victory)

**Use for:** `complete` slides — the celebration screen at the end of a mission. Should feel like a *reward*.

**Prompt:**
```
A triumphant hero-shot illustration of [VICTORY METAPHOR, e.g. "a
fully assembled glowing sandwich floating in a cosmic display case,
beams of light radiating outward, small floating credit icons and
star particles drifting around it"]. Centered, symmetrical, slightly
dramatic. Cyan core glow with amber highlights. Distant starfield
behind. No characters — this is a pure trophy/badge moment.
Slight lens flare, particle effects.

[append House Style Suffix]
```

**Alt text template:**
> "Trophy-style illustration of [VICTORY METAPHOR] celebrating mission completion."

**Aspect ratio:** 1:1 (1024×1024) — celebration art reads best square

---

### 🎞️ Recipe 7 — Animated Concept (GIF)

**Use for:** Big-idea moments where motion teaches something a still image can't (impact escalation, chain reactions, building-up sequences).

**Prompt:**
```
A looping animated diagram, 2-3 seconds, smooth seamless loop.
Sequence: [DESCRIBE THE MOTION, e.g. "a chain of dominoes falling
one by one from left to right, each labeled with an escalating
consequence, each domino glowing brighter than the last,
transitioning from cyan to magenta as the chain progresses; the
final domino is huge and pulses; then the sequence resets
invisibly to the start"]. Holographic console style throughout.

[append House Style Suffix]
Format: looping GIF, max 2MB if possible.
```

**Alt text template:**
> "Animated diagram showing [WHAT THE MOTION TEACHES]."

**Aspect ratio:** 3:2 or 16:9. **Keep under 2MB** for Chromebook performance.

---

### 🖼️ Recipe 8 — Sidebar Icon (small accent art)

**Use for:** Sidebar `{ kind: "image", src, alt }` slots — small contextual visuals next to body copy.

**Prompt:**
```
A small icon-style illustration of [SUBJECT, e.g. "a glowing key
floating in space, soft cyan halo"]. Centered, minimal, no
background details — just the icon on deep navy with subtle
starfield. Clean geometric vector, single glowing accent.

[append House Style Suffix, but specify "1:1 aspect ratio, 1024x1024"]
```

**Alt text template:**
> "Icon of [SUBJECT]."

**Aspect ratio:** 1:1 (1024×1024)

---

### 👥 Recipe 9 — Character Moment (debater-in-action)

**Use for:** Anywhere you want a human face — feedback screens, cross-ex examples, "imagine you're at the podium" moments.

**Prompt:**
```
A character illustration of a middle school debater: [SPECIFY: race
+ gender + 2-3 details — e.g. "a Black girl, ages 11-14, with locs
pulled back, wearing a hoodie under a blazer, confident expression,
leaning slightly forward into a microphone, mid-sentence"]. Default
to a girl of color unless the scenario requires otherwise — see the
Representation Mandate at the top of this doc. Clean geometric
vector style with friendly proportions (slightly stylized, not
realistic). Soft cyan rim light from one side, amber fill light
from the other. Holographic UI elements floating near them — small
data brackets, a credit counter, a mission tag. Distant starfield
background.

[append House Style Suffix]
```

**Alt text template:**
> "Illustration of a middle school debater [DESCRIPTION]."

**Aspect ratio:** 3:2 (1536×1024) or 2:3 (1024×1536) for portrait

---

### 🪐 Recipe 10 — Establishing Shot (rare, for mission intros / sector banners)

**Use for:** Big "you are here" moments — the CDSI space station exterior, a sector banner, a campaign hero image.

**Prompt:**
```
A wide cinematic establishing shot of [LOCATION, e.g. "the CDSI
training space station — a friendly academy-style orbital platform
with glowing windows, docking arms, and visible classroom modules,
hovering above a soft cyan-and-amber nebula"]. Clean geometric
vector style, not photorealistic. The station feels welcoming and
academic, not military. Subtle scale cues (tiny shuttles in flight,
glowing pathways between modules). Deep space background with rich
starfield. Cyan running lights along the station, amber glow from
windows.

[append House Style Suffix, but use 21:9 ultrawide, 2560x1080]
```

**Alt text template:**
> "Wide establishing shot of [LOCATION]."

**Aspect ratio:** 21:9 (2560×1080) for hero banners, or 16:9 (1792×1008)

---

## 🧪 Quick Workflow

1. **Pick a recipe** based on slide type.
2. **Fill the brackets** with your specific concept.
3. **Append the House Style Suffix** (always).
4. **Generate 2–4 variations**, pick the strongest.
5. **Optimize:** PNG for sharp diagrams, JPEG/WebP for photo-like, GIF for motion. Compress to <2MB.
6. **Save to:** `~/Desktop/policydebate101-app/public/mission-images/[mission-id]/[descriptive-name].[ext]`
7. **In the JSON:**
   ```json
   "image": {
     "src": "/mission-images/[mission-id]/[descriptive-name].png",
     "alt": "[from the recipe]",
     "caption": "[optional — use sparingly]",
     "aspectRatio": 1.5
   }
   ```
   - `aspectRatio` = width ÷ height. 3:2 → `1.5`. 16:9 → `1.778`. 1:1 → `1`. 21:9 → `2.333`.

---

## 🛟 Troubleshooting

**"My images look inconsistent across the platform."**
→ You forgot the House Style Suffix on some prompts. Always append it.

**"The AI keeps making it look photorealistic / corporate."**
→ Add `vector illustration, NOT photorealistic, NOT 3D render, NOT stock photo` to the negative prompt or main prompt.

**"Characters look like adults."**
→ Be explicit: `middle school students, ages 11-14, NOT adults, NOT college students, NOT teenagers older than 14`.

**"All my characters came out white / all boys."**
→ The model defaulted because you didn't specify. *Always* name the character's race and gender in the prompt — don't rely on "diverse." See the Representation Mandate. Regenerate with explicit traits.

**"I keep getting the same Black girl with braids in every image."**
→ Vary the details: hair texture, skin tone within the same race category, clothing, accessories, body type. Rotate across Black, Latina, Asian, Indigenous, Middle Eastern, mixed-race. The mandate is *representation breadth*, not one repeated archetype.

**"Too much magenta."**
→ Magenta is **boss-only**. Remove it from the prompt unless this is a capstone or final-mission moment.

**"Image too busy / cluttered HUD."**
→ Add `minimal UI, clean composition, plenty of negative space, no clutter`.

**"GIF is too big."**
→ Reduce dimensions (960×640 is plenty), reduce frame count, target <2MB. Use ezgif.com or `gifsicle` to compress.

---

## 🎨 Example: Full prompt, ready to paste

For the Argument Sandwich hero image:

```
A cross-section of a hero sandwich on a clean dark background. Three
layers clearly defined and labeled with floating glowing data tags:
top bun glowing cyan tagged "CLAIM", thick middle filling glowing
amber tagged "WARRANT", bottom bun glowing cyan tagged "IMPACT". The
sandwich is rendered in clean geometric vector style, not
photorealistic. Floating particle accents and thin data-bracket UI
corners suggest it's being analyzed by a holographic training
console. Slight transparency where layers meet.

Style: holographic sci-fi training console UI, deep navy/black space
background (#05071a) with subtle distant starfield, glowing cyan
(#00d4ff) and amber (#ffa726) accents, clean geometric vector
illustration, slight transparency and scan-line texture, friendly
approachable academy tone (not military, not gritty), no weapons,
ages 11-14 audience. 3:2 aspect ratio, 1536x1024.
```

Alt text:
> "Cross-section of a sandwich with three glowing layers labeled Claim, Warrant, and Impact."

---

*Last updated: 2026-06-25. Sync with `AI_STYLE_GUIDE.md` if either changes.*
