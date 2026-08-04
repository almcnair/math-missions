"use client";

// ============================================================================
// CFU SLIDES — all 8 interaction modes.
//
// Every CFU slide receives the same contract:
//   - slide: the typed slide data
//   - onResult: callback fired once the student commits, with a CfuOutcome
//
// The MissionPlayer wires onResult into the reducer, gates the Continue
// button on whether the slide.id appears in cfuOutcomes, and shows feedback.
// ============================================================================

import { useState, useRef, useEffect } from "react";
import type {
  McqSlide,
  MultiSlide,
  SortSlide,
  OrderSlide,
  MatchSlide,
  FillSlide,
  LabelSlide,
  HighlightSlide,
  FeedbackBlock,
  CfuHint,
} from "@/lib/mission-schema";
import { Inline, Paragraphs } from "@/lib/inline-markup";
import { scoreCfu, type CfuOutcome } from "../state";
import { MissionImageView } from "./ContentSlides";

/**
 * Per-CFU hint plumbing.
 *
 * The MissionPlayer owns `hintsUsed` state and passes this down to every
 * CFU view. When `used` is true, the scaffold image is revealed; when
 * false, the "Request Hint" button is rendered. Calling `onUse()`
 * triggers the countdown + reveal and breaks the active streak via the
 * `use-hint` reducer action.
 */
export type HintState = {
  hint: CfuHint;
  used: boolean;
  onUse: () => void;
};

// ---------- Shared bits -----------------------------------------------------

const tagToneClass = {
  default: "text-accent-cyan",
  amber: "text-accent-amber",
  magenta: "text-accent-magenta",
} as const;

function CfuFrame({
  tag,
  tagTone,
  promptLabel,
  scenario,
  question,
  image,
  children,
  feedback,
  hintState,
  answered,
}: {
  tag?: string;
  tagTone?: keyof typeof tagToneClass;
  promptLabel?: string;
  scenario?: string;
  question: string;
  image?: import("@/lib/mission-schema").MissionImage;
  children: React.ReactNode;
  feedback?: { block: FeedbackBlock; tone: "success" | "failure" } | null;
  hintState?: HintState;
  /**
   * The CFU has been submitted. Suppresses the hint button (no point
   * requesting help after you've already answered) but keeps an already
   * revealed hint image visible.
   */
  answered?: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {tag && (
        <div className={`font-mono text-xs tracking-[0.18em] ${tagToneClass[tagTone ?? "amber"]}`}>
          {tag}
        </div>
      )}
      <div className="relative border border-border-mid bg-bg-panel-solid/50 rounded-md p-6 space-y-3">
        <span className="corner tl" /><span className="corner tr" />
        <span className="corner bl" /><span className="corner br" />
        {promptLabel && (
          <div className="font-mono text-xs tracking-[0.18em] text-accent-amber">{promptLabel}</div>
        )}
        {scenario && (
          <p className="text-base leading-relaxed text-text-bright"><Inline>{scenario}</Inline></p>
        )}
        <p className="font-display text-xl font-bold pt-2">
          <Inline>{question}</Inline>
        </p>
      </div>
      {image && <MissionImageView image={image} className="max-w-2xl mx-auto" />}
      {hintState && <HintControl hintState={hintState} answered={!!answered} />}
      {children}
      {feedback && <FeedbackView block={feedback.block} tone={feedback.tone} />}
    </div>
  );
}

// ---------- Hint button + countdown + reveal -------------------------------
//
// Pedagogical design (locked 2026-06-28):
//   - Hints exist to create productive struggle. The delay is the point.
//   - Cost: requesting a hint immediately breaks the active streak. No
//     shield damage, no score reduction — streak is the single signal.
//   - One hint per CFU per attempt. Once requested, you ride out the
//     countdown and the image stays for the rest of the slide.
//   - The image is preloaded during the countdown so reveal is instant.
//   - When a CFU is already answered, we hide the request button entirely
//     but keep any previously-revealed image visible.

