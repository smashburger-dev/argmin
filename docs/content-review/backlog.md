# Content-Review-Backlog v0.6

Gegliedert nach P0, P1, P2 und offenen Policy-Entscheidungen.
Stand: Batch 1 + R14-Umsetzung abgeschlossen (siehe „Umgesetzt").

## Umgesetzt

| # | Eintrag | Umsetzung |
|---|---------|-----------|
| P0 1 | `two-lines.viz.json` Schnittpunkt | `((2*c1-c2)/5, (c1+2*c2)/5)` |
| P0 2 | `row-operation.viz.json` Invarianzpunkt | `[-2,-1]` |
| P0 3 | `chunk-overlap.viz.json` Chunk-Anzahl | `floor(10/(c-o)-0.0001)+1` |
| P0 4 | `optimize-gradient-update-rule` MSE/Gradient | `2/(n·d_out)` in JSON + prozeduralem `.mjs`, alle Artefakte synchron |
| P0 5 | Dropout-Skalierungsanzeige | zeigt `1/p` numerisch |
| P0 6 | defekte `feedbackRule` | entfernt |
| P0 7/8 | R14-Choice-Mastery | weiche Auslegung verbindlich in `authoring-guide.md` §5 + `rubrik.md` R14 präzisiert; `c-meta-learning`: neue Parsons-Familie `construct-error-journal-order`; `c-linalg-independence`: `formula-det2-independence` curated |
| P2 | `einmarshen`-Typo, `·`-Notation, `*`-Prompt-Rendering | behoben (Generator-Fix nach Audit-Korrektur: ` \cdot ` mit Leerzeichen) |
| P1 | Subgoal-Labels + Completion-Fading | `algebra.md`, `algebra-transformations.md` (Fettungs-Format nach Repo-Konvention, Probe als `???`-Selbstprüfung) |
| P1 | `estimatedMinutes` Foundations | `algebra.json` 20, `algebra-transformations.json` 25, `learning.json` 15 |
| P1 | Stretch/Challenge-Placements | `lm-foundations-algebra` (+2), `lm-foundations-python-state` (+1), `lm-foundations-code-reading` (+1), `lm-linalg-matrices` (+2), `lm-linalg-systems` (+1), `lm-linalg-independence` (+3), `lm-linalg-gauss` (+`rank-3x4-line`) — alle probe-instanziiert |
| P1 | Python-Intro-Trace/Predict-Curation | verifiziert bereits korrekt (B1b-Befund galt statischem Katalog, Cases kommen aus JS-Verträgen) |
| P1 | `trace-call-composition` Vertrag | `competencyIds`, `hints`, `feedbackRules`, `typicalErrors`, `tolerancePolicy`, `activityType`, `graderId` ergänzt |
| P1 | `product-definition-rationale` masteryEligible | entfernt (manual-rubric ohnehin nicht mastery-fähig, R15-Konsistenz) |
| P1 | `formula-scalar-product` Vertrag | Hints/feedbackRules/typicalErrors für 5 Cases, Fehlwerte nachgerechnet |
| P1 | Viz-Transferfragen | `span-2d`, `normal-density` (text-Objekt), 6× `data-ml/*.viz` (caption), `softmax-temperature` (caption + k-Slider mit Top-k-Renormierung) — schwache predict-then-verify-Form, benotete Kopplung braucht neuen Blocktyp (Plan-Doku) |
| P1 | R14-Audit ML-Familien | alle Cases erfüllen die präzisierte R14 — kein Flip nötig; Qualitätsfix: ID-gebundene feedbackRules durch Catch-all `choice !== 'none'` ersetzt (Varianten-Permutation), `threshold-under-asymmetric-cost`-fullSolutions angereichert |
| P1 | `construct-ensemble-predictor-comparison` | Mehrheitsregel in Prompt/Docstrings/Solver + `strict-majority`-Regel |
| P1 | `fit-weight-decay-ablation` | Docstring-Objective, `final_loss_*`-Semantik, `import numpy` in Tests; `.mjs`-Anchor synchronisiert |
| P1 | `validate-report-guard-compose` | `baseline-report` validiert `digest` in `ergebnis` (sha256 kanonische Serialisierung); `.mjs` + Seeded-Emission synchronisiert (echter Digest + 4. brokenArm) |
| P1 | `dl-training.md` LR-Schedules | Abschnitt Step/Cosine/Plateau ergänzt |
| P1 | `estimatedMinutes` restliche Module | `lm-dl-*` practice-space 0→8; `lm-capstone/genai/research-*` auf 25/30/32/45 kalibriert |
| P1 | Worked Example ≠ Exercise | 4 Research-Lessons: Exercise-`contentRef` auf neue `*-exercise.md` |
| P1 | Track-Reihenfolge | `common-core`, `research-evaluation`: `c-meta-learning` vor `c-git-basics`; `applied-ai`: `c-meta-learning` ergänzt (dangling require) |
| P1 | `diagnosticCodes` | `error-boundary` → `except-pass`, `git-workflow` → `missing-before-hash` (Family-Feedbackcodes statt freier Codes) |
| P1 | `projectIds`/`explanationIds` | 5 Explanation-Cards und 4 Projekte in 10 Module verdrahtet |
| P1 | `w30_core.py` Starter-Frage | entschieden: beibehalten (hash-gepinnter Scope-Freeze-Kern, `pipeline.py` importiert ihn korrekt) |
| P1 | `projectVersion` B6-Befund | **revidiert**: Live-Validator `learner_project_check.py` verlangt String — `"2"` bleibt String, kein Schema verlangt int |
| P1 | `lm-linalg-numpy-shape-contracts` | `synthesis-singular-guard` als core-Placement eingefügt (Rampenlücke core→challenge); Practice-Placements auf Fremd-Kompetenzen **behalten** — Spiral-Interleaving ist intendiert (R11); `feedbackRules: []` auf `final-boss-authored` nicht füllbar: `gradePython` wertet keine Regeln aus, Testnamen-Feedback kommt aus dem Pyodide-Lauf |
| P1 | Authoring-Guide Ergänzungen | JS-first-Status, Coverage-Generierung, `diagnosticCodes`-Vokabular in §8 dokumentiert |
| P1 | JS-first→public-first-Migration | **25 Familien** in `content/families/*.json` serialisiert; Generatoren lesen Fallkörper via `staticCaseBody`/`staticVariantInstance` aus der Registry (Eigenregistrierung per `with { type: 'json' }`-Import, Geschwister-Muster). Instantiate-Probes byte-identisch (Choice 508 KB, Construct 672, Trace/Linalg 4864, DataML+Git ~59.600 Instanzen). `family_golden_corpus`-`missing`-Pin auf `reflect-error-journal-rationale` reduziert |
| P1 | `capstone-pipeline.md` Aufteilung | 5 Phasen-Lektionen (`l-capstone-freeze/runner/regression/repro/acceptance`, je 70–79 Zeilen Worked-Example + eigene Checkpoints); Module umverdrahtet, `ms-research-capstone`-lessonIds aktualisiert, `build_public.mjs`-Allowlist angepasst; alte Lektion gelöscht |
| P1 | `lm-foundations-functions` Stretch | curated `both-orders-linear-functions` stretch (Seed 3, probe-verifiziert) — Stretch-Profil existierte parametrisch, kein dritter Case-Typ nötig |

Verifikation: `validate_content.mjs` (265 Aktivitäten), `coverage:check`,
`compile_content.mjs`, `build_public.mjs`, vollständige Node-Suite
(1374 pass, 1 erwarteter Skip). Inventar-Policy-Check: 46/46 Kompetenzen
erfüllen `minimumDistinctDefinitions`.

## P1-Backlog (offen)

Status nach P1-Batch: Die meisten Tabellenzeilen sind umgesetzt (siehe
„Umgesetzt"). Verbleibend offen: benotete Viz-Transferkopplung (braucht
`predict-then-verify`-Blocktyp, Plan-Doku), Stretch-Placement für
`lm-foundations-functions` (braucht dritten Case-Typ), `capstone-pipeline.md`-Aufteilung, `construct-ensemble`-Seed-Abdeckung falls gewünscht, und die 24-Familien-JS-first-Migration — letztere ist ein eigener PR-Kandidat samt Policy-Entscheid unten.

### Foundations

| Datei | Änderung | Grund | Evidenz |
|-------|----------|-------|---------|
| `content/lessons/foundations/algebra.md:7-12`, `algebra-transformations.md:7-14` | Subgoal-Labels (`## Schritt 1: ...`) und Completion-Fading (`???` statt Vollrechnung) einbauen | R1, R3, LM-R5 | C1: Worked Examples ohne Subgoals |
| `content/modules/lm-foundations-algebra.json:23-117` | Stretch/Challenge-Placements hinzufügen | R6: intro/core/stretch/challenge-Spread | `foundations_linalg_families.mjs`/`foundations_choice_families.mjs` enthalten ungenutzte Cases |
| `content/lessons/foundations/algebra.json:10`, `algebra-transformations.json:10`, `learning.json:10` | `estimatedMinutes` auf 20/25/15 senken | R7: plausible Zeiten | C1 OF-7 |
| `content/lessons/foundations/linear-function.viz.json`, `distributive-law.viz.json` | Gekoppelte `predict-output`- oder `short-rationale`-Aufgabe im Block hinzufügen | R12: Visualisierung mit Transferfrage koppeln | E2, LM-R12 |
| `content/modules/lm-foundations-python-state.json:22-42`, `lm-foundations-code-reading.json:21-67`, `lm-foundations-functions.json:33-42` | Korrekte intro-`trace-assignment-state`/`predict-output`-Cases für Python-Präfixe curieren | R5: trace/predict before code; R6: progressive difficulty | B1b |
| `content/families/trace-call-composition.json:7-43` | `competencyIds`, `activityType`, `graderId`, `hints`, `feedbackRules`, `typicalErrors` ergänzen | R15: valid family, R3/R4 | B1b |

### Lineare Algebra und Visualisierungen

| Datei | Änderung | Grund | Evidenz |
|-------|----------|-------|---------|
| `content/modules/lm-linalg-matrices.json:88` | `masteryEligible: true` auf `product-definition-rationale` entfernen | R15: consistency (manual-rubric wird von runtime ohnehin auf false gesetzt) | C2, `family_registry.mjs:57` |
| `content/families/formula-scalar-product.json:31-50` | Hints, feedbackRules, typicalErrors ergänzen | R3/R4 | B2 |
| `content/modules/lm-linalg-matrices.json`, `lm-linalg-systems.json`, `lm-linalg-independence.json` | Stretch/Challenge-Placements ergänzen | R6 | B2 |
| `content/families/transform-rank-dependence-rowops.json:644-700` | `rank-3x4-line` in passendes Modul platzieren | R6 | B2 |
| `content/lessons/linear-algebra/span-2d.viz.json`, `content/lessons/data-ml/normal-density.viz.json` | Vorhersage-/Transferfrage koppeln | R12 | E2 |
| `content/modules/lm-linalg-numpy-shape-contracts.json:65-84` | Practice-Fälle auf `c-numpy-basics` taggen oder als `intro`/`core` umdeklarieren | R15 | B2 |
| `count-remaining-rows-cleaning-rule`, `formula-ratio-percent-metric`, `formula-det2-independence` | Statische `content/families/*.json` oder Manifest-Eintrag generieren | public-first / R15 | C2 |

### ML/DL

| Datei | Änderung | Grund | Evidenz |
|-------|----------|-------|---------|
| `classify-cv-leakage`, `threshold-under-asymmetric-cost`, `classify-error-drift`, `classify-supervision-scaling` | Choice-Mastery-Fälle gegen präzisierte R14-Kriterien prüfen (Distraktoren, feedbackRules, fullSolution) | R14 | C2 Review |
| `content/lessons/machine-learning/mse-bowl.viz.json`, `residuals.viz.json`, `sigmoid-threshold.viz.json`, `bias-variance.viz.json`, `ridge-shrink.viz.json`, `pca-axis.viz.json` | Predict-then-verify-Fragen anhängen | R12 | E2 |
| `content/families/construct-ensemble-predictor-comparison.json` | Mehrheitsregel dokumentieren; ggf. `feedbackRules` ergänzen | R9/R15 | B3 |
| `aggregate-majority-rule-count`, `formula-metric-spread-range`, `mse-from-residuals`, `r2-explained-share`, `confusion-marginal-count`, `subgroup-error-gap-pp`, `ridge-shrinkage-percent`, `pca-explained-variance-percent` | In `content/families/*.json` serialisieren oder in Modul-Catalog dokumentieren | R15 / public-first | B3/C2 |
| `content/families/fit-weight-decay-ablation.json:21-63` | Prompt, Tests, Referenzlösung und Erklärung aufeinander abstimmen | R15 | B4 |
| `content/lessons/transformer-llm/softmax-temperature.viz.json` | Slider + Top-k-Frage | R12/R10 | E2 |
| `content/lessons/deep-learning/dl-training.md` | LR-Schedules-Konzept ergänzen | R10-Lücke | B4 |
| `content/modules/lm-dl-*.json` | `estimatedMinutes: 0` für Practice-Space-Placements anpassen | R7 | B4 |

### GenAI/Research

| Datei | Änderung | Grund | Evidenz |
|-------|----------|-------|---------|
| `content/lessons/research/capstone-pipeline.md` | In modul-spezifische Abschnitte aufteilen und auf maximal 80–100 Zeilen pro Modul kürzen | R1/R8 | C1 |
| `content/lessons/research/research-question.json`, `research-cards.json`, `responsible-ai.json`, `capstone-baseline.json` | Worked Example und Exercise auf unterschiedliche `.md`/Blockinhalte umstellen | R1/R15 | B5 |
| `content/families/validate-report-guard-compose.json` | `baseline-report` soll `digest` in `ergebnis` validieren | R10 | B5 |
| `content/modules/lm-capstone-*.json`, `lm-genai-*.json`, `lm-research-*.json` | `estimatedMinutes` an realistische Arbeitszeit anpassen | R7 | B5 |

### Catalog/Tracks

| Datei | Änderung | Grund | Evidenz |
|-------|----------|-------|---------|
| `docs/authoring-guide.md` | Absatz public-first vs. JS-first und `diagnosticCodes`-Taxonomie ergänzen (R14-Teil erledigt) | Katalogklarheit | C2 |
| `content/competency-family-coverage.json` | Generierungslogik dokumentieren; Overdeclaration auflösen oder erklären | R15 | B7 |
| `content/tracks/common-core.json`, `content/tracks/research-evaluation.json` | Reihenfolge `c-git-basics` / `c-meta-learning` korrigieren | R11 | B7 |
| `schemas/learning-module.schema.json:62` | Entscheiden, ob `diagnostic`/`guided-practice` als Placement-Rollen hinzukommen | R5/R15 | B7 |

### Projects/Explanations

| Datei | Änderung | Grund | Evidenz |
|-------|----------|-------|---------|
| `content/modules/lm-*.json` | `projectIds` und `explanationIds` befüllen | R11 | B6 |
| `content/explanations/foundations/error-boundary.json`, `git-workflow.json` | `diagnosticCodes` auf existierende `graders.js`-Typen mappen oder neue Typen ergänzen | R4/R15 | C2 |
| `content/projects/foundations-data-checker/project.json:34` | `estimatedMinutes: 300` auf 120–180 reduzieren | R7 | B6 |
| `content/projects/foundations-data-checker/check-manifest.json:4` | `projectVersion` von String `"2"` auf Integer `2` korrigieren | R15 / Schema | B6 |
| `content/projects/rag-capstone/src/w30_core.py` | Klärung: Starter-Datei entfernen oder Capstone-Lösung in `solution/pipeline.py` zusammenführen | R5 | B6 |

### JS-first catalog migration (P1)

| Datei | Änderung | Grund | Evidenz |
|-------|----------|-------|---------|
| `assets/js/core/foundations_*_families.mjs`, `data_ml_*.mjs`, `deep_learning_generators.mjs` | 24 JS-only-Familien in `content/families/*.json` generieren, wo sie lernrelevant sind | public-first / R15 | C2 Bundle-Analyse: 24 JS-only `familyId`s |

## P2-Backlog (offen)

| Datei | Änderung | Grund |
|-------|----------|-------|
| `content/explanations/foundations/*.json` | `diagnosticCodes` auf zentrale Taxonomie in `docs/authoring-guide.md` und `assets/js/core/graders.js` abbilden | R4/R15 |
| `content/modules/*.json` | Leere `projectIds`/`explanationIds` entweder füllen oder aus dem Schema entfernen | R15 |
| Alle `content/lessons/**/*.json` und `content/families/*.json` | `estimatedMinutes` Review gegen Lektionslänge | R7 |
| `content/lessons/research/capstone-pipeline.md` | Gemischte Anführungszeichen vereinheitlichen (pre-existing Kosmetik) | R9 |

## Policy-Entscheidungen

| Entscheidung | Stand |
|--------------|-------|
| **choice-mastery (R14)** | entschieden: weiche Auslegung, verbindlich in `authoring-guide.md` §5. Kriterien: ≥2 plausible Distraktoren auf Fehlkonzepte + erklärende `fullSolution`/`feedbackRules`, sonst `masteryEligible: false`. `manual-rubric`/`short-rationale` nie mastery-fähig. |
| **public-first vs. JS-first** | offen: Migration der 24 JS-only-Familien oder explizite JS-first-Erlaubnis im Guide. |
| **predict-then-verify scope** | offen: nur `.viz.json` oder auch Pyodide/NumPy-Live-Demos. |
| **diagnostic/guided-practice roles** | offen: Schema-Erweiterung + `ModuleView`, oder reine Milestone-Artefakte. |
