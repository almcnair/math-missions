# Avatar Generation Prompt Pack

The Math Missions pilot roster is **Path A** — distinct characters, unified blue/silver uniform, single canonical photoreal CG style.

`pilot-marcus.jpeg` (already in `public/avatars/pilots/`) is the **canonical style reference**. Every other pilot should match its style, uniform, framing, lighting, and background treatment exactly — only the character changes.

---

## The shared style anchor (paste this at the top of every generation)

> **Hyper-realistic cinematic portrait, photoreal AI-generated**, in the visual language of contemporary prestige sci-fi (Star Trek: Discovery, The Expanse, For All Mankind). Real human skin texture with visible pores, fine micro-detail, and natural subsurface scattering. Realistic hair strands, realistic fabric weave on cloth panels, true brushed-metal specular reflections on the armored chest and shoulder plates. Absolutely not stylized, illustrated, painterly, cel-shaded, or CG/animated. Reads as a high-end set still, not concept art.
>
> **Framing:** cinematic wide aspect (16:9), medium chest-up shot. Subject occupies the right two-thirds of the frame; the bridge viewport with deep space behind them fills the left third. Eye-level camera, very slight low angle for a subtly heroic feel. Lens equivalent ~35–50mm full-frame, shallow depth of field (~f/2.8), creamy bokeh on background consoles and the starfield, subject tack-sharp from eyelashes to chest badge. Mild cinematic lens vignette, no distortion.
>
> **Uniform** — read this section carefully; generators tend to costumey-fy sci-fi suits and we have to fight it.
>
> The uniform is a **screen-grade naval flight suit**, in the construction language of *The Expanse*, *For All Mankind*, and *Andor*. It is **lived-in workwear**, not cosplay. Specifically:
>
> - **Base fabric:** **muted, slightly desaturated navy blue** — a real military navy, not cartoon Crayola blue. **Matte ripstop or technical aramid weave** with **visible fabric texture and grain at close range**, like a real flight suit. Subtle wrinkles and fold lines at the elbows, shoulder pivot, and where the collar meets the chest plate. Fabric should look **woven**, never **printed, painted, vinyl, latex, plastic, foam, or rubbery**.
> - **Construction:** Real **stitched panel seams** between the fabric sections — actual physical seams with visible thread, not drawn-on lines. Paneling reads structurally (shoulder yoke, chest panel, side panel, sleeve panel) the way real flight gear is assembled. No symmetrical sticker-graphic shapes pretending to be panels.
> - **Armor plates:** Hard **brushed-aluminum / anodized-steel chest plate and raised shoulder caps**, finished like real machined composite. Surface shows **anisotropic brushed-metal grain**, faint scuffing, micro-scratches, fingerprint smudges near the badge — the wear of a working officer. **Differential specular highlights**: the metal catches the key light sharply, the fabric diffuses softly, the collar trim glints thinly. Plates fit the body — contoured to the chest, slight gap under the shoulder cap revealing fabric beneath — not glued-on slabs.
> - **Collar:** **Low standing mandarin collar** in the same navy fabric with **thin satin-silver piping** (not chunky decorative band), continuous with the shoulder seam, never floating or rubber-glued on.
> - **Insignia:** **Three diagonal hash-mark rank stripes** on each shoulder cap, **etched or embossed into the metal** (not printed flat, not stickered on). **Small gold circular compass/targeting badge** centered on the upper sternum, **machined into the chest plate** with a slight raised bezel — reads as cast metal, not a paper sticker.
> - **Fit:** Sits on the body like real clothing. Visible fabric tension across the chest, slight bunching where the sleeve meets the shoulder cap, natural fold at the elbow. **Not stiff, not symmetrical, not doll-like.** No helmet, no gloves visible, no exposed zippers, no Velcro patches, no toy-like buttons.
> - **Overall vibe:** A working bridge officer's daily uniform after three months at sea. **Functional, restrained, slightly worn, expensive-looking.** Think *The Expanse* MCRN flight crew, not Spirit Halloween.
>
> **Background:** spaceship bridge interior. Large angled viewport window dominating the left side, showing the Milky Way galactic core in deep space — magenta, teal, and gold nebula dust against a starfield — with a ringed Saturn-like planet visible at mid-right of the viewport. Foreground and side consoles: dark gunmetal-grey paneled workstations with glowing cyan and small orange holographic readouts, a planetary map display lower-left. Console detail rendered in soft bokeh, not crisp.
>
> **Lighting:** cinematic three-point. **Key:** soft frontal-right at ~45°, neutral-to-warm (~4800K), modeling the face with gentle falloff. **Fill:** cool blue ambient bounce from the cockpit consoles and viewport (~7000K), wrapping the left side of the face and shoulder. **Rim:** subtle cyan edge light along the jawline, shoulder cap, and chest plate from console glow. Soft, diffused, high dynamic range, no harsh shadows. Optional very faint lens flare from a console highlight.
>
> **Color grade:** filmic teal-and-orange cinematic LUT. Cool-dominant navy/silver/black environment with warm skin tones preserved as the focal contrast. Lifted shadows, clean whites, rich blacks. Subtle film grain.
>
> **Pose & expression:** three-quarter turn toward camera, torso angled slightly. Warm, confident, open-mouth smile showing teeth. Direct eye contact with the lens. One hand raised in a relaxed gesture (pointing, presenting, half-wave), the other resting at chest or waist level. Welcoming bridge-officer energy — approachable, not stiff, not staged.
>
> **Negative prompt cues** (if your generator supports them): `cartoon, anime, cel shading, illustration, painting, Pixar, 3D render, CGI, plastic skin, doll-like, airbrushed, sticker, vector art, flat lighting, harsh studio lighting, white background, low resolution, halloween costume, cosplay, craft foam, painted foam armor, vinyl uniform, latex suit, rubber suit, plastic armor, shiny plastic, oversaturated blue, cartoon blue, Crayola blue, neon blue, printed seam lines, drawn-on panels, sticker badge, floating insignia, decal patch, stiff doll fit, symmetrical wrinkle-free fabric, perfectly clean uniform, toy buttons, chunky piping, decorative trim, costume jewelry, anime mech suit, video game armor, Power Rangers, Star Wars stormtrooper, Buzz Lightyear, kids' Halloween costume`.

