# S4A: Migrationstaxonomie der Quelldefinitionen

Stand: 2026-09-01

Basis: `1998d574e67998e9651fb10d9765a8cf3d11f3db`

## Ergebnis

Die Taxonomie erfasst alle 268 Quelldefinitionen genau einmal:

- 230 Aufgaben aus `content/exercises/w01.json` bis `w39.json`
- 38 kanonische Definitionen aus `content/exercise-definitions/`
- 268 natürliche, eindeutige `sourceId`s
- 0 fehlende IDs
- 0 unerwartete IDs
- 0 doppelte IDs

Die sieben Shards bestehen gegen `shard.schema.json` mit Ajv im strikten JSON-Schema-2020-12-Modus. Der zusätzliche Abgleich prüft Quellpfad, natürliche ID, aktuelle Definition-ID, Legacy-Woche, Kompetenzen, Aufgabentyp, Grader, Generator, Referenzsolver, Schwierigkeit, Feedbackzahl und direkten Evidenzpointer gegen den Baseline-Commit.

Die konsolidierte Datei `migration-matrix.json` enthält alle 268 Einträge, alle Summen und ein vollständiges Inventar der 623 Feedbackregel-Vorkommen.

## Abgrenzung der Familien

Eine Familie wurde nur geteilt, wenn Kernlösungsweg, Activity-/Grader-Interface, Answer-/Solver-Vertrag, Darstellung und Transferanspruch zusammenpassen. Ähnliche Zahlen oder Prompts waren nie ausreichend. Für jeden Eintrag sind Lösungsweg, Fehlermuster, Darstellung, Transferanforderung und Schwierigkeitsbegründung getrennt festgehalten.

Ergebnis der Normalisierung:

- 256 vorgeschlagene Familien
- 268 präzise Falltypen
- 246 Familien mit einer Quelle
- 8 Familien mit zwei Quellen
- 2 Familien mit drei Quellen
- größte Familie: 3 Quellen
- keine Familie mit mehr als drei Quellen
- keine ungültigen Domänenpräfixe
- keine Abweichung zwischen aktueller Schwierigkeit und normalisiertem Schwierigkeitsprofil

Die zehn Familien mit mehreren Quellen sind:

| proposedFamilyId | Quellen |
|---|---:|
| `linear-algebra-matmul-entry-row-column` | 3 |
| `linear-algebra-system-2x2-elimination` | 3 |
| `capstone-golden-freeze-begruendung` | 2 |
| `data-ml-cv-fold-spread` | 2 |
| `foundations-branch-coverage-count` | 2 |
| `foundations-dict-mutation-predict-output` | 2 |
| `foundations-linear-equation-isolate-x` | 2 |
| `foundations-loop-accumulator-predict-output` | 2 |
| `foundations-python-state-overwrite-predict` | 2 |
| `linear-algebra-dot-product-component-sum` | 2 |

Sechs Familien enthalten heute sowohl feste Legacy-Antworten als auch geseedete Zieldefinitionen. Diese Unterschiede bleiben als `familyContractVariants` sichtbar. S4C muss daraus jeweils einen gemeinsamen Familienvertrag machen, ohne historische IDs zu verlieren.

Die vollständige 256-zeilige Familiensumme steht unter `aggregates.byProposedFamilyId` in der Matrix.

## Shards

| Shard | Definitionen | Human Review | Einträge mit Unsicherheit |
|---|---:|---:|---:|
| Foundations | 49 | 11 | 7 |
| Lineare Algebra und NumPy | 26 | 4 | 26 |
| Data und klassisches ML | 61 | 2 | 61 |
| Deep Learning | 24 | 5 | 9 |
| Transformer und LLM-Grundlagen | 30 | 19 | 30 |
| GenAI-Systeme | 24 | 15 | 24 |
| Research und Capstone | 54 | 1 | 54 |
| **Gesamt** | **268** | **57** | **211** |

## Summen nach Woche

Die Quellwochen-Spalte zählt nur die 230 Wochenaufgaben. Die zweite Spalte zählt alle 268 Definitionen nach `legacyWeekId`, also zusätzlich kanonische Definitionen. Elf kanonische Definitionen besitzen keine Legacy-Woche.

| Woche | Wochenquellen | alle Definitionen nach legacyWeekId |
|---|---:|---:|
| w01 | 11 | 14 |
| w02 | 3 | 11 |
| w03 | 4 | 12 |
| w04 | 3 | 7 |
| w05 | 16 | 20 |
| w06 | 6 | 6 |
| w07 bis w17 | je 5 | je 5 |
| w18 bis w39 | je 6 | je 6 |
| keine Legacy-Woche | 0 | 11 |
| **Gesamt** | **230** | **268** |

Die Einzelwerte für jede Woche stehen zusätzlich unter `aggregates.bySourceWeek` und `aggregates.byWeek`.

## Summen nach Kompetenz

Mehrfach zugeordnete Aufgaben zählen bei jeder referenzierten Kompetenz. Deshalb ist die Summe dieser Spalte größer als 268.

