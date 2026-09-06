# Cross-Domain-Review Claims / Difficulty / Didaktik (S4A-v2, Block D)

- Stand: 2026-09-03, korrigierte Shards nach `block-c-decisions.md` (alle 10 Punkte verifiziert im Korpus vorhanden)
- Korpus: 268 Entries, 131 Familien (57 mehrgliedrig, 74 Singletons), Registry 131 Familien, erwartete Summe 267 = abgeleitete Atomic-Summe 267, 0 Abweichungen
- `selftest.mjs`: 27/27. `assemble-v2.mjs` (Trockenlauf): alle Assertions wahr, Exit 0
- Urteil: **grün** — Claims und Didaktik freigegeben. Ein Finding (low, reine S4B-Auflagenliste, keine Shard-Änderung)

## 1. Primary Claims und coEvidence

Skriptprüfung korpusweit (268/268): jeder `competencyClaim.primary` liegt in den v1-`competencyIds` der Quelle und in `content/competencies/core.json` (46 Kompetenzen). Jede `coEvidence` ist Teilmenge der v1-`competencyIds` und in `core.json` enthalten. Verletzungen: 0.

Stichproben gegen `learningObjective` (w01-e11, w05-e3, w12-e2, w17-e2, w24-e3, w27-e6, w34-e2, w37-e1, w13-e4, w20-e3, f-linalg-column-choice-01, w26-e4): alle konsistent. Keine Agenten-Erfindung von Kompetenzbezügen; Claims sind 1:1 aus v1 übernommen.

Anmerkung ohne Finding: w05-e3 trägt primary `c-linalg-independence` bei reiner Skalarprodukt-Rechnung (LO) und Primärlektion `l-linalg-matrices`. Korrekt als `deferred-to-s4b` disponiert (lessonIds, mit Quartett); S4B bestätigt den Claim bei der Bindung.

## 2. Difficulty ist kognitive Anforderung

268/268 `difficultyProfile` zeichengleich mit v1 `proposedDifficultyProfile` (basic-recall 61, core-application 129, advanced-transfer 42, final-boss-synthesis 36). Die Agenten haben keine Schwierigkeit vergeben; jede inhaltliche Frage an die Labels richtet sich an v1.

Alle 131 Familien skriptgeprüft. Wochenfolge-Monotonie wäre der falsche Test (der Vertrag sagt ausdrücklich: Schwierigkeit folgt nicht der Wochenfolge); geprüft wurde stattdessen kognitive Deckung: 32/57 Mehr-Mitglieder-Familien staffeln Profile, jede Staffelung ist in der v1-`difficultyRationale` kognitiv begründet (Schrittzahl, Distraktoren, Transfer, Synthese). Stichproben: w35-e5 advanced (zwei Distraktoren, Reihenfolgenfallen) neben w39-e4 core (ein Vergleich, ein Fehlerweg); w05-e14 basic (Lesen/Sortieren bekannter Referenz) neben w05-e8 core (Reihenfolge Prüfung-vor-Berechnung als Lernkern); f-algebra-both-sides-01 advanced (Variable beidseits, negative Lösung, Probe) neben f-algebra-equivalence-01 basic (eine Operation). Inversionen im kognitiven Sinn: 0.

Hinweis (kein Finding): Difficulty korreliert grob mit Archetyp (basic-recall: 46 choice, 0 code-test; final-boss: 35/36 code-test). Das ist kein Oberflächen-Label: Schwierigkeit variiert auch archetyprein (classify-git-operation basic→advanced als choice; fit-forward core→final als code-test). Die Korrelation spiegelt echte Anforderung (Implementieren unter Hidden Tests vs. Wiedererkennen).

## 3. Darstellung vs. kognitive Anforderung

Alle domänenseitigen Fehlfamilien-Findings sind korrigiert und im Korpus verifiziert: w02-e1/w31-e3 in `trace-collection-state`, w01-e6 in `trace-call-composition`, w20-e3 in `trace-training-loop-count`, w24-e3 in `optimize-decode-greedy-loop`, f-linalg-column-choice-01 in `classify-column-combination`, w13-e4 in `aggregate-grouped-metrics-report`, w34-e2 in `formula-ratio-percent-metric`, MRR-Achsen im Retrieval-Vertrag, w37-e1-`mergeInto` auf `classify-freeze-purpose`, w18-e4-`caseId` auf v1-Wert. Die verbleibenden Dehnungen (w21-e3, w38-e3, w26-e4-Dokumentation, Transformer-F3/F4) fallen unter die dokumentierten Council-Entscheide aus `block-c-decisions.md` Nr. 11–15. Kein neues Oberflächen-Label gefunden.

