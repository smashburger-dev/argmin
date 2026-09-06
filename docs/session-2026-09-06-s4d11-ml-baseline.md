# S4D11: W09 ML-Probleme & Baselines → Modul lm-ml-baseline

Stand: 2026-09-06. Branch `devin/1788711543-s4d11-ml-baseline` auf S4D10.

## Gebaut

- Modul `lm-ml-baseline` (Lektion `l-ml-baseline`, `c-ml-baseline`):
  w09-e1…e5 + Übungsraum.
- Seeded `aggregate-majority-rule-count`, Fall `majority-baseline-errors`
  (genBaselineCorrect; Seed 9001 = 149 wie Legacy). Profile: intro =
  Mehrheitsklasse ≥ 2× zweitgrößte (18,8 % Rohakzeptanz), stretch = Abstand
  der zwei größten ≤ 10 (19,8 %); alle 10 000 Testseeds ziehbar. Solver:
  Summe − Maximum.
- Statik-JSON: `classify-task-type` (intro-MC, kein Mastery),
  `reproduce-seeded-split` (w09-e4, Pyodide), `fit-predict-metrics`
  (w09-e5, Pyodide, stretch). `trace-library-api-output` erhält den
  sklearn-Fall `sklearn-split-no-shuffle` (Kompetenz-Override E9).

## Gates

Suite 1032/1035 (Host-`sympy`), Typecheck, Build (JS 84,1 KiB gzip),
`validate_content` 14 Baseline, Playwright chromium 6/7 (`59 Min.`),
vier Routen ohne Konsolenfehler.

## Messung

Runtime 11.983 → 12.037 (+54), Tests +92, Content-JSON +394.

## Offen

S4D12 W10 (Lineare Regression: genMseFromResiduals, genR2Share;
`fit-predict-metrics` bekommt w10-e4/e5; `formula-ratio-percent-metric`
w10-e3). Noa wünscht später mehr seeded Familien als Content-Schritt.
