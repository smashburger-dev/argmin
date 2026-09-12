# B3 — ML-Block: Gradienten, Regression & klassisches ML

**Reviewer:** Devin-Subagent  
**Scope:** 10 Kompetenzen im Block B3 (`c-grad-regression`, `c-ml-baseline`, `c-ml-linear`, `c-ml-logistic`, `c-ml-cv`, `c-ml-erroranalysis`, `c-ml-regularization`, `c-ml-ensembles`, `c-ml-svm-pca`, `c-ml-repro`).  
**Datum:** Fortsetzung der vorherigen Prüfung.

## Durchführung & Methodik

- Pflichtlektüre: `docs/content-review/rubrik.md`, `e1-evidenz-remap.md`, `e2-interaktiv-audit.md`, `docs/authoring-guide.md`, `docs/content-review/inventar.json`.
- Inventar- und Case-Daten wurden in der vorherigen Sitzung nach `/tmp/b3_inventar_extract.json` und `/tmp/b3_cases_extract.json` extrahiert; diese Prüfung hat sie mit `jq` und `find_file_by_name` nach fehlenden Familien/Cases durchmustert.
- Repräsentative Fälle aus den Familien `optimize-mse-gradient-closed-form`, `fit-predict-metrics`, `aggregate-confusion-metric`, `reproduce-seeded-split`, `classify-cv-leakage`, `aggregate-grouped-metrics-report`, `formula-ridge-lasso-closed-form`, `optimize-tree-best-split`, `construct-ensemble-predictor-comparison`, `fit-pca-kmeans-pipeline`, `reproduce-seeded-experiment-report` und `trace-assignment-state` wurden fachlich nachgerechnet.
- **Content-Validierung (`node tools/compile_content.mjs` / `node tools/validate_content.mjs`) konnte nicht ausgeführt werden**, weil Hintergrund-Sessions `node` und `python3`-Aufrufe automatisch ablehnen. Der Bericht verlässt sich daher auf Filesystem-Checks (`find_file_by_name`) und `jq`-Auswertungen des Inventars.

---

## Blockübergreifende Befunde

### R15 — Fehlende Familien und Cases (Felder-/Referenzkonsistenz)

Das Inventar verweist auf **zwei fehlende Familien-Dateien** und **sieben fehlende Case-Instanzen**. `find_file_by_name` im `content/`-Verzeichnis lieferte für die folgenden Case-IDs keinen Treffer; in den Familien-Dateien ist jeweils nur eine andere Case vorhanden:

| Kompetenz | Geplante(r) Family / Case | Status | Bezug |
|---|---|---|---|
| `c-grad-regression` | `optimize-mse-gradient-closed-form/mse-gradient-wrt-w` | Case fehlt | `p-grad-regression-mse-gradient` |
| `c-ml-baseline` | `aggregate-majority-rule-count/majority-baseline-errors` | **Family fehlt** | `p-ml-baseline-majority`, `p-ml-baseline-practice-space` |
| `c-ml-linear` | `formula-quadratic-error-metric/mse-from-residuals` | Case fehlt | `p-ml-linear-mse-residuals`, Practice-Space |
| `c-ml-linear` | `formula-ratio-percent-metric/r2-explained-share` | Case fehlt | `p-ml-linear-r2` |
| `c-ml-logistic` | `aggregate-confusion-metric/confusion-marginal-count` | Case fehlt | `p-ml-logistic-confusion` |
| `c-ml-cv` | `formula-metric-spread-range/cv-fold-accuracy-spread` | **Family fehlt** | `p-ml-cv-spread`, Practice-Space |
| `c-ml-erroranalysis` | `formula-ratio-percent-metric/subgroup-error-gap-pp` | Case fehlt | `p-ml-error-analysis-gap`, Practice-Space |
| `c-ml-regularization` | `formula-ratio-percent-metric/ridge-shrinkage-percent` | Case fehlt | `p-ml-regularization-shrinkage`, Practice-Space |
| `c-ml-ensembles` | `aggregate-majority-rule-count/ensemble-majority-output-count` | **Family fehlt** | `p-ml-ensembles-majority`, Practice-Space |
| `c-ml-svm-pca` | `formula-ratio-percent-metric/pca-explained-variance-percent` | Case fehlt | `p-ml-svm-pca-variance`, Practice-Space |
| `c-ml-repro` | `formula-metric-spread-range/cv-fold-accuracy-spread` | **Family fehlt** | `p-ml-repro-cv-spread` |
| `c-ml-repro` | `formula-metric-spread-range/seed-rerun-accuracy-spread` | **Family fehlt** | `p-ml-repro-seed-spread`, Practice-Space |

