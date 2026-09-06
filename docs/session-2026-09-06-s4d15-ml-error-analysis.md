# S4D15: W13 Fehleranalyse nach Teilgruppen → Modul lm-ml-error-analysis

Stand: 2026-09-06. Branch `devin/1788713135-s4d15-ml-error-analysis` auf S4D14.

## Gebaut

- Modul `lm-ml-error-analysis` (Lektion `l-ml-error-analysis`,
  `c-ml-erroranalysis`): w13-e1…e5 + Übungsraum.
- `formula-ratio-percent-metric` erhält seeded `subgroup-error-gap-pp`
  (genSubgroupGapPp, Seed 13001 = 45; intro n = 100, stretch n ∈ {20, 25};
  Rohakzeptanz 25,7 % / 48,8 %; Override c-ml-erroranalysis). Nur 13 Zeilen
  Runtime für eine neue unendliche Übung.
- Statik-JSON: `classify-fairness-aggregation` (intro-MC, kein Mastery;
  W33 folgt), `classify-error-drift` (w13-e3). `aggregate-grouped-metrics-report`
  erhält w13-e4/e5 (Pyodide, core/stretch).

## Gates

Suite 1045/1048 (Host-`sympy`), Typecheck, Build (JS 85,9 KiB gzip),
`validate_content` 14 Baseline, Playwright chromium 6/7 (`59 Min.`),
vier Routen ohne Konsolenfehler.

## Offen

S4D16 W14 Regularisierung (genShrinkagePercent; `classify-cv-leakage` w14-e3).
