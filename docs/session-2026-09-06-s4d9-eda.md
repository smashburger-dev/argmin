# S4D9: W07 EDA & bedingte Wahrscheinlichkeit → Modul lm-eda-distributions

Stand: 2026-09-06. Branch `devin/1788710057-s4d9-eda` auf S4D8.

## Entscheidung E9 (Noa-Linie aus E5): Kompetenz pro Fall

Wochenübergreifende Familien (`trace-library-api-output`,
`formula-ratio-percent-metric`, `aggregate-grouped-metrics-report`) tragen
Fälle verschiedener Kompetenzen. Ein Fall darf `competencyIds` überschreiben
(`generated.competencyIds ?? family.competencyIds`, Schema + Compiler-Check
gegen den Katalog). Familienwert bleibt Default.

## Gebaut

- Modul `lm-eda-distributions` (Lektion `l-eda-distributions`, `c-eda-viz`):
  5 kuratierte Platzierungen w07-e1…e5 + Übungsraum.
- Seeded `formula-ratio-percent-metric` (Fall `conditional-count-percent`,
  genConditionalCount; intro = Anzahl, stretch = Prozent; Seed 7001 = 42 wie
  Legacy). `data_ml_families.mjs` als Tabelle Familie → Fall → Generator/Solver.
- Statik-JSON: `classify-confounding` (intro-MC, kein Mastery),
  `formula-descriptive-stats-numpy` (w07-e4, Pyodide), `aggregate-grouped-
  metrics-report` (w07-e5, stretch, Pyodide); `trace-library-api-output`
  bekommt zweiten Fall (NumPy, Kompetenz-Override).

## Gates

Suite 1026/1029 (Host-`sympy`), Typecheck, Build (JS 83,1 KiB gzip),
`validate_content` 14 Baseline, Playwright chromium 6/7 (`59 Min.`),
Routen Modul/Ratio/NumPy-Trace ohne Konsolenfehler.

## Messung

Runtime 11.818 → 11.881 (+63, davon Familientabelle), Tests +73,
Content-JSON gesamt 1.592 Zeilen.

## Offen

S4D10 W08 (Regression: genMseGradient, genBaselineCorrect), CI-Workflows
erst in S5B (Baseline muss grün werden können), Linalg-Modul, `59 Min.`.