Dies ist die wichtigste Substanzlücke des Blocks. Bei `c-ml-baseline`, `c-ml-cv` und `c-ml-repro` entfällt dadurch eine direkte Übung zu einem expliziten Lektions-/Objektiv-Aspekt (Majority-Baseline, Spannweite der Fold-Scores, Run-to-Run-Streuung).

### R12 — Visualisierungen ohne Transfer-/Vorhersagefrage

Alle vorhandenen ML-Visualisierungen (`data-ml/mse-bowl.viz.json`, `residuals.viz.json`, `sigmoid-threshold.viz.json`, `bias-variance.viz.json`, `ridge-shrink.viz.json`, `pca-axis.viz.json`) sind reine Slider-Explorationen; Captions sagen nur „Ziehe …: Du siehst …“. Keine gekoppelte Frage. Das bestätigt den systemischen E2-Befund. Besonders wenig kontextgerecht ist `bias-variance.viz.json` in `l-ml-cv`: Die `k`-Achse ist ein generischer Komplexitätsparameter, nicht ein Cross-Validation-Setting mit Folds und Spreads.

### R14 — `masteryEligible` an Konzept-/Choice-Fällen

Einige `single-choice`-Fälle tragen `masteryEligible: true`, obwohl die Rubrik vorsieht, reine Konzept-/Choice-Fälle als `masteryEligible: false` zu markieren:

- `classify-cv-leakage/impute-before-split` und `target-encoding-leakage` (verwendet auch in `c-ml-regularization`)
- `aggregate-confusion-metric/threshold-under-asymmetric-cost`
- `classify-error-drift/accuracy-drop-without-code-change`
- `classify-supervision-scaling/supervised-vs-unsupervised-scaling`

Diese Fälle sind sorgfältig konstruiert, aber die Policy-Erklärung fehlt. Laut `e1-evidenz-remap.md` zählt `c-ml-logistic` „exakt zwei Mastery-Definitionen“ — das stimmt nur, wenn die Choice-Fälle nicht als Definition zählen. Die `masteryEligible`-Flags sollten an die tatsächliche Evidence-Policy angeglichen werden.

### R2 / R6 / R7 — Varianten-Full-Solutions, Zeit- und Schwierigkeitskalibrierung

- Varianten von `trace-assignment-state` (z. B. `rng-stream-reseed-trace`, `tree-majority-vote-trace`) und `trace-library-api-output/sklearn-split-no-shuffle` haben als `fullSolution` oft nur „Die Ausgabe ist X — durch denselben Algorithmus wie im Basis-Fall“. Das erklärt den Weg nicht (R2).
- Die `estimatedMinutes` pro Modul summieren sich (ohne Practice-Space) auf 88–101 Min Placements plus 50–60 Min Lektion, die Kompetenz-`estimatedMinutes` liegen aber bei 360–480 Min. Das ist eine grobe Drift (R7, OF-7).
- Der Aufgabenmix ist ausgewogen (intro/core/stretch, Choice/Trace/Code), aber die `difficulty`-Label scheinen unkalibriert: `pipeline-leakage-audit` (40 Min) und `repro-report-table-check` (45 Min) sind sinnvollerweise Stretch, kleine Choice-Fälle sind Intro — formal okay, faktisch aber wenig geprüft.

### R1 — Worked Example und Completion

Alle B3-Lektionen sind als `worked-example` markiert und enthalten durchgerechnete Beispiele. Case-Level-`workedExample` (Completion/Fading) ist wie im ganzen Katalog nicht genutzt (vgl. E1). Das ist für ML-Code-Fälle akzeptabel, aber es fehlt die Completion-Zwischenstufe zwischen „Beispiel anschauen“ und „selbst implementieren“.

---

## Kompetenz-Reviews

### c-grad-regression — Gradienten und Regression aus Grundoperationen

