#!/usr/bin/env python3
"""Reproducible PDF inventory audit for the KI-Lernplattform.

Collects per document: SHA-256, byte size, pdfinfo metadata, font count,
per-page character counts (native text layer coverage via pdftotext),
and optionally a deep inspection of selected pages with pdfplumber
(images, tables, layout signals).

Only local tools are used: poppler (pdfinfo, pdftotext, pdffonts) and
pdfplumber if installed. No OCR is run here (Surya stays a separate,
explicitly documented step).

Usage:
  python3 tools/pdf_audit.py audit --out docs/pdf-catalog.json
  python3 tools/pdf_audit.py mml-map --out content/mml-chapter-map.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PDFS = {
    "mml-book": ROOT.parent / "mml-book.pdf",
    "probabilistic-ml": ROOT.parent / "probalistic_machine_learning.pdf",
    "impact-math-ai": ROOT.parent / "impactmathematicsAI2203.08890v1.pdf",
    "integration-methods": ROOT.parent / "integration-methods.pdf",
    "math-deep": ROOT.parent
    / "Algebra, Topology, Differential Calculus, and Optimization Theory For Computer Science and Machine Learningmath-deep.pdf",
}

META_KEYS = [
    "Title",
    "Author",
    "Creator",
    "Producer",
    "CreationDate",
    "ModDate",
    "Pages",
    "Encrypted",
    "Page size",
    "PDF version",
    "File size",
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def run(cmd: list[str]) -> str:
    return subprocess.run(cmd, capture_output=True, text=True, check=True).stdout


def parse_pdfinfo(path: Path) -> dict[str, str]:
    out = run(["pdfinfo", str(path)])
    meta: dict[str, str] = {}
    for line in out.splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            if key in META_KEYS or key.startswith("Custom"):
                meta[key] = value.strip()
    return meta


def page_char_counts(path: Path) -> list[int]:
    # -layout keeps visual layout; \f (form feed) separates pages. pdftotext
    # emits a trailing form feed after the LAST page, which must not be
    # counted as an extra (empty) page.
    out = run(["pdftotext", "-layout", str(path), "-"])
    parts = out.split("\f")
    if parts and not parts[-1].strip():
        parts.pop()
    return [len(p.strip()) for p in parts]


def font_count(path: Path) -> tuple[int, list[str]]:
    out = run(["pdffonts", str(path)])
    lines = [l for l in out.splitlines()[2:] if l.strip()]
    names = sorted({l.split()[0] for l in lines if l.split()})
    return len(lines), names


def deep_pages(path: Path, pages: list[int]) -> list[dict]:
    try:
        import pdfplumber  # noqa: PLC0415
    except ImportError:
        return []
    results = []
    with pdfplumber.open(path) as pdf:
        for pno in pages:
            page = pdf.pages[pno - 1]
            results.append(
                {
                    "pdfPageIndex": pno,
                    "width": round(page.width, 1),
                    "height": round(page.height, 1),
                    "nImages": len(page.images),
                    "nLines": len(page.lines),
                    "nRects": len(page.rects),
                    "nCurves": len(page.curves),
                    "chars": len(page.chars),
                    "words": len(page.extract_words() or []),
                }
            )
    return results


def coverage_stats(counts: list[int]) -> dict:
    if not counts:
        return {}
    text_pages = [c for c in counts if c > 100]
    return {
        "pages": len(counts),
        "pagesWithTextLayer>100chars": len(text_pages),
        "textLayerCoverageRatio": round(len(text_pages) / len(counts), 4),
        "meanCharsPerPage": round(sum(counts) / len(counts), 1),
        "minCharsPerPage": min(counts),
        "maxCharsPerPage": max(counts),
    }


def audit(out_path: Path) -> None:
    report = {"schemaVersion": 1, "generatedWith": "tools/pdf_audit.py", "documents": {}}
    for doc_id, path in PDFS.items():
        if not path.exists():
            report["documents"][doc_id] = {"error": "file-not-found", "path": str(path)}
            continue
        counts = page_char_counts(path)
        nfonts, fonts = font_count(path)
        meta = parse_pdfinfo(path)
        # Fail closed: our page count must agree with pdfinfo's Pages.
        pdfinfo_pages = int(meta.get("Pages", "0"))
        if pdfinfo_pages and len(counts) != pdfinfo_pages:
            msg = (
                f"{doc_id}: Seitenzahl-Diskrepanz pdftotext={len(counts)} "
                f"vs. pdfinfo={pdfinfo_pages} — Audit abgebrochen"
            )
            print(f"[audit] FEHLER: {msg}", file=sys.stderr)
            raise SystemExit(msg)
        report["documents"][doc_id] = {
            "path": str(path.relative_to(ROOT.parent)),
            "sha256": sha256(path),
            "bytes": path.stat().st_size,
            "pdfinfo": meta,
            "coverage": coverage_stats(counts),
            "embeddedFonts": nfonts,
            "fontNamesSample": fonts[:12],
            "extractionMethod": "pdftotext -layout (native text layer)",
            "perPageCharCounts": counts,
        }
        print(f"[audit] {doc_id}: {len(counts)} pages, ok", file=sys.stderr)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({k: v.get("coverage") for k, v in report["documents"].items()}, indent=2))


# --- MML chapter mapping ----------------------------------------------------

MML_SECTIONS = [
    "2 Linear Algebra",
    "2.1 Systems of Linear Equations",
    "2.2 Matrices",
    "2.3 Solving Systems of Linear Equations",
    "2.4 Vector Spaces",
    "2.5 Linear Independence",
    "2.6 Basis and Rank",
    "2.7 Linear Mappings",
    "2.8 Linear Mappings and Matrices",
    "2.9 Basic Transformations",
    "2.10 The Determinant",
    "2.11 Linear Mappings and Determinants",  # may not exist in this printing
    "Eigenvalues and Eigenvectors",
    "3 Analytic Geometry",
]


def mml_map(out_path: Path) -> None:
    """Build the MML chapter map from the book's own table of contents.

    The draft PDF (2024-01-15) prints its Contents on pdf pages 3-4 with
    printed page numbers. The body offset pdf = printed + 6 was verified
    against pages 23 ('2 Linear Algebra' start, printed 17), 30 and 32.
    Running heads on odd pages repeat section titles, so first-line heading
    detection is NOT reliable in this document; the TOC is authoritative.
    """
    path = PDFS["mml-book"]
    out = run(["pdftotext", "-layout", str(path), "-"])
    pages = out.split("\f")
    entry_re = re.compile(r"^(\d{1,2}(?:\.\d{1,2})?)\s+([A-Z].*?)\s+(\d{1,3})$")
    sections: dict[str, dict] = {}
    for pno in (3, 4):
        for line in pages[pno - 1].splitlines():
            m = entry_re.match(line.strip())
            if not m:
                continue
            num, title, printed = m.group(1), m.group(2), int(m.group(3))
            sections[f"{num} {title}"] = {
                "printedPage": printed,
                "pdfPage": printed + 6,
                "evidence": "toc-pdf-page-3/4; offset pdf=printed+6 verified on ch.2 start",
            }
    result = {
        "schemaVersion": 1,
        "documentId": "mml-book",
        "sha256": sha256(path),
        "draft": "2024-01-15",
        "sections": sections,
        "method": "pdftotext -layout TOC parse (pdf pages 3-4) + verified body offset",
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    ch2 = {k: v for k, v in sections.items() if k.startswith("2 ")}
    print(json.dumps(ch2, indent=2))


def out_pages_if_buggy(fake_run) -> list[int]:
    """Control: the naive split (the old, buggy behavior) counts a phantom
    page — proves the selftest would catch a regression."""
    raw = fake_run(["pdftotext", "x", "-"])
    return [len(p.strip()) for p in raw.split("\f")]


def _selftest() -> None:
    """Targeted tests for page counting without touching real PDFs.

    1. A trailing empty formfeed segment (pdftotext always emits one) must
       not become an extra page.
    2. A mismatch between the counted pages and pdfinfo's Pages must abort
       the audit (the guard used in audit()).
    """
    import tempfile
    from unittest.mock import patch

    def fake_run(cmd: list[str]) -> str:
        if cmd[0] == "pdftotext":
            # pdftotext separates every page with \f, including the last one.
            return "page one\n\fpage two\n\fpage three\n\f"
        raise AssertionError("unexpected command " + " ".join(cmd))

    with tempfile.TemporaryDirectory() as td:
        pdf = Path(td) / "synthetic.pdf"
        pdf.write_bytes(b"%PDF-1.4 synthetic")
        with patch.object(sys.modules[__name__], "run", fake_run):
            counts = page_char_counts(pdf)
            assert counts == [8, 8, 10], f"trailing formfeed mishandled: {counts}"
            # Without the trailing-formfeed handling this yields 4 pages.
            assert len(out_pages_if_buggy(fake_run)) == 4, "control case lost"

        # Guard: pdfinfo disagreeing with the counted pages must fail the audit.
        meta = {"Pages": "4"}  # counted 3 above
        with patch.object(sys.modules[__name__], "run", fake_run), \
                patch.object(sys.modules[__name__], "parse_pdfinfo", lambda _p: meta), \
                patch.object(sys.modules[__name__], "font_count", lambda _p: (0, [])):
            try:
                audit(Path(td) / "out.json")
            except SystemExit as e:
                assert "Seitenzahl-Diskrepanz" in str(e), f"wrong abort reason: {e}"
            else:
                raise AssertionError("page-count mismatch did not abort the audit")

    print("selftest ok: trailing formfeed ignored, pdfinfo mismatch aborts")


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("audit")
    a.add_argument("--out", type=Path, default=ROOT / "docs" / "pdf-catalog.json")
    m = sub.add_parser("mml-map")
    m.add_argument("--out", type=Path, default=ROOT / "content" / "mml-chapter-map.json")
    sub.add_parser("selftest")
    args = ap.parse_args()
    if args.cmd == "audit":
        audit(args.out)
    elif args.cmd == "mml-map":
        mml_map(args.out)
    else:
        _selftest()


if __name__ == "__main__":
    main()
