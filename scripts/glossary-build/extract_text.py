#!/usr/bin/env python3
"""Pass 1: extract clean text from every text-extractable file in the corpus.

Writes one .txt per source into /tmp/glossary_scan/corpus/ with a header line
recording the original source path so downstream matching can cite it.
"""
from __future__ import annotations

import re
import subprocess
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

BASE = Path("/Users/ausitnmcnair/Desktop/PolicyDebate101")
OUT = Path("/tmp/glossary_scan/corpus")
OUT.mkdir(parents=True, exist_ok=True)

# Files identified as text-extractable in the inventory. Excludes _archive/,
# brand guides, brain-breaks doc, and .pptx files marked IMG? (mostly image).
FILES: list[str] = [
    # Root
    "CDSI Lab Leader Toolkit_ Top Teacher Moves.docx",
    "ClaimWarrantImpact.pdf",
    # Explainers
    "Explainers Policy Debate/A Strong Argument.pdf",
    "Explainers Policy Debate/DebateRound.txt",
    "Explainers Policy Debate/GlossaryPolicy.txt",
    "Explainers Policy Debate/Impacts-The-Secret-to-Winning-Debates.pptx",
    "Explainers Policy Debate/IntroPolicy2026.pptx",
    "Explainers Policy Debate/The Mission Logistics.pdf",
    "Explainers Policy Debate/The-Argument-Engine.pptx",
    "Explainers Policy Debate/Winning-the-Argument.pptx",
    # Curriculum root
    "Policy Debate Curriculum 2026/BLOCK B_ Lesson 4_ Introduction to the Topic + AFF Basics.docx",
    "Policy Debate Curriculum 2026/Day 2 Block A.docx",
    "Policy Debate Curriculum 2026/Policy Debate Curriculum_CDSI2026.docx",
    "Policy Debate Curriculum 2026/Policy_Debate_2Week_Camp_Curriculum.pdf",
    "Policy Debate Curriculum 2026/Resolution Summary 2026.txt",
    # Claim Warrant Impact
    "Policy Debate Curriculum 2026/Claim Warrant Impact/Building an Argument – Claim, Warrant, Impact.docx",
    # Day 1
    "Policy Debate Curriculum 2026/Day 1_CDSI 2026/Day 1 Lessons_CDSI2026.docx",
    "Policy Debate Curriculum 2026/Day 1_CDSI 2026/Lesson 1_ What IS Debate.docx",
    "Policy Debate Curriculum 2026/Day 1_CDSI 2026/Lesson 3_ The Structure of a Policy Debate Round.pdf",
    "Policy Debate Curriculum 2026/Day 1_CDSI 2026/Lesson 5_ Understanding the Negative + On-Case Arguments.docx",
    "Policy Debate Curriculum 2026/Day 1_CDSI 2026/Lesson 6_ Flowing – The Debate Note-Taking System.docx",
    # Day 2
    "Policy Debate Curriculum 2026/Day 2_CDSI 2026/Understanding the Negative + On-Case Arguments.pdf",
    # Day 3
    "Policy Debate Curriculum 2026/Day 3_CDSI 2026/Understanding the Negative + On-Case Arguments.docx",
    # Graphic organizers (glossary excluded — we already have that verbatim)
    "Policy Debate Curriculum 2026/Graphic Organizers_CDSI 2026/Graphic Organizer_ Lesson 2.docx",
    "Policy Debate Curriculum 2026/Graphic Organizers_CDSI 2026/Lesson 1_Graphic Organizer_CDSI2026.docx",
]


def clean(text: str) -> str:
    """Normalize whitespace but keep paragraph structure."""
    # Collapse runs of blank lines to a single blank line.
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_docx(path: Path) -> str:
    ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    parts: list[str] = []
    for p in root.iter(f"{ns}p"):
        runs = [t.text or "" for t in p.iter(f"{ns}t")]
        line = "".join(runs).strip()
        if line:
            parts.append(line)
    return clean("\n".join(parts))


def extract_pptx(path: Path) -> str:
    """Iterate slides in order, prefixing each with a slide marker."""
    ns_a = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
    parts: list[str] = []
    with zipfile.ZipFile(path) as z:
        slide_names = sorted(
            [n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)],
            key=lambda s: int(re.search(r"slide(\d+)\.xml", s).group(1)),
        )
        for name in slide_names:
            n = int(re.search(r"slide(\d+)\.xml", name).group(1))
            xml = z.read(name)
            root = ET.fromstring(xml)
            texts: list[str] = []
            for t in root.iter(f"{ns_a}t"):
                if t.text and t.text.strip():
                    texts.append(t.text.strip())
            if texts:
                parts.append(f"[Slide {n}]\n" + "\n".join(texts))
    return clean("\n\n".join(parts))


def extract_pdf(path: Path) -> str:
    r = subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True)
    return clean(r.stdout)


def extract_txt(path: Path) -> str:
    return clean(path.read_text(encoding="utf-8", errors="replace"))


def safe_slug(s: str) -> str:
    s = re.sub(r"[^\w\-.]+", "_", s)
    return s.strip("_")[:120]


def main() -> None:
    idx = OUT / "INDEX.tsv"
    rows: list[str] = ["source_id\tchars\trelpath"]
    for rel in FILES:
        src = BASE / rel
        if not src.exists():
            print(f"MISSING: {rel}")
            continue
        try:
            if src.suffix == ".docx":
                text = extract_docx(src)
            elif src.suffix == ".pptx":
                text = extract_pptx(src)
            elif src.suffix == ".pdf":
                text = extract_pdf(src)
            elif src.suffix in {".txt", ".md"}:
                text = extract_txt(src)
            else:
                continue
        except Exception as e:
            print(f"FAIL {rel}: {e}")
            continue
        sid = safe_slug(src.stem)
        out_path = OUT / f"{sid}.txt"
        header = f"# SOURCE: {rel}\n\n"
        out_path.write_text(header + text)
        rows.append(f"{sid}\t{len(text)}\t{rel}")
        print(f"OK  {len(text):>7}  {sid}")
    idx.write_text("\n".join(rows) + "\n")
    print(f"\nIndex written to {idx}")


if __name__ == "__main__":
    main()
