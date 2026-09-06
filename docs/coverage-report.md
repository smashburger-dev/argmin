# Coverage-Bericht

Katalog: `ki-lernplattform-core` 2026.08.31. Die Matrix unterscheidet Erwähnung, Lektüre, geführte Praxis, unabhängige Evidenz, verzögerten Review und Transfer. Releaseblocker, optionale Supplements und Human-Review-Pflichten werden getrennt ausgewiesen (ADR-0016). Schwellen sind Produkt-Heuristiken und keine Forschungskonstanten.

## Überblick

- Kompetenzen: 46
- Roadmap-Themen: 39
- Kompetenzen mit echten Releaseblockern: 0
- Roadmap-Themen mit echten Releaseblockern: 0
- Kompetenzen ohne öffentliche Lektüre: 0
- Kompetenzen ohne in der Lektion verknüpfte öffentliche Lektüre: 0
- Kompetenzen ohne unabhängige Evidenz: 0
- Kompetenzen ohne frische Varianten: 0
- Nur skizzierte Roadmap-Themen: 0
- Roadmap-Themen mit undefinierten Kompetenzreferenzen: 0
- Optionale lokale Zusatzaktivitäten: 0 Kompetenzen (kein Releaseblocker, wenn gleichwertige öffentliche Evidenz existiert)
- Zurückgehaltene private Zusatzlektüren: 7 Kompetenzen (kein Releaseblocker, wenn vollständige öffentliche Lektüre existiert)
- Kompetenzen in menschlicher Freigabe (Draft): 46

## Kompetenzen