**Deckung:** `l-grad-regression` (717 Wörter, `mse-bowl.viz.json`) + 4 Curated-Placements + Practice-Space.  
**Copy:** klar, du-Form, konkretes 2-Schritt-Gradientenbeispiel in `gradient-regression.md` (Z. 31–53); mathematisch korrekt: `∂MSE/∂w = (2/n)Σxᵢrᵢ`, Update `w=1,2`, `b=0,5` im zweiten Schritt konsistent mit der `1/n`-MSE-Konvention.  
**Evidenz:** `optimize-mse-gradient-closed-form/grad-mse-numpy-reference` bestätigt `dw = (2/n)Σxr` und numerischen zentralen Differenzenquotient; `trace-assignment-state/gradient-loop-two-updates` führt zwei Updates korrekt nach.  
**Interaktiv:** `mse-bowl.viz.json` zeigt MSE-Bowl, Gradienten-Text und Tangente korrekt; aber reine Exploration, keine Transferfrage (R12).

**Befunde**:
- [P1] `optimize-mse-gradient-closed-form/mse-gradient-wrt-w` ist im Inventar als `caseMissing` verzeichnet und nicht als Datei vorhanden — eine geplante Kernaufgabe zum Herleiten des MSE-Gradienten fehlt.
- [P1] `gradient-regression.md` verlinkt im „Direkter Check“ auf die fehlende Case `#/family/optimize-mse-gradient-closed-form/mse-gradient-wrt-w/0/core` (Z. 88).
- [P2] `mse-bowl.viz.json` (`content/lessons/data-ml/mse-bowl.viz.json`) hat keine Vorhersagefrage; Caption beschreibt nur Slider-Wirkung.
- [P1] `trace-assignment-state/gradient-loop-two-updates`-Varianten enthalten minimale `fullSolution`-Texte ohne Rechenweg.

**Vorschläge**:
- [P1] `content/families/optimize-mse-gradient-closed-form.json` → Case `mse-gradient-wrt-w` ergänzen (handische Herleitung + numerischer Check, R1/R15).
- [P1] `content/lessons/data-ml/mse-bowl.viz.json` → `predictionPrompt` hinzufügen: „Stelle w auf 2,5 — vorher/nachher: Wie groß ist der Gradient ungefähr?“ (R12, E2).
- [P2] `content/families/trace-assignment-state.json` → Varianten-`fullSolution` für `gradient-loop-two-updates` um den Rechenweg erweitern (R2).

---

### c-ml-baseline — ML-Problemformulierung und Baseline

**Deckung:** `l-ml-baseline` (438 Wörter) + 4 Curated-Placements + Practice-Space.  
**Copy:** `ml-baseline.md` erklärt Task-Typen, Majority/Mean-Baseline und deterministischen Split anhand eines konkreten Beispiels.  
**Evidenz:** `reproduce-seeded-split/deterministic-split-numpy` prüft `default_rng(seed).permutation(n)` und Train/Test-Zuordnung; `fit-predict-metrics/baseline-experiment-report` implementiert eine deterministische Mean-Baseline mit MSE.  
**Interaktiv:** keine Visualisierung.

**Befunde**:
- [P0] `aggregate-majority-rule-count` (Family-Datei fehlt) wird von `p-ml-baseline-majority` und `p-ml-baseline-practice-space` referenziert. Damit fehlt die geplante Übung zur **Majority-Baseline** — ein explizites Lektionsziel (R15, Objective-Lücke).
- [P1] `ml-baseline.md` (Z. 58) verspricht eine „Einstiegsaufgabe zur Majority-Baseline“, die es nicht gibt.
- [P2] `trace-library-api-output/sklearn-split-no-shuffle`-Varianten haben minimale `fullSolution`-Texte.
- [P1] `c-ml-baseline` hat nach Abzug des fehlenden Cases noch drei mastery-fähige Fälle, aber der Verlust der Baseline-Count-Übung schwächt R5/R14.

**Vorschläge**:
- [P0] `content/families/aggregate-majority-rule-count.json` neu anlegen und Case `majority-baseline-errors` implementieren: Mehrheitsklasse zählen, Fehlerquote einer Majority-Baseline berechnen (R15, R1).
- [P2] `content/families/trace-library-api-output.json` → Varianten-`fullSolution` für `sklearn-split-no-shuffle` um Blocklogik erweitern (R2).

---

### c-ml-linear — Lineare Regression mit Residuenanalyse

