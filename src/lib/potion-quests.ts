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
    targetMultiplier: 2
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
    targetMultiplier: 3
  }
];
