# E1: Evidenz-Remap Lernmethodik → Kompetenz-Katalog (Agent-Report)

Orchestrator-Korrekturen (verifiziert gegen Repo):

- **G-14/LM-R4**: Die Typen parsons/code-trace/predict-output SIND im Content —
  als `expected.kind` in 14 Familien (`ordered-lines`=parsons 2,
  `variable-values`=code-trace 7, `output-lines`=predict-output 14 Cases).
  Offen bleibt: Sequenz (Trace/Predict VOR Schreibaufgaben?) und Deckung pro
  Kompetenz.
- **G-06/LM-R5**: Worked-Examples existieren als Lesson-Blocktyp
  `worked-example` (48 Vorkommen über Lessons). Ungenutzt ist das
  Case-Level-Feld `workedExample` (steps/completion-Fading in der Aufgabe
  selbst, 0 Fälle). Review-Frage: reicht Lesson-Level-Einführung, oder fehlt
  die Completion-Zwischenstufe?
- **Neuer P0-Befund aus dem Inventar** (policyCheck): `c-meta-learning` und
  `c-linalg-independence` erreichen ihre `minimumDistinctDefinitions: 2` nie
  (je nur 1 mastery-fähige Definition). `c-python-basics` und
  `c-python-functions` haben exakt 2 (kein Puffer).

---

## Block 1 — LM-R1..R10 im neuen Modell

| ID | Status | Begründung mit Beleg |
|---|---|---|
| **LM-R1** Mastery verfällt, Review aus Versuchshistorie | **umgesetzt** | `assets/js/core/review_scheduler.js` Expanding-Retrieval `[2,5,11]` Wochen; `evidencePolicy.freshnessDays: 77`/`minimumDelayDays`; authoring-guide §5. |
| **LM-R2** Kumulative Wochen-Gates | **plattform-out-of-scope** | Wochen-Gate-Modell ersetzt durch `evidencePolicy` + `requires`-DAG. Kumulation bleibt als Content-Frage über Spiral-Placements relevant (R11). |
| **LM-R3** `reviewQueue` bauen oder streichen | **umgesetzt** | `review_scheduler.js` buildReviewQueueEntries; `progress_store.js` Store; ADR-0008. |
| **LM-R4** parsons/code-trace/predict-output | **teilweise** | Typen whitelistet UND in 14 Familien vorhanden (s. Korrektur oben). Offen: Einsatzreihenfolge und Deckung. |
| **LM-R5** Worked-Example mit Fading | **teilweise** | Lesson-Block `worked-example` verbreitet (48); Case-Level `workedExample` (Completion-Fading) ungenutzt. |
| **LM-R6** Fortschritt = Stunden + Mastery | **plattform-out-of-scope** | UI-Systemthema. |
| **LM-R7** Wochenlog liest Fehlerjournal | **plattform-out-of-scope** | View-Aggregation; inhaltlich lebt das in `c-meta-learning`. |
| **LM-R8** Hinweis 1 als Subgoal-Frage | **offen-content** | Kein Schema-Feld erzwingt es — Reviewer prüft hints[0]-Formulierung. |
| **LM-R9** Review-Slots im Curriculum | **umgesetzt** | `evidencePolicy` + `review_scheduler.js` + ADR-0008. |
| **LM-R10** `durationMs` aktivieren | **plattform-out-of-scope** | Telemetrie-Auswertung. |

## Block 2 — G-Reihe (verletzt/teilw./unklar) im neuen Modell

