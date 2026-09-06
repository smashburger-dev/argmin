# S4D16: W14 Regularisierung → Modul lm-ml-regularization

Stand: 2026-09-06. Branch `devin/1788721238-s4d16-ml-regularization` auf S4D15.

## Gebaut

- Modul `lm-ml-regularization` (Lektion `l-ml-regularization`,
  `c-ml-regularization`): w14-e1…e5 + Übungsraum.
- `formula-ratio-percent-metric` erhält seeded `ridge-shrinkage-percent`
  (genShrinkagePercent, Seed 14001 = 75; intro Anteil-Fragestellung,
  stretch Schrumpfungs-Fragestellung; Rohakzeptanz 31,4 % / 34,3 %).
- Statik-JSON: `classify-regularizer-effect` (intro-MC, kein Mastery),
  `formula-ridge-lasso-closed-form` (w14-e4/e5, Pyodide, core/stretch).
  `classify-cv-leakage` erhält `target-encoding-leakage` (w14-e3,
  Override c-ml-regularization).

## Gates

Suite 1048/1051 (Host-`sympy`), Typecheck, Build (JS 86,4 KiB gzip),
`validate_content` 14 Baseline, Playwright chromium 6/7 (`59 Min.`),
vier Routen ohne Konsolenfehler.

## Offen

S4D17 W15 Ensembles (genEnsembleAccuracy).
