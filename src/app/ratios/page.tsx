"use client";
import Link from 'next/link';
import PotionGame from '@/components/game/PotionGame';

export default function RatiosPage() {
  return (
    <main className="min-h-screen bg-[#0b0c10] overflow-x-hidden">
      {/* Top Nav */}
      <nav className="bg-[#050508] border-b border-[#24273e] px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-50">
        <div className="text-white font-bold text-lg flex items-center gap-2">
          ✨ The Potion Pantry
        </div>
        <div className="flex gap-4 sm:gap-8 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <Link href="/bridge" className="text-yellow-400 border-b-2 border-yellow-400 pb-1 font-semibold text-sm shrink-0">📜 Story Quests</Link>
          <a href="#" className="text-slate-400 hover:text-slate-300 font-medium text-sm shrink-0 transition">📖 Recipe Grimoire</a>
          <Link href="/ratios/teacher" className="text-slate-400 hover:text-slate-300 font-medium text-sm shrink-0 transition">👩‍🏫 Teacher Math Guide</Link>
        </div>
        <button className="hidden sm:flex items-center gap-2 border border-white/10 text-slate-400 px-3 py-1.5 rounded-md text-xs hover:bg-white/5 transition">
          T Dyslexia Font
        </button>
      </nav>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 min-h-[calc(100vh-80px)] flex flex-col">
        <PotionGame />
      </div>
    </main>
  );
}