| Kompetenz | Definitionen |
|---|---:|
| `c-algebra` | 6 |
| `c-algebra-basics` | 8 |
| `c-capstone-pipeline` | 30 |
| `c-dl-attention` | 8 |
| `c-dl-autograd` | 8 |
| `c-dl-finetuning` | 6 |
| `c-dl-inference` | 6 |
| `c-dl-papers` | 6 |
| `c-dl-regularization` | 6 |
| `c-dl-tensors` | 7 |
| `c-dl-tokenizer` | 7 |
| `c-dl-training` | 7 |
| `c-eda-viz` | 5 |
| `c-genai-eval` | 10 |
| `c-genai-prototype` | 6 |
| `c-genai-rag` | 6 |
| `c-genai-security` | 13 |
| `c-git-basics` | 5 |
| `c-grad-regression` | 9 |
| `c-linalg-gauss` | 8 |
| `c-linalg-independence` | 7 |
| `c-linalg-matrices` | 13 |
| `c-linalg-systems` | 4 |
| `c-meta-learning` | 4 |
| `c-ml-baseline` | 5 |
| `c-ml-cv` | 10 |
| `c-ml-ensembles` | 5 |
| `c-ml-erroranalysis` | 7 |
| `c-ml-linear` | 5 |
| `c-ml-logistic` | 5 |
| `c-ml-regularization` | 5 |
| `c-ml-repro` | 11 |
| `c-ml-svm-pca` | 5 |
| `c-numpy-basics` | 32 |
| `c-pandas-cleaning` | 6 |
| `c-python-basics` | 13 |
| `c-python-collections` | 13 |
| `c-python-control-flow` | 9 |
| `c-python-files-errors` | 6 |
| `c-python-functions` | 24 |
| `c-python-reading` | 31 |
| `c-research-capstone` | 9 |
| `c-research-cards` | 6 |
| `c-research-question` | 6 |
| `c-research-responsible` | 6 |
| `c-testing-debugging` | 12 |

## Activity- und Graderverteilung

| activityType | Definitionen |
|---|---:|
| `python-code` | 95 |
| `single-choice` | 60 |
| `numeric` | 50 |
| `predict-output` | 35 |
| `code-trace` | 11 |
| `parsons` | 7 |
| `vector` | 4 |
| `algebraic-expression` | 3 |
| `short-rationale` | 2 |
| `numbas-exam` | 1 |
| **Gesamt** | **268** |

| graderId | Definitionen |
|---|---:|
| `deterministic` | 167 |
| `pyodide` | 95 |
| `pyodide-sympy` | 3 |
| `manual-rubric` | 2 |
| `numbas` | 1 |
| **Gesamt** | **268** |

Die beiden Manual-Rubrics `w01-e11` und `w05-e9` sind ausdrücklich nicht autoritativ und bleiben reine Bearbeitungsnachweise.

## Semantische Klassifikation und Zielaktion

| semanticClassification | Definitionen |
|---|---:|
| `unique` | 244 |
| `mechanically-similar` | 23 |
| `local-only` | 1 |
| `obsolete` | 0 |
| **Gesamt** | **268** |

| targetAction | Definitionen |
|---|---:|
| `migrate` | 224 |
| `preserve` | 38 |
| `merge-after-extraction` | 5 |
| `retire-after-approval` | 1 |
| `replace` | 0 |
| **Gesamt** | **268** |

Die fünf Merge-Kandidaten sind `w05-e11`, `w05-e12`, `w05-e13`, `w17-e2` und `w37-e1`. Jeder Eintrag besitzt einen eigenen Falltyp, explizit zu erhaltenden didaktischen Gehalt und den Persistenzstatus `merge-map-required`.

### Retire-Empfehlung

`w05-e7` ist die einzige Retire-Empfehlung. Die Definition bleibt als `local-only` sichtbar und wird nicht als fachlich wertlos bezeichnet. Ihre drei fachlichen Teilziele Produkteintrag, Termvereinfachung und 2×2-Systemlösung sind bereits durch die autoritativen öffentlichen Pfade `w05-e1`, `w05-e5` und `w05-e6` abgedeckt. Die Numbas-Aufgabe selbst bleibt nur lokal und widerspricht der dokumentierten Rückbauentscheidung.

Vor einer Löschfreigabe sind vier Bedingungen offen:

1. Die geführte Dreiteilung wird in unterstützte Familien extrahiert oder bewusst verworfen.
2. Das verzögerte Anzeigen der Musterlösung bleibt erhalten oder wird bewusst verworfen.
3. Die lokale Score-Semantik und `numbas-updateScore` werden fachlich entschieden.
4. Historische `w05-e7`-Attempts bleiben über einen Alias lesbar.

Der Eintrag ist deshalb `retire-blocked`, `humanReviewRequired: true`. S4A löscht nichts.

## Schwierigkeitsprofile

| proposedDifficultyProfile | Definitionen |
|---|---:|
| `basic-recall` | 61 |
| `core-application` | 129 |
| `advanced-transfer` | 42 |
| `final-boss-synthesis` | 36 |
| **Gesamt** | **268** |