**Deckung:** `l-ml-linear` (494 Wörter, `residuals.viz.json`) + 4 Curated-Placements + Practice-Space.  
**Copy:** `ml-linear.md` rechnet MSE=1, RMSE=1, R²=0,8 und `lstsq`-Fit an einem konkreten Beispiel korrekt vor.  
**Evidenz:** `fit-predict-metrics/linear-fit-lstsq` und `regression-report` decken Fit und Bericht; `formula-quadratic-error-metric/rmse-unit-from-mse` ist ein Intro-Choice.  
**Interaktiv:** `residuals.viz.json` zeigt Residuenstrecken und MSE-Formel korrekt, aber ohne Frage.

**Befunde**:
- [P0] `formula-quadratic-error-metric/mse-from-residuals` und `formula-ratio-percent-metric/r2-explained-share` fehlen. Die Lektion fordert im „Direkter Check“ (Z. 70) explizit: „Berechne in einer Einstiegsaufgabe einen MSE aus Residuen und in einer weiteren Einstiegsaufgabe ein R² in Prozent.“ Beide geplanten Übungen sind nicht vorhanden.
- [P1] Dadurch bleiben nur zwei mastery-fähige Definitionen (`linear-fit-lstsq`, `regression-report`) übrig — kein Puffer gegenüber `evidencePolicy.minimumDistinctDefinitions: 2`.
- [P1] `residuals.viz.json` ist passiv; Lernende ziehen `m`/`b`, sehen Residuen, aber müssen nicht vorhersagen, wann MSE=1 wird.
- [P2] `regression-report` ist Stretch (42 Min); für R²/MSE-Percent fehlt ein Kernschritt.

**Vorschläge**:
- [P0] `content/families/formula-quadratic-error-metric.json` → Case `mse-from-residuals` ergänzen (Residuenliste → MSE/RMSE, R1/R15).
- [P0] `content/families/formula-ratio-percent-metric.json` → Case `r2-explained-share` ergänzen (`R² = 1 - SS_res/SS_tot` in Prozent, R1/R15).
- [P1] `content/lessons/data-ml/residuals.viz.json` → Vorhersageaufgabe: „Setze m so, dass MSE genau 1 wird — prüfe mit dem Wert unten“ (R12).

---

### c-ml-logistic — Logistische Regression und Klassifikationsmetriken

**Deckung:** `l-ml-logistic` (502 Wörter, `sigmoid-threshold.viz.json`) + 4 Curated-Placements.  
**Copy:** `ml-logistic.md` rechnet Sigmoid-Werte, Konfusionsmatrix, Precision/Recall/F1 und asymmetrische Kosten korrekt vor.  
**Evidenz:** `aggregate-confusion-metric/sigmoid-predict-numpy` und `confusion-cost-report` testen Sigmoid, Konfusionszählung, Precision, Recall, F1 und kostenbasierte Schwellenwertsuche; `threshold-under-asymmetric-cost` ist ein Choice zur Kosten-Strategie.  
**Interaktiv:** `sigmoid-threshold.viz.json` zeigt `w`/`b`-Shift und Grenze `x=-b/w` korrekt, aber ohne Vorhersageaufgabe.

**Befunde**:
- [P1] `aggregate-confusion-metric/confusion-marginal-count` fehlt. `c-ml-logistic` hat damit nach aktuellem Bestand nur zwei mastery-fähige Code-Fälle (`sigmoid-predict-numpy`, `confusion-cost-report`) — kein Puffer; E1-Befund „exakt zwei mastery-fähige Definitionen“ bestätigt sich.
- [P1] `threshold-under-asymmetric-cost` ist `masteryEligible: true`, aber ein reiner Choice-Fall; dies widerspricht der R14-Konvention, sofern Choice-Fälle nicht als Mastery-Definitionen zählen sollen.
- [P1] `sigmoid-threshold.viz.json` passiv; Lernende verschieben die Sigmoidkurve, aber beantworten keine Frage zu False-Positive/False-Negative-Rate.
- [P2] Varianten-`fullSolution` in `threshold-under-asymmetric-cost` sind nur „Faktor 1000. Schwelle hoch.“ — kein Rechenweg.