function HintControl({
  hintState,
  answered,
}: {
  hintState: HintState;
  answered: boolean;
}) {
  const { hint, used, onUse } = hintState;
  const delaySeconds = hint.delaySeconds ?? 30;

  // Countdown is local UI state. `used` (from the player) tells us whether
  // the cost has been paid; once true, we start the timer. When the timer
  // hits zero, we flip to revealed and show the image.
  const [remaining, setRemaining] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  // When `used` flips true, start the countdown. We also begin preloading
  // the image immediately so the reveal has no extra latency.
  useEffect(() => {
    if (!used) return;
    // Preload (browser will cache by URL when <img> renders later).
    const pre = new Image();
    pre.src = hint.imageUrl;

    setRemaining(delaySeconds);
    const startedAt = Date.now();
    const tick = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, delaySeconds - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(tick);
        setRevealed(true);
      }
    }, 100);
    return () => clearInterval(tick);
  }, [used, hint.imageUrl, delaySeconds]);

  // Hidden state (CFU answered, hint never requested): render nothing.
  if (answered && !used) return null;

  // Idle state: render the request button.
  if (!used) {
    return (
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onUse}
          className="group flex items-center gap-3 px-5 py-2.5 border border-accent-amber/40 hover:border-accent-amber rounded-md bg-bg-panel-solid/40 hover:bg-bg-panel-solid/70 transition-colors"
        >
          <span className="text-base">💡</span>
          <span className="font-mono text-xs tracking-[0.15em] uppercase text-accent-amber group-hover:text-accent-amber">
            Request Hint
          </span>
          <span className="font-mono text-xs tracking-[0.12em] text-text-dim">
            — breaks streak
          </span>
        </button>
      </div>
    );
  }

  // Countdown state.
  if (!revealed) {
    const pct = remaining == null ? 0 : ((delaySeconds - remaining) / delaySeconds) * 100;
    const secondsLeft = Math.ceil(remaining ?? delaySeconds);
    const mm = Math.floor(secondsLeft / 60);
    const ss = secondsLeft % 60;
    const stamp = `${String(mm)}:${String(ss).padStart(2, "0")}`;
    return (
      <div
        role="status"
        aria-live="polite"
        className="max-w-md mx-auto border border-accent-cyan/40 bg-bg-panel-solid/50 rounded-md p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs tracking-[0.18em] text-accent-cyan">
            ◦ HINT DEPLOYING
          </div>
          <div className="font-display font-bold text-2xl tabular-nums text-accent-cyan">
            {stamp}
          </div>
        </div>
        <div className="relative h-1.5 bg-bg-deep/60 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-cyan to-accent-amber transition-[width] duration-100 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="font-mono text-xs tracking-[0.12em] text-text-dim text-center">
          Use this time to re-read the prompt.
        </p>
      </div>
    );
  }

  // Revealed state.
  return (
    <figure className="max-w-2xl mx-auto border border-accent-cyan/40 bg-bg-panel-solid/40 rounded-md p-4 space-y-2 animate-in fade-in duration-500">
      <figcaption className="font-mono text-xs tracking-[0.18em] text-accent-cyan">
        ◦ HINT · SCAFFOLD
      </figcaption>
      <div className="relative overflow-hidden rounded border border-border-mid bg-bg-panel-solid/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hint.imageUrl}
          alt={hint.altText}
          className="w-full h-auto object-contain"
        />
      </div>
    </figure>
  );
}

function FeedbackView({ block, tone }: { block: FeedbackBlock; tone: "success" | "failure" }) {
  const border = tone === "success" ? "border-status-good" : "border-status-warn";
  const titleColor = tone === "success" ? "text-status-good" : "text-status-warn";
  return (
    <div className={`border ${border} bg-bg-panel-solid/60 rounded-md p-5 space-y-2 animate-in fade-in duration-300`}>
      <div className={`font-display font-bold ${titleColor}`}>{block.title}</div>
      <div className="space-y-2 text-text-bright">
        <Paragraphs>{block.body}</Paragraphs>
      </div>
      {block.followup && (
        <p className="pt-2 border-t border-border-faint text-sm text-text-bright/80">
          <Inline>{block.followup}</Inline>
        </p>
      )}
    </div>
  );
}

// ============================================================================
// 1) MCQ — single correct answer
// ============================================================================

