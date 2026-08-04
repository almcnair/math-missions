#!/usr/bin/env python3
"""Generate a human-readable per-term markdown report of Pass 1 hits."""
from __future__ import annotations

import json
from pathlib import Path

SCAN = Path("/tmp/glossary_scan/term_scan.json")
EMOJI = Path("/tmp/glossary_scan/emoji_assignments.json")
OUT = Path("/tmp/glossary_scan/COVERAGE_REPORT.md")

# Group terms by category, same order as glossary page.
CATEGORY_ORDER: list[tuple[str, list[str]]] = [
    ("The Basics",              ["policy-debate", "resolution", "affirmative", "negative", "debate-partner", "squad", "round", "judge", "ballot", "tournament", "novice"]),
    ("Speeches & Time",         ["speech", "constructive", "rebuttal", "cx", "prep-time", "1ac", "1nc", "2ac", "2nc", "1nr", "1ar", "2nr", "2ar"]),
    ("Evidence",                ["evidence", "card", "tag", "cite", "quals", "cutting", "highlighting"]),
    ("Building an Argument",    ["claim", "warrant", "impact", "argument", "link", "uniqueness", "internal-link"]),
    ("The Affirmative Case",    ["plan", "significance", "harms", "inherency", "solvency", "case", "contention", "advantage", "status-quo"]),
    ("The Negative Attacks",    ["on-case", "off-case", "da", "neg-block", "cp", "kritik", "takeout", "turn", "impact-turn", "link-turn"]),
    ("Topicality",              ["topicality", "definition", "interpretation", "violation"]),
    ("Flowing & Strategy",      ["flowing", "drop", "line-by-line", "impact-calc", "flow", "extend", "answer", "signpost", "roadmap"]),
    ("Winning the Round",       ["voter", "weighing", "framework"]),
    ("Behavior & Culture",      ["speaker-points", "decorum", "speed"]),
]


def coverage_marker(n: int) -> str:
    if n == 0:  return "🔴 0"
    if n == 1:  return "🟡 1"
    if n <= 3:  return "🟠 " + str(n)
    if n <= 6:  return "🟢 " + str(n)
    return "🟢 " + str(n) + "+"


def main() -> None:
    d = json.load(open(SCAN))
    emo = json.load(open(EMOJI))
    total = sum(len(ids) for _, ids in CATEGORY_ORDER)

    out: list[str] = []
    out.append("# Pass 1 Coverage Report\n")
    out.append(f"_Scanned {total} terms across the CDSI 2026 curriculum + explainer docs._\n")
    out.append("Legend: 🔴 no hits · 🟡 1 hit · 🟠 2-3 hits · 🟢 4+ hits\n")

    # Summary table.
    with_any = sum(1 for v in d.values() if v["hit_count"] > 0)
    thin = sum(1 for v in d.values() if 1 <= v["hit_count"] <= 1)
    zero = sum(1 for v in d.values() if v["hit_count"] == 0)
    out.append(f"**Totals:** {with_any}/{total} with ≥1 hit · {thin} thin (1 hit) · {zero} zero-hit\n")
    out.append("---\n")

    for cat, ids in CATEGORY_ORDER:
        out.append(f"\n## {cat}\n")
        for tid in ids:
            if tid not in d:
                continue
            v = d[tid]
            marker = coverage_marker(v["hit_count"])
            e = emo.get(tid, "·")
            out.append(f"\n### {e} {marker} — {v['term']}")
            if v["hit_count"] == 0:
                out.append("\n_No hits in scanned corpus. Recommend: Bael-drafts fresh, or leave sparse._\n")
                continue
            # Show top 3 hits — that's usually enough to judge signal quality.
            for i, h in enumerate(v["hits"][:3], 1):
                sp = h["source_path"]
                if sp.startswith("EXTERNAL:"):
                    src = "🌐 " + sp.replace("EXTERNAL:", "")
                else:
                    src = sp.rsplit("/", 1)[-1]
                snip = h["snippet"]
                if len(snip) > 500:
                    snip = snip[:497] + "..."
                out.append(f"\n**{i}.** _`{src}`_")
                out.append(f"\n> {snip}\n")
            if v["hit_count"] > 3:
                out.append(f"\n_…and {v['hit_count'] - 3} more._\n")

    OUT.write_text("\n".join(out))
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
