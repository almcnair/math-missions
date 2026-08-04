"use client";

import type { Mission } from "@/lib/mission-schema";

export function MissionMetaEditor({
  mission,
  onChange,
}: {
  mission: Mission;
  onChange: (m: Mission) => void;
}) {
  return (
    <div className="meta-editor">
      <div className="form-row">
        <label className="form-label">Mission ID (filename · cannot change after publish)</label>
        <input
          className="form-input"
          value={mission.id}
          onChange={(e) => onChange({ ...mission, id: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "-") })}
        />
        <p className="form-hint">Slug-style. Letters, numbers, dash, underscore. Example: <code>inherency-v1</code></p>
      </div>

      <div className="form-row">
        <label className="form-label">Title</label>
        <input className="form-input" value={mission.title} onChange={(e) => onChange({ ...mission, title: e.target.value })} />
      </div>

      <div className="form-row">
        <label className="form-label">Subtitle (optional)</label>
        <input className="form-input" value={mission.subtitle ?? ""} onChange={(e) => onChange({ ...mission, subtitle: e.target.value })} />
      </div>

      <div className="form-row">
        <label className="form-label">Tagline (one sentence, shown on bridge card)</label>
        <textarea
          className="form-textarea"
          rows={2}
          value={mission.tagline}
          onChange={(e) => onChange({ ...mission, tagline: e.target.value })}
        />
      </div>

      <div className="grid-2">
        <div className="form-row">
          <label className="form-label">Sector ID</label>
          <input className="form-input" value={mission.sectorId} onChange={(e) => onChange({ ...mission, sectorId: e.target.value })} />
        </div>
        <div className="form-row">
          <label className="form-label">Mission number</label>
          <input
            className="form-input"
            type="number"
            value={mission.number}
            onChange={(e) => onChange({ ...mission, number: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-row">
          <label className="form-label">Difficulty</label>
          <select
            className="form-input"
            value={mission.difficulty}
            onChange={(e) => onChange({ ...mission, difficulty: e.target.value as Mission["difficulty"] })}
          >
            <option value="intro">Intro</option>
            <option value="core">Core</option>
            <option value="advanced">Advanced</option>
            <option value="boss">Boss</option>
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">Estimated minutes</label>
          <input
            className="form-input"
            type="number"
            value={mission.estimatedMinutes}
            onChange={(e) => onChange({ ...mission, estimatedMinutes: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-row">
          <label className="form-label">Reward credits</label>
          <input
            className="form-input"
            type="number"
            value={mission.rewards.credits}
            onChange={(e) => onChange({ ...mission, rewards: { ...mission.rewards, credits: Number(e.target.value) } })}
          />
        </div>
        <div className="form-row">
          <label className="form-label">Rank XP</label>
          <input
            className="form-input"
            type="number"
            value={mission.rewards.rankXp}
            onChange={(e) => onChange({ ...mission, rewards: { ...mission.rewards, rankXp: Number(e.target.value) } })}
          />
        </div>
      </div>

      <div className="form-row">
        <label className="form-label">Protected vocab (comma-separated)</label>
        <input
          className="form-input"
          value={mission.protectedTerms.join(", ")}
          onChange={(e) => onChange({ ...mission, protectedTerms: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
        <p className="form-hint">Terms students should learn from this mission. Drives the Codex / glossary.</p>
      </div>

      <div className="grid-2">
        <div className="form-row">
          <label className="form-label">Prerequisites (comma-separated mission IDs)</label>
          <input
            className="form-input"
            value={mission.prerequisites.join(", ")}
            onChange={(e) => onChange({ ...mission, prerequisites: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
        </div>
        <div className="form-row">
          <label className="form-label">Unlocks (comma-separated mission IDs)</label>
          <input
            className="form-input"
            value={mission.unlocks.join(", ")}
            onChange={(e) => onChange({ ...mission, unlocks: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
        </div>
      </div>

      <fieldset className="meta-passing">
        <legend>Passing criteria</legend>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={mission.passingCriteria.requireAllCfu}
            onChange={(e) => onChange({ ...mission, passingCriteria: { ...mission.passingCriteria, requireAllCfu: e.target.checked } })}
          />
          Require all CFUs correct
        </label>
        <div className="form-row">
          <label className="form-label">Min correct CFUs (if above is off)</label>
          <input
            className="form-input"
            type="number"
            value={mission.passingCriteria.minCorrectCfu ?? 0}
            onChange={(e) => onChange({ ...mission, passingCriteria: { ...mission.passingCriteria, minCorrectCfu: Number(e.target.value) } })}
          />
        </div>
        <div className="form-row">
          <label className="form-label">When shields hit zero…</label>
          <select
            className="form-input"
            value={mission.passingCriteria.shieldsAtZero}
            onChange={(e) => onChange({ ...mission, passingCriteria: { ...mission.passingCriteria, shieldsAtZero: e.target.value as "warn" | "allow-continue" } })}
          >
            <option value="allow-continue">Allow continue (just a warning)</option>
            <option value="warn">Show warning</option>
          </select>
        </div>
      </fieldset>
    </div>
  );
}