**Vorschläge**:
- [P1] `content/families/aggregate-confusion-metric.json` → Case `confusion-marginal-count` ergänzen (gezieltes Zählen aus Konfusionsmatrix, R1/R15).
- [P1] `content/lessons/data-ml/sigmoid-threshold.viz.json` → Frage: „Bei w=2, b=-1: wie viele der Punkte x=[-2,-1,0,1,2] werden als Klasse 1 vorhergesagt?“ (R12).
- [P2] `content/families/aggregate-confusion-metric.json` → `threshold-under-asymmetric-cost`-Varianten mit kurzem Kosten-Rechenweg versehen (R2).

---

### c-ml-cv — Cross-Validation und Leakage-Kontrolle

**Deckung:** `l-ml-cv` (493 Wörter, `bias-variance.viz.json`) + 5 Curated-Placements + Practice-Space.  
**Copy:** `ml-cv.md` erklärt Fold-Größen `n mod k`, Hyperparameter- vs. Parameter-Logik und drei Leakage-Quellen klar und korrekt.  
**Evidenz:** `reproduce-seeded-split/kfold-indices-numpy` testet deterministische Fold-Generierung; `validate-leakage-rule-audit/pipeline-leakage-audit` verlangt einen Leakage-Auditor; `classify-cv-leakage/impute-before-split` diagnostiziert Statistik-Leakage.  
**Interaktiv:** `bias-variance.viz.json` ist generisch und nicht an Folds/Spannweite gekoppelt.

**Befunde**:
- [P0] `formula-metric-spread-range` (Family-Datei fehlt) wird von `p-ml-cv-spread` und `p-ml-repro-cv-spread`/`p-ml-repro-seed-spread` referenziert. `ml-cv.md` (Z. 45) fordert: „Berechne in einer Einstiegsaufgabe die Spannweite von Fold-Scores.“ Es gibt keine solche Übung.
- [P1] `bias-variance.viz.json` in `l-ml-cv` zeigt Bias²/Varianz mit Parameter `k`, aber ohne Bezug zu K-Fold-Scores; R12-Verstoß.
- [P1] `classify-cv-leakage` ist als `masteryEligible: true` markiert, obwohl beide Cases reine Diagnose-Choice-Fälle sind. Die Konvention `masteryEligible: false` für reine Konzept-Checks sollte geprüft werden (R14).
- [P1] `pipeline-leakage-audit` als Stretch (40 Min) ist anspruchsvoll; die `difficulty`-Label sind unkalibriert (R6/R7).

**Vorschläge**:
- [P0] `content/families/formula-metric-spread-range.json` neu anlegen und `cv-fold-accuracy-spread` implementieren (gegebene Fold-Scores → Spannweite/Standardabweichung, R15/R1).
- [P1] `content/lessons/data-ml/bias-variance.viz.json` → entweder an CV umbauen (x-Achse: Modellkomplexität oder Fold-Anzahl, y: Fold-Score-Spread) oder durch einen `predict-then-verify`-Task koppeln (R12).
- [P1] `content/families/classify-cv-leakage.json` → `masteryEligible` auf `false` setzen, wenn Choice-Fälle nicht als Mastery-Definition zählen (R14).

---

### c-ml-erroranalysis — Fehleranalyse und Modellkarten

**Deckung:** `l-ml-error-analysis` (458 Wörter) + 4 Curated-Placements + Practice-Space.  
**Copy:** `ml-error-analysis.md` führt Gruppenfehlerraten, Prozentpunkt-Lücken und Overclaim-Kontrolle korrekt vor.  
**Evidenz:** `aggregate-grouped-metrics-report/subgroup-error-rates-numpy` prüft gruppenweise Fehlerraten und `largest_gap`; `categorize-errors-report` verlangt eine Modellkarte mit intended use und Grenzen.  
**Interaktiv:** keine Visualisierung.

**Befunde**:
- [P1] `formula-ratio-percent-metric/subgroup-error-gap-pp` fehlt. `subgroup-error-rates-numpy` deckt die Lücke ab, aber eine geplante Einstiegsaufgabe „größte Lücke in Prozentpunkten“ gibt es nicht.
- [P1] `c-ml-erroranalysis` hat keine Visualisierung, obwohl `l-ml-error-analysis` von Gruppen-Fehlerquoten lebt (R12; E2-Kandidat).
- [P1] `classify-error-drift/accuracy-drop-without-code-change` ist ein `masteryEligible: true`-Choice; R14-Konvention prüfen.
- [P2] Die Lektion ist kurz (458 Wörter) für ein komplexes Thema; Overclaim/Modellkarte könnte ein konkretes Beispiel-Template vertragen.