---

## The pilots to generate

Three are already installed (Marcus, Kamika, McNair). Five remain. For each, paste the style anchor above + the character paragraph below. **Do not change uniform, background, lighting, or framing language** — only the character description.

### 1. Marcus ✅ (`pilot-marcus.jpeg`)
Canonical style reference. Don't regenerate.

### 2. Commander Kamika ✅ (`pilot-kamika.jpeg`)
Installed in her purple/bronze senior-officer uniform. The palette difference is intentional — she reads as the senior officer of the roster. Don't regenerate.

### 3. Cadet Vega ✅ (`pilot-vega.jpeg`)
Installed in navy with cyan/magenta piping. Don't regenerate. (Note: the source image had a "Cadet 2nd Class / A. McNair" name patch baked in by the generator — too small to read at tile size; not a blocker.)

### 4. Diego
> Subject is a young Latino man in his early twenties with warm medium-brown skin, short curly dark hair, and a neat goatee. Bright open smile, three-quarter turn toward camera, both hands relaxed at his sides. Approachable, easygoing bridge officer energy.

### 5. Amara
> Subject is a young woman in her early twenties with warm medium-brown skin and a soft satin headwrap in a deep navy that matches the uniform, edges visible at her forehead, no hair showing in front. Calm, confident half-smile, direct eye contact, three-quarter turn toward camera, one hand resting on the chest badge. Thoughtful, composed bridge officer energy.

### 6. Theo
> Subject is a young white man in his early twenties with fair skin, slightly messy chin-length sandy-blond hair tucked behind one ear, and pale green eyes. Wry warm smile, direct eye contact, three-quarter turn toward camera, one hand raised in a relaxed half-wave. Friendly, slightly mischievous bridge officer energy.

### 7. Iris
> Subject is a young white woman in her early twenties with fair skin lightly dusted with freckles across the nose, a short auburn pixie cut, and bright hazel eyes. Bright open smile, direct eye contact, three-quarter turn toward camera, both hands resting on the console rim in front of her. Eager, curious bridge officer energy.

### 8. Rio
> Subject is a young East Asian person of androgynous presentation in their early twenties, with warm light-brown skin, a sharp jet-black undercut with longer hair on top swept to one side, and dark expressive eyes. Calm, knowing half-smile, direct eye contact, three-quarter turn toward camera, arms folded loosely. Cool, quietly confident bridge officer energy.

### 9. Nine (Robot Wildcard)
> Subject is a sleek humanoid bridge robot, chest-up, head and shoulders only. Smooth brushed-silver chassis matching the uniform's chrome panels, a softly glowing cyan visor strip across the eyes (no separate eyes — just the visor), articulated neck collar in royal blue matching the uniform's blue panels, the same gold compass/targeting chest badge. Subtle ambient micro-LEDs along the jawline. Friendly, neutral head tilt, the visor catching a warm reflection like a smile. Reads as a beloved crew member, not a threat.

---

## After generation: normalize and install

For each generated image:

1. Save the raw output anywhere convenient.
2. Run a square crop centered on the face/upper chest, downscale to **512×512**, save as JPEG (~50–80 KB). Quick one-liner:
   ```bash
   sips -s format jpeg -Z 512 -c 512 512 ~/Downloads/<raw>.jpg \
     --out ~/Desktop/policydebate101-app/public/avatars/pilots/pilot-<name>.jpeg
   ```
3. Filename must exactly match the `file:` field in `src/lib/avatars.ts`. The roster is:
   - `pilot-marcus.jpeg` ✅
   - `pilot-kamika.jpeg` ✅
   - `pilot-vega.jpeg` ✅
   - `pilot-diego.jpeg`
   - `pilot-amara.jpeg`
   - `pilot-theo.jpeg`
   - `pilot-iris.jpeg`
   - `pilot-rio.jpeg`
   - `pilot-nine.jpeg`
   - `mystery.jpeg` (or rely on the built-in SVG fallback — no file needed)

The `<Avatar>` component falls back to the Mystery Pilot SVG silhouette if any file is missing on disk, so it's safe to deploy with a partial set and fill in the rest as you generate them.

---

## Future Quartermaster cosmetics (v0.2 backlog)

- **Officer's Dress Uniform** — the purple/bronze variant from the original Commander Kamika generation. Earned cosmetic, not the default look.
- Alt background (lunar surface, jump-gate, debate hall) per pilot.
- Animated specular sweep on hover (rank ≥ Officer perk).