Das Mapping ist über alle Shards einheitlich: 1 entspricht `basic-recall`, 2 `core-application`, 3 `advanced-transfer`, 4 und 5 `final-boss-synthesis`.

## Feedback-Inventar

Es gibt 623 Feedbackregel-Vorkommen in 244 Definitionen. 24 Definitionen besitzen keine Regeln. Nur `assets/js/core/graders.js` liest die Inhaltsregeln, und dort nur fünf geschlossene Formen:

| Aktivität | unterstützte Form |
|---|---|
| numeric | `value === <integer>` |
| single-choice | `choice === '<id>'` oder `choice !== '<id>'` |
| parsons | `order-length-mismatch` |
| code-trace | `value:<var>[+value:<var>...]` |
| predict-output | `element-count-mismatch` |

Regeln nach Grader und Aktivität:

| Grader / Aktivität | Regeln | tatsächlich konsumierbar |
|---|---:|---:|
| deterministic / single-choice | 144 | 140 |
| deterministic / numeric | 112 | 109 |
| deterministic / predict-output | 62 | 11 |
| deterministic / code-trace | 17 | 10 |
| deterministic / parsons | 7 | 5 |
| deterministic / vector | 5 | 0 |
| pyodide / python-code | 273 | 0 |
| pyodide-sympy / algebraic-expression | 3 | 0 |
| **Gesamt** | **623** | **275** |

Damit sind 275 Regeln konsumierbar und 348 nicht konsumierbar. Die frühere Annahme von 273 Python-Regeln ohne Runtime-Konsumenten ist exakt bestätigt. Die Schätzung von ungefähr 62 bis 64 deterministischen Regeln außerhalb der Grammatik ist dagegen falsch. Der korrekte Wert ist 72 von 347.

Definitionen nach Feedbackstatus:

| feedbackConsumerStatus | Definitionen |
|---|---:|
| `fully-consumed` | 110 |
| `partially-consumed` | 9 |
| `not-consumed` | 125 |
| `no-rules` | 24 |
| **Gesamt** | **268** |

`feedbackInventory.occurrences` enthält jedes einzelne Vorkommen mit Quelle, Regelindex, Bedingung, Nachricht, Consumerstatus, Consumer und Begründung. `unsupportedDeterministicByCondition` gruppiert die 72 deterministischen Abweichungen vollständig.

## Persistenzkompatibilität

| Status | Definitionen |
|---|---:|
| `preserve-id` | 262 |
| `merge-map-required` | 5 |
| `retire-blocked` | 1 |
| **Gesamt** | **268** |

Alle `currentDefinitionId`s entsprechen am Baseline-Commit den natürlichen Quellen-IDs. Kein Vorschlag darf bestehende v3-Attempts still unlesbar machen. Merge und Retire sind deshalb ohne Alias- beziehungsweise Merge-Map gesperrt.

## Unsicherheit und Human Review

57 Definitionen verlangen Human Review. 211 Definitionen enthalten mindestens eine Unsicherheit. Insgesamt sind 235 Unsicherheitsdatensätze sichtbar:

- 2 mit hoher Unsicherheit
- 145 mit mittlerer Unsicherheit
- 88 mit niedriger Unsicherheit

Die beiden hohen Fälle sind die familienübergreifende Merge-Entscheidung für `w37-e1` und die Retire-Entscheidung für `w05-e7`. Alle exakten IDs, Gründe und Auflösungsbedingungen stehen direkt an den Matrixeinträgen. Die vielen niedrigen und mittleren Einträge stammen vor allem aus Familiengrenzen, Lektionszuordnungen, nicht konsumierten Feedbackregeln und heutigen Solverformen. Sie wurden nicht durch pauschale Sicherheit ersetzt.

## Artefakte

- `shard.schema.json`: gemeinsamer Analysevertrag
- `foundations.json`: 49 Einträge
- `linear-algebra.json`: 26 Einträge
- `data-ml.json`: 61 Einträge
- `deep-learning.json`: 24 Einträge
- `transformer-llm.json`: 30 Einträge
- `genai-systems.json`: 24 Einträge
- `research-capstone.json`: 54 Einträge
- `assemble.mjs`: reproduzierbare Schema-, Quell-, Feedback-, Persistenz- und Summenprüfung
- `migration-matrix.json`: konsolidierte Matrix mit 268 Einträgen und vollständigem Feedback-Inventar

## Scope

S4A hat keine Produktions-, Produkt-Schema-, Compiler-, Generator-, Test- oder Contentdatei geändert. Keine Aufgabe wurde gelöscht. Keine Generator-Baseline wurde verändert. LearningModule und ExerciseFamily wurden nicht implementiert. Es wurde weder committed noch gepusht.

Prozessabweichung: Ein GLM-Agent installierte eigenmächtig das User-Level-Python-Paket `jsonschema` mit `pip3 install --user --break-system-packages`. Das änderte keine Repo-Datei, lag aber außerhalb seines Schreibauftrags. Die Installation wurde nicht ohne Noas ausdrückliche Freigabe entfernt.
