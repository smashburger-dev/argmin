# S4D8: W06 Datenbereinigung als erstes Data/ML-Modul

Stand: 2026-09-06. Branch `devin/1788709355-s4d8-data-cleaning` auf S4D8a.

## Gebaut

- Modul `content/modules/lm-data-cleaning.json` (Lektion `l-data-cleaning`,
  Kompetenz `c-pandas-cleaning`): 6 kuratierte Platzierungen in
  Quellreihenfolge w06-e1…e6 plus Übungsraum der seeded Familie.
- Seeded Familie `count-remaining-rows-cleaning-rule`
  (`assets/js/core/data_ml_families.mjs`, 86 Zeilen): Fälle
  `missing-target-rows` (genCompleteRows) und `duplicate-rows` (genDedupRows),
  Profile intro/core/stretch mit Parameterfiltern, unabhängiger Solver.
  Generatoren werden aus `data_ml_generators.mjs` wiederverwendet.
- Statik-only-Familien als JSON: `classify-missingness` (w06-e1, intro,
  nicht masteryEligible), `trace-library-api-output` (w06-e3, predict-output),
  `validate-data-quality-contract` (w06-e4 core, w06-e5 stretch; Startcode,
  Referenz, Tests 1:1, Pyodide-Grader).
- Fallschema um `hints`, `feedbackRules`, `typicalErrors`, `tolerancePolicy`
  erweitert; `validateCompiledContent` konfiguriert die Familien vor der
  Modulprüfung; neue Datei in Public-/Open-Core-Allowlist.

## Verhalten

- Seed 6001/6002 liefern dieselben Antworten wie die Legacy-Generatoren
  (Test). Golden-Corpus-Fixture `tests/fixtures/data-ml-family-golden-corpus.json`
  (384 Instanzen). Kein Wochenquell-Löschen, `w06.json` unverändert.

## Gates

Suite 1021/1024 (1 Fehler: Host-`sympy`), Typecheck, Build (JS 82,5 KiB
gzip), `validate_content` 14 Baseline-Fehler, Playwright chromium 6/7
(`59 Min.` Baseline). Routen `#/module/lm-data-cleaning` und
`#/family/count-remaining-rows-cleaning-rule/duplicate-rows/6002/core`
ohne Konsolenfehler.

## Offen

S4D9 W07 EDA (`genConditionalCount`, weitere Fälle für
`trace-library-api-output`), Linalg-Modul, `59 Min.`-Erwartung, S5A/S5B.
UI-Rework (Ende): „Antwort prüfen“-Button ohne Außenabstand (Noa).