| ID | Status | Content-Prüfung |
|---|---|---|
| G-01 Wiederholungsslots | plattform-out-of-scope | evidencePolicy-Werte pro Kompetenz plausibel? |
| G-02 Einmal-Mastery | umgesetzt | masteryEligible:false bei Konzept/Diagnose korrekt? freshnessDays im Content kommuniziert? |
| G-03 Geblockte Abrufsitzung | teilweise | Placement-Minuten je Modul sinnvoll aufteilbar? |
| G-05 Keine kumulative Strategiewahl | offen-content | Ziehen spätere Module ältere familyIds? (R11) |
| G-06 Worked-Example-Typ | offen-content | Lesson-Level vorhanden; Case-Level-Completion fehlt — nötig? |
| G-08 Selbstmarkierung | plattform-out-of-scope | — |
| G-11 Hinweise kosten nichts | offen-content | Hinweis-Stufen verraten nicht zu viel? |
| G-12 Sofortiges Feedback | teilweise | Passt Sofort-Feedback zum Typ? feedbackRules decken typische Fehler? |
| G-14 Parsons/Trace/Predict | teilweise | Sequenz: Lesen/Trace/Predict VOR python-code-Placements? |
| G-15 Completion-Sequenz | offen-content | Beispiel→Completion→Problem-Pfad bei Code? |
| G-17 Diagnose | plattform-out-of-scope | requires inhaltlich korrekt? |
| G-18 Schmales Gate | umgesetzt | evidencePolicy-Werte begründbar? |
| G-19 Kumulative Prüfungen | plattform-out-of-scope | s. G-05/R11 |
| G-20 Prerequisite-Graph | umgesetzt | requires/relations inhaltlich stimmig? |
| G-23 Zeit als Fortschritt | plattform-out-of-scope | — |
| G-24 Konstantes Budget | plattform-out-of-scope | estimatedMinutes plausibel (R7) |
| G-25 Subgoal-Hinweise | teilweise | hints[0] = Teilziel-Frage? |
| G-28 reviewQueue leer | umgesetzt | — |
| G-29 Diagnosewoche | plattform-out-of-scope | Einstiegskompetenzen requires:[] korrekt? |
| G-30 Schlaf/Bewegung | plattform-out-of-scope | — |
| G-31 Keine Spirale | offen-content | s. G-05/R11 |
| G-33 Konzept:Abruf 360:60 | offen-content | Lesson-Minuten vs. Placement-Minuten je Modul plausibel? |
| G-34 Trial-and-error | teilweise | difficulty-Spread verhindert Verharren? |
| G-35 durationMs tot | plattform-out-of-scope | — |

## Block 3 — OF-1..OF-9 im neuen Modell

| ID | Status | Begründung |
|---|---|---|
| OF-1 Mastery-Schwelle | beantwortet (Policy) | evidencePolicy fest: 2 Hits / 2 Definitionen / delayed. |
| OF-2 Wiederholungsdosis | Content-Entscheidung | Expanding [2,5,11] Wo implementiert; Modul-Dosierung = Review-Thema. |
| OF-3 Algorithmus | beantwortet | expanding retrieval produktiv; FSRS-Experiment entfernt (ADR-0008). |
| OF-4 Parsons bei Erwachsenen | Content-Entscheidung | Typen vorhanden; Einsatz in c-python-* prüfen. |
| OF-5 Sofort-Feedback | Content-Entscheidung | Default bleibt; je Typ abwägen. |
| OF-6 Konzept:Abruf | Content-Entscheidung | Lessons vs. Placements-Balance je Modul prüfen. |
| OF-7 Difficulty-Kalibrierung | Content-Entscheidung | Autorenwerte unkalibriert — R6/R7 anwenden. |
| OF-8 Fehlerjournal | teilweise | c-meta-learning übt Fehleranalyse — Deckung dieser Kompetenz prüfen (aktuell P0: 1 mastery-Def). |
| OF-9 Kumulative Gates | beantwortet | evidencePolicy operationalisiert. |

## Konsequenz für Reviewer

Aktiv prüfen: G-05/G-31 (Spiralrückgriffe), G-06 (Completion-Fading), G-11,
G-14 (Sequenz Lesen→Schreiben), G-15, G-25 (Subgoal-Hinweise), G-33
(Konzept:Abruf-Balance), G-34 (Difficulty-Spread), OF-2/4/5/6/7/8.
