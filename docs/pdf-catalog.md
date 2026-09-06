# PDF-Katalog (reproduzierbarer Audit)

Erzeugt mit `python3 tools/pdf_audit.py audit --out docs/pdf-catalog.json` (poppler: pdfinfo/pdftotext/pdffonts).
OCR wurde nicht ausgeführt. `perPageCharCounts` stehen in der JSON. Herleitungsstufe 1 von 5 der Extraktions-Pipeline.

| Dokument | SHA-256 (16) | Seiten | Textschicht >100 Z. | Mittlere Z./Seite | Fonts |
|---|---|---:|---:|---:|---:|
| mml-book | `3f87b70c64a35d30` | 418 | 0.9833 | 3564.3 | 431 |
| probabilistic-ml | `89749245bc8065d7` | 861 | 0.9663 | 3213.1 | 918 |
| impact-math-ai | `2ada390ed8ea18a7` | 17 | 0.9412 | 3403.6 | 27 |
| integration-methods | `0c6b57afb6e9f300` | 35 | 0.9143 | 2969.4 | 60 |
| math-deep | `a1f91e337445851d` | 2205 | 0.9751 | 2536.8 | 690 |

## Zuordnung

- **mml-book**: Deisenroth/Faisal/Ong, Mathematics for Machine Learning (Draft 2024-01-15, CUP)
- **probabilistic-ml**: Murphy, Probabilistic Machine Learning (lokal vorhandene Fassung)
- **impact-math-ai**: Kutyniok et al., The Mathematics of Artificial Intelligence (arXiv 2203.08890v1)
- **integration-methods**: Integrationsmethoden-Skript (lokale Herkunft unklar, Metadaten siehe JSON)
- **math-deep**: Algebra, Topology, Differential Calculus, and Optimization Theory for CS/ML (math-deep)

## Rechtlicher Status (Vorbefund aus Dokumentmetadaten und Agenten-Recherche, 2026-08-24)

- mml-book: „This version is free to view and download for personal use only. Not for re-distribution, re-sale, or use in derivative works." (S. 1 des PDFs) → Klasse **private**.
- Murphy (probabilistic-ml): keine OA-Lizenz festgestellt → Klasse **private**; Einsatz als Nachschlagewerk.
- arXiv 2203.08890v1: arXiv-Standardlizenz (nicht CC) → Klasse **private**, Zitate mit Quellenangabe.
- integration-methods / math-deep: Lizenz ungeklärt → Klasse **private**, bis Lizenz geklärt ist.

## MML-Kapitelanker

Verlässliche Kapitelanker (TOC-Parse, Offset pdf = gedruckt + 6 verifiziert): siehe `content/mml-chapter-map.json`.
Kapitel 2 (lineare Algebra): 2.1 S. 19, 2.2 S. 22, 2.3 S. 27, 2.4 S. 35, 2.5 S. 40, 2.6 S. 44, 2.7 S. 48 (gedruckte Seiten).
