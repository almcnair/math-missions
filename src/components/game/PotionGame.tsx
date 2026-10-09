"use client";
import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Creepster } from 'next/font/google';
import { playSound } from '@/lib/audio';
import styles from './PotionGame.module.css';

const creepster = Creepster({ weight: '400', subsets: ['latin'], variable: '--font-potion-instruction' });

// Our quest data structure
const QUESTS = [
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

export default function PotionGame() {
  const [currentQuestIndex, setCurrentQuestIndex] = useState(0);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  // Counts how many times the cauldron reached the right TOTAL item count
  // but the wrong ratio, before the student finally nailed it. Reported to
  // the Teacher Math Guide as a "struggling vs. clicking through" signal.
  const wrongAttemptsRef = useRef(0);
  const lastWrongCheckTotalRef = useRef<number | null>(null);

  const quest = QUESTS[currentQuestIndex];

  // Initialize amounts when quest changes
  useEffect(() => {
    const initial: Record<string, number> = {};
    quest.ingredients.forEach(i => initial[i.id] = 0);
    setAmounts(initial);
    setIsSuccess(false);
    wrongAttemptsRef.current = 0;
    lastWrongCheckTotalRef.current = null;
  }, [currentQuestIndex]);

  const handleAdjust = (ingId: string, delta: number) => {
    if (isSuccess) return; // Frozen on success

    setAmounts(prev => {
      const current = prev[ingId] || 0;
      const next = Math.max(0, current + delta);
      if (next !== current) {
        playSound('plop');
      }
      return { ...prev, [ingId]: next };
    });
  };

  // Check victory condition
  useEffect(() => {
    // Need at least one item
    const totalItems = Object.values(amounts).reduce((a,b) => a+b, 0);
    if (totalItems === 0) return;

    // Check if ratio matches exactly AND target multiplier is met
    let isCorrectRatio = true;
    let currentMultiplier = 0;

    for (const ing of quest.ingredients) {
      const currentAmt = amounts[ing.id];
      if (currentAmt === 0 || currentAmt % ing.baseAmount !== 0) {
        isCorrectRatio = false;
        break;
      }
      const mult = currentAmt / ing.baseAmount;
      if (currentMultiplier === 0) {
        currentMultiplier = mult;
      } else if (mult !== currentMultiplier) {
        isCorrectRatio = false;
        break;
      }
    }

    const targetTotal = quest.ingredients.reduce(
      (acc, ing) => acc + ing.baseAmount * quest.targetMultiplier,
      0
    );

    if (isCorrectRatio && currentMultiplier === quest.targetMultiplier && !isSuccess) {
      handleSuccess();
    } else if (
      !isSuccess &&
      totalItems === targetTotal &&
      !isCorrectRatio &&
      lastWrongCheckTotalRef.current !== totalItems
    ) {
      // Student hit the right total item count but the wrong mix — count it
      // as a wrong attempt once per time they land on that total (avoids
      // double-counting while they fiddle with +/- around the same total).
      wrongAttemptsRef.current += 1;
      lastWrongCheckTotalRef.current = totalItems;
      playSound('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amounts, isSuccess, quest]);

  const handleSuccess = () => {
    setIsSuccess(true);
    playSound('success');
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#a855f7', '#fde047', '#34d399']
    });

    // Fire-and-forget telemetry for the Teacher Math Guide. Never blocks or
    // breaks gameplay if it fails (table missing, offline, etc.).
    fetch('/api/ratios/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: playerName || 'Anonymous Alchemist',
        questId: quest.id,
        questTitle: quest.title,
        targetMultiplier: quest.targetMultiplier,
        wrongAttempts: wrongAttemptsRef.current,
      }),
    }).catch(() => {
      // Ignore — telemetry is best-effort only.
    });

    // If beat quest 1 and no name, ask for it
    if (currentQuestIndex === 0 && !playerName) {
      setTimeout(() => setShowNameModal(true), 2000);
    }
  };

  const nextQuest = () => {
    if (currentQuestIndex < QUESTS.length - 1) {
      setCurrentQuestIndex(prev => prev + 1);
    }
  };

  // Calculate cauldron state
  const totalInCauldron = Object.values(amounts).reduce((a,b) => a+b, 0);

  // Cauldron color logic
  let cauldronColor = '#1e1b4b'; // Empty dark
  if (totalInCauldron > 0) {
     if (isSuccess) cauldronColor = '#a855f7'; // Perfect purple
     else cauldronColor = '#3f3f46'; // Sludge grey when mixing
  }

  return (
    <div className={`w-full ${creepster.variable}`}>

      {/* Name Onboarding Modal */}
      {showNameModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.animatePop}`}>
            <h2 className="text-2xl font-bold text-white mb-2">Incredible Brewing! ✨</h2>
            <p className="text-gray-400 mb-6">You've mastered the first spell. What should we call you in the Grimoire records?</p>

            <input
              type="text"
              placeholder="Enter your Alchemist Name..."
              className={styles.inputField}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  setPlayerName(e.currentTarget.value);
                  setShowNameModal(false);
                  nextQuest();
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-2">Press Enter to save</p>
          </div>
        </div>
      )}

      {/* Professor Bramble Box */}
      <div className="bg-[#141625] border border-[#24273e] rounded-xl p-4 sm:p-6 flex items-start gap-4 mb-6 relative overflow-hidden">
        <div className="w-12 h-12 bg-[#2a1b38] rounded-xl flex items-center justify-center text-2xl border border-purple-500 shrink-0 z-10">
          🧙‍♂️
        </div>
        <div className="flex-1 z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white">Professor Bramble</span>
            <span className="text-slate-400 text-sm hidden sm:inline">Academy Caretaker •</span>
            <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded font-semibold">Level {currentQuestIndex + 1}</span>
          </div>
          <div className="text-slate-400 italic text-sm sm:text-base mb-3">
            "{quest.dialogue}"
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400/10 border-2 border-yellow-400/40 text-yellow-400 px-5 py-3 rounded-xl font-extrabold text-3xl sm:text-4xl leading-tight">
              🎯 Target: {quest.targetMultiplier}x
            </div>
          </div>
        </div>
      </div>

      {/* Main Station */}
      <div className="bg-[#141625] border border-[#24273e] rounded-xl p-4 sm:p-6">

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-400/10 text-yellow-400 rounded-lg flex items-center justify-center">✨</div>
            <div>
              <h2 className="text-white font-semibold m-0 text-base sm:text-lg">Alchemist's Brewing Station</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT: Inputs */}
          <div>
            <div className="bg-black/20 border border-[#3b3f58] rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <div className="font-semibold text-white text-sm">📖 {quest.recipe.name}</div>
                <div className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-semibold">
                  1 Batch = {quest.recipe.batchSize} items
                </div>
              </div>
              <div className="mb-3">
                <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">Base Ratio</div>
                <div className="text-white text-3xl sm:text-4xl font-extrabold flex items-center flex-wrap gap-2 leading-tight">
                  {quest.ingredients.map((ing, idx) => (
                    <React.Fragment key={ing.id}>
                      {idx > 0 && <span className="mx-1 text-slate-500">:</span>}
                      {ing.emoji} <span className="text-yellow-400">{ing.baseAmount}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.spookyInstructions}>
              Add ingredients by pressing the + button... 🔮
            </div>

            <div className="space-y-3">
              {quest.ingredients.map(ing => (
                <div key={ing.id} className="bg-black/20 border border-[#3b3f58] rounded-xl p-3 sm:p-4 flex justify-between items-center transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-xl sm:text-2xl">
                      {ing.emoji}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm sm:text-base m-0">{ing.name}</h3>
                      <p className="text-slate-400 text-xs m-0">Base: {ing.baseAmount}</p>
                    </div>
                  </div>
                  <div className="flex items-center bg-[#1e293b] border border-slate-700 rounded-lg p-1">
                    <button
                      onClick={() => handleAdjust(ing.id, -1)}
                      className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white text-xl rounded-md hover:bg-white/10 active:scale-95 transition disabled:opacity-50"
                      disabled={isSuccess || amounts[ing.id] === 0}
                    >
                      -
                    </button>
                    <div className="w-10 sm:w-12 text-center text-white font-bold text-base sm:text-lg">
                      {amounts[ing.id]}
                    </div>
                    <button
                      onClick={() => handleAdjust(ing.id, 1)}
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-600 hover:bg-orange-500 active:scale-95 flex items-center justify-center text-white text-xl rounded-md transition disabled:opacity-50"
                      disabled={isSuccess}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Cauldron */}
          <div className="bg-[#1e1b4b] border border-[#3b3f58] rounded-xl p-6 flex flex-col relative overflow-hidden min-h-[400px]">
            {/* Glow backdrop */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-[60px] pointer-events-none" />

            <div className="flex justify-between items-start z-10 relative">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2 mb-1">
                  🧪 {quest.recipe.name}
                </h3>
                <p className="text-slate-400 text-sm m-0">Total Contents: {totalInCauldron} items</p>
              </div>
              {isSuccess && (
                <div className={`border border-green-500 text-green-400 bg-green-500/10 px-3 py-1 rounded-full text-xs font-semibold ${styles.animatePop}`}>
                  ✓ Balanced ({quest.targetMultiplier}x)
                </div>
              )}
            </div>

            <div className="flex-1 flex justify-center items-center my-8 z-10 relative">
              <svg viewBox="0 0 200 150" className="w-[280px] h-[200px] drop-shadow-2xl">
                <ellipse cx="100" cy="140" rx="70" ry="12" fill="rgba(0,0,0,0.6)" />
                <path d="M 45 90 L 20 145 L 40 145 Z" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1"/>
                <path d="M 155 90 L 180 145 L 160 145 Z" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1"/>
                <path d="M 30 50 C 30 135, 170 135, 170 50 Z" fill="#0f172a" stroke="#334155" strokeWidth="2"/>
                <path d="M 30 70 C 10 70, 10 95, 30 95" fill="none" stroke="#64748b" strokeWidth="4" strokeLinecap="round"/>
                <path d="M 170 70 C 190 70, 190 95, 170 95" fill="none" stroke="#64748b" strokeWidth="4" strokeLinecap="round"/>

                {/* Dynamic Liquid */}
                <ellipse cx="100" cy="50" rx="70" ry="15" fill={cauldronColor} stroke={isSuccess ? "#fde047" : "#b45309"} strokeWidth="4" className="transition-colors duration-500"/>

                {/* Bubbles if mixing */}
                {totalInCauldron > 0 && !isSuccess && (
                  <g className={`${styles.bubbling} transition-opacity duration-300`}>
                    <circle cx="80" cy="45" r="4" fill="#a1a1aa" />
                    <circle cx="120" cy="55" r="3" fill="#a1a1aa" />
                    <circle cx="105" cy="40" r="5" fill="#a1a1aa" />
                  </g>
                )}
              </svg>
            </div>

            <div className="z-10 relative mt-auto">
              {isSuccess ? (
                <div className={`bg-slate-900/80 border border-green-500 rounded-lg p-4 flex flex-col gap-2 ${styles.animatePop}`}>
                  <div className="text-green-400 font-semibold text-sm flex items-center gap-2">
                    ✨ QUEST COMPLETE! +100 XP
                  </div>
                  <p className="text-slate-400 text-sm m-0">You perfectly matched the ratio for {quest.targetMultiplier} batches.</p>
                  {playerName && currentQuestIndex < QUESTS.length - 1 && (
                     <button
                       onClick={nextQuest}
                       className="mt-2 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition"
                     >
                       Next Quest ➡️
                     </button>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex gap-3 items-center">
                  <div className="text-xl opacity-50">🔥</div>
                  <div>
                    <h4 className="text-slate-400 text-sm font-semibold m-0 mb-1">
                      {totalInCauldron === 0 ? "CAULDRON IS EMPTY" : "MIXING INGREDIENTS..."}
                    </h4>
                    <p className="text-slate-500 text-xs m-0">
                      {totalInCauldron === 0
                        ? "Add ingredients using the (+) buttons below."
                        : "Match the ratio to finish brewing."}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
