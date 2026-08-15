// ============================================================================
// INLINE MARKUP
// ----------------------------------------------------------------------------
// Tiny markup language for curriculum copy. Writers never touch HTML.
//
// Supported tokens:
//   **bold**            -> <strong>bold</strong>
//   *italic*            -> <em>italic</em>
//   `term`              -> <strong class="key-term">term</strong>  (protected vocab)
//   {{cyan: text}}      -> <span class="text-accent-cyan">text</span>
//   {{amber: text}}     -> <span class="text-accent-amber">text</span>
//   {{magenta: text}}   -> <span class="text-accent-magenta">text</span>  (boss only)
//
// Palette tokens (Mission 3 Cosmic Fuel Lab palettes, added 2026-08-15):
//   {{orange: text}}    -> Solar Soda color   (#fb923c)
//   {{violet: text}}    -> Void Juice color   (#a78bfa)
//   {{lime: text}}      -> Plasma Soda color  (#a3e635)
//   {{pink: text}}      -> Warp Juice color   (#ec4899)
//   {{green: text}}     -> Fuel Soda color    (#84cc16)
//
// Strict by design. If writers need more, add tokens here — never raw HTML.
// ============================================================================

import React from "react";

type Tag =
  | "strong"
  | "em"
  | "key-term"
  | "cyan"
  | "amber"
  | "magenta"
  | "orange"
  | "violet"
  | "lime"
  | "pink"
  | "green";

type Node = string | { tag: Tag; children: Node[] };

// Palette tokens → exact hex used by the Cosmic Fuel Lab. Keep in sync with
// src/content/missions/ratios-lab-v1.json palette definitions.
const PALETTE_HEX: Record<"orange" | "violet" | "lime" | "pink" | "green", string> = {
  orange: "#fb923c",
  violet: "#a78bfa",
  lime: "#a3e635",
  pink: "#ec4899",
  green: "#84cc16",
};

// Order matters: longest/most-specific patterns first.
const TOKEN = /(\{\{(cyan|amber|magenta|orange|violet|lime|pink|green):\s*([^}]+)\}\})|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/;

function parse(input: string): Node[] {
  const out: Node[] = [];
  let rest = input;
  while (rest.length > 0) {
    const m = TOKEN.exec(rest);
    if (!m) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    if (m[2]) {
      // {{accent: ...}}
      const tag = m[2] as Tag;
      out.push({ tag, children: parse(m[3]) });
    } else if (m[4]) {
      out.push({ tag: "strong", children: parse(m[5]) });
    } else if (m[6]) {
      out.push({ tag: "em", children: parse(m[7]) });
    } else if (m[8]) {
      out.push({ tag: "key-term", children: parse(m[9]) });
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

function render(nodes: Node[], keyPrefix = ""): React.ReactNode {
  return nodes.map((node, i) => {
    const k = `${keyPrefix}${i}`;
    if (typeof node === "string") return <React.Fragment key={k}>{node}</React.Fragment>;
    switch (node.tag) {
      case "strong":
        return <strong key={k}>{render(node.children, k + ".")}</strong>;
      case "em":
        return <em key={k}>{render(node.children, k + ".")}</em>;
      case "key-term":
        return (
          <strong key={k} className="key-term text-accent-cyan font-semibold">
            {render(node.children, k + ".")}
          </strong>
        );
      case "cyan":
        return (
          <span key={k} className="text-accent-cyan">
            {render(node.children, k + ".")}
          </span>
        );
      case "amber":
        return (
          <span key={k} className="text-accent-amber">
            {render(node.children, k + ".")}
          </span>
        );
      case "magenta":
        return (
          <span key={k} className="text-accent-magenta">
            {render(node.children, k + ".")}
          </span>
        );
      case "orange":
      case "violet":
      case "lime":
      case "pink":
      case "green":
        return (
          <span key={k} className="font-semibold" style={{ color: PALETTE_HEX[node.tag] }}>
            {render(node.children, k + ".")}
          </span>
        );
    }
  });
}

/** Render inline-markup string into React nodes. Use anywhere curriculum text is shown. */
export function Inline({ children }: { children: string }) {
  return <>{render(parse(children))}</>;
}

/** Render an array of paragraphs (e.g. body[]) into <p> blocks. */
export function Paragraphs({ children, className }: { children: string[]; className?: string }) {
  return (
    <>
      {children.map((p, i) => (
        <p key={i} className={className}>
          <Inline>{p}</Inline>
        </p>
      ))}
    </>
  );
}
