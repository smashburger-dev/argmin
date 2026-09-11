# E2: Interaktiv-Elemente-Audit (Agent-Report)

## A — Renderer-Mechanik

- Engine: JSXGraph vendored (`vendor/jsxgraph/`), Renderer `src/ui/VisualizationBlock.tsx`.
- Können: `boundingbox`, bis zu 4 Slider, Objekte `functiongraph`, `point`, `arrow/segment`, `text`, `polygon`, `curve`; Werte via `compileExpression`/`compileTemplate` (`assets/js/domain/expression_eval.mjs`).
- **Nur Slider-Drag**; alle Objekte `fixed: true` — keine draggable Points, keine Animation, kein Auto-Check, kein Eingabefeld.
- Einbettung: `<figure class="visualization-block">` mit figcaption in `LessonView.tsx`; eigene Route `/#/visualization/<id>`.
- Testzwang: Viz folgt immer auf einen `worked-example`-Block (`tests/content_visualizations.test.mjs`).
- Schema: `schemas/visualization.schema.json`, engine fix `jsxgraph`.

## B — Audit-Befund (alle 24 Viz)

**Keine der 24 Viz hat eine gekoppelte Transfer-/Vorhersagefrage.** Captions sind
durchweg Bedienhinweise ("Ziehe …: Du siehst …"), keine Lernaufgabe. Das ist ein
systemischer Verstoß gegen R12 (Viz mit Aufgabe koppeln), nicht 24 Einzelprobleme.

Muster-Schwächen: passive Exploration ohne Lernziel; keine Contiguity-Kopplung
Viz↔Übung; predict-output/code-trace-Familien werden nicht als Vorher/Nachher-
Rahmen genutzt.

Viz-Bestand je Lesson: siehe `inventar.md` (Spalte Viz).

## C — Kandidatenliste neue Interaktionen (Top 6)

1. `l-dl-autograd` — Backprop-Rechengraph mit Slidern für x/w; Vorhersage lokaler/upstream-Gradient vor dem Ziehen (Generationseffekt + Contiguity).
2. `l-ml-ensembles` — Threshold-Slider auf 2D-Streudiagramm mit Gini-/Klassenanteilen; Predict-then-verify "welcher Split minimiert Gini?".
3. `l-ml-error-analysis` — Balkendiagramm Gruppen-Fehlerraten + Threshold-Slider; Vorhersage der Fairness-Lücke.
4. `l-ml-repro` — `np.random.default_rng(seed)`-Stream mit seed/draws-Slidern; Vorhersage Reset vs. Weiterdrehen.
5. `l-tf-inference` — Softmax-Barplot mit temperature/top-k-Slidern (Variante des bestehenden softmax-temperature-Viz).
6. `l-tf-tokenizer` — BPE-Merge-Schritte mit Merge-Count-Slider; Segmentierung vorhersagen.

Geringere Viz-Relevanz: l-tf-papers, l-responsible-ai, l-research-question,
l-research-cards, l-capstone-baseline, l-genai-security, l-genai-prototype,
l-genai-rag, l-foundations-testing-debugging, l-foundations-learning,
l-foundations-git, l-foundations-files-errors, l-foundations-code-reading,
l-foundations-python-state, l-ml-baseline, l-data-cleaning.

## D — Elementtyp-Vorschlag

`predict-then-verify-visualization` (Arbeitstitel): viz.json erweitert um
`predictionPrompt` + `predictionInput` (Zahl/Choice) + `grader`-Verweis
(deterministisch, wiederverwendet predict-output-Logik). UI: Frage beantworten
→ Slider ziehen → Wert prüfen. Schließt die Lücke "Slider ohne Aufgabe"
systematisch. Nur Konzept — Umsetzung braucht Schema + `src/app/types.ts` +
`LessonView.tsx` + Grader → kommt in `plan-interaktive-elemente.md` /
`plan-neue-aufgabentypen.md`.
