# Content-Review-Bericht v0.6 — German KI-Lernplattform

Branch `enamel-sprocket`. Geprüft: 8 Domain-Reviews (B1a–B7), 2 Gegenprüfungen
(C1 Didaktik, C2 Formal/Schema), E1 Evidenz-Remap, E2 Interaktiv-Audit.

## Umsetzungsstand

| Paket | Stand |
|-------|-------|
| 6 fachliche P0s | behoben (siehe Tabelle unten) |
| P2-String-Fixes (4 Stellen) | behoben |
| R14-Policy | entschieden: weiche Auslegung, in `docs/authoring-guide.md` §5 präzisiert |
| Non-Choice-Mastery `c-meta-learning` | behoben: neue Parsons-Familie `construct-error-journal-order` (curated + practice-space) |
| Non-Choice-Mastery `c-linalg-independence` | behoben: `formula-det2-independence:det2-seeded-columns` curated in `lm-linalg-independence` |
| Verbleibende P1s | offen (Abschnitt 5) |
| Neue Aufgabentypen / interaktive Elemente | umgesetzt (Nachtrag): `multiple-choice`, `diagnostic-rationale`, `worked-example-fading` implementiert und platziert; Viz-Checkpoints in allen 24 `.viz.json` |

Alle 46 Kompetenzen erfüllen jetzt ihre `evidencePolicy.minimumDistinctDefinitions`
(Inventar-Policy-Check: 46/46 `policySatisfiable`).

## Zusammenfassung

- Review-Umfang: 46 Kompetenzen, 46 Lektionen, 108 `familyId`s, 255 `familyActivities`, 24 JSXGraph-Visualisierungen.
- Fazit für v0.6: Build stabil; alle bekannten fachlichen Fehler behoben; R14 geklärt. Rest sind P1-Didaktik- und P2-Polish-Themen.
- **P0: 6** fachliche Fehler — alle behoben und unabhängig nachgerechnet.
- **P1: ca. 40** lernwissenschaftliche Verbesserungen, Verteilung siehe Abschnitt 5.
- **P2: ca. 15** Polish, Katalogklarheit, Typos — die 4 String-Fixes sind erledigt.
- Wichtigster Katalogbefund: 24 Familien leben ausschließlich in JS-Generatoren und fehlen als `content/families/*.json`. Kein Build-Fehler, aber ein public-first-Vertragsproblem.

## Methodik

- 8 Domain-Reviewer (B1a Mathe, B1b Python, B2 Linalg/Daten, B3 ML, B4 DL, B5 GenAI/Research, B6 Projekte/Explanations, B7 Tracks/Milestones) gegen Rubrik R1–R15, E1, E2, Authoring-Guide, Inventar.
- 2 Counter-Reviewer (C1 Didaktik, C2 Formal) verifizierten P0/P1 gegen Bundle-Evidenzen (`evidence_engine.mjs:36-44`, `family_registry.mjs:57`, `tools/compile_content.mjs`) und Schemata.
- Nach der Umsetzung hat ein unabhängiger Audit-Agent alle 10 Fixes nachgerechnet; dabei wurde ein Escaping-Fehler in `foundations_construct_families.mjs` gefunden und korrigiert.
- `validate_content.mjs` prüft Schema und Referenzen, fängt aber keine inhaltlichen Fehler in Prompts, Viz-Formeln oder Generatortexten ab — genau dort lagen die P0s.

## Behobene P0s

| # | Datei | Fehler | Fix |
|---|-------|--------|-----|
| 1 | `two-lines.viz.json:14` | Schnittpunkt `/3` statt `/5` — Punkt lag nicht auf L1 | `((2*c1-c2)/5, (c1+2*c2)/5)` |
| 2 | `row-operation.viz.json:10-11` | Invarianzpunkt `(2,3)` statt `(-2,-1)` | `[-2,-1]` |
| 3 | `chunk-overlap.viz.json:15` | Chunk-Anzahl zu niedrig (c=4,o=1 → 3 statt 4) | `floor(10/(c-o)-0.0001)+1` |
| 4 | `optimize-gradient-update-rule` (JSON + `.mjs`) | MSE mittelt über `n·d_out`, Gradient nur über `n` | `grad = (2/(n·d_out))·r.T @ h`, Starter/Tests/Prompt/Lösung synchron |
| 5 | `deep_learning_generators.mjs:196` | Dropout-Lösung zeigte `1/p = p` | zeigt `1/p` numerisch |
| 6 | `foundations_choice_families.mjs` | `feedbackRule` referenzierte nicht-existierende `choiceId` | Regel entfernt |

