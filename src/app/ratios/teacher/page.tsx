"use client";
import { useState } from "react";

type Student = {
  playerName: string;
  questsCompleted: number;
  totalWrongAttempts: number;
  lastCompletedAt: string;
  quests: {
    questId: number;
    questTitle: string;
    targetMultiplier: number;
    wrongAttempts: number;
    completedAt: string;
  }[];
};

type StatsResponse = {
  summary: {
    totalStudents: number;
    totalCompletions: number;
    totalWrongAttempts: number;
  };
  students: Student[];
};

export default function TeacherMathGuidePage() {
  const [pin, setPin] = useState("");
  const [unlockedPin, setUnlockedPin] = useState<string | null>(null);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const unlock = async (enteredPin: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ratios/teacher?pin=${encodeURIComponent(enteredPin)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Incorrect PIN");
      }
      const json = (await res.json()) as StatsResponse;
      setData(json);
      setUnlockedPin(enteredPin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setUnlockedPin(null);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    if (unlockedPin) unlock(unlockedPin);
  };

  if (!unlockedPin) {
    return (
      <main className="min-h-screen bg-[#0b0c10] flex items-center justify-center px-4">
        <div className="bg-[#141625] border border-[#24273e] rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">👩‍🏫</div>
          <h1 className="text-white text-xl font-bold mb-2">Teacher Math Guide</h1>
          <p className="text-slate-400 text-sm mb-6">Enter your PIN to view ratios game statistics.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pin.trim()) unlock(pin.trim());
            }}
          >
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              autoFocus
              className="bg-black/30 border border-[#3b3f58] text-white text-center text-2xl tracking-[0.5em] rounded-lg px-4 py-3 w-full mb-4 focus:outline-none focus:border-purple-500"
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? "Checking..." : "Unlock"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0c10] px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold flex items-center gap-2">👩‍🏫 Teacher Math Guide</h1>
            <p className="text-slate-400 text-sm mt-1">Potion Pantry (/ratios) student statistics</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refresh}
              className="border border-white/10 text-slate-300 px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition"
            >
              🔄 Refresh
            </button>
            <a
              href={`/api/ratios/teacher/export?pin=${encodeURIComponent(unlockedPin)}`}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              ⬇️ Download CSV
            </a>
          </div>
        </div>

        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-[#141625] border border-[#24273e] rounded-xl p-5">
                <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">Students</div>
                <div className="text-white text-3xl font-bold">{data.summary.totalStudents}</div>
              </div>
              <div className="bg-[#141625] border border-[#24273e] rounded-xl p-5">
                <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">Quests Completed</div>
                <div className="text-white text-3xl font-bold">{data.summary.totalCompletions}</div>
              </div>
              <div className="bg-[#141625] border border-[#24273e] rounded-xl p-5">
                <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">Total Wrong Attempts</div>
                <div className="text-white text-3xl font-bold">{data.summary.totalWrongAttempts}</div>
              </div>
            </div>

            <div className="bg-[#141625] border border-[#24273e] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-black/30 text-slate-400 text-left">
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Quests Completed</th>
                    <th className="px-4 py-3 font-semibold">Wrong Attempts</th>
                    <th className="px-4 py-3 font-semibold">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        No completions yet. Stats will appear here as students play /ratios.
                      </td>
                    </tr>
                  ) : (
                    data.students.map((s) => (
                      <tr key={s.playerName} className="border-t border-white/5">
                        <td className="px-4 py-3 text-white font-medium">{s.playerName}</td>
                        <td className="px-4 py-3 text-slate-300">{s.questsCompleted}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {s.totalWrongAttempts > 0 ? (
                            <span className="text-amber-400">{s.totalWrongAttempts}</span>
                          ) : (
                            <span className="text-green-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(s.lastCompletedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