export function McqSlideView({
  slide,
  onResult,
  outcome,
  hintState,
}: {
  slide: McqSlide;
  onResult: (o: CfuOutcome) => void;
  outcome?: CfuOutcome;
  hintState?: HintState;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const answered = !!outcome;

  function pick(id: string) {
    if (answered) return;
    setChosen(id);
    const correct = id === slide.correctOptionId;
    onResult(scoreCfu({ scoring: slide.scoring, fullyCorrect: correct }));
  }

  const feedback = answered
    ? outcome.correct
      ? { block: slide.feedback.correct, tone: "success" as const }
      : { block: slide.feedback.wrongByChoice?.[chosen ?? ""] ?? slide.feedback.wrongDefault, tone: "failure" as const }
    : null;

  return (
    <CfuFrame
      tag={slide.tag} tagTone={slide.tagTone}
      promptLabel={slide.prompt.label}
      scenario={slide.prompt.scenario}
      question={slide.prompt.question}
      image={slide.image}
      feedback={feedback}
      hintState={hintState}
      answered={answered}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        {slide.options.map((opt) => {
          const isChosen = chosen === opt.id;
          const isCorrect = opt.id === slide.correctOptionId;
          const state =
            !answered ? "idle" :
            isChosen && isCorrect ? "right-chosen" :
            isChosen && !isCorrect ? "wrong-chosen" :
            !isChosen && isCorrect ? "right-unchosen" :
            "dimmed";
          return (
            <button
              key={opt.id}
              onClick={() => pick(opt.id)}
              disabled={answered}
              className={`text-left p-4 border rounded-md flex gap-3 items-start transition-colors ${
                state === "idle"            ? "border-border-mid hover:border-accent-cyan hover:bg-bg-panel-solid/60" :
                state === "right-chosen"    ? "border-status-good bg-status-good/10" :
                state === "wrong-chosen"    ? "border-status-warn bg-status-warn/10" :
                state === "right-unchosen"  ? "border-status-good/60 bg-status-good/5" :
                                              "border-border-faint opacity-50"
              }`}
            >
              <span className="font-display font-bold text-accent-cyan w-6">{opt.letter}</span>
              <span className="flex-1"><Inline>{opt.text}</Inline></span>
            </button>
          );
        })}
      </div>
    </CfuFrame>
  );
}

// ============================================================================
// 2) MULTI — pick all that apply
// ============================================================================

export function MultiSlideView({
  slide,
  onResult,
  outcome,
  hintState,
}: {
  slide: MultiSlide;
  onResult: (o: CfuOutcome) => void;
  outcome?: CfuOutcome;
  hintState?: HintState;
}) {
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const answered = !!outcome;

  function toggle(id: string) {
    if (answered) return;
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function submit() {
    if (answered || picks.size === 0) return;
    const correctSet = new Set(slide.correctOptionIds);
    const correctPicks  = [...picks].filter((p) => correctSet.has(p)).length;
    const wrongPicks    = [...picks].filter((p) => !correctSet.has(p)).length;
    const total = correctSet.size;
    const fullyCorrect = correctPicks === total && wrongPicks === 0;
    const fraction = Math.max(0, (correctPicks - wrongPicks) / total);
    onResult(scoreCfu({ scoring: slide.scoring, fullyCorrect, fraction }));
  }

  const feedback = answered
    ? { block: outcome.correct ? slide.feedback.correct : slide.feedback.wrongDefault,
        tone: (outcome.correct ? "success" : "failure") as "success" | "failure" }
    : null;

  return (
    <CfuFrame
      tag={slide.tag} tagTone={slide.tagTone}
      promptLabel={slide.prompt.label}
      scenario={slide.prompt.scenario}
      question={slide.prompt.question}
      image={slide.image}
      feedback={feedback}
      hintState={hintState}
      answered={answered}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        {slide.options.map((opt) => {
          const isPicked = picks.has(opt.id);
          const isCorrect = slide.correctOptionIds.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              disabled={answered}
              className={`text-left p-4 border rounded-md flex gap-3 items-start transition-colors ${
                !answered
                  ? isPicked
                    ? "border-accent-cyan bg-accent-cyan/10"
                    : "border-border-mid hover:border-accent-cyan"
                  : isPicked && isCorrect ? "border-status-good bg-status-good/10"
                  : isPicked && !isCorrect ? "border-status-warn bg-status-warn/10"
                  : !isPicked && isCorrect ? "border-status-good/60 bg-status-good/5"
                  : "border-border-faint opacity-50"
              }`}
            >
              <span className={`w-5 h-5 border ${isPicked ? "bg-accent-cyan border-accent-cyan" : "border-border-mid"} rounded-sm`} />
              <span className="font-display font-bold text-accent-cyan w-6">{opt.letter}</span>
              <span className="flex-1"><Inline>{opt.text}</Inline></span>
            </button>
          );
        })}
      </div>
      {!answered && (
        <button
          onClick={submit}
          disabled={picks.size === 0}
          className="px-6 py-2 bg-accent-amber text-bg-deep font-mono text-xs tracking-[0.18em] font-bold disabled:opacity-40"
        >
          COMMIT ANSWER
        </button>
      )}
    </CfuFrame>
  );
}

// ============================================================================
// 3) SORT — drag cards into bins
// ============================================================================

export function SortSlideView({
  slide,
  onResult,
  outcome,
  hintState,
}: {
  slide: SortSlide;
  onResult: (o: CfuOutcome) => void;
  outcome?: CfuOutcome;
  hintState?: HintState;
}) {
  const [placements, setPlacements] = useState<Record<string, string | null>>(
    Object.fromEntries(slide.cards.map((c) => [c.id, null]))
  );
  const draggedRef = useRef<string | null>(null);
  const answered = !!outcome;

  function commit(next: Record<string, string | null>) {
    setPlacements(next);
    if (Object.values(next).every((v) => v !== null)) {
      const total = slide.cards.length;
      const right = slide.cards.filter((c) => next[c.id] === c.correctBinId).length;
      const fullyCorrect = right === total;
      const fraction = right / total;
      onResult(
        scoreCfu({
          scoring: { ...slide.scoring, mode: slide.allowPartialCredit ? "partial" : "all-or-nothing" },
          fullyCorrect,
          fraction,
        })
      );
    }
  }

  function onDrop(binId: string) {
    if (answered) return;
    const cardId = draggedRef.current;
    if (!cardId) return;
    draggedRef.current = null;
    commit({ ...placements, [cardId]: binId });
  }

  const unplacedCards = slide.cards.filter((c) => placements[c.id] === null);

  const feedback = answered
    ? { block: outcome.correct ? slide.feedback.correct : slide.feedback.wrongDefault,
        tone: (outcome.correct ? "success" : "failure") as "success" | "failure" }
    : null;

  return (
    <CfuFrame
      tag={slide.tag} tagTone={slide.tagTone}
      promptLabel={slide.prompt.label}
      scenario={slide.prompt.scenario}
      question={slide.prompt.question}
      feedback={feedback}
      hintState={hintState}
      answered={answered}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3 min-h-[60px]">
          {unplacedCards.map((c) => (
            <div
              key={c.id}
              draggable={!answered}
              onDragStart={() => (draggedRef.current = c.id)}
              className="px-4 py-3 border border-border-strong bg-bg-panel-solid rounded-md text-sm cursor-grab active:cursor-grabbing max-w-md"
            >
              <Inline>{c.text}</Inline>
            </div>
          ))}
        </div>

        <div className={`grid grid-cols-${Math.min(slide.bins.length, 4)} gap-3`}
             style={{ gridTemplateColumns: `repeat(${slide.bins.length}, minmax(0, 1fr))` }}>
          {slide.bins.map((bin) => {
            const cards = slide.cards.filter((c) => placements[c.id] === bin.id);
            return (
              <div
                key={bin.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(bin.id)}
                className="border border-dashed border-border-mid rounded-md p-4 min-h-[180px] flex flex-col gap-2 hover:border-accent-cyan/80"
              >
                <div className="text-2xl">{bin.icon}</div>
                <div className="font-mono text-xs tracking-[0.18em] text-accent-cyan">{bin.label}</div>
                <div className="flex-1 flex flex-col gap-2 mt-2">
                  {cards.map((c) => {
                    const correct = answered ? c.correctBinId === placements[c.id] : null;
                    const border =
                      correct === true  ? "border-status-good bg-status-good/10" :
                      correct === false ? "border-status-warn bg-status-warn/10" :
                                          "border-border-faint bg-bg-panel-solid/70";
                    return (
                      <div key={c.id} className={`px-3 py-2 border ${border} rounded-md text-xs`}>
                        <Inline>{c.text}</Inline>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CfuFrame>
  );
}

// ============================================================================
// 4) ORDER — drag items into sequence
// ============================================================================

export function OrderSlideView({
  slide,
  onResult,
  outcome,
  hintState,
}: {
  slide: OrderSlide;
  onResult: (o: CfuOutcome) => void;
  outcome?: CfuOutcome;
  hintState?: HintState;
}) {
  // Start shuffled (deterministic-ish: reverse).
  const [order, setOrder] = useState<string[]>(() => [...slide.items].reverse().map((i) => i.id));
  const dragIdx = useRef<number | null>(null);
  const answered = !!outcome;

  function onDragStart(i: number) { dragIdx.current = i; }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(i: number) {
    if (answered) return;
    const from = dragIdx.current;
    if (from === null || from === i) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    setOrder(next);
    dragIdx.current = null;
  }

  function submit() {
    if (answered) return;
    const total = slide.items.length;
    const right = order.filter((id, idx) => {
      const item = slide.items.find((i) => i.id === id);
      return item?.correctPosition === idx + 1;
    }).length;
    const fullyCorrect = right === total;
    onResult(scoreCfu({ scoring: slide.scoring, fullyCorrect, fraction: right / total }));
  }

  const feedback = answered
    ? { block: outcome.correct ? slide.feedback.correct : slide.feedback.wrongDefault,
        tone: (outcome.correct ? "success" : "failure") as "success" | "failure" }
    : null;

  return (
    <CfuFrame
      tag={slide.tag} tagTone={slide.tagTone}
      promptLabel={slide.prompt.label}
      scenario={slide.prompt.scenario}
      question={slide.prompt.question}
      feedback={feedback}
      hintState={hintState}
      answered={answered}
    >
      {slide.intro && <p className="text-text-bright"><Inline>{slide.intro}</Inline></p>}
      <ol className="space-y-2">
        {order.map((id, idx) => {
          const item = slide.items.find((i) => i.id === id)!;
          const correct = answered ? item.correctPosition === idx + 1 : null;
          const border =
            correct === true  ? "border-status-good bg-status-good/10" :
            correct === false ? "border-status-warn bg-status-warn/10" :
                                "border-border-mid bg-bg-panel-solid/60";
          return (
            <li
              key={id}
              draggable={!answered}
              onDragStart={() => onDragStart(idx)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(idx)}
              className={`px-4 py-3 border ${border} rounded-md flex items-center gap-4 cursor-grab active:cursor-grabbing`}
            >
              <span className="font-display font-bold text-accent-cyan">{String(idx + 1).padStart(2, "0")}</span>
              <span className="flex-1"><Inline>{item.text}</Inline></span>
              {!answered && <span className="text-text-faint text-xs">⇅</span>}
            </li>
          );
        })}
      </ol>
      {!answered && (
        <button
          onClick={submit}
          className="px-6 py-2 bg-accent-amber text-bg-deep font-mono text-xs tracking-[0.18em] font-bold"
        >
          LOCK ORDER
        </button>
      )}
    </CfuFrame>
  );
}

// ============================================================================
// 5) MATCH — match pairs across two columns
// ============================================================================

export function MatchSlideView({
  slide,
  onResult,
  outcome,
  hintState,
}: {
  slide: MatchSlide;
  onResult: (o: CfuOutcome) => void;
  outcome?: CfuOutcome;
  hintState?: HintState;
}) {
  // Click-to-pair UX: tap one on the left, then one on the right.
  const [pairs, setPairs] = useState<Record<string, string>>({});  // leftId -> rightId
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const answered = !!outcome;

  // Shuffle the right column deterministically.
  const rightShuffled = useRef([...slide.rightColumn.items].sort((a, b) => a.id.localeCompare(b.id)));

  function clickLeft(id: string) {
    if (answered) return;
    setSelectedLeft(id === selectedLeft ? null : id);
  }
  function clickRight(rightId: string) {
    if (answered || !selectedLeft) return;
    setPairs((prev) => {
      // remove any existing pair using this right item
      const next: Record<string, string> = {};
      for (const [l, r] of Object.entries(prev)) if (r !== rightId) next[l] = r;
      next[selectedLeft] = rightId;
      return next;
    });
    setSelectedLeft(null);
  }

  function submit() {
    if (answered) return;
    const left = slide.leftColumn.items;
    const total = left.length;
    const right = left.filter((l) => {
      const rId = pairs[l.id];
      if (!rId) return false;
      const r = slide.rightColumn.items.find((ri) => ri.id === rId);
      return r?.pairId === l.pairId;
    }).length;
    const fullyCorrect = right === total;
    onResult(scoreCfu({ scoring: slide.scoring, fullyCorrect, fraction: right / total }));
  }

  function leftLabelFor(rightId: string): string | null {
    for (const [l, r] of Object.entries(pairs)) if (r === rightId) return slide.leftColumn.items.find((li) => li.id === l)?.text ?? null;
    return null;
  }

  const allPaired = Object.keys(pairs).length === slide.leftColumn.items.length;

  const feedback = answered
    ? { block: outcome.correct ? slide.feedback.correct : slide.feedback.wrongDefault,
        tone: (outcome.correct ? "success" : "failure") as "success" | "failure" }
    : null;

  return (
    <CfuFrame
      tag={slide.tag} tagTone={slide.tagTone}
      promptLabel={slide.prompt.label}
      scenario={slide.prompt.scenario}
      question={slide.prompt.question}
      feedback={feedback}
      hintState={hintState}
      answered={answered}
    >
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          {slide.leftColumn.label && (
            <div className="font-mono text-xs tracking-[0.18em] text-accent-cyan">{slide.leftColumn.label}</div>
          )}
          {slide.leftColumn.items.map((it) => {
            const paired = pairs[it.id];
            const sel = selectedLeft === it.id;
            const r = paired ? slide.rightColumn.items.find((ri) => ri.id === paired) : null;
            const wasCorrect = answered && r && r.pairId === it.pairId;
            const wasWrong   = answered && r && r.pairId !== it.pairId;
            return (
              <button
                key={it.id}
                onClick={() => clickLeft(it.id)}
                disabled={answered}
                className={`w-full text-left p-3 border rounded-md transition-colors ${
                  sel ? "border-accent-amber bg-accent-amber/10" :
                  wasCorrect ? "border-status-good bg-status-good/10" :
                  wasWrong   ? "border-status-warn bg-status-warn/10" :
                  paired ? "border-accent-cyan/70 bg-accent-cyan/5" :
                  "border-border-mid hover:border-accent-cyan"
                }`}
              >
                <div className="font-bold"><Inline>{it.text}</Inline></div>
                {paired && r && (
                  <div className="text-xs text-text-dim mt-1">↔ <Inline>{r.text}</Inline></div>
                )}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {slide.rightColumn.label && (
            <div className="font-mono text-xs tracking-[0.18em] text-accent-cyan">{slide.rightColumn.label}</div>
          )}
          {rightShuffled.current.map((it) => {
            const usedBy = leftLabelFor(it.id);
            return (
              <button
                key={it.id}
                onClick={() => clickRight(it.id)}
                disabled={answered || !selectedLeft}
                className={`w-full text-left p-3 border rounded-md transition-colors ${
                  usedBy ? "border-accent-cyan/50 bg-bg-panel-solid/40 opacity-60" :
                  selectedLeft ? "border-border-mid hover:border-accent-amber" :
                  "border-border-faint opacity-60"
                }`}
              >
                <Inline>{it.text}</Inline>
              </button>
            );
          })}
        </div>
      </div>
      {!answered && (
        <button
          onClick={submit}
          disabled={!allPaired}
          className="px-6 py-2 bg-accent-amber text-bg-deep font-mono text-xs tracking-[0.18em] font-bold disabled:opacity-40"
        >
          COMMIT PAIRS
        </button>
      )}
    </CfuFrame>
  );
}

// ============================================================================
// 6) FILL — fill-in-the-blank
// ============================================================================

export function FillSlideView({
  slide,
  onResult,
  outcome,
  hintState,
}: {
  slide: FillSlide;
  onResult: (o: CfuOutcome) => void;
  outcome?: CfuOutcome;
  hintState?: HintState;
}) {
  const [values, setValues] = useState<Record<number, string>>({});
  const answered = !!outcome;

  function normalize(s: string) { return slide.caseSensitive ? s.trim() : s.trim().toLowerCase(); }

  function submit() {
    if (answered) return;
    const total = slide.blanks.length;
    let right = 0;
    for (const b of slide.blanks) {
      const v = normalize(values[b.index] ?? "");
      const ok = b.acceptedAnswers.some((a) => normalize(a) === v);
      if (ok) right++;
    }
    const fullyCorrect = right === total;
    onResult(scoreCfu({ scoring: slide.scoring, fullyCorrect, fraction: right / total }));
  }

  // Split template on {{N}} tokens and render input boxes inline.
  const parts: React.ReactNode[] = [];
  const re = /\{\{(\d+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slide.template)) !== null) {
    if (m.index > last) parts.push(<span key={`t${last}`}>{slide.template.slice(last, m.index)}</span>);
    const idx = parseInt(m[1], 10);
    const v = values[idx] ?? "";
    const correct = answered
      ? slide.blanks.find((b) => b.index === idx)?.acceptedAnswers.some((a) => normalize(a) === normalize(v)) ?? false
      : null;
    const ringClass =
      correct === true  ? "border-status-good bg-status-good/10" :
      correct === false ? "border-status-warn bg-status-warn/10" :
                          "border-accent-cyan bg-accent-cyan/5";
    if (slide.wordBank) {
      parts.push(
        <select
          key={`b${idx}`}
          value={v}
          onChange={(e) => setValues({ ...values, [idx]: e.target.value })}
          disabled={answered}
          className={`mx-1 px-2 py-1 border ${ringClass} rounded bg-bg-deep font-mono text-sm`}
        >
          <option value="">—</option>
          {slide.wordBank.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      );
    } else {
      parts.push(
        <input
          key={`b${idx}`}
          type="text"
          value={v}
          onChange={(e) => setValues({ ...values, [idx]: e.target.value })}
          disabled={answered}
          className={`mx-1 px-2 py-1 border ${ringClass} rounded bg-bg-deep font-mono text-sm w-32`}
          placeholder={slide.blanks.find((b) => b.index === idx)?.hint}
        />
      );
    }
    last = re.lastIndex;
  }
  if (last < slide.template.length) parts.push(<span key="tail">{slide.template.slice(last)}</span>);

  const allFilled = slide.blanks.every((b) => (values[b.index] ?? "").trim().length > 0);

  const feedback = answered
    ? { block: outcome.correct ? slide.feedback.correct : slide.feedback.wrongDefault,
        tone: (outcome.correct ? "success" : "failure") as "success" | "failure" }
    : null;

  return (
    <CfuFrame
      tag={slide.tag} tagTone={slide.tagTone}
      promptLabel={slide.prompt.label}
      scenario={slide.prompt.scenario}
      question={slide.prompt.question}
      feedback={feedback}
      hintState={hintState}
      answered={answered}
    >
      <div className="border border-border-mid bg-bg-panel-solid/40 rounded-md p-6 text-lg leading-relaxed">
        {parts}
      </div>
      {!answered && (
        <button
          onClick={submit}
          disabled={!allFilled}
          className="px-6 py-2 bg-accent-amber text-bg-deep font-mono text-xs tracking-[0.18em] font-bold disabled:opacity-40"
        >
          COMMIT
        </button>
      )}
    </CfuFrame>
  );
}

// ============================================================================
// 7) LABEL — drop labels onto regions of an image
// ============================================================================

export function LabelSlideView({
  slide,
  onResult,
  outcome,
  hintState,
}: {
  slide: LabelSlide;
  onResult: (o: CfuOutcome) => void;
  outcome?: CfuOutcome;
  hintState?: HintState;
}) {
  const [placements, setPlacements] = useState<Record<string, string | null>>(
    Object.fromEntries(slide.targets.map((t) => [t.id, null]))
  );
  const draggedRef = useRef<string | null>(null);
  const answered = !!outcome;

  function commit(next: Record<string, string | null>) {
    setPlacements(next);
    if (Object.values(next).every((v) => v !== null)) {
      const total = slide.targets.length;
      const right = slide.targets.filter((t) => next[t.id] === t.correctLabelId).length;
      onResult(scoreCfu({ scoring: slide.scoring, fullyCorrect: right === total, fraction: right / total }));
    }
  }

  function onDrop(targetId: string) {
    if (answered) return;
    const labelId = draggedRef.current;
    if (!labelId) return;
    draggedRef.current = null;
    // remove labelId from any previous target first
    const cleaned: Record<string, string | null> = {};
    for (const [tid, lid] of Object.entries(placements)) cleaned[tid] = lid === labelId ? null : lid;
    commit({ ...cleaned, [targetId]: labelId });
  }

  const placedLabelIds = new Set(Object.values(placements).filter(Boolean) as string[]);
  const unplacedLabels = slide.labels.filter((l) => !placedLabelIds.has(l.id));

  const feedback = answered
    ? { block: outcome.correct ? slide.feedback.correct : slide.feedback.wrongDefault,
        tone: (outcome.correct ? "success" : "failure") as "success" | "failure" }
    : null;

  return (
    <CfuFrame
      tag={slide.tag} tagTone={slide.tagTone}
      promptLabel={slide.prompt.label}
      scenario={slide.prompt.scenario}
      question={slide.prompt.question}
      feedback={feedback}
      hintState={hintState}
      answered={answered}
    >
      <div className="space-y-4">
        <div
          className="relative border border-border-mid bg-bg-panel-solid/40 rounded-md overflow-hidden"
          style={{ aspectRatio: slide.image.aspectRatio }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.image.src} alt={slide.image.alt} className="w-full h-full object-contain" />
          {slide.targets.map((t) => {
            const labelId = placements[t.id];
            const label = labelId ? slide.labels.find((l) => l.id === labelId) : null;
            const correct = answered && labelId ? labelId === t.correctLabelId : null;
            const border =
              correct === true  ? "border-status-good bg-status-good/20" :
              correct === false ? "border-status-warn bg-status-warn/20" :
              labelId ? "border-accent-cyan bg-accent-cyan/10" :
              "border-dashed border-border-mid";
            return (
              <div
                key={t.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(t.id)}
                className={`absolute border ${border} flex items-center justify-center text-xs font-mono`}
                style={{
                  left:   `${t.x * 100}%`,
                  top:    `${t.y * 100}%`,
                  width:  `${t.width * 100}%`,
                  height: `${t.height * 100}%`,
                }}
              >
                {label ? label.text : "·"}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {unplacedLabels.map((l) => (
            <div
              key={l.id}
              draggable={!answered}
              onDragStart={() => (draggedRef.current = l.id)}
              className="px-3 py-2 border border-border-strong bg-bg-panel-solid rounded-md font-mono text-sm cursor-grab active:cursor-grabbing"
            >
              {l.text}
            </div>
          ))}
        </div>
      </div>
    </CfuFrame>
  );
}

// ============================================================================
// 8) HIGHLIGHT — click words / spans inside a passage
// ============================================================================

export function HighlightSlideView({
  slide,
  onResult,
  outcome,
  hintState,
}: {
  slide: HighlightSlide;
  onResult: (o: CfuOutcome) => void;
  outcome?: CfuOutcome;
  hintState?: HintState;
}) {
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const answered = !!outcome;

  function togglePick(id: string) {
    if (answered) return;
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function submit() {
    if (answered) return;
    const correctSet = new Set(slide.correctIds);
    const correctPicks = [...picks].filter((p) => correctSet.has(p)).length;
    const wrongPicks   = [...picks].filter((p) => !correctSet.has(p)).length;
    const total = correctSet.size;
    const fullyCorrect = correctPicks === total && wrongPicks === 0;
    const fraction = Math.max(0, (correctPicks - wrongPicks) / total);
    onResult(scoreCfu({ scoring: slide.scoring, fullyCorrect, fraction }));
  }

  // Tokenize. mode=words splits on whitespace, each word is a clickable token
  // whose id is its lowercased form stripped of punctuation.
  function renderWords() {
    return slide.passage.split(/(\s+)/).map((tok, i) => {
      if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
      const id = tok.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isPicked = picks.has(id);
      const isCorrect = slide.correctIds.includes(id);
      const classes =
        !answered
          ? isPicked ? "bg-accent-amber/30 text-accent-amber-soft cursor-pointer" : "cursor-pointer hover:bg-bg-panel-solid"
          : isPicked && isCorrect ? "bg-status-good/30 text-status-good"
          : isPicked && !isCorrect ? "bg-status-warn/30 text-status-warn"
          : !isPicked && isCorrect ? "outline outline-1 outline-status-good/50"
          : "opacity-70";
      return (
        <span
          key={i}
          onClick={() => togglePick(id)}
          className={`px-0.5 rounded-sm ${classes}`}
        >
          {tok}
        </span>
      );
    });
  }

  function renderSpans() {
    if (!slide.spans) return slide.passage;
    const sorted = [...slide.spans].sort((a, b) => a.start - b.start);
    const out: React.ReactNode[] = [];
    let cursor = 0;
    sorted.forEach((s, i) => {
      if (s.start > cursor) out.push(<span key={`p${i}`}>{slide.passage.slice(cursor, s.start)}</span>);
      const isPicked = picks.has(s.id);
      const isCorrect = slide.correctIds.includes(s.id);
      const classes =
        !answered
          ? isPicked ? "bg-accent-amber/30 text-accent-amber-soft cursor-pointer" : "cursor-pointer hover:bg-bg-panel-solid"
          : isPicked && isCorrect ? "bg-status-good/30 text-status-good"
          : isPicked && !isCorrect ? "bg-status-warn/30 text-status-warn"
          : !isPicked && isCorrect ? "outline outline-1 outline-status-good/50"
          : "";
      out.push(
        <span key={`s${i}`} onClick={() => togglePick(s.id)} className={`px-0.5 rounded-sm ${classes}`}>
          {slide.passage.slice(s.start, s.end)}
        </span>
      );
      cursor = s.end;
    });
    if (cursor < slide.passage.length) out.push(<span key="tail">{slide.passage.slice(cursor)}</span>);
    return out;
  }

  const feedback = answered
    ? { block: outcome.correct ? slide.feedback.correct : slide.feedback.wrongDefault,
        tone: (outcome.correct ? "success" : "failure") as "success" | "failure" }
    : null;

  return (
    <CfuFrame
      tag={slide.tag} tagTone={slide.tagTone}
      promptLabel={slide.prompt.label}
      scenario={slide.prompt.scenario}
      question={slide.prompt.question}
      feedback={feedback}
      hintState={hintState}
      answered={answered}
    >
      <div className="border border-border-mid bg-bg-panel-solid/40 rounded-md p-6 text-lg leading-relaxed">
        {slide.mode === "words" ? renderWords() : renderSpans()}
      </div>
      {!answered && (
        <button
          onClick={submit}
          disabled={picks.size === 0}
          className="px-6 py-2 bg-accent-amber text-bg-deep font-mono text-xs tracking-[0.18em] font-bold disabled:opacity-40"
        >
          COMMIT SELECTION
        </button>
      )}
    </CfuFrame>
  );
}
