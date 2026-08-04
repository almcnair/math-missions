"use client";

// Per-slide-type editor. Switches on slide.type and renders the right form.
// Each editor calls onChange with the full updated slide object.

import type {
  Slide,
  HookSlide,
  DefineSlide,
  ConceptSlide,
  ConceptCard,
  StrategySlide,
  StrategyRow,
  McqSlide,
  McqOption,
  MultiSlide,
  SortSlide,
  SortBin,
  SortCard,
  OrderSlide,
  OrderItem,
  MatchSlide,
  MatchItem,
  FillSlide,
  FillBlank,
  LabelSlide,
  HighlightSlide,
  CompleteSlide,
  CfuHint,
} from "@/lib/mission-schema";
import type { MissionImage } from "@/lib/mission-schema";
import { MarkupTextarea, MarkupInput } from "./MarkupTextarea";
import { ImagePicker } from "./ImagePicker";

// Generic helpers ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-row">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="form-input"
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <input
      className="form-input"
      type="number"
      value={value ?? 0}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function SmallButton({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger" | "primary";
}) {
  return (
    <button type="button" className={`small-btn small-btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
}

// Main editor switcher ────────────────────────────────────────────────────────

export function SlideEditor({
  slide,
  missionId,
  onChange,
}: {
  slide: Slide;
  missionId: string;
  onChange: (next: Slide) => void;
}) {
  // Common fields (id, tag) shown at top.
  return (
    <div className="slide-editor">
      <div className="slide-editor-common">
        <Field label="Slide tag (optional, top of slide e.g. ‘CONTENTION 1’)">
          <TextInput
            value={slide.tag}
            onChange={(v) => onChange({ ...slide, tag: v || undefined } as Slide)}
          />
        </Field>
      </div>

      {renderTypeSpecific(slide, missionId, onChange)}
    </div>
  );
}

function renderTypeSpecific(slide: Slide, missionId: string, onChange: (s: Slide) => void) {
  switch (slide.type) {
    case "hook":      return <HookEditor slide={slide} missionId={missionId} onChange={onChange} />;
    case "define":    return <DefineEditor slide={slide} missionId={missionId} onChange={onChange} />;
    case "concept":   return <ConceptEditor slide={slide} missionId={missionId} onChange={onChange} />;
    case "strategy":  return <StrategyEditor slide={slide} missionId={missionId} onChange={onChange} />;
    case "cfu-mcq":   return <McqEditor slide={slide} missionId={missionId} onChange={onChange} />;
    case "cfu-multi": return <MultiEditor slide={slide} missionId={missionId} onChange={onChange} />;
    case "cfu-sort":  return <SortEditor slide={slide} missionId={missionId} onChange={onChange} />;
    case "cfu-order": return <OrderEditor slide={slide} missionId={missionId} onChange={onChange} />;
    case "cfu-match": return <MatchEditor slide={slide} missionId={missionId} onChange={onChange} />;
    case "cfu-fill":  return <FillEditor slide={slide} missionId={missionId} onChange={onChange} />;
    case "cfu-label": return <LabelEditor slide={slide} missionId={missionId} onChange={onChange} />;
    case "cfu-highlight": return <HighlightEditor slide={slide} missionId={missionId} onChange={onChange} />;
    case "complete":  return <CompleteEditor slide={slide} missionId={missionId} onChange={onChange} />;
    default:
      return <p>Unsupported slide type.</p>;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

function HookEditor({ slide, missionId, onChange }: { slide: HookSlide; missionId: string; onChange: (s: HookSlide) => void }) {
  return (
    <>
      <MarkupInput
        label="Headline"
        value={slide.headline}
        onChange={(v) => onChange({ ...slide, headline: v })}
        placeholder="Why does this matter?"
      />
      <ImagePicker
        value={slide.image}
        missionId={missionId}
        onChange={(img) => onChange({ ...slide, image: img })}
        hint="Shown above the body text."
      />
      <Field label="Body paragraphs (one per box)">
        <div className="repeater">
          {slide.body.map((p, i) => (
            <div key={i} className="repeater-row">
              <MarkupTextarea
                value={p}
                rows={3}
                onChange={(v) => {
                  const next = [...slide.body];
                  next[i] = v;
                  onChange({ ...slide, body: next });
                }}
              />
              <SmallButton
                variant="danger"
                onClick={() => onChange({ ...slide, body: slide.body.filter((_, idx) => idx !== i) })}
              >
                Remove
              </SmallButton>
            </div>
          ))}
          <SmallButton onClick={() => onChange({ ...slide, body: [...slide.body, ""] })}>
            + Add paragraph
          </SmallButton>
        </div>
      </Field>
      <Field label="Pull quote (optional)">
        <TextInput
          value={slide.quote?.text}
          onChange={(v) => onChange({ ...slide, quote: { text: v, cite: slide.quote?.cite ?? "" } })}
          placeholder="Quote text"
        />
        <TextInput
          value={slide.quote?.cite}
          onChange={(v) => onChange({ ...slide, quote: { text: slide.quote?.text ?? "", cite: v } })}
          placeholder="Citation / attribution"
        />
        {(slide.quote?.text || slide.quote?.cite) && (
          <SmallButton variant="danger" onClick={() => onChange({ ...slide, quote: undefined })}>
            Clear quote
          </SmallButton>
        )}
      </Field>
    </>
  );
}

// ── Define ───────────────────────────────────────────────────────────────────

function DefineEditor({ slide, missionId, onChange }: { slide: DefineSlide; missionId: string; onChange: (s: DefineSlide) => void }) {
  return (
    <>
      <Field label="Term">
        <TextInput value={slide.term} onChange={(v) => onChange({ ...slide, term: v })} />
      </Field>
      <ImagePicker
        value={slide.image}
        missionId={missionId}
        onChange={(img) => onChange({ ...slide, image: img })}
      />
      <Field label="Pronunciation (optional)">
        <TextInput value={slide.pronunciation} onChange={(v) => onChange({ ...slide, pronunciation: v })} />
      </Field>
      <MarkupInput
        label="Definition (formal)"
        value={slide.definition}
        onChange={(v) => onChange({ ...slide, definition: v })}
      />
      <MarkupInput
        label="In plain words (optional)"
        value={slide.plainWords ?? ""}
        onChange={(v) => onChange({ ...slide, plainWords: v })}
      />
      <MarkupInput
        label="Analogy (optional)"
        value={slide.analogy ?? ""}
        onChange={(v) => onChange({ ...slide, analogy: v })}
      />
    </>
  );
}

// ── Concept ──────────────────────────────────────────────────────────────────

function ConceptEditor({ slide, missionId, onChange }: { slide: ConceptSlide; missionId: string; onChange: (s: ConceptSlide) => void }) {
  function updateCard(idx: number, patch: Partial<ConceptCard>) {
    const next = [...slide.cards];
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...slide, cards: next });
  }
  return (
    <>
      <MarkupInput
        label="Headline"
        value={slide.headline}
        onChange={(v) => onChange({ ...slide, headline: v })}
      />
      <MarkupInput
        label="Intro (optional)"
        value={slide.intro ?? ""}
        onChange={(v) => onChange({ ...slide, intro: v })}
      />
      <ImagePicker
        value={slide.image}
        missionId={missionId}
        onChange={(img) => onChange({ ...slide, image: img })}
        hint="Shown between the intro and the cards."
      />
      <Field label="Cards">
        <div className="repeater">
          {slide.cards.map((c, i) => (
            <div key={c.id} className="card-edit">
              <div className="card-edit-head">
                <strong>Card {i + 1}</strong>
                <SmallButton variant="danger" onClick={() => onChange({ ...slide, cards: slide.cards.filter((x) => x.id !== c.id) })}>
                  Remove
                </SmallButton>
              </div>
              <div className="grid-2">
                <Field label="Icon">
                  <TextInput value={c.icon} onChange={(v) => updateCard(i, { icon: v })} />
                </Field>
                <Field label="Accent">
                  <select className="form-input" value={c.accent ?? "cyan"} onChange={(e) => updateCard(i, { accent: e.target.value as ConceptCard["accent"] })}>
                    <option value="cyan">Cyan</option>
                    <option value="amber">Amber</option>
                    <option value="magenta">Magenta (boss only)</option>
                  </select>
                </Field>
              </div>
              <MarkupInput label="Name" value={c.name} onChange={(v) => updateCard(i, { name: v })} />
              <MarkupTextarea label="Description" value={c.description} rows={2} onChange={(v) => updateCard(i, { description: v })} />
              <MarkupInput
                label="Example label (optional)"
                value={c.example?.label ?? ""}
                onChange={(v) => updateCard(i, { example: { label: v, text: c.example?.text ?? "" } })}
              />
              <MarkupInput
                label="Example text (optional)"
                value={c.example?.text ?? ""}
                onChange={(v) => updateCard(i, { example: { label: c.example?.label ?? "", text: v } })}
              />
            </div>
          ))}
          <SmallButton
            onClick={() =>
              onChange({
                ...slide,
                cards: [
                  ...slide.cards,
                  { id: `card-${Date.now()}`, icon: "✦", name: "New card", description: "", accent: "cyan" },
                ],
              })
            }
          >
            + Add card
          </SmallButton>
        </div>
      </Field>
    </>
  );
}

// ── Strategy ─────────────────────────────────────────────────────────────────

function StrategyEditor({ slide, missionId, onChange }: { slide: StrategySlide; missionId: string; onChange: (s: StrategySlide) => void }) {
  function updateRow(idx: number, patch: Partial<StrategyRow>) {
    const next = [...slide.rows];
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...slide, rows: next });
  }
  return (
    <>
      <MarkupInput label="Headline" value={slide.headline} onChange={(v) => onChange({ ...slide, headline: v })} />
      <MarkupInput label="Intro (optional)" value={slide.intro ?? ""} onChange={(v) => onChange({ ...slide, intro: v })} />
      <ImagePicker
        value={slide.image}
        missionId={missionId}
        onChange={(img) => onChange({ ...slide, image: img })}
      />
      <Field label="Rows">
        <div className="repeater">
          {slide.rows.map((r, i) => (
            <div key={i} className="card-edit">
              <div className="card-edit-head">
                <strong>Row {i + 1}</strong>
                <SmallButton variant="danger" onClick={() => onChange({ ...slide, rows: slide.rows.filter((_, idx) => idx !== i) })}>
                  Remove
                </SmallButton>
              </div>
              <MarkupInput label="Name" value={r.name} onChange={(v) => updateRow(i, { name: v })} />
              <MarkupTextarea label="Description" value={r.description} rows={2} onChange={(v) => updateRow(i, { description: v })} />
              <MarkupInput
                label="Counter label (optional)"
                value={r.counter?.label ?? ""}
                onChange={(v) => updateRow(i, { counter: { label: v, text: r.counter?.text ?? "" } })}
              />
              <MarkupInput
                label="Counter text (optional)"
                value={r.counter?.text ?? ""}
                onChange={(v) => updateRow(i, { counter: { label: r.counter?.label ?? "", text: v } })}
              />
            </div>
          ))}
          <SmallButton onClick={() => onChange({ ...slide, rows: [...slide.rows, { name: "New move", description: "" }] })}>
            + Add row
          </SmallButton>
        </div>
      </Field>
    </>
  );
}

// ── CFU shared ───────────────────────────────────────────────────────────────

// CfuHintEditor
// -------------
// Renders the per-CFU scaffold hint (image + alt text + reveal delay).
// Uploads go through the same /api/author/upload endpoint as slide images, so
// hint images live alongside slide images in /mission-images/<missionId>/.
//
// Storage shape note: CfuHint uses `imageUrl` + `altText` (NOT `src` + `alt`
// like MissionImage). We adapt to/from MissionImage so we can reuse ImagePicker.
//
// Pedagogy: streak break + delay belong to the player, not the editor. The
// editor only collects what's shown when revealed and how long to wait.
function CfuHintEditor({
  hint,
  missionId,
  onChange,
}: {
  hint: CfuHint | undefined;
  missionId: string;
  onChange: (next: CfuHint | undefined) => void;
}) {
  // Adapt the CfuHint shape to the MissionImage shape ImagePicker expects.
  const asMissionImage: MissionImage | undefined = hint
    ? { src: hint.imageUrl, alt: hint.altText }
    : undefined;

  function handlePicked(next: MissionImage | undefined) {
    if (!next) {
      onChange(undefined);
      return;
    }
    onChange({
      imageUrl: next.src,
      altText: next.alt ?? "",
      delaySeconds: hint?.delaySeconds,
    });
  }

  return (
    <details className="collapsible">
      <summary>Scaffold hint (optional)</summary>
      <p className="form-hint">
        Students can tap <strong>Request Hint</strong> on this CFU to reveal a
        scaffold image after a short delay. Asking for the hint breaks the
        student&apos;s streak (cost) but does <em>not</em> damage shields. Skip this
        section if you don&apos;t want a hint on this CFU.
      </p>
      <ImagePicker
        value={asMissionImage}
        missionId={missionId}
        onChange={handlePicked}
        label="Hint image"
        hint="Upload a scaffold diagram, mnemonic card, or visual cue. Required to enable the hint button."
      />
      {hint && (
        <>
          <Field label="Reveal delay (seconds, default 30)">
            <NumberInput
              value={hint.delaySeconds}
              onChange={(v) =>
                onChange({ ...hint, delaySeconds: Number.isFinite(v) && v > 0 ? v : undefined })
              }
            />
          </Field>
          <p className="form-hint">
            The delay is the pedagogical point — it forces time with the problem
            before help arrives. 30s is the default; shorter for easy CFUs,
            longer for productive struggle.
          </p>
        </>
      )}
    </details>
  );
}

function CfuPromptAndFeedback<T extends McqSlide | MultiSlide | SortSlide | OrderSlide | MatchSlide | FillSlide | LabelSlide | HighlightSlide>(
  { slide, onChange }: { slide: T; onChange: (s: T) => void }
) {
  return (
    <>
      <details className="collapsible" open>
        <summary>Prompt</summary>
        <MarkupInput
          label="Label (small caps above the question)"
          value={slide.prompt.label ?? ""}
          onChange={(v) => onChange({ ...slide, prompt: { ...slide.prompt, label: v } })}
        />
        <MarkupTextarea
          label="Scenario (optional, longer setup)"
          value={slide.prompt.scenario ?? ""}
          rows={2}
          onChange={(v) => onChange({ ...slide, prompt: { ...slide.prompt, scenario: v } })}
        />
        <MarkupTextarea
          label="Question"
          value={slide.prompt.question}
          rows={2}
          onChange={(v) => onChange({ ...slide, prompt: { ...slide.prompt, question: v } })}
        />
      </details>

      <details className="collapsible">
        <summary>Feedback</summary>
        <MarkupInput
          label="Correct title"
          value={slide.feedback.correct.title}
          onChange={(v) => onChange({ ...slide, feedback: { ...slide.feedback, correct: { ...slide.feedback.correct, title: v } } })}
        />
        <Field label="Correct body (one per line)">
          <textarea
            className="form-textarea"
            rows={3}
            value={slide.feedback.correct.body.join("\n")}
            onChange={(e) => onChange({ ...slide, feedback: { ...slide.feedback, correct: { ...slide.feedback.correct, body: e.target.value.split("\n") } } })}
          />
        </Field>
        <MarkupInput
          label="Wrong (default) title"
          value={slide.feedback.wrongDefault.title}
          onChange={(v) => onChange({ ...slide, feedback: { ...slide.feedback, wrongDefault: { ...slide.feedback.wrongDefault, title: v } } })}
        />
        <Field label="Wrong (default) body (one per line)">
          <textarea
            className="form-textarea"
            rows={3}
            value={slide.feedback.wrongDefault.body.join("\n")}
            onChange={(e) => onChange({ ...slide, feedback: { ...slide.feedback, wrongDefault: { ...slide.feedback.wrongDefault, body: e.target.value.split("\n") } } })}
          />
        </Field>
      </details>

      <details className="collapsible">
        <summary>Scoring</summary>
        <div className="grid-2">
          <Field label="Credits on correct">
            <NumberInput
              value={slide.scoring.creditsOnCorrect}
              onChange={(v) => onChange({ ...slide, scoring: { ...slide.scoring, creditsOnCorrect: v } })}
            />
          </Field>
          <Field label="Mode">
            <select
              className="form-input"
              value={slide.scoring.mode ?? "all-or-nothing"}
              onChange={(e) => onChange({ ...slide, scoring: { ...slide.scoring, mode: e.target.value as "all-or-nothing" | "partial" } })}
            >
              <option value="all-or-nothing">All or nothing</option>
              <option value="partial">Partial credit</option>
            </select>
          </Field>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={slide.scoring.shieldOnWrong}
            onChange={(e) => onChange({ ...slide, scoring: { ...slide.scoring, shieldOnWrong: e.target.checked } })}
          />
          Lose a shield on wrong
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={slide.scoring.breaksStreakOnWrong}
            onChange={(e) => onChange({ ...slide, scoring: { ...slide.scoring, breaksStreakOnWrong: e.target.checked } })}
          />
          Break streak on wrong
        </label>
      </details>
    </>
  );
}

// ── MCQ ──────────────────────────────────────────────────────────────────────

function McqEditor({ slide, missionId, onChange }: { slide: McqSlide; missionId: string; onChange: (s: McqSlide) => void }) {
  function updateOpt(id: string, patch: Partial<McqOption>) {
    onChange({ ...slide, options: slide.options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  }
  return (
    <>
      <CfuPromptAndFeedback slide={slide} onChange={onChange} />
      <CfuHintEditor
        hint={slide.hint}
        missionId={missionId}
        onChange={(next) => onChange({ ...slide, hint: next })}
      />
      <ImagePicker
        value={slide.image}
        missionId={missionId}
        onChange={(img) => onChange({ ...slide, image: img })}
        hint="Shown above the answer choices — great for ‘which is this?’ questions."
      />
      <Field label="Options (radio = pick the correct one)">
        <div className="repeater">
          {slide.options.map((o) => (
            <div key={o.id} className="opt-row">
              <input
                type="radio"
                name={`correct-${slide.id}`}
                checked={slide.correctOptionId === o.id}
                onChange={() => onChange({ ...slide, correctOptionId: o.id })}
                title="Mark correct"
              />
              <input
                className="form-input opt-letter"
                value={o.letter}
                onChange={(e) => updateOpt(o.id, { letter: e.target.value })}
                maxLength={2}
              />
              <input
                className="form-input"
                value={o.text}
                onChange={(e) => updateOpt(o.id, { text: e.target.value })}
              />
              <SmallButton variant="danger" onClick={() => onChange({ ...slide, options: slide.options.filter((x) => x.id !== o.id) })}>
                ✕
              </SmallButton>
            </div>
          ))}
          <SmallButton
            onClick={() => {
              const nextLetter = String.fromCharCode(65 + slide.options.length);
              onChange({
                ...slide,
                options: [...slide.options, { id: nextLetter.toLowerCase(), letter: nextLetter, text: "" }],
              });
            }}
          >
            + Add option
          </SmallButton>
        </div>
      </Field>
    </>
  );
}

// ── Multi ────────────────────────────────────────────────────────────────────

function MultiEditor({ slide, missionId, onChange }: { slide: MultiSlide; missionId: string; onChange: (s: MultiSlide) => void }) {
  function toggleCorrect(id: string) {
    const set = new Set(slide.correctOptionIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ ...slide, correctOptionIds: Array.from(set) });
  }
  function updateOpt(id: string, patch: Partial<McqOption>) {
    onChange({ ...slide, options: slide.options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  }
  return (
    <>
      <CfuPromptAndFeedback slide={slide} onChange={onChange} />
      <CfuHintEditor
        hint={slide.hint}
        missionId={missionId}
        onChange={(next) => onChange({ ...slide, hint: next })}
      />
      <ImagePicker
        value={slide.image}
        missionId={missionId}
        onChange={(img) => onChange({ ...slide, image: img })}
        hint="Shown above the answer choices."
      />
      <Field label="Options (check all correct)">
        <div className="repeater">
          {slide.options.map((o) => (
            <div key={o.id} className="opt-row">
              <input type="checkbox" checked={slide.correctOptionIds.includes(o.id)} onChange={() => toggleCorrect(o.id)} />
              <input className="form-input opt-letter" value={o.letter} onChange={(e) => updateOpt(o.id, { letter: e.target.value })} maxLength={2} />
              <input className="form-input" value={o.text} onChange={(e) => updateOpt(o.id, { text: e.target.value })} />
              <SmallButton variant="danger" onClick={() => onChange({ ...slide, options: slide.options.filter((x) => x.id !== o.id), correctOptionIds: slide.correctOptionIds.filter((x) => x !== o.id) })}>
                ✕
              </SmallButton>
            </div>
          ))}
          <SmallButton
            onClick={() => {
              const nextLetter = String.fromCharCode(65 + slide.options.length);
              onChange({
                ...slide,
                options: [...slide.options, { id: nextLetter.toLowerCase(), letter: nextLetter, text: "" }],
              });
            }}
          >
            + Add option
          </SmallButton>
        </div>
      </Field>
    </>
  );
}

// ── Sort ─────────────────────────────────────────────────────────────────────

function SortEditor({ slide, missionId, onChange }: { slide: SortSlide; missionId: string; onChange: (s: SortSlide) => void }) {
  function updateBin(id: string, patch: Partial<SortBin>) {
    onChange({ ...slide, bins: slide.bins.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  }
  function updateCard(id: string, patch: Partial<SortCard>) {
    onChange({ ...slide, cards: slide.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  }
  return (
    <>
      <CfuPromptAndFeedback slide={slide} onChange={onChange} />
      <CfuHintEditor
        hint={slide.hint}
        missionId={missionId}
        onChange={(next) => onChange({ ...slide, hint: next })}
      />
      <Field label="Bins">
        <div className="repeater">
          {slide.bins.map((b) => (
            <div key={b.id} className="opt-row">
              <input className="form-input opt-letter" value={b.icon} onChange={(e) => updateBin(b.id, { icon: e.target.value })} />
              <input className="form-input" value={b.label} onChange={(e) => updateBin(b.id, { label: e.target.value })} placeholder="Bin label" />
              <select className="form-input" value={b.accent ?? "cyan"} onChange={(e) => updateBin(b.id, { accent: e.target.value as SortBin["accent"] })}>
                <option value="cyan">Cyan</option>
                <option value="amber">Amber</option>
                <option value="magenta">Magenta</option>
              </select>
              <SmallButton variant="danger" onClick={() => onChange({ ...slide, bins: slide.bins.filter((x) => x.id !== b.id) })}>✕</SmallButton>
            </div>
          ))}
          <SmallButton onClick={() => onChange({ ...slide, bins: [...slide.bins, { id: `bin-${Date.now()}`, icon: "◇", label: "New bin", accent: "cyan" }] })}>
            + Add bin
          </SmallButton>
        </div>
      </Field>
      <Field label="Cards (assign each to a bin)">
        <div className="repeater">
          {slide.cards.map((c) => (
            <div key={c.id} className="opt-row">
              <input className="form-input" value={c.text} onChange={(e) => updateCard(c.id, { text: e.target.value })} placeholder="Card text" />
              <select className="form-input" value={c.correctBinId} onChange={(e) => updateCard(c.id, { correctBinId: e.target.value })}>
                {slide.bins.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
              <SmallButton variant="danger" onClick={() => onChange({ ...slide, cards: slide.cards.filter((x) => x.id !== c.id) })}>✕</SmallButton>
            </div>
          ))}
          <SmallButton onClick={() => onChange({ ...slide, cards: [...slide.cards, { id: `c-${Date.now()}`, text: "", correctBinId: slide.bins[0]?.id ?? "" }] })}>
            + Add card
          </SmallButton>
        </div>
      </Field>
      <label className="checkbox-row">
        <input type="checkbox" checked={slide.allowPartialCredit} onChange={(e) => onChange({ ...slide, allowPartialCredit: e.target.checked })} />
        Allow partial credit
      </label>
    </>
  );
}

// ── Order ────────────────────────────────────────────────────────────────────

function OrderEditor({ slide, missionId, onChange }: { slide: OrderSlide; missionId: string; onChange: (s: OrderSlide) => void }) {
  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= slide.items.length) return;
    const next = [...slide.items];
    [next[idx], next[target]] = [next[target], next[idx]];
    // re-number positions
    next.forEach((it, i) => (it.correctPosition = i + 1));
    onChange({ ...slide, items: next });
  }
  function updateItem(id: string, patch: Partial<OrderItem>) {
    onChange({ ...slide, items: slide.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  }
  return (
    <>
      <CfuPromptAndFeedback slide={slide} onChange={onChange} />
      <CfuHintEditor
        hint={slide.hint}
        missionId={missionId}
        onChange={(next) => onChange({ ...slide, hint: next })}
      />
      <MarkupInput label="Intro (optional)" value={slide.intro ?? ""} onChange={(v) => onChange({ ...slide, intro: v })} />
      <Field label="Items (top → bottom is the correct order)">
        <div className="repeater">
          {slide.items.map((it, i) => (
            <div key={it.id} className="opt-row">
              <span className="opt-pos">{i + 1}</span>
              <input className="form-input" value={it.text} onChange={(e) => updateItem(it.id, { text: e.target.value })} />
              <SmallButton onClick={() => move(i, -1)}>↑</SmallButton>
              <SmallButton onClick={() => move(i, 1)}>↓</SmallButton>
              <SmallButton variant="danger" onClick={() => {
                const next = slide.items.filter((x) => x.id !== it.id).map((x, idx) => ({ ...x, correctPosition: idx + 1 }));
                onChange({ ...slide, items: next });
              }}>✕</SmallButton>
            </div>
          ))}
          <SmallButton onClick={() => onChange({ ...slide, items: [...slide.items, { id: `i-${Date.now()}`, text: "", correctPosition: slide.items.length + 1 }] })}>
            + Add item
          </SmallButton>
        </div>
      </Field>
    </>
  );
}

// ── Match ────────────────────────────────────────────────────────────────────

function MatchEditor({ slide, missionId, onChange }: { slide: MatchSlide; missionId: string; onChange: (s: MatchSlide) => void }) {
  function updateLeft(id: string, patch: Partial<MatchItem>) {
    onChange({ ...slide, leftColumn: { ...slide.leftColumn, items: slide.leftColumn.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) } });
  }
  function updateRight(id: string, patch: Partial<MatchItem>) {
    onChange({ ...slide, rightColumn: { ...slide.rightColumn, items: slide.rightColumn.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) } });
  }
  const pairIds = Array.from(new Set([...slide.leftColumn.items.map((i) => i.pairId), ...slide.rightColumn.items.map((i) => i.pairId)]));
  return (
    <>
      <CfuPromptAndFeedback slide={slide} onChange={onChange} />
      <CfuHintEditor
        hint={slide.hint}
        missionId={missionId}
        onChange={(next) => onChange({ ...slide, hint: next })}
      />
      <p className="form-hint">
        Each left item shares a <code>pairId</code> with its matching right item. Use the dropdown to set the pair.
      </p>
      <div className="grid-2">
        <Field label="Left column">
          <input className="form-input" placeholder="Column label" value={slide.leftColumn.label ?? ""}
            onChange={(e) => onChange({ ...slide, leftColumn: { ...slide.leftColumn, label: e.target.value } })} />
          <div className="repeater">
            {slide.leftColumn.items.map((it) => (
              <div key={it.id} className="opt-row">
                <input className="form-input" value={it.text} onChange={(e) => updateLeft(it.id, { text: e.target.value })} />
                <select className="form-input" value={it.pairId} onChange={(e) => updateLeft(it.id, { pairId: e.target.value })}>
                  {pairIds.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <SmallButton variant="danger" onClick={() => onChange({ ...slide, leftColumn: { ...slide.leftColumn, items: slide.leftColumn.items.filter((x) => x.id !== it.id) } })}>✕</SmallButton>
              </div>
            ))}
            <SmallButton onClick={() => {
              const newPair = `p-${Date.now()}`;
              onChange({ ...slide, leftColumn: { ...slide.leftColumn, items: [...slide.leftColumn.items, { id: `l-${Date.now()}`, text: "", pairId: newPair }] } });
            }}>+ Add left</SmallButton>
          </div>
        </Field>
        <Field label="Right column">
          <input className="form-input" placeholder="Column label" value={slide.rightColumn.label ?? ""}
            onChange={(e) => onChange({ ...slide, rightColumn: { ...slide.rightColumn, label: e.target.value } })} />
          <div className="repeater">
            {slide.rightColumn.items.map((it) => (
              <div key={it.id} className="opt-row">
                <input className="form-input" value={it.text} onChange={(e) => updateRight(it.id, { text: e.target.value })} />
                <select className="form-input" value={it.pairId} onChange={(e) => updateRight(it.id, { pairId: e.target.value })}>
                  {pairIds.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <SmallButton variant="danger" onClick={() => onChange({ ...slide, rightColumn: { ...slide.rightColumn, items: slide.rightColumn.items.filter((x) => x.id !== it.id) } })}>✕</SmallButton>
              </div>
            ))}
            <SmallButton onClick={() => {
              const pairIdToUse = pairIds[0] ?? `p-${Date.now()}`;
              onChange({ ...slide, rightColumn: { ...slide.rightColumn, items: [...slide.rightColumn.items, { id: `r-${Date.now()}`, text: "", pairId: pairIdToUse }] } });
            }}>+ Add right</SmallButton>
          </div>
        </Field>
      </div>
    </>
  );
}

// ── Fill ─────────────────────────────────────────────────────────────────────

function FillEditor({ slide, missionId, onChange }: { slide: FillSlide; missionId: string; onChange: (s: FillSlide) => void }) {
  function updateBlank(idx: number, patch: Partial<FillBlank>) {
    onChange({ ...slide, blanks: slide.blanks.map((b, i) => (i === idx ? { ...b, ...patch } : b)) });
  }
  return (
    <>
      <CfuPromptAndFeedback slide={slide} onChange={onChange} />
      <CfuHintEditor
        hint={slide.hint}
        missionId={missionId}
        onChange={(next) => onChange({ ...slide, hint: next })}
      />
      <Field label="Template (use {{0}}, {{1}}, … to mark blanks)">
        <textarea
          className="form-textarea"
          rows={3}
          value={slide.template}
          onChange={(e) => onChange({ ...slide, template: e.target.value })}
        />
      </Field>
      <Field label="Blanks (one row per {{N}})">
        <div className="repeater">
          {slide.blanks.map((b, i) => (
            <div key={i} className="opt-row">
              <span className="opt-pos">{`{{${b.index}}}`}</span>
              <input
                className="form-input"
                placeholder="Accepted answers, comma-separated"
                value={b.acceptedAnswers.join(", ")}
                onChange={(e) => updateBlank(i, { acceptedAnswers: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
              />
              <input
                className="form-input"
                placeholder="Hint (optional)"
                value={b.hint ?? ""}
                onChange={(e) => updateBlank(i, { hint: e.target.value })}
              />
              <SmallButton variant="danger" onClick={() => onChange({ ...slide, blanks: slide.blanks.filter((_, idx) => idx !== i) })}>✕</SmallButton>
            </div>
          ))}
          <SmallButton onClick={() => onChange({ ...slide, blanks: [...slide.blanks, { index: slide.blanks.length, acceptedAnswers: [] }] })}>
            + Add blank
          </SmallButton>
        </div>
      </Field>
      <Field label="Word bank (optional, comma-separated)">
        <input
          className="form-input"
          value={(slide.wordBank ?? []).join(", ")}
          onChange={(e) => onChange({ ...slide, wordBank: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
        />
      </Field>
      <label className="checkbox-row">
        <input type="checkbox" checked={slide.caseSensitive} onChange={(e) => onChange({ ...slide, caseSensitive: e.target.checked })} />
        Case sensitive
      </label>
    </>
  );
}

// ── Label ────────────────────────────────────────────────────────────────────

function LabelEditor({ slide, missionId, onChange }: { slide: LabelSlide; missionId: string; onChange: (s: LabelSlide) => void }) {
  return (
    <>
      <CfuPromptAndFeedback slide={slide} onChange={onChange} />
      <CfuHintEditor
        hint={slide.hint}
        missionId={missionId}
        onChange={(next) => onChange({ ...slide, hint: next })}
      />
      <ImagePicker
        label="Image to label"
        value={{ src: slide.image.src, alt: slide.image.alt, aspectRatio: slide.image.aspectRatio }}
        missionId={missionId}
        onChange={(img) => {
          if (!img) {
            onChange({ ...slide, image: { src: "", alt: "", aspectRatio: slide.image.aspectRatio ?? 1.5 } });
          } else {
            onChange({
              ...slide,
              image: {
                src: img.src,
                alt: img.alt,
                aspectRatio: img.aspectRatio ?? slide.image.aspectRatio ?? 1.5,
              },
            });
          }
        }}
      />
      <Field label="Aspect ratio (width / height, e.g. 1.5)">
        <NumberInput value={slide.image.aspectRatio} onChange={(v) => onChange({ ...slide, image: { ...slide.image, aspectRatio: v } })} />
      </Field>
      <p className="form-hint">
        Targets and labels are best edited by hand in JSON for now — visual target placement is on the roadmap.
        Each target has an <code>(x, y, width, height)</code> in % and a <code>correctLabelId</code>.
      </p>
    </>
  );
}

// ── Highlight ────────────────────────────────────────────────────────────────

function HighlightEditor({ slide, missionId, onChange }: { slide: HighlightSlide; missionId: string; onChange: (s: HighlightSlide) => void }) {
  return (
    <>
      <CfuPromptAndFeedback slide={slide} onChange={onChange} />
      <CfuHintEditor
        hint={slide.hint}
        missionId={missionId}
        onChange={(next) => onChange({ ...slide, hint: next })}
      />
      <Field label="Passage">
        <textarea
          className="form-textarea"
          rows={5}
          value={slide.passage}
          onChange={(e) => onChange({ ...slide, passage: e.target.value })}
        />
      </Field>
      <Field label="Mode">
        <select className="form-input" value={slide.mode} onChange={(e) => onChange({ ...slide, mode: e.target.value as "words" | "spans" })}>
          <option value="words">Words (click individual words)</option>
          <option value="spans">Spans (pre-defined ranges)</option>
        </select>
      </Field>
      <Field label="Correct IDs (comma-separated word indexes or span ids)">
        <input
          className="form-input"
          value={slide.correctIds.join(", ")}
          onChange={(e) => onChange({ ...slide, correctIds: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
        />
      </Field>
    </>
  );
}

// ── Complete ─────────────────────────────────────────────────────────────────

function CompleteEditor({ slide, missionId, onChange }: { slide: CompleteSlide; missionId: string; onChange: (s: CompleteSlide) => void }) {
  return (
    <>
      <MarkupInput label="Headline" value={slide.headline} onChange={(v) => onChange({ ...slide, headline: v })} />
      <MarkupInput label="Subtext" value={slide.subtext} onChange={(v) => onChange({ ...slide, subtext: v })} />
      <ImagePicker
        value={slide.image}
        missionId={missionId}
        onChange={(img) => onChange({ ...slide, image: img })}
      />
      <Field label="Primary CTA label">
        <TextInput value={slide.primaryCta.label} onChange={(v) => onChange({ ...slide, primaryCta: { ...slide.primaryCta, label: v } })} />
      </Field>
      <Field label="Primary CTA action">
        <select
          className="form-input"
          value={typeof slide.primaryCta.action === "string" ? slide.primaryCta.action : "url"}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "next-mission" || v === "return-bridge") {
              onChange({ ...slide, primaryCta: { ...slide.primaryCta, action: v } });
            } else {
              onChange({ ...slide, primaryCta: { ...slide.primaryCta, action: { url: "" } } });
            }
          }}
        >
          <option value="next-mission">Go to next mission</option>
          <option value="return-bridge">Return to bridge</option>
          <option value="url">External URL</option>
        </select>
      </Field>
    </>
  );
}
