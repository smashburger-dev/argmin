# Einmalige fachliche Gegenprüfung S7

Die Browserbilder und die hier genannten Ergebnisse verwenden die reinen Szenenmodelle. Es gibt keinen neuen Antwort- oder Optimierungsgrader. Die Gegenproben wurden einmalig mit Node und den unveränderten CPython-Referenzprogrammen ausgeführt, ohne eine neue Testsuite anzulegen.

| Autorität | Eingabe und Gegenprobe | Ergebnis |
|---|---|---|
| `count-remaining-rows-cleaning-rule` | Nach Schema bleiben sieben Zeilen. `duplicate-rows` mit einer exakten Kopie und ohne Schlüsselkonflikt liefert sechs. `missing-target-rows` mit drei fehlenden Zielwerten liefert drei. | Modell und Löser identisch; gesamte Spur 8 → 7 → 6 → 3. |
| `classify-cv-leakage` | Kapsel `impute-before-split`, Seed 0, core: der bestehende Löser benennt Statistik-Leakage durch die über alle Zeilen inklusive Test gelernte Region. Die gleiche Informationsgrenze wird durch `fitRows ∩ testRows` in der Figur sichtbar. | Familie bestätigt die fachliche Einordnung. Die Figur behauptet keinen universellen Text-Leakage-Detektor. |
| `validate-leakage-rule-audit` | CPython-Referenz `audit_pipeline` aus `pipeline-leakage-audit`; für alle sechs Fold-Zustände einmal „Imputation auf Train gefittet“, im Gegenbeispiel „Imputation ueber alle Zeilen gelernt“. | Die Audit-Indizes sind genau dann nicht leer, wenn das Modell Test-IDs im Fit enthält. Fold-Größen 3, 2, 2, 2, 2. |
| `reproduce-pipeline-status-report` | CPython-Referenz `run_stage` aus `run-stage-budget` mit Budget 120 und virtuellen Dauern 0, 119, 120, 121, 200. | Status überall identisch; 120 ist ok, 121 und 200 sind timeout. Keine Ausgabe nach Timeout, nachfolgender Bericht wartet. |
| `aggregate-confusion-metric` | Bestehender JS-Löser `answer-filter-precision-recall-f1` für alle vier Eval-Zustände; zusätzlich CPython-Referenz `prf` aus `confusion-from-rows`. Gleichheit bei p = t separat geprüft. | Bei t = 0,5: TP 3, FP 1, FN 1, TN 3; Precision = Recall = F1 = 0,75. |
| `aggregate-parity-threshold-selection` | Kandidaten werden ausschließlich aus denselben acht Fällen erzeugt und an die bestehende CPython-Referenz `threshold_sweep` übergeben. Band 0,05. | Unter den gezeigten Kandidaten gewinnt t = 0,8 mit F1 = 2/3. Die Figur implementiert keinen parallelen Auswahlgrader. |
| `classify-sigmoid-regime` | Gegenprobe der eigenen Scoreberechnung gegen die exportierte Referenz `sigmoidValue` bei z = −100, −5, −1, 0, 1, 5, 100. | Identische Werte. Der geschützte Logistic-Checkpoint behält Ergebnis 2. |

39 numerische bzw. Zustandsgegenproben bestanden. Hinzu kommt die Abfrage des vorhandenen Leakage-Klassifikationslösers. Die Majority-Baseline hat aus hundert tatsächlichen Zeilen TN 99, FN 1, TP 0, FP 0: Accuracy 0,99, Recall 0. Die Ablation verwendet dieselben fünf Fixtures: mit Kontrolle Recall@k 0,6 und keine unsichere Freigabe; ohne Kontrolle Recall@k 0,8 und eine unsichere Freigabe. Der Recall-Verlust der Kontrolle wird nicht als verbesserte Antwortqualität verkauft.

Die zwei übernommenen Checkpoints sind bis auf die Zuordnung zum Figurenbeat wörtlich erhalten, einschließlich Frage, erwartetem Wert, Toleranz, Hinweisen und typischen Fehlern. Die früheren `.viz.json` sind unverändert und über `l-figuren-s7-archive` lokal referenziert.
