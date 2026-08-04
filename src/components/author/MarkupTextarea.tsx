"use client";

import { useRef } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
};

type WrapBtn = {
  label: string;
  title: string;
  before: string;
  after: string;
  style?: React.CSSProperties;
};

const BUTTONS: WrapBtn[] = [
  { label: "B", title: "Bold (Cmd+B)", before: "**", after: "**", style: { fontWeight: 800 } },
  { label: "I", title: "Italic (Cmd+I)", before: "*", after: "*", style: { fontStyle: "italic" } },
  // Underline isn't in the canonical inline markup, but we can support it as
  // a custom token. For now we map "Underline" to *italic* + a hint, since the
  // schema spec doesn't include it. Replace with proper __underline__ if/when
  // the parser gets extended.
  { label: "U", title: "Underline (renders as italic for now — schema doesn't have underline yet)", before: "*", after: "*", style: { textDecoration: "underline" } },
  { label: "`code`", title: "Inline term / code", before: "`", after: "`", style: { fontFamily: "ui-monospace, monospace" } },
];

const COLOR_BUTTONS: WrapBtn[] = [
  { label: "Cyan", title: "Cyan emphasis", before: "{{cyan: ", after: "}}", style: { color: "#38BDF8" } },
  { label: "Amber", title: "Amber emphasis", before: "{{amber: ", after: "}}", style: { color: "#FBBF24" } },
  { label: "Magenta", title: "Magenta — reserve for boss/capstone moments", before: "{{magenta: ", after: "}}", style: { color: "#F472B6" } },
];

export function MarkupTextarea({ value, onChange, placeholder, rows = 6, label }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after: string) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    // restore selection to inside the wrap
    requestAnimationFrame(() => {
      ta.focus();
      const newStart = start + before.length;
      const newEnd = newStart + selected.length;
      ta.setSelectionRange(newStart, newEnd);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      if (e.key === "b") { e.preventDefault(); wrap("**", "**"); return; }
      if (e.key === "i") { e.preventDefault(); wrap("*", "*"); return; }
    }
  }

  return (
    <div className="markup-textarea">
      {label && <label className="form-label">{label}</label>}
      <div className="toolbar" role="toolbar" aria-label="Formatting">
        {BUTTONS.map((b) => (
          <button
            key={b.label}
            type="button"
            className="tb-btn"
            title={b.title}
            style={b.style}
            onClick={() => wrap(b.before, b.after)}
          >
            {b.label}
          </button>
        ))}
        <span className="tb-sep" />
        {COLOR_BUTTONS.map((b) => (
          <button
            key={b.label}
            type="button"
            className="tb-btn"
            title={b.title}
            style={b.style}
            onClick={() => wrap(b.before, b.after)}
          >
            {b.label}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={rows}
        className="form-textarea"
        spellCheck={true}
      />
      <p className="markup-help">
        Inline markup: <code>**bold**</code> · <code>*italic*</code> ·{" "}
        <code>`term`</code> · <code>{`{{cyan: …}}`}</code> /{" "}
        <code>{`{{amber: …}}`}</code> / <code>{`{{magenta: …}}`}</code>
      </p>
    </div>
  );
}

// Single-line markup input — same toolbar, but no rows.
export function MarkupInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <MarkupTextarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={2}
      label={label}
    />
  );
}