## 4. Human-Review-Markierungen (57)

v1-`humanReviewRequired` 57 = Shard-`required` 57, keine fehlende, keine extra. `reasons` 57/57 zeichentreu. Alle 57 disponiert: 32× `deferred-to-s4c`, 22× `requires-noa-decision`, 2× `deferred-to-s4b`, 1× `deferred-to-domain-migration`. Keine einzige `resolved-*`-Disposition unter den 57: keine Agentenbewertung wird als menschliche Releasefreigabe ausgegeben. Alle offenen tragen vollständiges Quartett (owner/decision/evidence/latestGate): 0 Lücken.

## 5. Unsicherheitsdispositionen (235)

v1-Unsicherheiten 235 = Shard-Dispositions 235. Tripel (field/level/reason) 268/268 Quellen multiset-gleich mit v1: 0 Abweichungen. Verteilung: 96× `deferred-to-s4c`, 74× `resolved-with-source-evidence`, 32× `deferred-to-s4b`, 18× `resolved-with-code-evidence`, 14× `requires-noa-decision`, 1× `deferred-to-domain-migration`. Keine fehlende Disposition, keine leeren Quartette bei offenen (0 Lücken, skriptgeprüft).

Tiefenstichproben: w01-e3 (Quellbeleg tragfähig), w04-e2 (Code-Beleg verifiziert: `BRANCH_SHAPES` mit `if-elif-elif-else` und `if-elif-elif-elif-else`, `foundations_fresh_generators.mjs` Zeilen 538–539), w27-e5 (geteilter Ranking-Kern belegt), w31-e6 (ehrliche S4C-Vertagung). Alle substanziell.

## 6. resolved-by-review-council

Korpusweit 0× vergeben (weder uncertainties noch humanReviews), 0× `councilReviewRef` im Korpus. Die Disposition bleibt damit strukturell unerreichbar wie vorgesehen; kein dangling ref. Bestanden.

## 7. Bearbeitungsnachweis-Semantik (block-c-decisions Nr. 16)

Exercise-level `masteryEligible: false` tragen 38 Quellen; das Shard-Modell hat dafür kein Feld (`reviewEligible` bleibt `true`). Davon 33 mit explizitem Bearbeitungsnachweis-String und 5 ohne String (w09-e1, w10-e1, w11-e1, w12-e1, w13-e1), die in keinem Domänenreview-Anhang namentlich stehen. Zusätzlich tragen w01-e11 und w05-e9 `masteryEligible: false` nur in der `tolerancePolicy` (self-assessed-rubric); deren Nicht-Mastery-Semantik ist bereits modelliert (`reviewEligible: false`, rationale-note) und gehört nicht in die S4B-Liste.

## Findings

| ID | Schweregrad | sourceIds | verletzte Regel | Beleg | kleinste Korrektur (nicht ausgeführt) |
|---|---|---|---|---|---|
| F1 | low | w09-e1, w10-e1, w11-e1, w12-e1, w13-e1 (ergänzend die 33 aus der Liste unten) | block-c-decisions Nr. 16: alle betroffenen `currentDefinitionId`s wandern als S4B-Auflage in den Integrationsdigest | `content/exercises/w09.json`–`w13.json` je erste Übung mit `masteryEligible: false` ohne Bearbeitungsnachweis-String (eigene Skriptauswertung); Domänenreviews nennen nur Teilmengen (foundations 4, data-ml 7, transformer-llm 5, capstone unvollständig, deep/genai/linalg keine) | Vollständige 38er-Liste (unten) in den Integrationsdigest übernehmen; kein Shard-Eingriff nötig |

Keine weiteren Findings. Keine Shard-Korrektur aus diesem Review erforderlich.

## S4B-Auflagenliste Bearbeitungsnachweis (38 currentDefinitionIds)

w01-e1, w01-e2, w02-e3, w03-e2, w06-e1, w07-e1, w08-e1, w09-e1, w10-e1, w11-e1, w12-e1, w13-e1, w14-e1, w15-e1, w16-e1, w17-e1, w18-e1, w19-e1, w20-e1, w21-e1, w22-e1, w23-e1, w24-e1, w25-e1, w26-e1, w27-e1, w28-e1, w29-e1, w30-e1, w31-e1, w32-e1, w33-e1, w34-e1, w35-e1, w36-e1, w37-e1, w38-e1, w39-e1.

Vollständigkeit: skriptgeprüft gegen alle `content/exercises/w*.json` (38 exercise-level `masteryEligible: false`, plus 2 rubric-level w01-e11/w05-e9, die bereits via `reviewEligible: false` modelliert sind).
