# Session-Digest 2026-09-06 — S4D22: GenAI-Systeme + Research-Block W27–W33

## Scope

- Ein Branch, ein PR, ein Content-Commit pro Woche, teure Gates einmal am Blockende.
- Sieben Module, eine Lektion je Modul:
  `lm-genai-rag`, `lm-genai-eval`, `lm-genai-security`, `lm-genai-prototype`,
  `lm-research-question`, `lm-research-cards`, `lm-research-responsible`.
- 42 migrierte Aufgaben (W27–W33 je 6); `content/exercises/w27.json` … `w33.json` byte-identisch.
- Keine neuen Generatoren (Registry bleibt 52); wiederverwendet aus `w27_w30_generators.mjs`
  und `w31_w39_generators.mjs`.

## Seeded Fälle (Solver unabhängig aus Parametern)

| Fall | Familie | Quelle | Generator | intro / stretch (10k Seeds) | Seed → Wert |
| --- | --- | --- | --- | --- | --- |
| recall-at-k-window | aggregate-topk-relevance-arithmetic (neu) | w27-e2 | genRecallAtK | 20,9 % / 53,9 % | 2711 → 2 |
| answer-filter-precision-recall-f1 | aggregate-confusion-metric | w28-e2 | genF1orPrecision | 33,6 % / 33,3 % | 2811 → 75 |
| injection-filter-counts | aggregate-confusion-metric | w29-e2 | genInjectionFlagCount | 49,8 % / 27,2 % | 2911 → 75 |
| allowed-action-count | formula-ratio-percent-metric | w30-e2 | genAllowedActionCount | 33,6 % / 33,3 % | 3011 → 80 |
| protocol-shift-flag-count | validate-goalshift-flag-rules (neu, gemischt) | w31-e2 | genProtocolShifts | 19,5 % / 54,4 % | 3111 → 3 |
| card-audit-missing-count | formula-stat-from-table | w32-e2 | genCardAudit | 52,5 % / 47,5 % | 3211 → 6 |
| subgroup-rate-gap-permille | aggregate-confusion-metric | w33-e2 | genSubgroupCost | 50,1 % / 49,9 % | 3311 → 40 |

Die Konfusionsmetrik-Familie trägt damit 7 der 11 vorgesehenen Quellen (W11, W28, W29, W33).

## Taxonomie-Entscheidungen

- **E12** (w32-e2): Kanon nennt `aggregate-validate-and-count-records` — eine seeded Pyodide-Familie; ein numerischer
  Fall kann dort nicht leben. Platzierung: `formula-stat-from-table / card-audit-missing-count`
  (intro = eine Karte, stretch = zwei Karten). `canonical-families.json` unverändert.
- **E13** (w31-e3): Kanon nennt `trace-collection-state` (code-trace, variable-values); die Quelle ist
  predict-output mit `output-lines`. Fallback auf `trace-assignment-state / metric-name-normalize-trace`
  mit Kompetenz-Override `c-research-question, c-python-reading`.

## Statische Migration

- 18 neue JSON-Familien (classify-*, trace-*, construct-*, validate-*, aggregate-*, reproduce-*),
  Erweiterungen von `aggregate-confusion-metric`, `trace-assignment-state`, `validate-required-field-raise`,
  `formula-stat-from-table`, `classify-fairness-aggregation`.
- Python-Fälle 1:1 (Startercode, Referenzsolver, Tests, Pakete); Intro-MCs `masteryEligible: false`.

## Review-Befunde

- Erster Entwurf enthielt fünf doppelte Case-Einträge/Solver-Zweige in `data_ml_families.mjs`
  (teils mit falschen Parameternamen); entfernt (−56 Zeilen), Parameter gegen Generatoren verifiziert.

## Gates

- compile public, typecheck, build:release: grün. Compile: 46 Kompetenzen, 46 Lektionen, 267 Aufgaben.
- `node --test tests/`: 1085 Tests, 1081 passed, 2 failed (Baseline: `sympy` fehlt; Coverage-Check im
  Full-Run – isoliert auf Basis und Branch grün), 2 skipped.
- `validate_content`: 14 Library-Baseline-Fehler, 2 Hinweise.
- Chromium exercise-family + learning-module: 6/7; Fehler = bekannte `59 Min.`-Erwartung.
- Route-Smokes: 7 Module, 7 seeded Family-Routen, 1 Trace-Route — HTTP 200, keine Console-/Page-Errors.

## Offen / Notizen

- Der S4D7-Pyodide-E2E-Test schlägt gegen einen langlebigen Dev-Server mit „Unbekannte Familie“ fehl
  (Test importiert `exercise_registry.mjs` als zweite Modulinstanz); frischer Server → grün. Harness-Thema
  für S5A, keine Regression.
- Modul-`description` ist seit S4D-Beginn eine Verkettung der Lektionsziele ohne Satztrennung
  (alle `lm-*`); Kosmetik für S6/UI-Rework, zentral in einem Schritt.
- `learning-module.spec.ts`: neben `59 Min.` ein Strict-Mode-Treffer „Algebra-Grundlagen sicher prüfen“
  (Modul- und Lektionslink gleichnamig) — S5A.
- Nächster Block: S4D23 W34–W39 (Abschluss aller 39 Quellen), danach S4E-Löschliste.