## Behobene P2-String-Fixes

| Datei | Fix |
|-------|-----|
| `capstone-pipeline.md:43` | `einmarshen` → `einfrieren` |
| `algebra.md` | `·` → `\cdot` im Math-Mode |
| `foundations_construct_families.mjs:511` | generierte Prompts rendern `*` als ` \cdot ` |
| `foundations_choice_families.mjs` | defekte `feedbackRule` entfernt (zugleich P0 6) |

## R14-Entscheidung (Choice als Mastery)

Die ursprüngliche Rubrik las `single-choice` grundsätzlich als Bearbeitungsnachweis.
Noa hat die weiche Auslegung gewählt, jetzt verbindlich in `authoring-guide.md` §5:

- Choice darf Mastery liefern, wenn der Fall Diagnose oder Transfer verlangt:
  ≥2 plausible Distraktoren auf typische Fehlkonzepte plus `fullSolution`/
  `feedbackRules`, die erklären, warum Alternativen falsch sind.
- Reine Wiedererkennung bleibt `masteryEligible: false` mit `fullSolution`-Notiz.
- `manual-rubric`/`short-rationale` bleiben nie mastery-fähig.

Konsequenz für die zwei betroffenen Kompetenzen:

| Kompetenz | Vorher | Nachher |
|-----------|--------|---------|
| `c-meta-learning` | 1 Mastery-Definition, nur Choice | + `construct-error-journal-order` (Parsons, curated + practice-space) → 2 Definitionen, davon 1 nicht-Choice |
| `c-linalg-independence` | 1 explizite Mastery-Definition | + `formula-det2-independence` curated (numeric) → 2 Definitionen, beide nicht-Choice, plus weiterhin Choice-Cross-Tagging |

## Von W2 herabgestufte Befunde

Die W2-P0s zur „fehlenden" Mastery-Deckung und fehlenden Familien beruhten auf
Zählung in `content/families/*.json`. Counter-Reviews zeigten: Bundle-Evidence
zählt über alle `familyActivities` inkl. Cross-Competency-Tagging, und 24
Familien kommen ausschließlich aus JS-Generatoren.

- JS-only-Familien (Python-Trace/Choice/Construct, ML-Formeln u. a.): runtime-verfügbar, nur als statische JSON unsichtbar → **P2** (public-first-Kataloglücke).
- `product-definition-rationale` als `masteryEligible: true` im Modul: `family_registry.mjs:57` setzt `manual-rubric` ohnehin auf `false` → **P2** (Katalog-Inkonsistenz).
- `classify-error-hypothesis` für `c-algebra-basics`: die Cases taggen `c-algebra`/`c-meta-learning`, nicht `c-algebra-basics` → **P2**.
- `competency-family-coverage.json`-Drift: generiert aus Bundle inkl. Cross-Tagging → **P2** (Dokumentationsbedarf, kein Defekt).

## P1: Lernwissenschaftliche Verbesserungen (offen)

### Foundations

- Worked Examples in `algebra.md`/`algebra-transformations.md` ohne Subgoal-Labels und ohne Completion-Fading (R1/R3).
- `lm-foundations-algebra` deckt nur `intro`/`core` ab, kein `stretch`/`challenge` (R6).
- `estimatedMinutes` 45/35/25 für wenig Text in drei Foundations-Lektionen (R7).
- Foundations-Visualisierungen sind passive Explorationen ohne Transferfrage (R12).
- Mehrere `foundations_construct_families`-Fälle ohne/unvollständige `feedbackRules`/`typicalErrors` (R3/R4).
- Zu schwere oder generator-basierte Curated-Cases in drei Python-Modulen; es fehlen intro-`trace-assignment-state`-Cases (R5/R6).
- Keine Parsons-Fälle im Python-Foundations-Block (R5).
- `trace-call-composition.json` fehlen `competencyIds`, `activityType`, `graderId`, `hints`, `feedbackRules`, `typicalErrors` (R15, R3/R4).

