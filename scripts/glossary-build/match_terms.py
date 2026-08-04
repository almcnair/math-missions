#!/usr/bin/env python3
"""Pass 1 matcher: for each glossary term, find context snippets in the corpus.

For every term (with its shorthand aliases), scan every corpus file. For each
hit, emit a snippet: ~180 chars before and ~320 chars after the match, with
sentence-boundary cleanup. Cap snippets per term per source to keep signal
high. Write results to /tmp/glossary_scan/term_scan.json.

Deliberately conservative:
- We match on WORD BOUNDARIES only (no substring hits inside other words).
- We de-duplicate near-identical snippets across sources (first ~80 chars).
- We skip snippets that ARE the CDSI glossary definition (already have those).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

CORPUS = Path("/tmp/glossary_scan/corpus")
OUT = Path("/tmp/glossary_scan/term_scan.json")

# ---------- Term table ---------------------------------------------------
# Aliases include the primary term, its short form (if any), and any obvious
# grammatical variants. Kept intentionally tight to avoid noise.

TERMS: list[dict] = [
    # basics
    {"id": "policy-debate",     "term": "Policy Debate",         "aliases": ["policy debate"]},
    {"id": "resolution",        "term": "Resolution",            "aliases": ["resolution"]},
    {"id": "affirmative",       "term": "Affirmative",           "aliases": ["affirmative", "AFF"]},
    {"id": "negative",          "term": "Negative",              "aliases": ["negative team", "the negative", "NEG"]},
    {"id": "debate-partner",    "term": "Debate Partner",        "aliases": ["debate partner", "partner"]},
    {"id": "round",             "term": "Round",                 "aliases": ["debate round", "round"]},
    {"id": "judge",             "term": "Judge",                 "aliases": ["judge", "the judge"]},
    {"id": "ballot",            "term": "Ballot",                "aliases": ["ballot"]},
    {"id": "tournament",        "term": "Tournament",            "aliases": ["tournament"]},
    {"id": "novice",            "term": "Novice",                "aliases": ["novice"]},
    # speeches
    {"id": "speech",            "term": "Speech",                "aliases": ["speech"]},
    {"id": "constructive",      "term": "Constructive Speech",   "aliases": ["constructive speech", "constructive"]},
    {"id": "rebuttal",          "term": "Rebuttal Speech",       "aliases": ["rebuttal speech", "rebuttal"]},
    {"id": "cx",                "term": "Cross-Examination",     "aliases": ["cross-examination", "cross examination", "CX"]},
    {"id": "prep-time",         "term": "Prep Time",             "aliases": ["prep time", "preparation time"]},
    {"id": "1ac",               "term": "First Affirmative Constructive", "aliases": ["1AC", "first affirmative constructive"]},
    {"id": "1nc",               "term": "First Negative Constructive",    "aliases": ["1NC", "first negative constructive"]},
    {"id": "2ac",               "term": "Second Affirmative Constructive","aliases": ["2AC", "second affirmative constructive"]},
    {"id": "2nc",               "term": "Second Negative Constructive",   "aliases": ["2NC", "second negative constructive"]},
    {"id": "1nr",               "term": "First Negative Rebuttal",        "aliases": ["1NR", "first negative rebuttal"]},
    {"id": "1ar",               "term": "First Affirmative Rebuttal",     "aliases": ["1AR", "first affirmative rebuttal"]},
    {"id": "2nr",               "term": "Second Negative Rebuttal",       "aliases": ["2NR", "second negative rebuttal"]},
    {"id": "2ar",               "term": "Second Affirmative Rebuttal",    "aliases": ["2AR", "second affirmative rebuttal"]},
    # evidence
    {"id": "evidence",          "term": "Evidence",              "aliases": ["evidence"]},
    {"id": "card",              "term": "Card",                  "aliases": ["card", "cards"]},
    {"id": "tag",               "term": "Tag",                   "aliases": ["tag", "tagline"]},
    {"id": "cite",              "term": "Cite",                  "aliases": ["cite", "citation"]},
    {"id": "highlighting",      "term": "Highlighting",          "aliases": ["highlighting"]},
    # argument
    {"id": "claim",             "term": "Claim",                 "aliases": ["claim"]},
    {"id": "warrant",           "term": "Warrant",               "aliases": ["warrant"]},
    {"id": "impact",            "term": "Impact",                "aliases": ["impact", "impacts"]},
    {"id": "argument",          "term": "Argument",              "aliases": ["argument"]},
    {"id": "link",              "term": "Link",                  "aliases": ["link"]},
    {"id": "uniqueness",        "term": "Uniqueness",            "aliases": ["uniqueness"]},
    {"id": "internal-link",     "term": "Internal Link",         "aliases": ["internal link"]},
    # aff
    {"id": "plan",              "term": "Plan",                  "aliases": ["plan"]},
    {"id": "significance",      "term": "Significance",          "aliases": ["significance"]},
    {"id": "harms",             "term": "Harms",                 "aliases": ["harms", "harm"]},
    {"id": "inherency",         "term": "Inherency",             "aliases": ["inherency"]},
    {"id": "solvency",          "term": "Solvency",              "aliases": ["solvency"]},
    {"id": "case",              "term": "Case",                  "aliases": ["case", "on-case", "on case"]},
    {"id": "contention",        "term": "Contention",            "aliases": ["contention"]},
    {"id": "advantage",         "term": "Advantage",             "aliases": ["advantage", "advantages"]},
    {"id": "status-quo",        "term": "Status Quo",            "aliases": ["status quo", "squo"]},
    # neg
    {"id": "on-case",           "term": "On-Case",               "aliases": ["on-case", "on case"]},
    {"id": "off-case",          "term": "Off-Case",              "aliases": ["off-case", "off case"]},
    {"id": "da",                "term": "Disadvantage",          "aliases": ["disadvantage", "disad", "DA"]},
    {"id": "neg-block",         "term": "NEG Block",             "aliases": ["neg block", "negative block"]},
    {"id": "cp",                "term": "Counterplan",           "aliases": ["counterplan", "counter-plan", "CP"]},
    {"id": "kritik",            "term": "Kritik",                "aliases": ["kritik"]},
    {"id": "takeout",           "term": "Solvency Take-Out",     "aliases": ["solvency take-out", "solvency takeout", "take-out"]},
    {"id": "turn",              "term": "Turn",                  "aliases": ["turn"]},
    {"id": "impact-turn",       "term": "Impact Turn",           "aliases": ["impact turn"]},
    {"id": "link-turn",         "term": "Link Turn",             "aliases": ["link turn"]},
    # topicality
    {"id": "topicality",        "term": "Topicality",            "aliases": ["topicality"]},
    {"id": "definition",        "term": "Definition",            "aliases": ["definition"]},
    {"id": "interpretation",    "term": "Interpretation",        "aliases": ["interpretation", "interp"]},
    {"id": "violation",         "term": "Violation",             "aliases": ["violation"]},
    # flowing
    {"id": "flowing",           "term": "Flowing",               "aliases": ["flowing"]},
    {"id": "drop",              "term": "Drop",                  "aliases": ["dropped argument", "dropped"]},
    {"id": "line-by-line",      "term": "Line-by-Line",          "aliases": ["line by line", "line-by-line"]},
    {"id": "impact-calc",       "term": "Impact Calculus",       "aliases": ["impact calculus", "impact calc"]},
    {"id": "flow",              "term": "Flow",                  "aliases": ["the flow", "flow"]},
    {"id": "extend",            "term": "Extend",                "aliases": ["extend"]},
    {"id": "answer",            "term": "Answer",                "aliases": ["answer"]},
    {"id": "signpost",          "term": "Signpost",              "aliases": ["signpost"]},
    {"id": "roadmap",           "term": "Roadmap",               "aliases": ["roadmap", "road map"]},
    # winning
    {"id": "voter",             "term": "Voter",                 "aliases": ["voter", "voting issue"]},
    {"id": "weighing",          "term": "Weighing",              "aliases": ["weighing"]},
    {"id": "framework",         "term": "Framework",             "aliases": ["framework"]},
    # culture
    {"id": "speaker-points",    "term": "Speaker Points",        "aliases": ["speaker points"]},
]


# ---------- Match helpers ------------------------------------------------

MAX_SNIPPETS_PER_SOURCE = 3
MAX_SNIPPETS_TOTAL = 12
BEFORE = 180
AFTER  = 320

def compile_alias(alias: str) -> re.Pattern:
    # Escape, allow flexible whitespace (space matches any whitespace),
    # honor word boundaries. For short all-caps aliases (CX, DA, T, K, CP, AFF,
    # NEG, 1AC…) do CASE-SENSITIVE match to avoid noise like "the" matching "T".
    escaped = re.escape(alias).replace(r"\ ", r"\s+")
    is_short_caps = (
        len(alias) <= 4
        and alias.upper() == alias
        and re.match(r"^[A-Z0-9]+$", alias)
    )
    flags = 0 if is_short_caps else re.IGNORECASE
    return re.compile(rf"(?<!\w){escaped}(?!\w)", flags)


def find_snippets(text: str, patterns: list[re.Pattern], primary_term: str) -> list[tuple[int, str]]:
    """Return (start_offset, snippet) pairs, at most MAX_SNIPPETS_PER_SOURCE."""
    found: list[tuple[int, str]] = []
    seen_windows: set[tuple[int, int]] = set()
    for pat in patterns:
        for m in pat.finditer(text):
            s, e = m.start(), m.end()
            # Merge overlapping windows.
            win_start = max(0, s - BEFORE)
            win_end   = min(len(text), e + AFTER)
            overlap = False
            for ws, we in seen_windows:
                if not (win_end < ws or win_start > we):
                    overlap = True
                    break
            if overlap:
                continue
            seen_windows.add((win_start, win_end))

            # Grow to sentence boundaries.
            snippet = text[win_start:win_end]
            # Trim leading fragment before first sentence break (if we're not at start)
            if win_start > 0:
                m2 = re.search(r"[.!?]\s+", snippet[:BEFORE])
                if m2:
                    snippet = snippet[m2.end():]
            # Trim trailing fragment after last sentence break (if not end)
            if win_end < len(text):
                m3 = list(re.finditer(r"[.!?]\s", snippet))
                if m3:
                    snippet = snippet[: m3[-1].end()]
            snippet = re.sub(r"\s+", " ", snippet).strip()
            if len(snippet) < 40:
                continue
            found.append((s, snippet))
            if len(found) >= MAX_SNIPPETS_PER_SOURCE:
                return found
    return found


def main() -> None:
    # Load all corpus files.
    corpus: list[tuple[str, str, str]] = []  # (source_id, relpath, text)
    idx_path = CORPUS / "INDEX.tsv"
    for line in idx_path.read_text().splitlines()[1:]:
        sid, _, rel = line.split("\t", 2)
        p = CORPUS / f"{sid}.txt"
        # Skip the SOURCE header line.
        text = p.read_text()
        text = re.sub(r"^# SOURCE:.*?\n\n", "", text, count=1)
        corpus.append((sid, rel, text))

    results: dict[str, dict] = {}
    for term in TERMS:
        patterns = [compile_alias(a) for a in term["aliases"]]
        hits: list[dict] = []
        seen_prefixes: set[str] = set()
        for sid, rel, text in corpus:
            for offset, snippet in find_snippets(text, patterns, term["term"]):
                prefix = re.sub(r"\W+", "", snippet.lower())[:60]
                if prefix in seen_prefixes:
                    continue
                seen_prefixes.add(prefix)
                hits.append({
                    "source_id": sid,
                    "source_path": rel,
                    "offset": offset,
                    "snippet": snippet,
                })
                if len(hits) >= MAX_SNIPPETS_TOTAL:
                    break
            if len(hits) >= MAX_SNIPPETS_TOTAL:
                break

        results[term["id"]] = {
            "term": term["term"],
            "aliases": term["aliases"],
            "hit_count": len(hits),
            "hits": hits,
        }

    OUT.write_text(json.dumps(results, indent=2, ensure_ascii=False))

    # Coverage report.
    total = len(TERMS)
    with_any = sum(1 for v in results.values() if v["hit_count"] > 0)
    with_2plus = sum(1 for v in results.values() if v["hit_count"] >= 2)
    zero = [v["term"] for v in results.values() if v["hit_count"] == 0]

    print(f"\nCoverage: {with_any}/{total} terms have ≥1 hit ({with_2plus} have ≥2).")
    print(f"Zero-hit terms ({len(zero)}):")
    for t in zero:
        print(f"  - {t}")


if __name__ == "__main__":
    main()
