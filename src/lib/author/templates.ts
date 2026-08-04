// Blank templates for missions and individual slides. Each blank value is the
// minimum valid shape for the type so the live preview can render immediately.

import type {
  Mission,
  Slide,
  SlideType,
  HookSlide,
  DefineSlide,
  ConceptSlide,
  StrategySlide,
  McqSlide,
  MultiSlide,
  SortSlide,
  OrderSlide,
  MatchSlide,
  FillSlide,
  LabelSlide,
  HighlightSlide,
  CompleteSlide,
} from "@/lib/mission-schema";

let uidCounter = 0;
function uid(prefix: string): string {
  uidCounter++;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter}`;
}

export function blankMission(idHint?: string): Mission {
  const id = idHint || `mission-${Date.now().toString(36)}`;
  return {
    id,
    campaignId: "policy-debate",
    sectorId: "core",
    number: 1,
    title: "Untitled Mission",
    subtitle: "",
    tagline: "Set a one-sentence tagline that lands on the bridge card.",
    estimatedMinutes: 10,
    difficulty: "core",
    rewards: { credits: 50, rankXp: 100 },
    unlocks: [],
    prerequisites: [],
    protectedTerms: [],
    passingCriteria: {
      requireAllCfu: true,
      shieldsAtZero: "allow-continue",
    },
    slides: [blankSlide("hook")],
  };
}

export function blankSlide(type: SlideType): Slide {
  switch (type) {
    case "hook":
      return {
        type: "hook",
        id: uid("hook"),
        headline: "Why does this matter?",
        body: [
          "Open with a question or scenario that makes the student lean in.",
          "Two or three short paragraphs is plenty.",
        ],
      } as HookSlide;

    case "define":
      return {
        type: "define",
        id: uid("def"),
        term: "Term",
        pronunciation: "TERM",
        definition: "The textbook definition goes here.",
        plainWords: "Now say it like a human.",
        analogy: "It's like ___.",
      } as DefineSlide;

    case "concept":
      return {
        type: "concept",
        id: uid("concept"),
        headline: "The Concept",
        intro: "One line of setup before the cards.",
        cards: [
          {
            id: uid("card"),
            icon: "✦",
            name: "First Idea",
            description: "Describe it in a sentence.",
            accent: "cyan",
          },
          {
            id: uid("card"),
            icon: "✧",
            name: "Second Idea",
            description: "Describe it in a sentence.",
            accent: "amber",
          },
        ],
      } as ConceptSlide;

    case "strategy":
      return {
        type: "strategy",
        id: uid("strat"),
        headline: "How to Use It",
        intro: "One line of setup.",
        rows: [
          {
            name: "Move 1",
            description: "What to do, in plain words.",
            counter: { label: "Counter", text: "What an opponent might say." },
          },
        ],
      } as StrategySlide;

    case "cfu-mcq":
      return {
        type: "cfu-mcq",
        id: uid("mcq"),
        prompt: {
          label: "CHECK FOR UNDERSTANDING",
          question: "Which of these is the best answer?",
        },
        options: [
          { id: "a", letter: "A", text: "Option A" },
          { id: "b", letter: "B", text: "Option B" },
          { id: "c", letter: "C", text: "Option C" },
          { id: "d", letter: "D", text: "Option D" },
        ],
        correctOptionId: "a",
        scoring: {
          creditsOnCorrect: 10,
          shieldOnWrong: true,
          breaksStreakOnWrong: true,
        },
        feedback: {
          correct: { title: "Correct!", body: ["Explain why this is right."] },
          wrongDefault: {
            title: "Not quite.",
            body: ["Nudge them toward the right thinking."],
          },
        },
      } as McqSlide;

    case "cfu-multi":
      return {
        type: "cfu-multi",
        id: uid("multi"),
        prompt: {
          label: "PICK ALL THAT APPLY",
          question: "Which of these are true?",
        },
        options: [
          { id: "a", letter: "A", text: "Option A" },
          { id: "b", letter: "B", text: "Option B" },
          { id: "c", letter: "C", text: "Option C" },
          { id: "d", letter: "D", text: "Option D" },
        ],
        correctOptionIds: ["a", "c"],
        scoring: {
          creditsOnCorrect: 15,
          shieldOnWrong: true,
          breaksStreakOnWrong: true,
          mode: "all-or-nothing",
        },
        feedback: {
          correct: { title: "Correct!", body: ["Explain the pattern."] },
          wrongDefault: {
            title: "Not quite.",
            body: ["Reread and try again."],
          },
        },
      } as MultiSlide;

    case "cfu-sort":
      return {
        type: "cfu-sort",
        id: uid("sort"),
        prompt: {
          label: "SORT INTO BINS",
          question: "Drop each card into the right bin.",
        },
        bins: [
          { id: "bin1", icon: "①", label: "Bin 1", accent: "cyan" },
          { id: "bin2", icon: "②", label: "Bin 2", accent: "amber" },
        ],
        cards: [
          { id: "c1", text: "Card 1", correctBinId: "bin1" },
          { id: "c2", text: "Card 2", correctBinId: "bin2" },
          { id: "c3", text: "Card 3", correctBinId: "bin1" },
          { id: "c4", text: "Card 4", correctBinId: "bin2" },
        ],
        allowPartialCredit: true,
        scoring: {
          creditsOnCorrect: 15,
          shieldOnWrong: true,
          breaksStreakOnWrong: true,
          mode: "partial",
        },
        feedback: {
          correct: { title: "Sorted!", body: ["You see the pattern."] },
          wrongDefault: { title: "Try again.", body: ["Re-read each card."] },
        },
      } as SortSlide;

    case "cfu-order":
      return {
        type: "cfu-order",
        id: uid("order"),
        prompt: { label: "ARRANGE IN ORDER", question: "Put these in the right order." },
        intro: "",
        items: [
          { id: "i1", text: "First step", correctPosition: 1 },
          { id: "i2", text: "Second step", correctPosition: 2 },
          { id: "i3", text: "Third step", correctPosition: 3 },
        ],
        scoring: {
          creditsOnCorrect: 15,
          shieldOnWrong: true,
          breaksStreakOnWrong: true,
          mode: "all-or-nothing",
        },
        feedback: {
          correct: { title: "Right order.", body: ["You've got the flow."] },
          wrongDefault: { title: "Out of order.", body: ["Reread and try again."] },
        },
      } as OrderSlide;

    case "cfu-match":
      return {
        type: "cfu-match",
        id: uid("match"),
        prompt: { label: "MATCH PAIRS", question: "Connect each item on the left to its match on the right." },
        leftColumn: {
          label: "Left",
          items: [
            { id: "l1", text: "A", pairId: "p1" },
            { id: "l2", text: "B", pairId: "p2" },
          ],
        },
        rightColumn: {
          label: "Right",
          items: [
            { id: "r1", text: "1", pairId: "p1" },
            { id: "r2", text: "2", pairId: "p2" },
          ],
        },
        scoring: {
          creditsOnCorrect: 15,
          shieldOnWrong: true,
          breaksStreakOnWrong: true,
          mode: "all-or-nothing",
        },
        feedback: {
          correct: { title: "Matched.", body: ["Nicely done."] },
          wrongDefault: { title: "Try again.", body: ["Look at the relationships."] },
        },
      } as MatchSlide;

    case "cfu-fill":
      return {
        type: "cfu-fill",
        id: uid("fill"),
        prompt: { label: "FILL IN THE BLANK", question: "Complete the sentence." },
        template: "A claim must have a {{0}} that supports it.",
        blanks: [
          { index: 0, acceptedAnswers: ["warrant", "reason"] },
        ],
        caseSensitive: false,
        scoring: {
          creditsOnCorrect: 10,
          shieldOnWrong: true,
          breaksStreakOnWrong: true,
        },
        feedback: {
          correct: { title: "Yes.", body: ["That's it."] },
          wrongDefault: { title: "Not quite.", body: ["Hint goes here."] },
        },
      } as FillSlide;

    case "cfu-label":
      return {
        type: "cfu-label",
        id: uid("label"),
        prompt: { label: "LABEL THE DIAGRAM", question: "Drop each label onto the right spot." },
        image: { src: "", alt: "Diagram", aspectRatio: 1.5 },
        targets: [
          { id: "t1", x: 20, y: 20, width: 30, height: 30, correctLabelId: "lbl1" },
          { id: "t2", x: 60, y: 60, width: 30, height: 30, correctLabelId: "lbl2" },
        ],
        labels: [
          { id: "lbl1", text: "Label 1" },
          { id: "lbl2", text: "Label 2" },
        ],
        scoring: {
          creditsOnCorrect: 15,
          shieldOnWrong: true,
          breaksStreakOnWrong: true,
          mode: "all-or-nothing",
        },
        feedback: {
          correct: { title: "Labeled.", body: ["You see the structure."] },
          wrongDefault: { title: "Try again.", body: ["Look more carefully."] },
        },
      } as LabelSlide;

    case "cfu-highlight":
      return {
        type: "cfu-highlight",
        id: uid("hl"),
        prompt: { label: "HIGHLIGHT THE EVIDENCE", question: "Click each word that proves the claim." },
        passage: "The status quo is broken because nothing is currently working.",
        mode: "words",
        correctIds: [],
        scoring: {
          creditsOnCorrect: 10,
          shieldOnWrong: true,
          breaksStreakOnWrong: true,
          mode: "partial",
        },
        feedback: {
          correct: { title: "Spotted.", body: ["Good eye."] },
          wrongDefault: { title: "Look again.", body: ["Find the proof, not the claim."] },
        },
      } as HighlightSlide;

    case "complete":
      return {
        type: "complete",
        id: uid("done"),
        headline: "Mission Complete",
        subtext: "You did it.",
        rewards: [
          { icon: "◇", label: "Credits", dynamicValue: "credits" },
          { icon: "⬢", label: "Rank XP", dynamicValue: "rank-delta" },
          { icon: "✓", label: "Accuracy", dynamicValue: "accuracy" },
        ],
        primaryCta: { label: "Continue", action: "return-bridge" },
      } as CompleteSlide;

    default:
      // Should never happen — exhaustive check.
      throw new Error(`Unknown slide type: ${type as string}`);
  }
}

export const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  hook: "Hook",
  define: "Define",
  concept: "Concept",
  strategy: "Strategy",
  "cfu-mcq": "CFU · Multiple Choice",
  "cfu-multi": "CFU · Multi-Select",
  "cfu-sort": "CFU · Sort into Bins",
  "cfu-order": "CFU · Put in Order",
  "cfu-match": "CFU · Match Pairs",
  "cfu-fill": "CFU · Fill the Blank",
  "cfu-label": "CFU · Label Diagram",
  "cfu-highlight": "CFU · Highlight Evidence",
  complete: "Complete",
};

export const SLIDE_TYPE_GROUPS: { label: string; types: SlideType[] }[] = [
  { label: "Content", types: ["hook", "define", "concept", "strategy"] },
  {
    label: "Check for Understanding",
    types: ["cfu-mcq", "cfu-multi", "cfu-sort", "cfu-order", "cfu-match", "cfu-fill", "cfu-label", "cfu-highlight"],
  },
  { label: "Closing", types: ["complete"] },
];
