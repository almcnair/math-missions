"use client";

// Top-level authoring workspace. Three panes:
//   [Sidebar: mission list] [Center: slide list + editor] [Right: live preview]

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { Mission, Slide, SlideType } from "@/lib/mission-schema";
import {
  actionList,
  actionRead,
  actionSave,
  actionDelete,
  actionPublish,
  actionDeploy,
} from "@/lib/author/actions";
import type { DeployResult } from "@/lib/author/deploy";
import type { MissionListItem } from "@/lib/author/storage";
import { blankMission, blankSlide, SLIDE_TYPE_LABELS, SLIDE_TYPE_GROUPS } from "@/lib/author/templates";
import { SlideEditor } from "./SlideEditor";
import { SlidePreview } from "./SlidePreview";
import { MissionMetaEditor } from "./MissionMetaEditor";

type SaveState = "saved" | "dirty" | "saving" | "error";

export function AuthorWorkspace() {
  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [showMeta, setShowMeta] = useState(false);
  const [showAddSlide, setShowAddSlide] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [, startTransition] = useTransition();

  // Load mission list
  useEffect(() => {
    actionList().then(setMissions);
  }, []);

  // Auto-save when dirty (debounced)
  useEffect(() => {
    if (!activeMission || saveState !== "dirty") return;
    const t = setTimeout(() => {
      void doSave();
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMission, saveState]);

  const doSave = useCallback(async () => {
    if (!activeMission) return;
    setSaveState("saving");
    try {
      await actionSave(activeMission);
      setSaveState("saved");
      const next = await actionList();
      setMissions(next);
    } catch (e) {
      console.error(e);
      setSaveState("error");
    }
  }, [activeMission]);

  const updateMission = useCallback((next: Mission) => {
    setActiveMission(next);
    setSaveState("dirty");
  }, []);

  const updateSlide = useCallback(
    (idx: number, next: Slide) => {
      if (!activeMission) return;
      const slides = [...activeMission.slides];
      slides[idx] = next;
      updateMission({ ...activeMission, slides });
    },
    [activeMission, updateMission]
  );

  const addSlide = useCallback(
    (type: SlideType, atIdx?: number) => {
      if (!activeMission) return;
      const newSlide = blankSlide(type);
      const insertAt = atIdx ?? activeMission.slides.length;
      const slides = [...activeMission.slides];
      slides.splice(insertAt, 0, newSlide);
      updateMission({ ...activeMission, slides });
      setActiveSlideIdx(insertAt);
      setShowAddSlide(false);
    },
    [activeMission, updateMission]
  );

  const deleteSlide = useCallback(
    (idx: number) => {
      if (!activeMission) return;
      if (activeMission.slides.length <= 1) {
        setToast("A mission needs at least one slide.");
        return;
      }
      const slides = activeMission.slides.filter((_, i) => i !== idx);
      updateMission({ ...activeMission, slides });
      setActiveSlideIdx(Math.max(0, Math.min(idx, slides.length - 1)));
    },
    [activeMission, updateMission]
  );

  const moveSlide = useCallback(
    (idx: number, dir: -1 | 1) => {
      if (!activeMission) return;
      const target = idx + dir;
      if (target < 0 || target >= activeMission.slides.length) return;
      const slides = [...activeMission.slides];
      [slides[idx], slides[target]] = [slides[target], slides[idx]];
      updateMission({ ...activeMission, slides });
      setActiveSlideIdx(target);
    },
    [activeMission, updateMission]
  );

  const duplicateSlide = useCallback(
    (idx: number) => {
      if (!activeMission) return;
      const orig = activeMission.slides[idx];
      const copy: Slide = JSON.parse(JSON.stringify(orig));
      // give it a new id so refs don't collide
      copy.id = `${orig.id}-copy-${Date.now().toString(36)}`;
      const slides = [...activeMission.slides];
      slides.splice(idx + 1, 0, copy);
      updateMission({ ...activeMission, slides });
      setActiveSlideIdx(idx + 1);
    },
    [activeMission, updateMission]
  );

  const newMission = useCallback(() => {
    const m = blankMission();
    setActiveMission(m);
    setActiveSlideIdx(0);
    setSaveState("dirty");
  }, []);

  const openMission = useCallback(async (id: string) => {
    const m = await actionRead(id);
    if (!m) {
      setToast(`Could not load ${id}`);
      return;
    }
    setActiveMission(m);
    setActiveSlideIdx(0);
    setSaveState("saved");
  }, []);

  const publish = useCallback(async () => {
    if (!activeMission) return;
    if (saveState !== "saved") {
      await doSave();
    }
    try {
      await actionPublish(activeMission.id);
      setToast(`Published ${activeMission.title}`);
      startTransition(async () => {
        setMissions(await actionList());
      });
    } catch (e) {
      console.error(e);
      setToast("Publish failed — check console.");
    }
  }, [activeMission, saveState, doSave]);

  // Deploy: publish + register in bridge/REGISTRY + git commit + push.
  // Wraps ~60s of Vercel build time so the UI shows a modal with per-step
  // results instead of a toast. The button is dev-only (prod 404s /author).
  const deploy = useCallback(async () => {
    if (!activeMission) return;
    const proceed = confirm(
      `Deploy "${activeMission.title}" to policydebate101.com?\n\n` +
      `This will:\n` +
      `  1. Publish the mission to disk (if not already).\n` +
      `  2. Register it in /bridge and /play/[id].\n` +
      `  3. Commit and push to origin/main.\n\n` +
      `Vercel will auto-deploy in ~60s. Continue?`
    );
    if (!proceed) return;

    if (saveState !== "saved") {
      await doSave();
    }

    setDeploying(true);
    setDeployResult(null);
    try {
      const result = await actionDeploy(activeMission.id);
      setDeployResult(result);
      startTransition(async () => {
        setMissions(await actionList());
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDeployResult({
        ok: false,
        missionId: activeMission.id,
        steps: [{ name: "FAILED", status: "error", detail: msg }],
        errorMessage: msg,
      });
    } finally {
      setDeploying(false);
    }
  }, [activeMission, saveState, doSave]);

  const deleteMission = useCallback(async () => {
    if (!activeMission) return;
    if (!confirm(
      `Delete "${activeMission.title}"?\n\nThis removes BOTH the draft and the published copy. Students will no longer be able to play this mission. This cannot be undone.`
    )) return;
    await actionDelete(activeMission.id);
    setActiveMission(null);
    setMissions(await actionList());
  }, [activeMission]);

  // dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const activeSlide = activeMission?.slides[activeSlideIdx];

  return (
    <div className="author-root">
      {/* Top header */}
      <header className="author-header">
        <div className="author-header-left">
          <span className="author-brand">⟡ AUTHORING CONSOLE</span>
          {activeMission && (
            <>
              <span className="author-sep">/</span>
              <button className="author-meta-btn" onClick={() => setShowMeta(true)}>
                {activeMission.title || "(untitled)"} ▾
              </button>
            </>
          )}
        </div>
        <div className="author-header-right">
          <a href="/" className="author-nav-link">← Bridge</a>
          {activeMission && (
            <>
              <SaveBadge state={saveState} />
              <button className="author-btn" onClick={() => void doSave()} disabled={saveState === "saving"}>
                Save
              </button>
              <button className="author-btn" onClick={publish}>
                Publish
              </button>
              <button
                className="author-btn author-btn-primary"
                onClick={deploy}
                disabled={deploying}
                title="Publish + register + git push to policydebate101.com"
              >
                {deploying ? "Deploying…" : "🚀 Deploy to Live Site"}
              </button>
              <a className="author-btn" href={`/play/${activeMission.id}?from=author`} target="_blank" rel="noreferrer">
                ▶ Play
              </a>
            </>
          )}
        </div>
      </header>

      <div className="author-grid">
        {/* SIDEBAR: missions */}
        <aside className="author-sidebar">
          <div className="author-sidebar-head">
            <span className="author-side-label">MISSIONS</span>
            <button className="author-side-new" onClick={newMission}>+ New</button>
          </div>
          <div className="author-mission-list">
            {missions.length === 0 && (
              <p className="author-empty">No missions yet. Click <strong>+ New</strong> to begin.</p>
            )}
            {missions.map((m) => (
              <button
                key={m.id}
                className={`author-mission-item ${activeMission?.id === m.id ? "active" : ""}`}
                onClick={() => void openMission(m.id)}
              >
                <span className="ami-row">
                  <span
                    className="ami-num"
                    title={m.number > 0
                      ? `Mission ${m.number} (play order)`
                      : "No number set — will sort last"}
                    aria-label={m.number > 0
                      ? `Mission number ${m.number}`
                      : "No mission number set"}
                  >
                    {m.number > 0 ? String(m.number).padStart(2, "0") : "——"}
                  </span>
                  <span className="ami-title">{m.title}</span>
                </span>
                <span className="ami-meta">
                  <span className={`ami-diff ami-diff-${m.difficulty}`}>{m.difficulty}</span>
                  <span className="ami-slides">{m.slideCount} slides</span>
                  <span className={`ami-status ami-status-${m.status}`}>
                    {m.status === "published" ? "✓ live" : "draft"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* MAIN: slide rail + editor */}
        <main className="author-main">
          {!activeMission && (
            <div className="author-placeholder">
              <div className="author-placeholder-icon">📡</div>
              <h2>Select or create a mission</h2>
              <p>Pick one from the left, or click + New to start fresh.</p>
            </div>
          )}

          {activeMission && (
            <div className="author-editor-grid">
              {/* Slide rail */}
              <nav className="author-slide-rail">
                <div className="author-rail-head">
                  <span className="author-side-label">SLIDES</span>
                </div>
                <ol className="author-slide-list">
                  {activeMission.slides.map((s, i) => (
                    <li
                      key={s.id}
                      className={`author-slide-item ${i === activeSlideIdx ? "active" : ""} ${s.type.startsWith("cfu-") ? "is-cfu" : "is-content"} ${s.type === "complete" ? "is-complete" : ""}`}
                      onClick={() => setActiveSlideIdx(i)}
                    >
                      <span className="asi-num">{String(i + 1).padStart(2, "0")}</span>
                      <span className="asi-label">{SLIDE_TYPE_LABELS[s.type]}</span>
                      <span className="asi-actions">
                        <button onClick={(e) => { e.stopPropagation(); moveSlide(i, -1); }} disabled={i === 0} title="Move up">↑</button>
                        <button onClick={(e) => { e.stopPropagation(); moveSlide(i, 1); }} disabled={i === activeMission.slides.length - 1} title="Move down">↓</button>
                        <button onClick={(e) => { e.stopPropagation(); duplicateSlide(i); }} title="Duplicate">⎘</button>
                        <button onClick={(e) => { e.stopPropagation(); deleteSlide(i); }} title="Delete">✕</button>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="author-rail-foot">
                  <button className="author-add-slide-btn" onClick={() => setShowAddSlide(true)}>
                    + Add Slide
                  </button>
                  <button className="author-delete-mission-btn" onClick={deleteMission}>
                    Delete mission
                  </button>
                </div>
              </nav>

              {/* Editor + Preview side by side */}
              <section className="author-editor-pane">
                <div className="author-editor-head">
                  <span className="author-editor-type">{activeSlide && SLIDE_TYPE_LABELS[activeSlide.type]}</span>
                  <span className="author-editor-id">id: {activeSlide?.id}</span>
                </div>
                <div className="author-editor-body">
                  {activeSlide && activeMission && (
                    <SlideEditor
                      slide={activeSlide}
                      missionId={activeMission.id}
                      onChange={(next) => updateSlide(activeSlideIdx, next)}
                    />
                  )}
                </div>
              </section>

              <section className="author-preview-pane">
                <div className="author-preview-head">
                  <span className="author-editor-type">LIVE PREVIEW</span>
                  <span className="author-preview-hint">read-only — interactions disabled</span>
                </div>
                <div className="author-preview-frame">
                  <div className="author-preview-stage">
                    {activeSlide && <SlidePreview slide={activeSlide} />}
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* MISSION META MODAL */}
      {showMeta && activeMission && (
        <Modal onClose={() => setShowMeta(false)} title="Mission Settings">
          <MissionMetaEditor mission={activeMission} onChange={updateMission} />
        </Modal>
      )}

      {/* ADD SLIDE MODAL */}
      {showAddSlide && (
        <Modal onClose={() => setShowAddSlide(false)} title="Add Slide">
          <div className="add-slide-groups">
            {SLIDE_TYPE_GROUPS.map((group) => (
              <div key={group.label} className="add-slide-group">
                <h4>{group.label}</h4>
                <div className="add-slide-grid">
                  {group.types.map((t) => (
                    <button
                      key={t}
                      className="add-slide-card"
                      onClick={() => addSlide(t, (activeSlideIdx ?? -1) + 1)}
                    >
                      <span className="asc-label">{SLIDE_TYPE_LABELS[t]}</span>
                      <span className="asc-type">{t}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* DEPLOY RESULT MODAL */}
      {deployResult && (
        <Modal title={deployResult.ok ? "🚀 Deployed" : "Deploy failed"} onClose={() => setDeployResult(null)}>
          <div style={{ padding: "8px 4px" }}>
            {deployResult.ok ? (
              <p style={{ marginTop: 0, color: "var(--aqua, #7dd3fc)" }}>
                <strong>{deployResult.missionId}</strong> is on its way to policydebate101.com.
                {deployResult.commitSha && <> Vercel is building commit <code>{deployResult.commitSha}</code> — live in about a minute.</>}
              </p>
            ) : (
              <p style={{ marginTop: 0, color: "#fca5a5" }}>
                Something broke. See the step list below and check the dev-server console for the full stack trace.
              </p>
            )}
            <ol style={{ paddingLeft: 20, lineHeight: 1.6 }}>
              {deployResult.steps.map((s, i) => {
                const glyph = s.status === "ok" ? "✓" : s.status === "skipped" ? "·" : "✗";
                const color = s.status === "ok" ? "var(--aqua, #7dd3fc)" : s.status === "skipped" ? "var(--text-dim, #94a3b8)" : "#fca5a5";
                return (
                  <li key={i} style={{ color }}>
                    <strong>{glyph} {s.name}</strong>
                    {s.detail && <span style={{ color: "var(--text-dim, #94a3b8)", marginLeft: 8 }}>— {s.detail}</span>}
                  </li>
                );
              })}
            </ol>
            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {deployResult.ok && (
                <a
                  className="author-btn"
                  href={`https://policydebate101.com/play/${deployResult.missionId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open live mission →
                </a>
              )}
              <button className="author-btn author-btn-primary" onClick={() => setDeployResult(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* TOAST */}
      {toast && <div className="author-toast">{toast}</div>}
    </div>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  const label = state === "saved" ? "✓ Saved" : state === "saving" ? "Saving…" : state === "dirty" ? "Unsaved" : "Error";
  return <span className={`save-badge save-badge-${state}`}>{label}</span>;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="author-modal-backdrop" onClick={onClose}>
      <div className="author-modal" onClick={(e) => e.stopPropagation()}>
        <header className="author-modal-head">
          <h3>{title}</h3>
          <button className="author-modal-close" onClick={onClose}>✕</button>
        </header>
        <div className="author-modal-body">{children}</div>
      </div>
    </div>
  );
}

const _unused = useMemo; // silence linter if useMemo isn't used elsewhere
void _unused;
