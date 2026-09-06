# S4D12: W10 Lineare Regression → Modul lm-ml-linear

Stand: 2026-09-06. Branch `devin/1788712023-s4d12-ml-linear` auf S4D11.

## Gebaut

- Modul `lm-ml-linear` (Lektion `l-ml-linear`, `c-ml-linear`): w10-e1…e5 + Übungsraum.
- Gemischte Familie `formula-quadratic-error-metric`: statischer intro-MC
  `rmse-unit-from-mse` (w10-e1, kein Mastery) + seeded `mse-from-residuals`
  (genMseFromResiduals, Seed 10001 = 31; intro n ≤ 3, stretch n ≥ 5).
- `formula-ratio-percent-metric` erhält seeded `r2-explained-share`
  (genR2Share, Seed 10002 = 84, Kompetenz-Override c-ml-linear; intro =
  Formel genannt, stretch = Kontextformulierung). Solver dispatcht auf caseId.
- `fit-predict-metrics` erhält `linear-fit-lstsq` (w10-e4, core) und
  `regression-report` (w10-e5, stretch); Profile ["core","stretch"].

Rohakzeptanz der Profile: MSE 39,6 % / 40,0 %, R² 33,6 % / 33,3 %.

## Gates

Suite 1036/1039 (Host-`sympy`), Typecheck, Build (JS 84,5 KiB gzip),
`validate_content` 14 Baseline, Playwright chromium 6/7 (`59 Min.`),
fünf Routen ohne Konsolenfehler.

## Offen

S4D13 W11 Klassifikation (genConfusionCount). Statik-Zweige in gemischten
Familien weiterhin pro Familie (S5A: in Registry zentralisieren).
