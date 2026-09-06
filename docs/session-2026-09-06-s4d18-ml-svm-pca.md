# Session 2026-09-06 — S4D18: W16 Margins, PCA & k-Means → `lm-ml-svm-pca`

## Outcome

W16 (`content/exercises/w16.json`, 5 Aufgaben) ist vollständig in zentrale Familien und das Modul `lm-ml-svm-pca` überführt. Die Wochenquelle bleibt bis S4E unverändert.

## Zuordnung

| Quelle | Familie | Fall | Profil | Mastery |
| --- | --- | --- | --- | --- |
| w16-e1 | `classify-svm-margin` (neu, JSON) | `hard-margin-width` | intro | nein (E3) |
| w16-e2 | `formula-ratio-percent-metric` (bestehend, seeded) | `pca-explained-variance-percent` | intro/core/stretch | ja |
| w16-e3 | `classify-supervision-scaling` (neu, JSON) | `supervised-vs-unsupervised-scaling` | core | ja |
| w16-e4 | `fit-pca-kmeans-pipeline` (neu, JSON, Pyodide) | `pca-eigh-projection` | core | ja |
| w16-e5 | `fit-pca-kmeans-pipeline` | `standardize-pca-kmeans` | stretch | ja |

Fall-Level-Kompetenz `c-ml-svm-pca` für den Ratio-Fall (E9). Python-Fälle: Startcode, Tests, Referenzsolver, Pakete 1:1 aus Legacy.

## Seeded Fall

- Generator `genPcaVariancePercent` (bestehend), Solver `100·λ₁/(λ₁+λ₂+λ₃)`.
- Seed 16001 → 85 (Legacy-Erwartung).
- Profile: intro `total === 50`, stretch `total === 25`; Rohakzeptanz über 10.000 Seeds 32,98 % / 33,66 %.
- Runtime-Zuwachs: 16 Zeilen in `data_ml_families.mjs`.

## Gates

- compile_content public, typecheck, build:release (87,7 KiB JS gzip) grün.
- Fokussierte Suite 65/65; Full Suite 1054 bestanden, 1 Fehler (Host-`sympy` fehlt, Baseline), 2 übersprungen.
- validate_content: bekannte Baseline (14 fehlende `library/`-Pfade, 2 Hinweise).
- Chromium 6/7 (bekannte `59 Min.`-Baseline).
- Routen Modul + 3 Familien: HTTP 200, keine Console-/Page-Errors.

## Offen

- Nächster Schnitt S4D19: W17 Reproduzierbarkeit inkl. neuem Repro-Fall in `formula-metric-spread-range` (E5, zur Freigabe).
