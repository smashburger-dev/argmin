# v1 gegen v2 (S4A-v2, Stand 2026-09-03)

Quelle: `assemble-v2.mjs --write` aus 7 Shards (268 Entries) gegen eingefrorene
v1-Inputs (Baseline `1998d57`). Alle Zahlen maschinell abgeleitet, keine
Schätzung außer Abschnitt 7 (markiert).

## 1. Familien

| Maß | v1 | v2 |
|---|---|---|
| CognitiveFamilies | 256 | 132 |
| Quellen je Familie (max) | 3 | 18 (`trace-assignment-state`) |
| Singleton-Familien | 246 | 76 (Anteil 0,58) |
| FamilyGroups | — (Domänenpräfixe) | 11 |
| Shardübergreifende Familien | 10 (2–3 Quellen) | 15 |

v1 war ein Inventar mit Familienetikett: 246 von 256 Familien hatten genau eine
Quelle. v2 halbiert die Familienzahl und zieht 15 echte Cross-Domain-Familien
ein (größte: `trace-assignment-state` 18 über 6 Domänen,
`aggregate-confusion-metric` 11 über 3, `formula-ratio-percent-metric` 10 über 4).
Die 64er-Designhypothese ist überholt: 67 Familien wurden adoptiert, 2 tote
Hypothesen entfernt, 20 Counts korrigiert (Protokoll: `block-c-decisions.md`).

Kompression je Domäne (v1→v2): foundations 44→25, linear-algebra 21→14,
data-ml 60→34, deep-learning 24→17, transformer-llm 30→21, genai-systems
24→17, research-capstone 53→27.

## 2. FamilyGroups (11)

aggregate-count 41, classify-concept 54, construct-program 16, fit-model 12,
formula-apply 33, optimize-update 19, reflect-journal 2, reproduce-hash 14,
trace-state 37, transform-terms 16, validate-contract 23 (Mitglieder je Gruppe).

## 3. TaskArchetypes (9 aktiv + 1 historisch)

choice-diagnose 60, code-test 95, expression-equivalence 3, numeric-exact 50,
output-predict-lines 35, program-ordering 7, rationale-note 2, state-trace-vars
11, tuple-exact 4. `numbas-exam-retired` ist `historical-retired` und bindet
nichts (nur `w05-e7` als historische Referenz). Die Archetyp-Sitze summieren
sich auf 267 atomic-cases.

## 4. CaseTemplates und Placements

267 distinkte caseIds bei 267 atomic-cases, 0 geteilte Cases. Ehrliche Lesart:
Die Wiederverwendung sitzt auf Familien- und Vertrags-Ebene, nicht auf
Case-Ebene. Geteilte, parametrisierte Templates sind S4C-Arbeit; v2 liefert
dafür die gruppierten Kandidaten (56 Mehr-Mitglieder-Familien).
Placements: 268 (267 atomar + 1 retired Composite), 84 distinkte
Lektionsmengen, 268 distinkte Modul-Hints, 265 review-fähig (ohne `w05-e7`,
`w01-e11`, `w05-e9`).

## 5. Singleton-Quote

76 von 132 Familien (0,58) haben ein Mitglied. D1 hat jeden Singleton geprüft:
kein weiterer Merge besteht die drei Mitgliedschaftstests (Prozedur,
Referenzmodell, Diagnose). Die Quote spiegelt echte Konzeptvielfalt (der Korpus
deckt 46 Kompetenzen ab), nicht Bequemlichkeit. S4C entscheidet, ob einzelne
Singletons als CaseTemplates bestehender Familien landen; v2 erzwingt das nicht.

## 6. Wiederverwendung je Familie (Top)

18, 11, 10, 8, 6, 5, 4 (mehrfach). 56 Familien teilen Lösungsweg,
Referenzmodell, Fehlerhypothesen und Feedback-Zielpfade über 2–18 Quellen.

## 7. Erwartete Reduktion durch S4C/S4D (Projektion, keine Messung)

- Generatoren: 51 registrierte IDs bedienen heute 268 Quellen. 56
  Mehr-Mitglieder-Familien sind Kandidaten für je einen Familien-Generator mit
  Fallparametern statt Einzel-Seeds. Realistisch erst nach S4C-Baseline messbar.
- Content: 230 Wochen-Einzelaufgaben werden zu Familien-Placements mit
  Falltypen/Schwierigkeitsprofilen; keine Zahl vor S4D seriös.
- Tests: Familienverträge tragen je einen Property-/Contract-Test statt
  verstreuter Einzel-Assertions (S5A). 275 konsumierte Feedbackregeln bleiben
  verhaltensstabil, 348 bekommen erstmals einen echten Konsumenten (334
  answer-note, 8 worked-solution, 3 generic-hint, 2 input-validation,
  1 editorial-diagnosis).

## 8. Offene Noa- und Empirie-Entscheide (36 Queue-Punkte)

`decision-queue.json`: 3× rank-0, 1× rank-1, 31× rank-2, 1× rank-3. Darunter:
`w37-e1`-Merge (zwei Zweitprüfungen + Gegenreview liegen vor),
`w05-e11/12/13`-Merges, `w17-e2`-Merge mit `c-ml-repro`-Claim-Migration,
Prozent-Grenzen (GenAI), Kopier-gegen-Extraktions-Architektur (GenAI-Bosse),
S4B-Bindungsauflagen (Bearbeitungsnachweis-Semantik, Lektionszuordnungen).

## 9. Was v2 nicht ist

Kein Produktionscode, keine Contentänderung, keine Generator-Baseline, kein
zweiter Grader. v2 ist die prüfbare Taxonomie, auf der S4B (LearningModule) und
S4C (ExerciseFamily-Runtime) bauen. Timeline, Lektionsmassenproduktion und
LLM-Nutzung sind ausdrücklich draußen.
