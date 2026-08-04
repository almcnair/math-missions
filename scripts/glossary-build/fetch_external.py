#!/usr/bin/env python3
"""Grab both external glossaries in raw HTML, strip to text, save to corpus/.

We use urllib directly + a light HTML→text pass so we get the FULL page,
not the readability-truncated 20k version.
"""
from __future__ import annotations

import re
import urllib.request
from pathlib import Path

OUT = Path("/tmp/glossary_scan/corpus")
OUT.mkdir(parents=True, exist_ok=True)

SOURCES = [
    ("debateus_glossary", "https://debateus.org/policy-debate-vocabulary/"),
    ("wikipedia_glossary", "https://en.wikipedia.org/wiki/Glossary_of_policy_debate_terms"),
]

UA = "Mozilla/5.0 (glossary scanner; +policydebate101.com)"


def html_to_text(html: str) -> str:
    # Kill script/style/nav/footer blocks.
    html = re.sub(r"<(script|style|nav|footer|header|aside)[^>]*>.*?</\1>", " ", html, flags=re.I | re.S)
    # Line-break helpful block tags.
    html = re.sub(r"</(p|div|li|h[1-6]|tr|br)\s*>", "\n", html, flags=re.I)
    html = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    # Strip remaining tags.
    text = re.sub(r"<[^>]+>", "", html)
    # Decode a few common entities. minidom import is overkill.
    text = (text
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", '"')
            .replace("&#39;", "'")
            .replace("&mdash;", "—")
            .replace("&ndash;", "–")
            .replace("&hellip;", "…"))
    # Normalize whitespace.
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main() -> None:
    for sid, url in SOURCES:
        print(f"Fetching {url}")
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8", errors="replace")
        text = html_to_text(raw)
        header = f"# SOURCE: {url}\n\n"
        (OUT / f"{sid}.txt").write_text(header + text)
        print(f"  → {len(text):,} chars")


if __name__ == "__main__":
    main()