**Vorschläge**:
- [P1] `content/families/formula-ratio-percent-metric.json` → Case `subgroup-error-gap-pp` ergänzen (gegebene Gruppenfehler → größte Lücke in Prozentpunkten, R15).
- [P1] `content/lessons/data-ml/ml-error-analysis.md` oder neues `ml-error-analysis.viz.json` → Balkendiagramm mit Gruppen-Fehlerquoten + Threshold-Slider; Vorhersage der größten Lücke (R12, E2).
- [P2] `content/lessons/data-ml/ml-error-analysis.md` → kurzes Overclaim-Template-Beispiel ergänzen (R9/R10).

---

### c-ml-regularization — Ridge und Lasso

**Deckung:** `l-ml-regularization` (562 Wörter, `ridge-shrink.viz.json`) + 5 Curated-Placements + Practice-Space.  
**Copy:** `ml-regularization.md` rechnet Ridge-1D `(Σx²+λ)w = Σxy` und Lasso-Soft-Thresholding korrekt vor; gibt konkrete Schrumpfprozente.  
**Evidenz:** `formula-ridge-lasso-closed-form/ridge-normal-equation` und `lasso-soft-threshold` testen geschlossene Formen, OLS-Vergleich und exakte Null; `classify-cv-leakage/target-encoding-leakage` verknüpft Vorverarbeitung mit Leakage.  
**Interaktiv:** `ridge-shrink.viz.json` zeigt das Minimum `(3/(1+λ))` korrekt, ist aber passiv.

**Befunde**:
- [P1] `formula-ratio-percent-metric/ridge-shrinkage-percent` fehlt. `ridge-normal-equation` deckt die Schrumpfung ab, aber eine geplante Einstiegsaufgabe „Schrumpfungsprozentsatz aus OLS vs. Ridge“ fehlt.
- [P1] `ridge-shrink.viz.json` hat keine Vorhersagefrage; Lernende sehen das Minimum wandern, sagen aber nicht vorher, wo es bei λ=2 liegt (R12).
- [P1] `target-encoding-leakage` als Placement in `c-ml-regularization` ist inhaltlich eher `c-ml-cv`; es dient als Brücke, erschwert aber die Lernziel-Abschätzung (R5/R11).

**Vorschläge**:
- [P1] `content/families/formula-ratio-percent-metric.json` → Case `ridge-shrinkage-percent` ergänzen (OLS-Wert vs. Ridge-Wert → Schrumpfung in %, R15).
- [P1] `content/lessons/data-ml/ridge-shrink.viz.json` → Vorhersageaufgabe: „Vor dem Ziehen: Wie groß ist w* bei λ=1?“ (R12).
- [P2] `content/modules/lm-ml-regularization.json` → `target-encoding-leakage` als explizite Spiralrückgriff-Verknüpfung markieren oder in `c-ml-cv` belassen (R11).

---

### c-ml-ensembles — Ensembles und Entscheidungsbäume

**Deckung:** `l-ml-ensembles` (569 Wörter) + 4 Curated-Placements + Practice-Space.  
**Copy:** `ml-ensembles.md` erklärt Gini, gewichtete Splits, Bagging und Majority-Voting an konkreten Beispielen.  
**Evidenz:** `optimize-tree-best-split/gini-best-binary-split` testet Gini-Anteile, Kandidatenmitten und Gleichstandsregel; `construct-ensemble-predictor-comparison/voting-tree-linear-rmse` testet Baum-Traversierung, Majority-Voting und lineare Baseline; `trace-assignment-state/tree-majority-vote-trace` übt Baum-Trace.  
**Interaktiv:** keine Visualisierung.

