# Session 2026-09-06 — S4D19: W17 Reproduzierbarkeit → `lm-ml-repro`

## Outcome

W17 (`content/exercises/w17.json`, 5 Aufgaben) ist vollständig überführt; damit ist der Data/ML-Block W06–W17 abgeschlossen (12 Module). Die Wochenquelle bleibt bis S4E unverändert.

## Zuordnung

| Quelle | Familie | Fall | Profil | Mastery |
| --- | --- | --- | --- | --- |
| w17-e1 | `classify-repro-contract` (neu, JSON) | `repro-contract-violation` | intro | nein (E3) |
| w17-e2 | `formula-metric-spread-range` (bestehend) | `cv-fold-accuracy-spread` — Lineage um `w17-e2` ergänzt, kein Duplikat (generatoridentisch zu w12-e2) | — | ja |
| E5 (neu) | `formula-metric-spread-range` | `seed-rerun-accuracy-spread`, Generator `genSeedSpread`, Kompetenzen `c-ml-repro`, `c-ml-cv` | intro/core/stretch | ja |
| w17-e3 | `trace-assignment-state` (bestehend, JSON) | `rng-stream-reseed-trace` (`expected.output` 1:1, Kompetenzen `c-ml-repro`, `c-numpy-basics`) | core | ja |
| w17-e4 | `reproduce-seeded-experiment-report` (neu, JSON, Pyodide) | `seeded-experiment-manifest` | core | ja |
| w17-e5 | `reproduce-seeded-experiment-report` | `repro-report-table-check` | stretch | ja |

## Neuer Fall (E5)

`seed-rerun-accuracy-spread`: gleiche Formel (max − min), aber Schwankung über Seeds statt Folds. Varianten: `unit = percent | fraction` (Anteile mit Dezimalkomma → Antwort in Prozentpunkten), `runs ∈ {3,5,8}`. Profile: intro `unit === 'percent' && runs === 3`, stretch `unit === 'fraction'`; Rohakzeptanz über 10.000 Seeds 16,56 % / 50,23 %. Seed 17002 → 34. Generator-Golden-Corpus 51 → 52 Familien (`genSeedSpread` Digest ergänzt, alle bestehenden Digests unverändert).

## Gates

- compile_content public, typecheck, build:release (88,3 KiB JS gzip) grün.
- Full Suite 1063 bestanden, 1 Fehler (Host-`sympy`, Baseline), 2 übersprungen.
- validate_content: bekannte Baseline (14 `library/`-Pfade, 2 Hinweise).
- Chromium 6/7 (bekannte `59 Min.`-Baseline).
- Routen Modul + 3 Familien: HTTP 200, keine Console-/Page-Errors.

## Offen

- Nächster Block S4D20+: Deep Learning W18–W21.
- Data/ML-Zwischenbilanz für E8 (Runtime-/Test-LOC) kann jetzt gemessen werden.
