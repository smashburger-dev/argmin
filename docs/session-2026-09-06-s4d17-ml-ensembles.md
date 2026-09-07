# S4D17: W15 Bäume & Ensembles → Modul lm-ml-ensembles

Stand: 2026-09-06. Branch `devin/1788721708-s4d17-ml-ensembles` auf S4D16.

## Gebaut

- Modul `lm-ml-ensembles` (Lektion `l-ml-ensembles`, `c-ml-ensembles`):
  w15-e1…e5 + Übungsraum.
- `aggregate-majority-rule-count` erhält seeded `ensemble-majority-output-count`
  (genEnsembleAccuracy, Seed 15001 = 11; intro Anzahl, stretch Prozent;
  Rohakzeptanz 34,8 % / 65,2 %; Override c-ml-ensembles).
- Statik-JSON: `classify-ensemble-effect` (intro-MC, kein Mastery),
  `optimize-tree-best-split` (w15-e4), `construct-ensemble-predictor-comparison`
  (w15-e5). `trace-assignment-state` erhält `tree-majority-vote-trace`
  (w15-e3, Override c-ml-ensembles + c-python-reading; Taxonomie-Verfeinerung
  in `foundations_trace_families.test.mjs` registriert).

## Gates

Suite grün bis auf Host-`sympy` und Coverage-Artefakt-Hinweis, Typecheck,
Build, `validate_content` 14 Baseline, Playwright chromium 6/7 (`59 Min.`),
vier Routen ohne Konsolenfehler.

## Offen

S4D18 W16 PCA (genPcaVariancePercent).