**Befunde**:
- [P1] `aggregate-majority-rule-count` (Family fehlt) wird von `p-ml-ensembles-majority` und Practice-Space referenziert. Ensembles-Logik ist durch `voting-tree-linear-rmse` und `tree-majority-vote-trace` abgedeckt, aber eine dedizierte Mehrheits-Count-Übung fehlt.
- [P1] `c-ml-ensembles` hat keine Visualisierung; der E2-Kandidat schlägt ein Gini-Split-Viz vor (R12/R13).
- [P1] `construct-ensemble-predictor-comparison/voting-tree-linear-rmse` verwendet `majority_vote` mit Regel `ones * 2 >= n_models`; diese ist für ungerade `n` korrekt, für gerade `n` wertet Gleichstand als Klasse 1. Das muss dokumentiert/verifiziert werden, um keine versteckte Mehrheitsdefinition zu produzieren.
- [P2] `classify-ensemble-effect/bagging-variance-reduction` ist korrekt als `masteryEligible: false` markiert; hier passt R14.

**Vorschläge**:
- [P1] `content/families/aggregate-majority-rule-count.json` neu anlegen und `ensemble-majority-output-count` implementieren (Tabelle aus Einzelvorhersagen → Mehrheitsentscheidung, R15).
- [P1] `content/lessons/data-ml/ml-ensembles.md` → neues `ml-ensembles.viz.json` mit 2D-Streudiagramm + Threshold-Slider; Frage „Welcher Split minimiert den gewichteten Gini?“ (R12, E2).
- [P2] `content/families/construct-ensemble-predictor-comparison.json` → Majority-Vote-Gleichstandsregel im Prompt/den Hinweisen dokumentieren (R9).

---

### c-ml-svm-pca — Hard-Margin, PCA und k-Means

**Deckung:** `l-ml-svm-pca` (602 Wörter, `pca-axis.viz.json`) + 5 Curated-Placements + Practice-Space.  
**Copy:** `ml-svm-pca.md` rechnet Hard-Margin, PCA-Eigenwerte/-vektoren und k-Means mit Gleichstand (kleinster Index) korrekt vor.  
**Evidenz:** `fit-pca-kmeans-pipeline/pca-eigh-projection` testet Zentrieren, `eigh`, absteigende Sortierung, Varianzanteile und `kmeans` mit `default_rng(seed)`; `classify-svm-margin/hard-margin-width` und `classify-supervision-scaling/supervised-vs-unsupervised-scaling` sichern Konzepte ab.  
**Interaktiv:** `pca-axis.viz.json` zeigt Varianz entlang einer gedrehten Achse korrekt, ist aber passiv.

**Befunde**:
- [P1] `formula-ratio-percent-metric/pca-explained-variance-percent` fehlt. `pca-eigh-projection` deckt Varianzanteile ab, aber eine geplante Einstiegsaufgabe „erklärte Varianz in Prozent“ fehlt.
- [P1] `pca-axis.viz.json` hat keine Vorhersagefrage; Lernende drehen die Achse, ohne vorherzusagen, bei welchem θ die Varianz maximal wird (R12).
- [P1] `classify-supervision-scaling/supervised-vs-unsupervised-scaling` ist `masteryEligible: true`, obwohl ein Choice-Fall. R14 prüfen.
- [P1] `fit-pca-kmeans-pipeline/pca-eigh-projection` testet `kmeans` nur an gut getrennten 4-Punkt-Daten; `iters=10` konvergiert hier, ist aber für allgemeine Initialisierungen keine Garantie — unkritisch, da Reference-Solver autoritativ.

**Vorschläge**:
- [P1] `content/families/formula-ratio-percent-metric.json` → Case `pca-explained-variance-percent` ergänzen (Eigenwerte → erklärte Varianz in %, R15).
- [P1] `content/lessons/data-ml/pca-axis.viz.json` → Vorhersageaufgabe: „Bei θ=0.78 rad — wie groß ist der Varianzanteil ungefähr?“ (R12).
- [P1] `content/families/classify-supervision-scaling.json` → `masteryEligible` an R14-Konvention anpassen, falls Choice-Fälle nicht zählen.

---

### c-ml-repro — Reproduzierbarkeit und Zufallsströme

**Deckung:** `l-ml-repro` (531 Wörter) + 6 Curated-Placements + Practice-Space.  
**Copy:** `ml-repro.md` erklärt den Reproduzierbarkeitsvertrag (Seed, Split, Metrik, Manifest, Versions) und Run-to-Run-Streuung.  
**Evidenz:** `trace-assignment-state/rng-stream-reseed-trace` testet `default_rng`-Stream-Fortsetzung vs. Neustart; `reproduce-seeded-experiment-report/seeded-experiment-manifest` implementiert deterministisches Experiment + Manifest; `repro-report-table-check` prüft Wiederholbarkeit über Konfigurationen.  
**Interaktiv:** keine Visualisierung.