| Kompetenz | Lektionen | Lektionsverknüpfte / öffentliche Lektüren | öffentliche Aufgaben / Typen | Varianten | Basic · Core · Advanced · Final Boss | Evidenzdimensionen | Releaseblocker | Supplements | Human-Review |
|---|---:|---:|---|---|---|---|---|---|---|
| `c-algebra-basics` Algebra-Grundlagen | 1 | 2 / 9 | 8 / algebraic-expression, numeric, single-choice | ja (4) | 5 · 1 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | private Lektüre zurückgehalten | draft-content |
| `c-algebra` Algebraische Termumformung | 1 | 2 / 2 | 5 / algebraic-expression, numeric, single-choice | ja (1) | 1 · 2 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-python-basics` Python-Grundlagen | 1 | 1 / 2 | 13 / code-trace, parsons, predict-output, python-code | ja (2) | 3 · 9 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | private Lektüre zurückgehalten | draft-content |
| `c-python-reading` Python-Code lesen und tracen | 1 | 1 / 1 | 31 / code-trace, parsons, predict-output, python-code | ja (2) | 6 · 23 · 2 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-python-functions` Python-Funktionen | 1 | 1 / 2 | 24 / code-trace, numeric, parsons, predict-output, python-code | ja (1) | 1 · 14 · 6 · 4 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | private Lektüre zurückgehalten | draft-content |
| `c-meta-learning` Fehler analysieren und Lernen planen | 1 | 3 / 4 | 4 / short-rationale, single-choice | ja (1) | 1 · 2 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-linalg-matrices` Matrizen und Matrixprodukte | 1 | 2 / 4 | 12 / code-trace, numeric, predict-output, python-code, short-rationale, single-choice | ja (1) | 5 · 3 · 2 · 2 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | private Lektüre zurückgehalten | draft-content |
| `c-linalg-systems` Lineare Gleichungssysteme | 1 | 2 / 4 | 4 / python-code, single-choice, vector | ja (1) | 1 · 1 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | private Lektüre zurückgehalten | draft-content |
| `c-linalg-gauss` Gauß-Elimination | 1 | 2 / 2 | 7 / numeric, python-code, single-choice, vector | ja (1) | 1 · 4 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | private Lektüre zurückgehalten | draft-content |
| `c-linalg-independence` Lineare Unabhängigkeit und Rang | 1 | 2 / 4 | 7 / numeric, python-code, single-choice | ja (1) | 3 · 2 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | private Lektüre zurückgehalten | draft-content |
| `c-numpy-basics` NumPy-Grundlagen und Shapes | 1 | 1 / 2 | 32 / parsons, predict-output, python-code, single-choice | ja (1) | 1 · 10 · 12 · 9 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-python-control-flow` Bedingungen und Schleifen | 1 | 1 / 4 | 9 / code-trace, parsons, predict-output, python-code, single-choice | ja (1) | 2 · 6 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-python-collections` Listen, Dictionaries und Sets | 1 | 1 / 3 | 13 / code-trace, predict-output, python-code, single-choice | ja (1) | 2 · 7 · 3 · 2 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-python-files-errors` Dateien, Eingaben und Fehler | 1 | 1 / 3 | 6 / parsons, python-code, single-choice | ja (1) | 1 · 3 · 1 · 2 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-testing-debugging` Testen und systematisch debuggen | 1 | 1 / 4 | 12 / numeric, parsons, predict-output, python-code, single-choice | ja (1) | 1 · 5 · 5 · 2 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-git-basics` Git-Grundlagen für Lernprojekte | 1 | 1 / 2 | 5 / parsons, single-choice | ja (1) | 1 · 3 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-pandas-cleaning` Datenbereinigung tabellarischer Daten | 1 | 3 / 7 | 6 / numeric, predict-output, python-code, single-choice | ja (2) | 1 · 3 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-eda-viz` Explorative Datenanalyse und Visualisierung | 1 | 3 / 6 | 5 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 2 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-grad-regression` Gradienten und Regression aus Grundoperationen | 1 | 3 / 5 | 9 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 4 · 2 · 2 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-ml-baseline` ML-Problemformulierung und Baseline | 1 | 2 / 5 | 5 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 2 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-ml-linear` Lineare Regression mit Residuenanalyse | 1 | 4 / 6 | 5 / numeric, python-code, single-choice | ja (2) | 1 · 2 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-ml-logistic` Logistische Regression und Klassifikationsmetriken | 1 | 2 / 4 | 5 / numeric, python-code, single-choice | ja (1) | 1 · 2 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-ml-cv` Cross-Validation und Leakage-Kontrolle | 1 | 3 / 6 | 10 / numeric, python-code, single-choice | ja (2) | 1 · 4 · 2 · 3 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-ml-erroranalysis` Systematische ML-Fehleranalyse | 1 | 3 / 5 | 7 / numeric, python-code, single-choice | ja (1) | 1 · 2 · 2 · 2 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-ml-regularization` Regularisierung und Feature Engineering | 1 | 3 / 5 | 5 / numeric, python-code, single-choice | ja (1) | 1 · 2 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-ml-ensembles` Entscheidungsbäume und Ensembles | 1 | 2 / 5 | 5 / code-trace, numeric, python-code, single-choice | ja (1) | 1 · 2 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-ml-svm-pca` SVM und Hauptkomponentenanalyse | 1 | 3 / 8 | 5 / numeric, python-code, single-choice | ja (1) | 1 · 2 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-ml-repro` Reproduzierbare ML-Modellvergleiche | 1 | 2 / 5 | 11 / numeric, predict-output, python-code, single-choice | ja (2) | 2 · 4 · 2 · 4 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-dl-tensors` Tensoren, Layer und Dimensionsverträge | 1 | 3 / 3 | 7 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 3 · 2 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-dl-autograd` Automatische Differentiation und Backpropagation | 1 | 3 / 3 | 8 / code-trace, numeric, python-code, single-choice | ja (1) | 1 · 3 · 1 · 3 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-dl-training` Training Loops und Optimierung | 1 | 3 / 3 | 7 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 3 · 2 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-dl-regularization` Deep-Learning-Regularisierung und Ablation | 1 | 3 / 3 | 6 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 3 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-dl-attention` Attention und Transformer-Grundlagen | 1 | 3 / 3 | 8 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 3 · 2 · 2 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-dl-tokenizer` Tokenisierung und Sprachmodellfamilien | 1 | 3 / 3 | 7 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 3 · 1 · 2 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-dl-inference` Reproduzierbare Modellinferenz | 1 | 3 / 3 | 6 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 3 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-dl-finetuning` Fine-Tuning-Experimente | 1 | 4 / 4 | 6 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 3 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-dl-papers` Deep-Learning-Paper kritisch synthetisieren | 1 | 6 / 6 | 6 / code-trace, numeric, python-code, single-choice | ja (1) | 1 · 3 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-genai-rag` RAG-Pipeline mit messbarem Retrieval | 1 | 4 / 4 | 6 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 3 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-genai-eval` Evaluation generativer KI-Systeme | 1 | 4 / 4 | 10 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 4 · 2 · 3 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-genai-security` Sicherheit generativer KI-Systeme | 1 | 4 / 4 | 13 / numeric, predict-output, python-code, single-choice | ja (2) | 2 · 5 · 3 · 3 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-genai-prototype` Abgesicherter GenAI-Prototyp | 1 | 4 / 4 | 6 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 3 · 1 · 2 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-research-question` Forschungsfrage und Experimentprotokoll | 1 | 4 / 8 | 6 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 3 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-research-cards` Daten- und Modellkarten | 1 | 4 / 8 | 6 / code-trace, numeric, python-code, single-choice | ja (1) | 1 · 3 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-research-responsible` Responsible AI und Risikobewertung | 1 | 4 / 10 | 6 / code-trace, numeric, python-code, single-choice | ja (1) | 1 · 3 · 1 · 1 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-research-capstone` Forschungsbasierte Capstone-Baseline | 1 | 4 / 8 | 9 / numeric, predict-output, python-code, single-choice | ja (1) | 1 · 4 · 2 · 2 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |
| `c-capstone-pipeline` Reproduzierbare Capstone-Pipeline | 1 | 6 / 24 | 30 / code-trace, numeric, parsons, predict-output, python-code, single-choice | ja (2) | 5 · 15 · 5 · 6 | mentioned, reading, guidedPractice, independentEvidence, delayedReview, transfer | — | — | draft-content |

## 39 Roadmap-Themen

| Woche | Thema | Status | Kompetenzen | Lektüren | Aufgaben | Projekte (eigen / fortgeführt) | Releaseblocker | Supplements |
|---:|---|---|---|---:|---:|---|---|---|
| 1 | Diagnose, Setup, Variablen, Funktionen, Algebra | detailliert | c-algebra-basics, c-python-basics, c-python-functions, c-meta-learning | 10 | 14 | 0 | — | private Lektüre zurückgehalten |
| 2 | Bedingungen, Schleifen, Strings, Listen | detailliert | c-python-control-flow, c-python-collections | 4 | 11 | 0 | — | — |
| 3 | Dictionaries, Sets, Exceptions, Git-Branches | detailliert | c-python-collections, c-python-files-errors, c-git-basics | 4 | 12 | 0 | — | — |
| 4 | Module, pytest-Grundlagen | detailliert | c-testing-debugging | 3 | 7 | 1 | — | — |
| 5 | Vektoren, Matrizen und Dimensionschecks mit NumPy | detailliert | c-linalg-systems, c-linalg-matrices, c-linalg-gauss, c-linalg-independence, c-numpy-basics, c-meta-learning | 8 | 19 | 0 | — | private Lektüre zurückgehalten |
| 6 | Tabellarische Daten: fehlende Werte, Duplikate, Datenqualitätsvertrag | detailliert | c-pandas-cleaning | 4 | 6 | 0 | — | — |
| 7 | Verteilungen, Diagrammwahl, Korrelation, bedingte Wahrscheinlichkeit | detailliert | c-eda-viz | 4 | 5 | 0 | — | — |
| 8 | Ableitung, Gradient, MSE, lineare Regression aus Grundoperationen | detailliert | c-grad-regression | 4 | 5 | 0 | — | — |
| 9 | Problemformulierung, Zielvariable, Baseline, deterministischer Split | detailliert | c-ml-baseline | 4 | 5 | 0 | — | — |
| 10 | Lineare Regression, Loss, RMSE, R², Residuenanalyse | detailliert | c-ml-linear | 4 | 5 | 0 | — | — |
| 11 | Logistische Regression, Konfusionsmatrix, Precision/Recall, Schwellenwerte | detailliert | c-ml-logistic | 3 | 5 | 0 | — | — |
| 12 | Cross-Validation, Hyperparameter, Leakage, Pipelinegrenzen | detailliert | c-ml-cv | 4 | 5 | 0 | — | — |
| 13 | Fehleranalyse, Teilgruppen, Modellkarte, Kommunikation ohne Overclaims | detailliert | c-ml-erroranalysis | 3 | 5 | 0 | — | — |
| 14 | Ridge, Lasso, Regularisierung und Feature Engineering | detailliert | c-ml-regularization | 4 | 5 | 0 | — | — |
| 15 | Entscheidungsbäume, Ensembles, Vergleich gegen Baselines | detailliert | c-ml-ensembles | 4 | 5 | 0 | — | — |
| 16 | SVM, PCA, Clustering, Skalierung, überwacht versus unüberwacht | detailliert | c-ml-svm-pca | 5 | 5 | 0 | — | — |
| 17 | Reproduzierbarer Modellvergleich als Final-Boss-Projekt | detailliert | c-ml-repro | 3 | 5 | 1 | — | — |
| 18 | Tensors, Layer, Forward Pass | detailliert | c-dl-tensors | 3 | 6 | 0 | — | — |
| 19 | Autograd und Backpropagation | detailliert | c-dl-autograd | 3 | 6 | 0 | — | — |
| 20 | Training Loop, Optimizer, Batch | detailliert | c-dl-training | 3 | 6 | 0 | — | — |
| 21 | Regularisierung, Ablation, Save/Load | detailliert | c-dl-regularization | 3 | 6 | 0 | — | — |
| 22 | Attention und Transformer | detailliert | c-dl-attention | 3 | 6 | 0 | — | — |
| 23 | Tokenizer und Modellfamilien | detailliert | c-dl-tokenizer | 3 | 6 | 0 | — | — |
| 24 | Pipeline und Modellinferenz | detailliert | c-dl-inference | 3 | 6 | 0 | — | — |
| 25 | Fine-Tuning-Konzept und Evaluation | detailliert | c-dl-finetuning | 4 | 6 | 0 | — | — |
| 26 | Paper-Synthese und Demo | detailliert | c-dl-papers | 6 | 6 | 0 | — | — |
| 27 | RAG-Baseline | detailliert | c-genai-rag | 4 | 6 | 0 | — | — |
| 28 | Antwort-Evaluation | detailliert | c-genai-eval | 4 | 6 | 0 | — | — |
| 29 | OWASP-Sicherheitsreview | detailliert | c-genai-security | 4 | 6 | 0 | — | — |
| 30 | Sicherer Prototyp | detailliert | c-genai-prototype | 4 | 6 | 1 | — | — |
| 31 | Forschungsfrage und Protokoll | detailliert | c-research-question | 4 | 6 | 0 | — | — |
| 32 | Daten-, Modell- und Systemkarte | detailliert | c-research-cards | 4 | 6 | 0 | — | — |
| 33 | Responsible AI und Betrieb | detailliert | c-research-responsible | 6 | 6 | 0 | — | — |
| 34 | Capstone-Baseline | detailliert | c-research-capstone | 4 | 6 | 0 | — | — |
| 35 | Scope einfrieren, Pipeline, Baseline | detailliert | c-capstone-pipeline | 4 | 6 | 0 (+1 fortgeführt) | — | — |
| 36 | Hauptfunktion, Integrationstests | detailliert | c-capstone-pipeline | 3 | 6 | 0 (+1 fortgeführt) | — | — |
| 37 | Feste Evaluation, Red-Team | detailliert | c-capstone-pipeline | 3 | 6 | 0 (+1 fortgeführt) | — | — |
| 38 | Reproduktion, README, Karten | detailliert | c-capstone-pipeline | 4 | 6 | 0 (+1 fortgeführt) | — | — |
| 39 | Demo, Abschlussdiagnose, Retrospektive | detailliert | c-capstone-pipeline | 4 | 6 | 1 | — | — |

## Empirisch offen

- **review-slots**: Expanding-Slots Woche+2/+5/+11 sind eine Eigenableitung (ADR-0008), nicht literaturgeprüfte Dosierung; Kalibrierung mit eigenen Retentionsdaten offen. (betroffen: alle geplanten Reviews)
- **competency-freshness**: freshnessDays (30, 77 Tage) sind transparente Produktheuristiken (ADR-0009) ohne empirische Kalibrierung. (betroffen: alle Kompetenzen)
- **evidence-thresholds**: minimumIndependentHits 2 / minimumDistinctDefinitions 2 / maxHints 1 sind Produktheuristiken; die Hint-Dosierung hat keine direkte Evidenzgrundlage. (betroffen: alle Kompetenzen)
- **time-estimates**: Geschätzte Minuten für Lektionen und Aufgaben sind unkalibrierte Autorenangaben. (betroffen: alle Lektionen und Aufgaben)
- **difficulty-tiers**: Die Difficulty-Stufen 1-5 sind eine Produktklassifikation ohne empirische Schwierigkeitskalibrierung. (betroffen: alle Aufgaben)

## Schwellen und Interpretation

- Mindestens eine eigene Lektion und eine öffentlich nutzbare Lektüre pro freizugebender Kompetenz.
- Mindestens zwei Aufgabendefinitionen und zwei passende Aufgabentypen pro Kompetenz.
- Mindestens ein autoritativ bewertbarer unabhängiger Nachweis; Manual-Rubrics bleiben nicht bindend.
- Ein verzögerter Review-Pfad und eine frische, deterministische Instanzvariante pro Kompetenz.
- Difficulty 1 = Basic, 2 = Core, 3 = Advanced, 4–5 = Final Boss; Projekte zählen als Transfer/Final Boss.
- Wochen-Abdeckung verknüpft Aufgaben BOTH über ihre Verankerungswoche als auch über die Themen-Kompetenzen; Multi-Wochen-Projekte erscheinen in ihren tatsächlichen Phasenwochen als fortgeführt.
- Releaseblocker sind nur echte publikations-/fachliche Gaps. Optionale lokale/private Supplements bleiben sichtbar, blockieren aber nicht, wenn ein gleichwertiger öffentlicher Pfad existiert; `source-rights-block-publication` bleibt immer ein echter Blocker.
- Nicht jede Woche benötigt ein eigenes Projekt; Projektpflicht ergibt sich explizit aus Kompetenz, Milestone oder Curriculum.
- Menschliche Freigabe (Draft-Status) und empirische Unsicherheiten sind getrennt von fachlichen Gaps ausgewiesen.
- Die konkreten Treffer-, Hinweis- und Zeitgrenzen sind konfigurierbare Heuristiken und müssen mit eigener Retentions- und Nutzungsevaluation kalibriert werden.

