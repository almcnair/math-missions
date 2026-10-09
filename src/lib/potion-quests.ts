// Shared quest data for the Potion Pantry ratio game (/ratios). Both the
// game itself (PotionGame.tsx) and the "All Quests" picker
// (src/app/ratios/quests/page.tsx) read from this single source of truth.

export type Ingredient = {
  id: string;
  name: string;
  emoji: string;
  baseAmount: number;
};

export type Quest = {
  id: number;
  title: string;
  dialogue: string;
  recipe: { name: string; batchSize: number };
  ingredients: Ingredient[];
  targetMultiplier: number;
  /** 1 (easiest) through 5 (hardest) — shown as star rating on the All Quests page. */
  difficulty: number;
  difficultyLabel: string;
};

export const QUESTS: Quest[] = [
  {
    id: 1,
    title: "Double the Recipe",
    dialogue: "Greetings young apprentice! I need twice as much Elixir of Levitation for tomorrow's ceiling dusting. Please brew 2x the recipe!",
    recipe: { name: "Elixir of Levitation", batchSize: 5 },
    ingredients: [
      { id: 'dragon', name: 'Dragon Scales', emoji: '🐉', baseAmount: 2 },
      { id: 'moon', name: 'Moonstones', emoji: '🌙', baseAmount: 3 }
    ],
    targetMultiplier: 2,
    difficulty: 1,
    difficultyLabel: "Beginner"
  },
  {
    id: 2,
    title: "Triple the Sunflare",
    dialogue: "Excellent work! Now, we have a large order from the Academy of Light. They need three times the usual Sunflare Draught.",
    recipe: { name: "Sunflare Draught", batchSize: 5 },
    ingredients: [
      { id: 'sun', name: 'Sun Motes', emoji: '☀️', baseAmount: 1 },
      { id: 'ember', name: 'Phoenix Embers', emoji: '🔥', baseAmount: 4 }
    ],
    targetMultiplier: 3,
    difficulty: 1,
    difficultyLabel: "Beginner"
  },
  {
    id: 3,
    title: "The Fading Draught",
    dialogue: "The veil grows thin tonight... I need a Fading Draught to slip past the night watchmen. Quadruple the recipe — four full batches, no less!",
    recipe: { name: "Fading Draught", batchSize: 7 },
    ingredients: [
      { id: 'shadow', name: 'Shadow Essence', emoji: '🌑', baseAmount: 2 },
      { id: 'moonpetal', name: 'Moonpetals', emoji: '🥀', baseAmount: 5 }
    ],
    targetMultiplier: 4,
    difficulty: 2,
    difficultyLabel: "Easy"
  },
  {
    id: 4,
    title: "Potion of the Giants",
    dialogue: "The giants at the eastern gate demand a toll — five full batches of my strongest Giant's Vigor, or none of us cross tonight!",
    recipe: { name: "Giant's Vigor", batchSize: 7 },
    ingredients: [
      { id: 'root', name: "Giant's Root", emoji: '🌳', baseAmount: 3 },
      { id: 'thunder', name: 'Thunder Dust', emoji: '⚡', baseAmount: 4 }
    ],
    targetMultiplier: 5,
    difficulty: 2,
    difficultyLabel: "Easy"
  },
  {
    id: 5,
    title: "Triple Threat Tonic",
    dialogue: "Three creatures, three curses to cure — spider, bat, and newt all need calming tonight. Mix me two batches of the Triple Threat Tonic, exactly as written.",
    recipe: { name: "Triple Threat Tonic", batchSize: 6 },
    ingredients: [
      { id: 'silk', name: 'Spider Silk', emoji: '🕸️', baseAmount: 2 },
      { id: 'wing', name: 'Bat Wing', emoji: '🦇', baseAmount: 3 },
      { id: 'eye', name: 'Newt Eye', emoji: '🦎', baseAmount: 1 }
    ],
    targetMultiplier: 2,
    difficulty: 3,
    difficultyLabel: "Medium"
  },
  {
    id: 6,
    title: "The Grand Elixir",
    dialogue: "For the Harvest Ball, the Headmistress demands nothing less than the Grand Elixir — and she wants triple the usual batch, down to the very last drop.",
    recipe: { name: "Grand Elixir", batchSize: 9 },
    ingredients: [
      { id: 'feather', name: 'Raven Feather', emoji: '🪶', baseAmount: 2 },
      { id: 'salt', name: 'Black Salt', emoji: '🧂', baseAmount: 3 },
      { id: 'pepper', name: 'Ghost Pepper', emoji: '🌶️', baseAmount: 4 }
    ],
    targetMultiplier: 3,
    difficulty: 4,
    difficultyLabel: "Hard"
  },
  {
    id: 7,
    title: "Master Alchemist's Challenge",
    dialogue: "Only a true Master Alchemist can brew this one. Four full batches, three rare ingredients, no room for error — prove your mastery of the craft.",
    recipe: { name: "Philosopher's Draught", batchSize: 10 },
    ingredients: [
      { id: 'blood', name: "Dragon's Blood", emoji: '🩸', baseAmount: 3 },
      { id: 'venom', name: 'Spider Venom', emoji: '🕷️', baseAmount: 5 },
      { id: 'crystal', name: 'Crystal Dust', emoji: '💎', baseAmount: 2 }
    ],
    targetMultiplier: 4,
    difficulty: 5,
    difficultyLabel: "Expert"
  }
];