**Befunde**:
- [P0/P1] `formula-metric-spread-range` (Family fehlt) wird von `p-ml-repro-cv-spread` und `p-ml-repro-seed-spread` referenziert. `ml-repro.md` (Z. 67) spricht von „berichtete Run-to-Run-Streuung“; eine dedizierte Spannweiten-/Streuungsaufgabe fehlt. `repro-report-table-check` deckt Wiederholbarkeit ab, aber nicht die **Interpretation berichteter Streuung**. Schweregrad: P0, falls die Objektive „berichtete Streuung“ strikt interpretiert werden; P1, falls `repro-report-table-check` als ausreichend gilt.
- [P2] `trace-assignment-state/rng-stream-reseed-trace`-Varianten enthalten minimale `fullSolution`-Texte (nur „Die Ausgabe ist X — durch denselben Algorithmus wie im Basis-Fall“).
- [P1] `c-ml-repro` hat keine Visualisierung; E2 schlägt ein `default_rng`-Stream-Viz mit Seed/Draws-Slidern vor.
- [P1] Die `rng-stream-reseed-trace`-Fixture-Werte (z. B. Output 26 für Seed 7) hängen von der NumPy-Version ab; Referenzlösung und Tests müssen zur Plattform-NumPy passen (R15).

**Vorschläge**:
- [P0/P1] `content/families/formula-metric-spread-range.json` neu anlegen und `cv-fold-accuracy-spread`/`seed-rerun-accuracy-spread` implementieren (R15, R1).
- [P1] `content/lessons/data-ml/ml-repro.md` oder neues `ml-repro.viz.json` → `default_rng(seed)`-Stream-Viz: Seed und Anzahl Draws einstellen, Vorhersage der nächsten Zahl (R12, E2).
- [P2] `content/families/trace-assignment-state.json` → Varianten-`fullSolution` für `rng-stream-reseed-trace` um Stream-Logik ergänzen (R2).
- [P2] `content/families/reproduce-seeded-experiment-report.json` → `versions` im Test-Manifest an tatsächliche vendored NumPy-Version angleichen (R15).

---

## Validierungsstatus

- `node tools/compile_content.mjs` und `node tools/validate_content.mjs` **nicht ausführbar** in dieser Hintergrund-Session (`node`/`python3`-Aufrufe wurden automatisch abgelehnt).
- Filesystem-Check und `jq`-Auswertung des Inventars/Cases-Extracts zeigen konsistent:
  - 2 fehlende Familien-Dateien (`aggregate-majority-rule-count`, `formula-metric-spread-range`)
  - 7 fehlende Case-Dateien innerhalb bestehender Familien
- Empfohlene Nachvalidierung, sobald ein Vordergrund-Prozess möglich ist:
  1. `node tools/validate_content.mjs` — erwartet Fehler wegen der fehlenden Family- und Case-Referenzen.
  2. `node tools/compile_content.mjs` — prüft, ob die fehlenden Placements im Bundle ausfallen oder Crash verursachen.
  3. `npm run test:e2e:build` oder `npm run build:release` — verifiziert, dass kein privater Quellenmarker in den Public-Build gelangt.

---

## Zusammenfassung für Noa

Fachlich ist der ML-Block über weite Strecken solide: Gradienten-, Regressions-, Klassifikations-, CV-, Regularisierungs-, Ensemble- und PCA-Fälle sind mathematisch konsistent, die `feedbackRules` benennen typische Fehler, und die Lektionstexte folgen `du`-Form und Worked-Example-Struktur.

Die größte Bedrohung ist **R15/Feldkonsistenz**: Zwei ganze Familien und sieben Cases fehlen. Dadurch entstehen konkrete Objective-Lücken (Majority-Baseline, Fold-Score-Spannweite, Run-to-Run-Streuung, geplante Percent-Aufgaben). Diese sollten vor einem Release geschlossen werden.

Darüber hinaus verstößt der gesamte B3-Viz-Bestand gegen **R12** (passive Slider ohne Transferfrage) und einige Choice-Fälle sind mit `masteryEligible: true` markiert, was die R14-Policy-Einordnung erfordert.
