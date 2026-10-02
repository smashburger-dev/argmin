# Plan: Interaktive Elemente

Planungsdokument für die German KI-Lernplattform v0.7+. Keine Implementierung in v0.6.

## Status quo

- 24 JSXGraph-Visualisierungen in `content/lessons/**/*.viz.json`.
- `schemas/visualization.schema.json:7-8` verlangt `schemaVersion`, `engine`, `title`, `caption`, `boundingbox` und `objects`. `input`, `grader` oder `checkpoint` sind nicht vorgesehen.
- `src/ui/VisualizationBlock.tsx:91-119` rendert `<figure>`, `<figcaption>` und das JSXGraph-Board. Es gibt weder Eingabefelder, noch einen Grader, noch Feedback.
- Alle Visualisierungen sind reine Exploration: Lernende können Slider bewegen, aber die Frage "Was wird passieren, wenn ...?" bleibt ungestellt oder nur in der Caption implizit.

## Didaktische Zielsetzung

Interaktive Vorhersage-Widgets könnten die Lerntransferrate verbessern, indem sie:

- vor der Rechnung eine Hypothese abfragen (R2: retrieve before reveal),
- den Raum zwischen Visualisierung und Exercise schließen (R12: visualization coupled to a task),
- kurze Retrieval-Fragen direkt im Lesson-Flow einbauen (R11: spiral/cumulative retrieval, LM-R4, LM-R8),
- Eingabefelder mit sofortigem, deterministischem Feedback koppeln (R4: diagnostic feedback).

Einschränkung: Die Contiguity-Evidenz zeigt, dass nahe beieinanderliegende Fragen und Erklärungen lernwirksam sind. Das beweist nicht, dass interaktive Vorhersage-Widgets passive Visualisierungen überall übertreffen. Der E2-Audit hat daher geplant, nicht implementiert.

## Mögliche Mechanismen

### 1. JSXGraph-Slider plus predict-then-verify-Frage

Eine `.viz.json` erhält ein neues Feld `prompt` und einen `predictOutput`-Block. Lernende stellen den Slider auf einen Wert und tippen die erwartete Größe (z. B. y-Wert, Schnittpunkt, Chunk-Anzahl) in ein Eingabefeld ein. Nach Klick auf "Prüfen" wird der exakte Wert vom Board abgelesen und mit `graders.js` verglichen.

**Beispiel**: `content/lessons/linear-algebra/two-lines.viz.json` könnte fragen: "Setze c1=3 und c2=-1. Welcher x-Wert ergibt sich am Schnittpunkt?"

**Vorteil**: minimale Schema-Änderung, wiederverwendet `VisualizationBlock`.
**Nachteil**: JSXGraph-Lesezugriff und Animationstiming machen Tests komplexer.

### 2. NumPy/Pyodide-Live-Demo mit verstecktem Reveal

Innerhalb eines Lesson-Blocks läuft ein Pyodide-Worker (`assets/js/runtime/pyodide_worker.mjs`) und führt den Python-Code des Lernenden aus. Das Ergebnis wird mit dem vorberechneten Referenzwert verglichen, bevor der eigentliche Code-Trace-Block kommt.

**Beispiel**: "Vorhersage: Was ist `np.mean(residuals**2)` für diesen synthetischen Datensatz?" Lernender tippt; danach wird das MSE-Bowl-Plot gezeigt.

**Vorteil**: stark für ML/DL-Transfer.
**Nachteil**: hoher Ladeaufwand, Pyodide-Initialisierung, CSP- und Hashed-License-Checks.

### 3. `visualization`-Block mit eingebettetem `short-rationale`/`predict-output`-Checkpoint

Statt eines neuen Block-Typs wird die `lesson.schema.json` erlauben, dass ein `visualization`-Block direkt eine `activityId` referenziert. `VisualizationBlock.tsx` zeigt das JSXGraph-Board und darunter eine kompakte `ExerciseView` mit `short-rationale` oder `predict-output`.

**Beispiel**: `content/lessons/foundations/linear-function.viz.json` referenziert `predict-output:linear-function-slope-at-point`.

**Vorteil**: Kein neuer Aufgabentyp nötig; wiederverwendet bestehende Grader.
**Nachteil**: `lesson.schema.json` muss `visualization`-Block-Items erlauben, die auf `familyActivities` verweisen.

### 4. Neuer `predict-then-verify-visualization`-Block

Ein eigener Block-Typ `predict-then-verify-viz` in `schemas/lesson.schema.json`. Er enthält:
- `visualizationId` (`.viz.json`),
- `predictQuestion` (Eingabetyp, z. B. `numeric`, `vector`, `short-rationale`),
- `graderId`,
- `revealSpec` (was nach korrekter Antwort gezeigt wird),
- `hint` und `typicalErrors`.

**Beispiel**: `content/lessons/machine-learning/sigmoid-threshold.viz.json` fragt: "Bei welchem x-Wert liegt die Sigmoid-Ausgabe bei 0.75?" Antwort: `log(3)`.

