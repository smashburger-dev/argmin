# Session-Digest 2026-09-06 — S4D23: Capstone-Block W34–W39 (letzter Legacy-Block)

## Scope

- Ein Branch, ein PR; teure Gates einmal am Blockende.
- Sechs Module: `lm-capstone-baseline` (W34, `l-capstone-baseline`) sowie `lm-capstone-freeze` (W35),
  `lm-capstone-runner` (W36), `lm-capstone-regression` (W37), `lm-capstone-repro` (W38),
  `lm-capstone-acceptance` (W39) — alle fünf an der einen Lektion `l-capstone-pipeline`.
- 36 migrierte Aufgaben; `content/exercises/w34.json` … `w39.json` byte-identisch.
- Keine neuen Generatoren (Registry bleibt 52); wiederverwendet aus `w31_w39_generators.mjs`.
- Damit sind alle 39 Wochenquellen überführt.

## Seeded Fälle (Solver unabhängig aus Parametern)

| Fall | Familie | Quelle | Generator | intro / stretch (10k Seeds) | Seed → Wert |
| --- | --- | --- | --- | --- | --- |
| baseline-ledger-rates | formula-ratio-percent-metric | w34-e2 | genBaselineLedger | 33,1 % / 33,3 % | 3411 |
| pipeline-stage-audit | formula-stat-from-table | w35-e2 | genPipelineStages | 50,1 % / 49,9 % | 3511 |
| eval-batch-rates | formula-stat-from-table | w37-e2 | genEvalRates | 40,8 % / 59,2 % | 3711 |

Die kanonischen Seeds reproduzieren den Legacy-`defaultExpected` (Test `s4d23_capstone.test.mjs`).

## Entscheidungen

- **E14** (w36-e2, w38-e2, w39-e2): numerische Fälle mit festem Wert ohne Generator laufen über den
  statischen JSON-Adapter (`expected: {kind:'integer', value}`); kein neuer Grader-Pfad.
- **E15** (w35-e2, w37-e2): Kanon nennt `aggregate-validate-and-count-records` (seeded Pyodide);
  numerische Fälle liegen in `formula-stat-from-table`. `canonical-families.json` unverändert.
- **E16** (W35–W39): fünf Module an einer Lektion statt eines 30-Aufgaben-Kapitels — E6 („ein Modul
  pro Lektion“) wird hier zugunsten gleich großer Kapitel und feinkörnigem Fortschritt aufgeweicht.
- **E17** (w37-e5): Python-Fall als statischer Fall in der seeded Familie
  `aggregate-validate-and-count-records` (Muster `validate-required-field-raise`), kein Fallback nötig.
- Parsons (w35-e5): bestehender Parsons-Grader/-View trägt den statischen Fall `freeze-assert-parsons`
  in `construct-freeze-assert-guard`.

## Grader-Fix

`gradeVariable` (code-trace) verglich jede Variable als Ganzzahl; w36-e3 hat eine String-Variable
(`status_zeile = 'ok fehler timeout'`) und war in der Legacy nie lösbar. String-Werte werden jetzt exakt
verglichen, umschließende Anführungszeichen toleriert. Ganzzahl-/`repr`-Pfade unverändert.

## Gates

- compile public, typecheck, build:release grün (46 Kompetenzen, 46 Lektionen, 267 Aufgaben; JS 103,0 KiB gzip).
- `node --test tests/`: 1093/1097 (Baselines: Host-`sympy`; veraltetes `build-next` vor Release-Build).
- `validate_content`: 14 Library-Baseline, 2 Hinweise.
- Chromium exercise-family + learning-module: 6/7 (`59 Min.`-Baseline).
- Route-Smokes: 6 Module, 3 seeded Familien, 1 Trace, 1 statischer Numeric-Fall — keine Console-/Page-Errors.

## Vorarbeit S4E (Löschliste)

Abgleich aller 229 Legacy-IDs gegen `sourceLineage` in `content/families/*.json` und Runtime-Registrierungen:
52 IDs ohne JSON-Lineage sind seeded Runtime-Fälle; **drei IDs haben kein Ziel**:

- `w01-e10` (numeric, log₅(25)) — Kandidat `formula-*`-Familie oder bewusst streichen;
- `w01-e11` (short-rationale, Wochenreflexion, manual-rubric) — vermutlich bewusst nicht migriert;
- `w05-e15` (code-trace Spaltenbild; Kanon `trace-assignment-state`, S4B-Digest „Zuhause l-linalg-matrices“) —
  fehlt als statischer Fall.

Diese drei sind vor der Löschung der Wochenquellen zu entscheiden. Offen bleiben ferner: Linalg-Modul fehlt,
Answer-Button-Spacing (UI-Rework), Modulbeschreibungen mit verketteten Lernzielen (S6).
