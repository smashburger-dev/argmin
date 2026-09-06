# S4D14: W12 Cross-Validation & Leakage → Modul lm-ml-cv

Stand: 2026-09-06. Branch `devin/1788712798-s4d14-ml-cv` auf S4D13.

## Gebaut

- Modul `lm-ml-cv` (Lektion `l-ml-cv`, `c-ml-cv`): w12-e1…e5 + Übungsraum.
- Seeded `formula-metric-spread-range` / `cv-fold-accuracy-spread`
  (genCvSpread, Seed 12001 = 32; intro k = 4, stretch k = 10,
  Rohakzeptanz 33,3 % / 33,0 %). W17 ergänzt später einen eigenen,
  fachlich anderen Repro-Fall (E5).
- Statik-JSON: `classify-parameter-origin` (intro-MC, kein Mastery),
  `classify-cv-leakage` (w12-e3; W14 folgt), `validate-leakage-rule-audit`
  (w12-e5, Pyodide, stretch). `reproduce-seeded-split` erhält
  `kfold-indices-numpy` (w12-e4, Override c-ml-cv + c-numpy-basics).

## Gates

Suite 1042/1045 (Host-`sympy`), Typecheck, Build (JS 85,4 KiB gzip),
`validate_content` 14 Baseline, Playwright chromium 6/7 (`59 Min.`),
vier Routen ohne Konsolenfehler.

## Offen

S4D15 W13 Fehleranalyse (genSubgroupGapPp; `formula-ratio-percent-metric` w13-e2).