**Vorteil**: Klarste semantische Trennung von passiver Viz und aktiver Aufgabe.
**Nachteil**: Größter Implementierungsaufwand; neuer Grader, neues UI-Widget, neues Schema.

## Technische Architektur

### Schema-Änderungen

Option A (bevorzugt für v0.7):
- `schemas/visualization.schema.json`: optional `checkpoint` mit `prompt`, `graderId`, `expected`, `hints`, `feedbackRules`, `typicalErrors`.
- `schemas/lesson.schema.json`: `visualization`-Block-Items dürfen optional `activityId` referenzieren.

Option B:
- Neuer Blocktyp `predict-then-verify-viz` in `schemas/lesson.schema.json:27-50` neben `worked-example`, `checkpoint`, `visualization`, `exercise`.

### `VisualizationBlock.tsx`-Änderungen

- Props erweitern: `checkpoint?: PredictCheckpoint`.
- Nach `status === 'ready'` wird unter dem Board ein `ExerciseMiniView` gerendert.
- Bei Eingabe wird `window.JXG.JSXGraph` zur Bestimmung des tatsächlichen Werts genutzt, falls `expected` vom Typ `numeric` und an einen Slider gekoppelt ist.
- Bei `short-rationale`-Checkpoints wird der Text an `graders.js:shortRationale` übergeben.

### Grader/Feedback-Integration

- `assets/js/core/graders.js`: `numeric`-Grader erhält `tolerance` pro Checkpoint.
- `short-rationale`-Grader wird um `expectedKeywords` erweitert.
- Neue `errorType`s: `wrong-prediction`, `wrong-slider-value`, `missing-explanation`.
- `content/explanations/foundations/*.json` und `content/explanations/linear-algebra/*.json` erhalten `diagnosticCodes`, die von den neuen Gradern ausgelöst werden.

### Build/Validierungs-Änderungen

- `tools/validate_content.mjs` prüft, dass `visualization` + `checkpoint` referenzierte `familyId`s und `graderId`s auflösen kann.
- `tools/build_coverage_matrix.mjs` zählt `visualization`-Checkpoint-`familyActivities` mit in die Kompetenzcoverage, falls sie `competencyIds` tragen.
- `node --test tests/`: `VisualizationBlock`-Komponententests müssen JSXGraph-Mocks bereitstellen.

## Vorschläge pro Domäne

### Foundations

- `content/lessons/foundations/linear-function.viz.json`: "Setze a=2 und b=-1. Wie groß ist f(3)?"
- `content/lessons/foundations/distributive-law.viz.json`: "Vereinfache 3(2x-1)-1(x+1) vorher. Welcher Term bleibt übrig?"

### Lineare Algebra

- `content/lessons/linear-algebra/two-lines.viz.json` (nach P0-Fix): "Setze c1=3, c2=-1. Berechne den Schnittpunkt x-Wert."
- `content/lessons/linear-algebra/row-operation.viz.json` (nach P0-Fix): "Welchen y-Wert behält die Lösung nach der Zeilenumformung?"

### Machine Learning

- `content/lessons/machine-learning/mse-bowl.viz.json`: "Verändere die Steigung. Bei welchem β-Wert wird das MSE minimal?"
- `content/lessons/machine-learning/residuals.viz.json`: "Schätze die Summe der Residuen vor der Anpassung."
- `content/lessons/machine-learning/sigmoid-threshold.viz.json`: "Bei welchem x ist σ(x)=0.75?"
- `content/lessons/machine-learning/ridge-shrink.viz.json`: "Erhöhe λ. Um welchen Faktor schrumpft der Koeffizient bei λ=10 gegenüber λ=0?"
- `content/lessons/machine-learning/pca-axis.viz.json`: "Wo liegt die erste Hauptachse für diese Punktwolke?"

### Deep Learning

- `content/lessons/transformer-llm/softmax-temperature.viz.json`: "Setze T=2.0. Welche Wahrscheinlichkeit hat das wahrscheinlichste Token?"

### GenAI

- `content/lessons/genai-systems/chunk-overlap.viz.json` (nach P0-Fix): "Bei c=4 und o=1, wie viele Chunks ergeben sich aus einem Text der Länge 10?"
- `content/lessons/genai-systems/precision-recall-threshold.viz.json`: "Verschiebe den Schwellenwert. Wie verändert sich F1?"

### Research

- `content/lessons/research/capstone-pipeline.viz.json` (neu): Interaktiver Pipeline-Flow, bei dem Lernende Reihenfolge der Schritte vorhersagen.

## Was in v0.6 nicht kommt

Keine neuen Visualisierungs-Input-Felder, kein neuer Lesson-Block-Typ und keine Änderungen an `VisualizationBlock.tsx`, `graders.js` oder `schemas/visualization.schema.json` werden in v0.6 umgesetzt. Die vorgeschlagenen Mechanismen bleiben Planung für v0.7+.