### Lineare Algebra und Daten

- `product-definition-rationale` in `lm-linalg-matrices` mit `masteryEligible: true` markiert obwohl `manual-rubric` (R15).
- `formula-scalar-product`, `classify-row-operation-validity`: mastery-fähige Fälle ohne `hints`/`feedbackRules`/`typicalErrors` (R3/R4).
- Wenig `stretch`/`challenge`-Placements in drei Linalg-Modulen (R6).
- `rank-3x4-line` und zwei `classify-independence-multiple`-Cases in keinem Modul platziert (R6).
- `lm-linalg-numpy-shape-contracts` platziert Practice-Fälle ohne `c-numpy-basics`-Tag (R15).
- `final-boss-authored` ohne `feedbackRules`, `estimatedMinutes: 45` (R3/R4/R7).

### Machine Learning

- 4 `single-choice`-Familien mit `masteryEligible: true` — unter weicher R14 erlaubt, aber auf Kriterien (Distraktoren, Feedback) zu prüfen.
- Alle ML-Visualisierungen passiv (R12).
- `fullSolution`-Texte in Trace-Varianten oft nur Ergebnis ohne Rechenweg (R2).
- Mehrheitsregel in `construct-ensemble-predictor-comparison` undokumentiert (R9/R15).

### Deep Learning

- `softmax-temperature.viz.json` passiv, keine Top-k/Temperatur-Frage (R12/R10).
- DL-Familien-JSONs ohne `license`, `releaseStatus`, `validationStatus` (R15).
- `dl-training.md` deckt Lernraten-Schedules nicht ab (R10).
- `lm-dl-*` Practice-Placements mit `estimatedMinutes: 0` (R7).
- Kein Case-Level-`workedExample`-Fading (R1).

### GenAI und Research

- `precision-recall-threshold.viz.json`: Spielzeugfunktionen, keine Transferfrage (R12).
- `capstone-pipeline.md` (156 Zeilen) von 5 Modulen geteilt, keine modulare Vertiefung (R1/R8).
- Vier Research-Lektionen nutzen dieselbe `.md` doppelt als Worked-Example und Exercise (R1/R15).
- `validate-report-guard-compose` (`baseline-report`) prüft `digest` nicht (R10).
- `estimatedMinutes`-Kalibrierung in Capstone-/GenAI-/Research-Modulen (R7).

### Projekte und Tracks

- `projectIds`/`explanationIds` in 48 von 49 Modulen leer; UI-Konsum in `ModuleView`/`TrackView` unklar (R11/R15).
- `diagnosticCodes` in Explanation-Cards ohne Mapping zu `graders.js`-`errorType`s (R4/R15).
- `foundations-data-checker`: `estimatedMinutes: 300` zu hoch, `projectVersion` als String (R7/R15).
- `rag-capstone/src/w30_core.py` byte-identisch mit W30-Projekt-Starter (R5/R15).
- `common-core`/`research-evaluation` platzieren `c-git-basics` vor seinem Erfordernis `c-meta-learning` (R11/R15).

## P2: Polish und Katalogklarheit (offen)

- Leere `projectIds`/`explanationIds` in Modulen füllen oder Schema-Felder streichen.
- `diagnosticCodes`-Taxonomie zentral mappen.
- `estimatedMinutes`-Kalibrierung über alle Module und Lektionen.
- Gemischte Anführungszeichen in `capstone-pipeline.md` (Kosmetik, pre-existing).

## Querschnittsthemen

### Public-first versus JS-first-Katalog

`tools/compile_content.mjs` lädt statische Familien, `exercise_registry.mjs`
mischt 24 JS-only-Familien dazu. Der Build läuft, aber der public-first-Vertrag
ist nicht vollständig erfüllt. Vorschlag: `contract: null`-Dokumente kommentieren,
Authoring-Guide klären (R14-Teil erledigt), Migration der 24 Familien plan-only.

### Kompetenzübergreifendes Tagging und Mastery-Zählung

