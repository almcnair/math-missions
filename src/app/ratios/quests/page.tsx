import Link from 'next/link';
import { QUESTS } from '@/lib/potion-quests';

export default function AllQuestsPage() {
  return (
    <main className="min-h-screen bg-[#0b0c10] overflow-x-hidden">
      {/* Top Nav */}
      <nav className="bg-[#050508] border-b border-[#24273e] px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-50">
        <div className="text-white font-bold text-lg flex items-center gap-2">
          ✨ The Potion Pantry
        </div>
        <div className="flex gap-4 sm:gap-8 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <Link href="/bridge" className="text-slate-400 hover:text-slate-300 font-medium text-sm shrink-0 transition">📜 Story Quests</Link>
          <Link href="/ratios/quests" className="text-yellow-400 border-b-2 border-yellow-400 pb-1 font-semibold text-sm shrink-0">📖 All Quests</Link>
          <Link href="/ratios/teacher" className="text-slate-400 hover:text-slate-300 font-medium text-sm shrink-0 transition">👩‍🏫 Teacher Math Guide</Link>
        </div>
        <button className="hidden sm:flex items-center gap-2 border border-white/10 text-slate-400 px-3 py-1.5 rounded-md text-xs hover:bg-white/5 transition">
          T Dyslexia Font
        </button>
      </nav>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-8">
          <h1 className="text-white text-3xl sm:text-4xl font-extrabold flex items-center gap-3">📖 All Quests</h1>
          <p className="text-slate-400 mt-2">Pick any potion to brew — jump straight into any quest, in any order.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {QUESTS.map((quest) => (
            <div key={quest.id} className="bg-[#141625] border border-[#24273e] rounded-xl p-6 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">
                    Quest {quest.id}
                  </div>
                  <h2 className="text-white text-xl font-bold">{quest.title}</h2>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-amber-400 text-sm tracking-tight" aria-hidden="true">
                      {"★".repeat(quest.difficulty)}
                      <span className="text-slate-700">{"★".repeat(5 - quest.difficulty)}</span>
                    </span>
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">{quest.difficultyLabel}</span>
                  </div>
                </div>
                <div className="bg-yellow-400/10 border border-yellow-400/40 text-yellow-400 px-3 py-1.5 rounded-lg font-extrabold text-lg whitespace-nowrap">
                  🎯 {quest.targetMultiplier}x
                </div>
              </div>

              <div className="text-slate-400 text-sm italic mb-4">
                "{quest.dialogue}"
              </div>

              <div className="bg-black/20 border border-[#3b3f58] rounded-lg p-4 mb-4">
                <div className="font-semibold text-white text-sm mb-2">🧪 {quest.recipe.name}</div>
                <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">Base Ratio</div>
                <div className="text-white text-2xl sm:text-3xl font-extrabold flex items-center flex-wrap gap-2 leading-tight">
                  {quest.ingredients.map((ing, idx) => (
                    <span key={ing.id} className="flex items-center gap-2">
                      {idx > 0 && <span className="mx-1 text-slate-500">:</span>}
                      {ing.emoji} <span className="text-yellow-400">{ing.baseAmount}</span>
                    </span>
                  ))}
                </div>
              </div>

              <Link
                href={`/ratios?quest=${quest.id}`}
                className="mt-auto bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg px-4 py-3 text-center transition"
              >
                ▶ Play This Quest
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
