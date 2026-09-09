# Lizenzregister (KI-Lernplattform)

Quellenregister: `content/sources.json` ist die verbindliche Quelle (Klassen: open, generated, link-only; Stand 2026-09-07, ADR-0015). Diese Datei ist eine lesbare Zusammenfassung und kann hinterherhinken.

Stand: 2026-08-31 (ADR-0014). Vier Inhaltsklassen:

- **open**: offen lizenziert (Weiterverbreitung + kommerzielle Nutzung + Bearbeitung, z. B. CC BY 4.0/CC0/MIT/Apache-2.0/BSD), korrekt attribuiert, im Public-Build erlaubt. Der Content-Validator lehnt NC-/ND-/SA-Marker in dieser Klasse fail-closed ab.
- **link-only**: rechtlich nur verlink- und zitierbar (NC, ND, ShareAlike-Kollision mit dem CC-BY-4.0-Sammelcontent, arXiv non-exclusive, fehlende Lizenzangabe). Dürfen als Lektüren referenziert werden; kein Textübertrag.
- **generated**: eigenständig entwickelt (Aufgaben, Lösungen, Lerntexte) mit dokumentierter Quellenlinie; Standardlizenz im Public-Build: CC BY 4.0 (eigene Inhalte).

Reklassifizierungen 2026-08-31 nach Primärbeleg (ADR-0014 Teil 4): `mit-ocw-18-06sc`, `serlo-mathe`, `wikibooks-mfnf`, `serlo-algebra-grundlagen-w01`, `openintro-statistics` von open nach link-only (NC/SA).```

Die vollständige, maschinenverbindliche Liste steht im Anhang (generiert aus sources.json) und in `content/sources.json` selbst.

Eigene Software steht unter MIT in `LICENSE`. Eigene distributierbare Lerninhalte stehen unter CC BY 4.0 in `LICENSE-CONTENT.md`. Vendor-Dateien und npm-Bundles behalten ihre Upstream-Lizenzen.

## Quellen

| sourceId | Titel | Klasse | Lizenz | Attribution | allowedUses | Nachweis (URL, 2026-08-24 geprüft) |
|---|---|---|---|---|---|---|
| `mit-ocw-18-06sc` | MIT 18.06SC Linear Algebra (Fall 2011) | **link-only** (reklassifiziert 2026-08-31; CC BY-NC-SA 4.0) | CC BY-NC-SA 4.0 | © MIT OpenCourseWare, Prof. Gilbert Strang; Lizenzlink beilegen | Weitergabe/Bearbeitung nicht-kommerziell mit Attribution + Share-Alike; OCW-Terms erlauben lokale Kopie und Weitergabe unter diesen Bedingungen | https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/ , https://ocw.mit.edu/terms/ |
| `serlo-mathe` | Serlo Mathematik | **link-only** (reklassifiziert 2026-08-31) | CC BY-SA 4.0 (Einzelinhalte können eigene Lizenznotizen tragen — vor Übernahme prüfen) | „Serlo“ e. V. / Autor:innen der Seite | Übernahme mit Attribution + Share-Alike; Einzel-Lizenzcheck Pflicht | https://de.serlo.org/terms |
| `wikibooks-mfnf` | Mathe für Nicht-Freaks (Wikibooks) | **link-only** (reklassifiziert 2026-08-31) | **CC BY-SA 4.0** (Live-Footer der Seite, einziger CC-Lizenzlink by-sa/4.0, verifiziert 2026-08-31; lokale Staging-Evidenz nannte konservativ 3.0 — ShareAlike bleibt in jeder Version link-only) | Wikibooks-Autor:innen / Serlo | Verlinkung und Zitat mit Attribution; kein Textübertrag in den CC-BY-4.0-Content | https://de.wikibooks.org/wiki/Mathe_f%C3%BCr_Nicht-Freaks:_Kopiere_uns |
| `devries-ml` | Maschinelles Lernen (Andreas de Vries, FH Südwestfalen) | open | CC BY 4.0 (wörtlich im PDF: „Dieses Skript unterliegt der Creative Commons License CC BY 4.0") | Andreas de Vries | Übernahme mit Attribution; Phase-3-Begleitung | https://www.fh-swf.de/.../devries_1/Maschinelles-Lernen.pdf |
| `kutyniok-2203.08890` | The Mathematics of Artificial Intelligence (arXiv) | verwaist (nicht in sources.json; W31 nutzt stattdessen cos-prereg/SEP/NeurIPS-Checkliste, ADR-0014) | arXiv-Standardlizenz (nicht-CC), Nichtausschließende Einräumung | Kutyniok et al. | Zitate mit Zitation, Woche 31 | arXiv 2203.08890v1 |
| `dlwp-notebooks` | Deep Learning with Python, 3rd ed. — Notebooks-Repo | open | MIT (upstream LICENSE unverändert beigelegt, plus NOTICE.md) | François Chollet | Code-Artefakte übernehmbar mit LICENSE+NOTICE; W18-W22 | https://github.com/fchollet/deep-learning-with-python-notebooks ; lokal vendort unter staging/sources/open/dlwp-notebooks/ |
| `overleaf-mml-extra` | Overleaf-Projekt (Zusatzaufgaben) | private | **nicht öffentlich zugänglich** (HTTP 403 ohne Login) | unbekannt | nicht verfügbar; ersatzlos gestrichen, bis Noa Zugriff bereitstellt | Projekt-URL 2026-08-24 geprüft |
| `katex`, `jsxgraph`, `pyodide`, `cpython`, `numpy`, `sympy`, `mpmath`, `mathlive` | Software-Runtimes | open | versionsgenaue SPDX-Ausdrücke in `vendor/licenses/THIRD_PARTY_NOTICES.json` | jeweilige Upstream-Autor:innen | Public-Artefakte werden nur mit referenziertem Lizenztext, Quell-URL und geprüftem Hash gebaut (S1B: Numbas-Retirement; S1A: ts-fsrs-Retirement) | `tools/validate_content.mjs` erzwingt Notice-Abdeckung und Hashes; Details in `docs/dependency-matrix.md` |
| Preact, CodeMirror, Lezer und Laufzeitabhängigkeiten | npm-Browserbundle | open | 18 exakte Komponenten aus `package-lock.json`, derzeit MIT | jeweilige Upstream-Autor:innen | nur produktiv erreichbare Pakete; Build- und Testwerkzeuge bleiben ausgeschlossen | `tools/build_npm_notices.mjs` erzeugt Lizenztexte, Quell-URLs und SHA-256; der Public-Validator prüft die Notice |

## Anhang: Vollständige Quellenliste (generiert aus content/sources.json, Stand 2026-08-31)

Diese Tabelle wird aus der verbindlichen Datei abgeleitet und listet alle 65 Einträge. Detailnotizen der Handtabelle oben bleiben gültig, wo sie konkreter sind.

| sourceId | Klasse | Lizenz (Kurzfassung) |
|---|---|---|
| `mit-ocw-18-06sc` | link-only | CC BY-NC-SA 4.0 (ocw.mit.edu/terms, wörtlich verifiziert 2026-08-31: „users may not sell, profit from, or commercialize OCW materials“); NC verletzt die Public- |
| `serlo-mathe` | link-only | CC BY-SA 4.0 (de.serlo.org/license/detail/1, verifiziert 2026-08-31); ShareAlike kollidiert mit CC-BY-4.0-Sammelcontent |
| `wikibooks-mfnf` | link-only | CC BY-SA 4.0 (Live-Footer de.wikibooks.org, einziger CC-Link by-sa/4.0, verifiziert 2026-08-31; lokale Staging-Evidenz nannte 3.0 — SA bleibt in jedem Fall) |
| `devries-ml` | open | CC BY 4.0 (wörtlich im PDF) |
| `numpy-docs` | open | BSD-3-Clause NumPy license (numpy.org/doc/stable/license.html erreichbar, verifiziert 2026-08-31; vorherige 404-Annahme aus ADR-0013 überholt) |
| `generated` | generated | CC BY 4.0 |
| `py-tutorial-official-3.14` | open | PSF License Version 2 (Software + Dokumentation); Code-Beispiele zusaetzlich BSD-0 — Beleg: docs.python.org/3/license.html (Staging rights py-tutorial-psf-v2) |
| `serlo-algebra-grundlagen-w01` | link-only | CC BY-SA 4.0 (de.serlo.org/license/detail/1: „Dieses Werk steht unter der freien Lizenz CC BY-SA 4.0“, verifiziert 2026-08-31) |
| `dlwp-notebooks` | open | MIT (LICENSE + NOTICE beigelegt) |
| `pro-git-book` | link-only | CC BY-NC-SA 3.0; im Public-Core nur Verlinkung und bibliografische Attribution |
| `ma-its-meta-analysis-2014` | link-only | Verlagsinhalt; im Public-Core nur DOI-Link und Zitation, keine Weitergabe des Volltexts |
| `murray-spacing-math-2025` | link-only | © Autor:innen unter exklusiver Springer-Lizenz; im Public-Core nur DOI-Link und Zitation |
| `bastani-ai-guardrails-2025` | link-only | Verlagsinhalt; im Public-Core nur DOI-Link und Zitation, keine Weitergabe des Volltexts |
| `pandas-docs` | open | BSD-3-Clause (pandas-Projekt; LICENSE github.com/pandas-dev/pandas) |
| `sklearn-user-guide` | open | BSD-3-Clause (scikit-learn-Projekt; COPYING github.com/scikit-learn/scikit-learn) |
| `openintro-statistics` | link-only | CC BY-SA 3.0 (openintro.org/license: „Derivative works should also be clearly licensed under the CC BY-SA 3.0“, verifiziert 2026-08-31); zusätzlich Markenzeiche |
| `wilke-dataviz` | link-only | CC BY-NC-ND 4.0 (Seitenfooter, abgerufen 2026-08-30) |
| `islr-book` | link-only | Verlagswerk (Springer); kostenfreies PDF zum Download, keine offene Textlizenz auf der Buchseite (abgerufen 2026-08-30) |
| `google-mlcc` | link-only | Google-Nutzungsbedingungen; keine offene Content-Lizenz auf der Kursseite gefunden (abgerufen 2026-08-30) |
| `model-cards-paper` | link-only | arXiv non-exclusive license; ACM DOI 10.1145/3287560.3287596 |
| `arxiv-attention-2017` | link-only | arXiv non-exclusive license 1.0; nur Verlinkung, Zitation und Abstract-Fakten |
| `arxiv-lora-2021` | link-only | arXiv non-exclusive license 1.0; nur Verlinkung, Zitation und Abstract-Fakten (10000x Parameter, 3x GPU-Speicher) |
| `arxiv-rag-2020` | link-only | arXiv non-exclusive license 1.0; nur Verlinkung, Zitation und Abstract-Fakten |
| `arxiv-bert-2018` | link-only | arXiv non-exclusive license 1.0; nur Verlinkung und Zitation |
| `arxiv-gpt3-2020` | link-only | arXiv non-exclusive license 1.0; nur Verlinkung und Zitation |
| `karpathy-micrograd` | open | MIT (GitHub LICENSE verifiziert) |
| `karpathy-nanogpt` | open | MIT (GitHub LICENSE verifiziert) |
| `karpathy-zero-to-hero` | link-only | YouTube-Standardlizenz; keine Lizenzangabe auf Kursseite — nur Verlinkung |
| `karpathy-recipe-blog` | link-only | keine Lizenzangabe auf der Blogseite — nur Verlinkung und Zitation |
| `hf-tokenizers-docs` | open | Apache-2.0 (Repo-Lizenz; Docs im Repo) |
| `hf-transformers-docs` | open | Apache-2.0 (Repo-Lizenz) |
| `pytorch-repro-notes` | open | BSD-Stil (PyTorch LICENSE); nur Lektüre — torch laeuft nicht in der Plattform (ADR-0012) |
| `dlbook-goodfellow` | link-only | MIT Press Copyright; Vertrag verbietet leicht kopierbare Formate — nur Verlinkung |
| `d2l-book` | link-only | Text CC BY-SA 4.0 (ShareAlike kollidiert mit CC-BY-4.0-Sammelcontent); nur Verlinkung, Code-Ideen MIT |
| `iir-book-ch8` | link-only | Cambridge University Press Copyright; HTML gratis lesbar — nur Verlinkung, Formeln eigenstaendig darstellen |
| `craswell-mrr-2009` | link-only | Springer, paywalled — nur Zitation und Verlinkung |
| `nist-airmf` | open | US-Regierungswerk, public information (17 U.S.C. 105); Veroeffentlichung mit Byline erbeten |
| `owasp-genai-llm-top10` | link-only | CC BY-SA 4.0 (ShareAlike kollidiert mit CC-BY-4.0-Content); nur Verlinkung, Paraphrase in Eigentext, kurze Zitate mit Attribution |
| `mitre-atlas` | open | Daten Apache-2.0 (atlas-data LICENSE verifiziert); Website-Prosa nur verlinken |
| `openai-cookbook` | open | MIT (GitHub LICENSE verifiziert) |
| `ragas-docs` | open | Apache-2.0 (Repo-Lizenz verifiziert) |
| `cos-prereg` | open | CC BY 4.0 (Seitenstatement, verifiziert 2026-08-31) |
| `hf-model-cards-docs` | open | Apache-2.0 (hub-docs-Repo, github.com/huggingface/hub-docs, verifiziert 2026-08-31) |
| `fairlearn` | open | MIT (github.com/fairlearn/fairlearn, verifiziert 2026-08-31) |
| `aequitas-toolkit` | open | MIT (Code github.com/dssg/aequitas, verifiziert 2026-08-31); Website ohne Lizenzangabe — konservativ referenzieren |
| `helm-leaderboard` | open | Apache-2.0 (github.com/stanford-crfm/helm, verifiziert 2026-08-31) |
| `lm-evaluation-harness` | open | MIT (Repo, verifiziert 2026-08-31) |
| `cookiecutter-data-science` | open | MIT (github.com/drivendataorg/cookiecutter-data-science, verifiziert 2026-08-31) |
| `turing-way` | open | CC BY 4.0 (Site-Statement; Software MIT; LICENSE.md im Repo, verifiziert 2026-08-31) |
| `wilson-good-enough` | open | CC BY 4.0 (PLOS-Copyrightzeile + Crossref, verifiziert 2026-08-31) |
| `sandve-repro-rules` | open | CC BY 4.0 (Crossref verifiziert 2026-08-31) |
| `rougier-figures` | open | CC0 1.0 (Artikeltext + Crossref publicdomain/zero/1.0, verifiziert 2026-08-31) |
| `kass-statistical-practice` | open | CC BY 4.0 (Seiten-Copyrightzeile + Crossref, verifiziert 2026-08-31) |
| `stanford-encyclopedia-popper` | link-only | Keine offene Lizenz — Copyright bei Autor, Encyclopedia „All rights reserved“ (Terms of Use, geprüft 2026-08-31); nur Verlinkung und Zitat |
| `jhangiani-research-methods` | link-only | CC BY-NC-SA 4.0 (Buchseite, wörtlich verifiziert 2026-08-31); NC schließt kommerzielle Nutzung aus |
| `neurips-paper-checklist` | link-only | Keine Lizenzangabe auf der Seite (geprüft 2026-08-31); nur Verlinkung und Zitat |
| `datasheets-for-datasets` | link-only | arXiv non-exclusive license 1.0 (arxiv.org/licenses/nonexclusive-distrib/1.0/, gelesen 2026-08-31); Verlinkung und Zitation |
| `data-cards-playbook` | link-only | Website ohne Lizenzangabe [UNKNOWN]; zugehöriges Repo github.com/pair-code/datacardsplaybook Apache-2.0 (verifiziert 2026-08-31) — konservativ link-only |
| `gpt4-system-card` | link-only | Keine offene Lizenz (© OpenAI); nur Verlinkung und kurze Zitate |
| `fairmlbook` | link-only | CC BY-NC-ND 4.0 (Buchwebsite, wörtlich: „licensed under the Creative Commons BY-NC-ND 4.0 license“, verifiziert 2026-08-31) |
| `strubell-energy` | link-only | arXiv non-exclusive license 1.0; Verlinkung und Zitation |
| `patterson-carbon` | link-only | arXiv non-exclusive license 1.0; Verlinkung und Zitation |
| `stanford-ai-index-2025` | link-only | CC BY-ND 4.0 (PDF-Zitat: „licensed under Attribution-NoDerivatives 4.0 International“, verifiziert 2026-08-31) — ND schließt Adaption aus; ältere Jahrgänge ware |
| `helm-paper` | link-only | arXiv non-exclusive license 1.0; Verlinkung und Zitation |
| `acm-artifact-badging` | link-only | Keine offene Lizenz (© ACM); nur Verlinkung und Zitat |

## Regeln für Aufgabentexte

- Generierte Aufgaben mit eigener Zahlenwahl/eigener Formulierung, die nur *Konzepte* aus MML/MIT aufgreifen, sind Klasse **generated**; ihre `sourceLineage` nennt die konzeptionelle Quelle (z. B. „Konzept: MML §2.2, S. 22; Aufgabe eigenständig entwickelt, Seed 42").
- Keine Übersetzung geschützter Aufgabentexte. „Inspiriert durch" heißt: eigene Instanz, eigene Zahlen, eigene Sprache — und die Lineage dokumentiert das.
- MIT-OCW-abgeleitete deutsche Notizen tragen CC BY-NC-SA 4.0 weiter (Attribution + Share-Alike + nicht-kommerziell).