`evidence_engine.mjs` zählt `qualified`-Events über alle `competencyIds` einer
Aktivität. Das erklärt scheinbar überdeklarierte Coverage-Werte und warum
spärliche Modul-Placements ihre Policy trotzdem erreichen. Design, kein Fehler.

### Passive Visualisierungen (R12)

Alle 24 `.viz.json` folgen auf `worked-example`-Blöcke ohne gekoppelte
Transferfrage. `VisualizationBlock.tsx` rendert Slider, aber keine Eingabe,
keinen Grader, keinen Auto-Check. `predict-then-verify` bleibt plan-only.

### Projekt- und Erklärungsverdrahtung

`module.projectIds`/`module.explanationIds` existieren im Schema, werden aber in
der UI nicht konsumiert. Befüllung lohnt erst nach UI-Entscheidung.

## Unsicherheiten und Validierungsbedarf

- Migration der 24 JS-only-Familien in `content/families/*.json`: Migrationspfad nötig, falls public-first für v0.6 gilt.
- `projectIds`/`explanationIds`: UI-Verbraucher klären, sonst keine Befüllung.
- `predict-then-verify`: Scope nur Visualisierungen oder auch Pyodide-Demos?
- `diagnostic`/`guided-practice` als echte Placement-Rollen im Schema?
- `rng-stream-reseed-trace` hängt von der vendored NumPy-Version ab; Referenzlösung dazu prüfen.
- `fit-weight-decay-ablation.json` sollte fachlich gegen den Referenzsolver gegengeprüft werden.

## Bewertung der Lerninhalte pro Domäne

### Mathematik (c-algebra-basics, c-algebra, c-grad-regression)

Kurze, aktive Lektionen mit messbaren Zielen; generierte Fälle handrechenbar und
invariantenstabil. Schwächen: fehlende Subgoal-Labels, kein Fading, unkalibrierte
Minuten, kein `stretch`-Fall für `c-grad-regression`.

### Python (c-python-basics bis c-git-basics)

Solide `du`-Form-Texte mit konkreten Beispielen. Schwäche: Curated-Placements
verweisen teils auf zu schwere oder fachfremde Cases; keine Parsons-Fälle — der
Einstieg ist steiler als vorgesehen.

### Lineare Algebra und Daten (B2)

Über weite Strecken korrekt; sinnvolle Verträge bei `formula-scalar-product`,
`transform-system-2x2-elimination`, `construct-matvec-shape-contract`. Die zwei
Viz-Fehler waren echte P0s (behoben). Es fehlen Challenge-Fälle und gekoppelte
Visualisierungsaufgaben.

### Machine Learning (B3)

Fachlich solide: Gradienten, Regression, Metriken, CV, Regularisierung,
Ensembles, PCA konsistent, `feedbackRules` decken typische Fehler. Größte Lücke
ist der public-first-Katalog (8 JS-only-Formel-Familien); dazu passive
Visualisierungen.

### Deep Learning (B4)

Attention, Tokenizer, Inference, LoRA und Training mathematisch abgestimmt.
Die zwei fachlichen Fehler (Dropout-Anzeige, Head-Only-Gradient) sind behoben.
Fehlende Familien-Metadaten und passive Visualisierungen bleiben.

### GenAI und Research (B5)

RAG, Evaluation, Sicherheit, Prototyping, Research-Fragen, Responsible AI und
Capstone konzeptionell stimmig und ehrlich über Stub-Grenzen. `chunk-overlap`-
Viz-Fehler behoben. Capstone-Teilung und doppelte `.md`-Nutzung bleiben.

### Projekte und Tracks (B6/B7)

Vier Projekte mit hochwertigen Tests und klaren Verträgen; Projekt-Reports sind
korrekt als Selbstlern-Nachweise markiert. Schwäche: keine Modul-Verlinkung;
Track-Reihenfolgeverletzungen bleiben offen.

## Validierungsstatus

```
$ node tools/validate_content.mjs
Content-Bundle: 46 Kompetenzen, 46 Lektionen, 255 Aktivitäten

$ node tools/build_coverage_matrix.mjs --check
Kompetenz-Familien-Coverage aktuell

$ node --test tests/*.test.mjs
1374 pass, 0 fail, 1 skipped (browser-Pyodide-Receipt, e2e only)
```
