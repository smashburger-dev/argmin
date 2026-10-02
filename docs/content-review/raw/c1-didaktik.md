# C1: Didaktische und evidenzkritische Gegenprüfung der W2-Reports

## Kurzvermerk

- **Prüfstand:** `docs/content-review/rubrik.md`, `docs/content-review/raw/e1-evidenz-remap.md`, `docs/content-review/raw/e2-interaktiv-audit.md`, alle acht W2-Reports, `docs/authoring-guide.md`, `docs/content-review/inventar.md`/`.json`, `content/competencies/core.json` und die Lernmethodik-Quellen unter `research/lernmethodik/` (insb. `requirements.md`, `offene-fragen.md`, `gap-matrix.md`).
- **Fachliche Verifikation gegen den Build:** `node tools/validate_content.mjs` erfolgreich (46 Kompetenzen, 46 Lektionen, 253 Aktivitäten); `node tools/compile_content.mjs` erfolgreich; `node tools/build_coverage_matrix.mjs --check` aktuell; `node --test tests/family_contract.test.mjs` bestanden; `node --test tests/foundations_trace_families.test.mjs` (28/28) bestanden; `node --test tests/content_visualizations.test.mjs` (2/2) bestanden, prüft aber nur finite Werte, nicht mathematische Korrektheit.
- **Zentrale Gegenhypothese:** Viele W2-P0s stützen sich auf Dateisystemzählung in `content/families/*.json` oder auf Modul-Curated-Placements. Die Runtime bezieht Familien aus `assets/js/core/*.mjs`, `assets/js/domain/exercise_registry.mjs` und `DATA_ML_FAMILY_SPECS`/`PROCEDURAL_FAMILY_SPECS`. Das Bundle (`.content-build/public/content-bundle.json`) und `assets/js/domain/evidence_engine.mjs:36-44` zählen mastery-fähige Definitionen über *alle* `competencyIds`-getaggten `familyActivities`, nicht nur über ein Modul. Fehlende `.json`-Dateien bedeuten daher nicht automatisch fehlende Lernaktivitäten.
- **Berichtssprache:** Deutsch. P0/P1/P2 beziehen sich auf die Rubrik, werden aber an maschinenlesbarem Verhalten und Evidenzbindung relativiert.

## Blockübergreifende Gegenbefunde

`[P2] docs/content-review/raw/e1-evidenz-remap.md:15-18 → Inventarbehauptung präzisieren: c-meta-learning/c-linalg-independence haben im Bundle jeweils ≥2 mastery-fähige Definitionen (bundle.familyActivities via evidence_engine.mjs:36-44, nicht nur Modul-Curated-Placements; [didaktik] Mastery ist kompetenzzentriert, nicht modulzentriert; [evidenz] public Bundle zeigt c-meta-learning 4, c-linalg-independence 2, c-python-basics 10, c-python-functions 24 mastery-fähige familyActivities).`

`[P1] docs/content-review/rubrik.md: R14 / docs/authoring-guide.md → Choice-/Konzept-Fälle als Mastery-Nachweis nur dann verbieten, wenn family_registry.mjs das erzwingt (family_registry.mjs:57 erlaubt mastery für jede nicht-manual-rubric-Aufgabe mit masteryEligible:true; [didaktik] R14 ist eine Review-Rubrik, keine Runtime-Policy; [evidenz] Vertrag `classify-error-hypothesis` in assets/js/core/foundations_choice_families.mjs:319-334 setzt masteryEligible:true für c-algebra/c-meta-learning).`

`[P1] research/lernmethodik/offene-fragen.md:OF-4 / research/lernmethodik/requirements.md:LM-R4 → Parsons- und Trace-Einforderungen als "Soll" bzw. W4-Wunsch kennzeichnen, nicht als P0-Defizit (B1b, B2, B5 stellen fehlende Parson-/Predict-Aufgaben als P1/P0 dar; [didaktik] R5 Aufgabenmix; [evidenz] OF-4: Generalisierbarkeit auf erwachsene Lerner mit Vorkenntnissen offen; LM-R4: "Soll" und "kann nach Pilotwoche erfolgen").`

`[P2] docs/content-review/raw/e2-interaktiv-audit.md → Systemischen R12-Verstoß wegen passiver Visualisierungen nicht als P0/P1-Defizit überzeichnen (alle 24 Viz folgen auf worked-example, aber keine gekoppelte Transferfrage; [didaktik] R12; [evidenz] OF-11: Contiguity-Effekt belegt räumliche/zeitliche Nähe (d=0.40-0.56), nicht den Zusatznutzen interaktiver Vorhersage-Widgets für dieses Material; B5/B2 Viz-Fehler sind separate mathematische P0s).`

`[P0] content/lessons/linear-algebra/two-lines.viz.json:14 → Schnittpunkt S auf ((2*c1-c2)/5 ; (c1+2*c2)/5) setzen (Schnitt von L1: y=c1-2x und L2: y=(c2+x)/2; aktuelle Formel /3 liefert für c1=1, c2=-1 den Punkt (1,0), der nicht auf L1 liegt; [didaktik] R12 Visualisierung muss fachlich korrekt sein; [evidenz] Lösung des linearen Gleichungssystems).`

`[P0] content/lessons/linear-algebra/row-operation.viz.json:10-11 → Invariantenpunkt S auf (-2, -1) korrigieren (Zeile1 y=x+1, ursprüngliche Zeile2 y=2x+3; abgeleitete Zeile2' geht durch denselben Schnittpunkt; aktueller Punkt (2,3) liegt nicht auf der ursprünglichen Zeile 2; [didaktik] R12; [evidenz] Lösen des Gleichungssystems).`

`[P0] content/lessons/research/chunk-overlap.viz.json:15 → Chunks-Formel auf floor(10/(c-o)-0.0001)+1 korrigieren (aktuelle Formel floor((10-o)/(c-o)-0.0001)+1 unterschreitet die korrekte Anzahl, z.B. c=4, o=1 → 3 statt 4; [didaktik] R12; [evidenz] RAG-Vertrag start += size - overlap mit start < text length).`

`[P0] content/families/optimize-gradient-update-rule.json:501/503/504 → head-only-finetune MSE/Gradient auf allgemeine multi-output-Formel 2/(n*d2) * r.T @ h angleichen oder Vertrag explizit auf d2=1 einschränken (Prompt behauptet allgemeinen Fall, `__ref_head_ft` im Test verwendet 2/(n*d2), aktueller Solver 2/n; für d2>1 inkonsistent; aktuelle Tests verwenden d2=1, verbergen Fehler; [didaktik] R14 Mastery-Ehrlichkeit / R1; [evidenz] multivariate MSE-Ableitung).`

`[P0] assets/js/core/deep_learning_generators.mjs:196 → fullSolution der kept-Variante "Skalierung 1/p = ..." auf den tatsächlichen Kehrwert korrigieren (p=0,5 → 2,0; aktuell steht der p-Wert; [didaktik] R2/R9; [evidenz] invertierter Dropout skaliert mit 1/p).`

`[P1] assets/js/core/foundations_choice_families.mjs:166-171 → feedbackRule `choice !== 'observable-test'` für error-journal-next-test korrigieren oder entfernen (graders.js:62-65 erwartet choiceId a/b/c/d, nicht sourceId; die Regel kann nie differenziert greifen; [didaktik] R4 diagnosebezogenes Feedback; [evidenz] graders.js Regex für choice-Feedback).`

## W2-Finden pro Block

### B1a — Foundations Math

- **P0 `c-meta-learning` erfüllt `minimumDistinctDefinitions:2` nicht:** widerlegt. Der public Bundle enthält 4 mastery-fähige Definitionen für `c-meta-learning` (`classify-error-hypothesis:base-vs-exponent-confusion`, `seeded-error-pattern-cases`, `error-journal-next-test`, `classify-test-attitude:csv-off-by-one-reproduce-smallest`). Die `evidencePolicy` in `content/competencies/core.json:171-177` zählt nicht modul-lokal, sondern distincte `definitionId`s. Empfohlene Klassifizierung: **P1** (Choice-Mastery und die defekte feedbackRule sind didaktisch problematisch, aber keine Policy-Verletzung).
- **P1 `classify-error-hypothesis`-Placements als Mastery in `c-algebra-basics`:** herabstufen auf P2. Die Fälle tragen `competencyIds: ['c-algebra','c-meta-learning']` (`assets/js/core/foundations_choice_families.mjs:319-334`), nicht `c-algebra-basics`. Sie wirken daher im `lm-foundations-algebra.json` zwar inhaltlich, aber nicht als `c-algebra-basics`-Mastery-Evidenz. Es ist ein Katalog-/Tagging-Mismatch, kein fachlicher Fehler.
- **P1 `error-journal-next-test` feedbackRule `choice !== 'observable-test'`:** bestätigt. Die Regel verwendet die `sourceId`-Semantik, der Grader liest `choiceId` (a/b/c/d) — die Regel greift für alle falschen Antworten gleich. `[P1] assets/js/core/foundations_choice_families.mjs:166-171 → feedbackRule an choiceId anpassen oder entfernen (für differenziertes Feedback; vgl. graders.js:62-65).`
- **P1 `estimatedMinutes: 45` Algebra-Lektion / keine stretch/challenge:** P1 bestätigt, aber mit Evidenzcaveat. `estimatedMinutes` und difficulty-Profile sind Autorenwerte (OF-7: unkalibriert). Keine Literatur legt 45 min als falsch fest. R6/R7 bezeichnen sie als Review-Hinweis, nicht P0.
- **P1 passive Visualisierungen / keine Subgoals / keine Completion:** P1/P2 teilweise annehmbar, aber OF-11/OF-4/LM-R8 relativieren die Evidenz. Subgoal-Labeling ist in der Literatur nur ein kleiner Effekt (LM-R8 "Kann"; gap-matrix G-25 "niedrig"). Completion-Fading ist `Soll` (LM-R5), nicht `Muss`.

### B1b — Foundations Python

- **P0 Curated-Placements `reassign-two-variables-print`, `accumulate-reassign-print`, `slice-predict-output`, `comprehension-predict`, `both-orders-linear-functions`:** widerlegt. Alle Fall-IDs existieren in `assets/js/core/foundations_trace_families.mjs` (z.B. `generateTraceAssignmentFamily`, `generateTraceCallCompositionFamily`) und werden im Bundle korrekt instanziiert. `[P2] content/modules/lm-foundations-python-state.json → kein P0, sondern public-first-Kataloglücke; die Lernpfade sind runtime-verfügbar.`
- **P0 `c-python-control-flow` / `c-python-collections` Familien fehlen:** widerlegt. `classify-control-construct`, `classify-string-immutability`, `construct-guarded-loop`, `aggregate-accumulator-count` etc. sind in `assets/js/core/foundations_choice_families.mjs`, `foundations_construct_families.mjs`, `foundations_trace_families.mjs` registriert. Der public Bundle enthält für `c-python-control-flow` 7 mastery-fähige Definitionen.
- **P0 `c-python-basics` / `c-python-reading` / `c-python-functions` erreichen `minimumDistinctDefinitions:2` nicht:** widerlegt. Bundle zeigt 10/15/24 mastery-fähige familyActivities.
- **P1 fehlende Parson-Familien:** P2 oder W4. Parsons sind in `LM-R4` als "Soll" und in `requirements.md` als Pilotwochen-Thema klassiert. `LM-R4` ist kein `Muss`; die Typen `ordered-lines`/`variable-values`/`output-lines` existieren bereits im Content (E1).
- **P1 `trace-call-composition.json` fehle Felder wie `competencyIds`, `activityType`, `graderId`, `hints`:** P2. Der Laufzeit-Vertrag `TRACE_CALL_COMPOSITION_CONTRACT` in `assets/js/core/foundations_trace_families.mjs:373-380` liefert diese Felder. Die statische Datei ist ein `contract: null`-Rumpf; das ist ein Katalogformatierungsproblem, kein Runtime-P0. `[P2] content/families/trace-call-composition.json → contract ergänzen oder Datei als deprecated markieren, da Vertrag in JS liegt.`

### B2 — Lineare Algebra + Daten

- **P0 `two-lines.viz.json` und `row-operation.viz.json`:** bestätigt, s. blockübergreifende Befunde. Mathematische Fehler in statischen Visualisierungen.
- **P0 `product-definition-rationale` fälschlich als Mastery:** herabstufen auf P2. Der Fall hat `graderId: manual-rubric` und `masteryEligible: false` im Case. `family_registry.mjs:57` setzt `masteryEligible` generiert auf false. Der Bundle-Eintrag zeigt `masteryEligible: false`. Die Modul-Angabe `masteryEligible: true` wird überschrieben, ist aber ein R15-Konsistenzfehler.
- **P0 `c-linalg-independence` erfüllt `minimumDistinctDefinitions:2` nicht:** widerlegt. Bundle enthält `transform-rank-dependence-rowops:rank-3x3-staircase` und `classify-rank-solution-case:rank-system-authored` (letzteres platziert in `lm-linalg-systems.json:77-86` und `lm-linalg-gauss.json:66-75`, cross-getaggt). `[P1] content/modules/lm-linalg-independence.json → falls Choice-Fälle laut R14 keine Mastery sein sollen, eine nicht-Choice-Definition hinzufügen; die Anzahl 2 ist aber gegeben.`
- **P1 challenge-Placements / fehlende Hinweise in statischen Fällen:** P1 bestätigt — R6/R3-Lücken, aber kein P0.
- **P1 passive Visualisierungen:** P2. Begründung s. blockübergreifend.

### B3 — Machine Learning

- **P0 `aggregate-majority-rule-count` fehlt:** widerlegt als P0, P2 als Kataloglücke. Die Familie existiert in `assets/js/core/data_ml_families.mjs:436-455` und `AGREGATE_MAJORITY_RULE_COUNT_CONTRACT:915-927` und ist in `lm-ml-baseline.json:34-41` und `lm-ml-ensembles.json:33-40` platziert. Es fehlt lediglich `content/families/aggregate-majority-rule-count.json` im public-first-Katalog.
- **P0 `formula-metric-spread-range` fehlt:** widerlegt als P0, P2 als Kataloglücke. Existiert in `data_ml_families.mjs:489-499` und `FORMULA_METRIC_SPREAD_RANGE_CONTRACT:957-969`, platziert in `lm-ml-cv.json:33-40` und `lm-ml-repro.json:38-46`.
- **P0 `mse-from-residuals` und `r2-explained-share` fehlen:** widerlegt. Beide Cases werden von den Generatoren `generateFormulaQuadraticErrorMetricFamily`/`generateFormulaRatioPercentMetricFamily` bereitgestellt und in `lm-ml-linear.json:35-55` platziert.
- **P1 `c-ml-linear` nur 2 mastery-fähige Definitionen:** widerlegt. Bundle zeigt 4 (`mse-from-residuals`, `r2-explained-share`, `linear-fit-lstsq`, `regression-report`).
- **P1 `classify-cv-leakage` als Mastery:** P1 bestätigt — es ist ein Choice-Diagnose-Fall, R14 spricht gegen Mastery. Runtime erlaubt es aber (`family_registry.mjs:57`), so dass es kein P0 ist.

### B4 — Deep Learning

- **P0 `head-only-finetune` MSE/Gradient-Inkonsistenz:** bestätigt, s. blockübergreifend. `[P0] content/families/optimize-gradient-update-rule.json:501/503/504 → Gradientskala auf 2/(n*Y.shape[1]) anpassen oder Fall explizit auf d2=1 einschränken.`
- **P0 `genDropoutCount` fullSolution `1/p = p`:** bestätigt, s. blockübergreifend. `[P0] assets/js/core/deep_learning_generators.mjs:196 → fullSolution auf Skalierung 1/p = (1/p).toFixed(2) korrigieren.`
- **P1 Worked-Example/Completion, Familien-Metadaten, Visualisierungen:** P1/P2 annehmbar, aber keine Evidenz, dass sie v0.6 blockieren.

### B5 — GenAI + Research + Capstone

- **P0 `chunk-overlap.viz.json`:** bestätigt, s. blockübergreifend. `[P0] content/lessons/research/chunk-overlap.viz.json:15 → Formel korrigieren in floor(10/(c-o)-0.0001)+1.`
- **P1 passive Visualisierungen, fehlende Case-Level-Completion, Spiralrückgriffe, Zeitkalibrierung:** P1/P2 annehmbar, aber kein P0. `precision-recall-threshold.viz.json` ist passiv, aber fachlich nicht falsch.
- **P1 Capstone-Lektion 156 Zeilen für fünf Module:** P1 bestätigt (R8/R1), aber Aufteilung ist ein Content-Refactoring, kein P0.
- **P2 Überschriftenfehler `einmarshen`:** P2 bestätigt, s. `capstone-pipeline.md:43`.

### B6 — Projekte + Explanation-Cards

- Keine P0s im W2-Bericht. Gegenprüfung: Die vier Projekte existieren unter `content/projects/`, sind aber in keinem `module.projectIds` verknüpft. Das ist eine Auffindbarkeitslücke, kein Mastery-Defizit (Projekte sind laut Authoring-Guide Selbstlern-Nachweise, `masteryEligible` implizit false). `[P1] content/modules/*.json → projectIds für die jeweiligen Projekt-IDs füllen (z.B. p-foundations-data-checker, p-ml-repro-comparison, p-rag-secure-prototype, p-rag-capstone).`
- **P1 `p-rag-capstone` `w30_core.py` referenziere den Starter statt die Lösung:** P2, kein P1-Contentfix. Der Test `tests/test_rag_capstone_project_solution.py:117-123` fordert Byte-Identität mit `rag-secure-prototype/src/prototype.py`; das ist ein bewusster Starter-/Solution-Vertrag. Eine Umstellung auf die Lösung würde Test und Projektvertrag ändern.
- **P1 Explanation-Cards (außer `x-git-workflow`) nicht in Modulen verlinkt / `followUpActivityIds` verweisen auf Canonical-Fixtures:** P2. Die Karten liegen in `content/explanations/foundations/`, sind aber nur in `content/modules/git-basics.json` (ID `x-git-workflow`) in `explanationIds` eingebunden. `[P2] content/modules/lm-foundations-*.json → explanationIds um die passenden Cards erweitern; followUpActivityIds auf tatsächliche caseIds im Public-Bundle prüfen.`
- **P1 `exception-boundary` `diagnosticCodes` (`exception-boundary`) nicht in `graders.js`:** P2. Der `explanation-card.schema.json` definiert `diagnosticCodes` als eigene Taxonomie; kein zwingender Mapping-Zwang. Falls `errorType` gemeint war, ist es eine Konsistenzfrage, kein P0.

### B7 — Tracks + Milestones

- **P0 im W2-Bericht:** keine.
- **P1 `competency-family-coverage.json` überdeklariert:** widerlegt als P0, P2 als Dokumentations-/Interpretationsfrage. Die Datei wird von `tools/build_coverage_matrix.mjs` aus dem Bundle generiert und `build_coverage_matrix.mjs --check` ist aktuell. Hohe `placedCaseCount`-Werte entstehen durch Cross-`competencyIds` (viele Fälle taggen z.B. `c-numpy-basics` oder `c-python-functions`); das ist kein Build-Fehler, sondern eine Designentscheidung für übergreifende Kompetenzen. `[P2] content/competency-family-coverage.json → Kommentar ergänzen, dass die Matrix alle familyActivities mit diesem competencyId zählt, nicht nur die Module dieser Kompetenz.`
- **P1 fehlende `diagnostic`/`guided-practice`-Artefakte in `content/milestones/core.json`:** P2. Die `learning-module.schema.json` erlaubt nur `curated` und `practice-space` als `role` (`schemas/learning-module.schema.json:62`). Die Milestone-`requiredArtifacts` sind Planungskategorien, für die es im Schema noch keinen `role`-Wert gibt. `[P1] content/milestones/core.json → requiredArtifacts entweder an Schema anpassen oder diagnostic/guided-practice als Rollen in learning-module.schema.json ergänzen.`
- **P1 Projekte in Milestones, aber keine Modulverdrahtung:** P1 (s. B6).

## Konflikte und Unsicherheiten

1. **Choice-Fälle als Mastery:** B1a/B2/B3 werten `masteryEligible: true` bei Choice-Fällen als Verstoß gegen R14. `family_registry.mjs:57` erlaubt es, und `core.json` definiert `minimumDistinctDefinitions`, nicht den Aufgabentyp. **Unsicherheit:** Ist R14 eine harte Blockierregel für v0.6 oder eine Designempfehlung? Solange der Code Choice-Mastery erlaubt, ist es keine P0-Mastery-Ehrlichkeitsverletzung.
2. **Cross-Competency-Tagging:** Viele Fälle taggen mehrere Kompetenzen. Das führt zu scheinbar "überdeklarierten" Coverage-Werten und dazu, dass `c-meta-learning`/`c-linalg-independence` über Modulgrenzen hinweg Definitionen erhalten. **Faktum:** `evidence_engine.mjs:36-44` zählt diese. **Hypothese:** Das ist beabsichtigt, um Spiral- und Wiederholungseffekte zu unterstützen. **Unsicherheit:** Ob Lernende die fachliche Verbindung zwischen Modulen erkennen, hängt von `requires`/Reihenfolge ab.
3. **"Fehlende Familie" vs. "Fehlende JSON-Datei":** B1b/B3 deklarieren Familien als fehlend, weil sie nicht in `content/families/*.json` stehen. **Faktum:** `compile_content` instanziiert sie aus JS-Generatoren. **Unsicherheit:** Ist der public-first-Katalog-Vertrag (alles als JSON) ein hartes v0.6-Kriterium oder ein W4-Wunsch?
4. **Viz-Fehler vs. Viz-Passivität:** B2 identifiziert zwei echte mathematische Fehler (P0). B1a/B2/B5 kritisieren passive Visualisierungen ohne Transferfrage. **Evidenz:** OF-11 kann interaktiven Mehrwert nicht belegen. **Konflikt:** R12 verlangt eine Aufgabe, die Rubrik ist stärker als die Forschungslage. P1/P2 angemessen.
5. **Mastery-Policy-Schwellen:** `minimumDistinctDefinitions:2` und `minimumIndependentHits:2` sind inhaltlich nicht durch die Lernmethodik belegt (OF-1). Sie sind Design-Policies. Daher sind "Policy-Verletzungen" P1/P2-Entscheidungen, nicht P0-Fehler, solange `core.json` anpassbar ist.
6. **Completion-Fading:** LM-R5 ist "Soll", nicht "Muss". Viele W2-Berichte klassieren fehlende Case-Level-Completion als P1. **Unsicherheit:** Reicht Lesson-Level-Worked-Example, oder ist Case-Fading notwendig? Evidenz (Renkl/Fading) unterstützt Zwischenstufen, aber LM-R5 priorisiert sie als Soll.
7. **Parsons-Effekt:** OF-4 relativiert die Übertragbarkeit auf erwachsene Lerner. W2-B1b empfiehlt Parson-Familien als P1. **Unsicherheit:** Ob in v0.6 zusätzliche Parson-Familien den Lernerfolg verbessern, ist unbelegt.
8. **Projekte als Selbstlern-Nachweise:** B6 bewertet Projekte korrekt als `masteryEligible: false`. Deren Fehlen in Modul-`projectIds` ist eine Navigationslücke, kein Mastery-Defizit.

## Empfohlene Klassifizierungskorrekturen

| W2 file | Befund | ursprüngliche P-Klasse | vorgeschlagene P-Klasse | Begründung |
|---|---|---|---|---|
| `b1a-foundations-math.md` | `c-meta-learning` erfüllt `minimumDistinctDefinitions:2` nicht | P0 | P1 | Bundle enthält 4 mastery-fähige Definitionen (cross-getaggt); echtes Problem ist Choice-Mastery + defekte feedbackRule |
| `b1a-foundations-math.md` | `classify-error-hypothesis`-Placements als Mastery in `c-algebra-basics` | P1 | P2 | Cases taggen `c-algebra`/`c-meta-learning`, nicht `c-algebra-basics`; Katalogmismatch, kein fachlicher Fehler |
| `b1a-foundations-math.md` | `error-journal-next-test` feedbackRule defekt | P1 | P1 | Bestätigt: Regel verwendet sourceId statt choiceId |
| `b1a-foundations-math.md` | Keine Subgoal-Labels / passive Viz / keine stretch | P1 | P1/P2 | Akzeptabel, aber LM-R8/OF-11 relativieren die Evidenz |
| `b1b-foundations-python.md` | Curated-Placements referenzieren nicht existierende `caseId`s | P0 | P2 | Case-IDs existieren in `assets/js/core/foundations_trace_families.mjs`; fehlende `content/families/*.json` sind Kataloglücken |
| `b1b-foundations-python.md` | `c-python-control-flow`/`c-python-collections` Familien fehlen | P0 | P2 | Familien in JS-Registries vorhanden, Module instanziierbar |
| `b1b-foundations-python.md` | `c-python-basics`/`c-python-reading`/`c-python-functions` <2 mastery-Definitionen | P0 | P2 | Bundle zeigt 10/15/24 mastery-fähige familyActivities |
| `b1b-foundations-python.md` | `trace-call-composition.json` fehlen Case-Felder | P1 | P2 | Felder werden vom Laufzeit-Vertrag `TRACE_CALL_COMPOSITION_CONTRACT` bereitgestellt |
| `b1b-foundations-python.md` | Keine Parson-Familien | P1 | P2/W4 | LM-R4 ist Soll; OF-4 relativiert Evidenz |
| `b2-linalg-daten.md` | `two-lines.viz.json` Schnittpunkt falsch | P0 | P0 | Mathematisch bestätigt |
| `b2-linalg-daten.md` | `row-operation.viz.json` Invariantenpunkt falsch | P0 | P0 | Mathematisch bestätigt |
| `b2-linalg-daten.md` | `product-definition-rationale` fälschlich als Mastery | P0 | P2 | Runtime setzt masteryEligible=false (manual-rubric); Modul-Eintrag ist R15-Problem |
| `b2-linalg-daten.md` | `c-linalg-independence` <2 mastery-Definitionen | P0 | P1 | Bundle enthält 2, eine ist Choice; falls R14 greift, P1 |
| `b3-ml.md` | `aggregate-majority-rule-count` fehlt | P0 | P2 | In `data_ml_families.mjs`, fehlt nur `content/families/*.json` |
| `b3-ml.md` | `formula-metric-spread-range` fehlt | P0 | P2 | In `data_ml_families.mjs`, fehlt nur `content/families/*.json` |
| `b3-ml.md` | `mse-from-residuals`/`r2-explained-share` fehlen | P0 | P2 | Von JS-Generatoren bereitgestellt und in Modulen platziert |
| `b3-ml.md` | `c-ml-linear` nur 2 mastery-Definitionen | P1 | P2 | Bundle zeigt 4 mastery-fähige Definitionen |
| `b4-dl.md` | `head-only-finetune` MSE/Gradient-Inkonsistenz | P0 | P0 | Bestätigt; latent für d2>1 |
| `b4-dl.md` | `genDropoutCount` fullSolution 1/p = p | P0 | P0 | Bestätigt |
| `b5-genai-research.md` | `chunk-overlap.viz.json` Formel | P0 | P0 | Bestätigt |
| `b5-genai-research.md` | Capstone-Lektion 156 Zeilen für 5 Module | P1 | P1 | Bestätigt, aber kein P0 |
| `b6-projekte-explanations.md` | Projekte nicht in Modulen verknüpft | P1 | P1 | Bestätigt, Navigationslücke, kein Mastery-Defizit |
| `b6-projekte-explanations.md` | `w30_core.py` sollte Lösung referenzieren | P1 | P2 | Byte-identischer Pinning ist Test-Vertrag; Änderung bricht Test |
| `b7-tracks-milestones.md` | `competency-family-coverage.json` überdeklariert | P1 | P2 | Generiert aus Bundle, Cross-Tagging by design |
| `b7-tracks-milestones.md` | Milestones fordern `diagnostic`/`guided-practice` | P1 | P2 | `learning-module.schema.json` unterstützt diese Rollen nicht |

## Forschungslücken für W4

- **Choice-Mastery-Policy:** Klären, ob `family_registry.mjs` Choice-Diagnosefälle als Mastery blockieren soll oder ob `masteryEligible` auf Case-Ebene ausschlaggebend bleibt (R14 vs. Runtime).
- **Cross-Competency-Tagging und Lernpfad-Reihenfolge:** Untersuchen, ob cross-getaggte Mastery-Definitionen in späteren Modulen als Beweis für frühere Kompetenzen akzeptabel sind oder ob Modul-lokale Evidence-Policies eingeführt werden.
- **Public-first-Katalog vs. JS-Generatoren:** Entscheiden, ob `content/families/*.json` der alleinige Veröffentlichungsort sein soll. Wenn ja, Migrationspfad für `data_ml_families.mjs`- und `foundations_*_families.mjs`-Familien.
- **Mastery-Schwellen (OF-1):** `minimumDistinctDefinitions:2`, `minimumIndependentHits:2` und `freshnessDays` sind nicht evidenzbasiert; W4 könnte Telemetrie (durationMs, errorType-Kohorten) nutzen, um sie zu kalibrieren.
- **Interaktive Visualisierungen (OF-11):** Läuft eine Vorhersage-/Transferfrage in JSXGraph tatsächlich über reines Lesen hinaus? Pilotdaten aus `durationMs` + JOL nötig.
- **Parsons bei Erwachsenen (OF-4):** Prototypischer A/B-Vergleich in w06/w07, um Zeit-zu-Erfolg gegen bestehende `output-lines`-Fälle zu prüfen.
- **Case-Level-Completion-Fading (LM-R5):** Ist Lesson-`worked-example` ausreichend, oder benötigen `python-code`-Fälle eine `caseHasWorkedExample`/`completion`-Stufe? W4: Prototyp mit zwei Fällen pro Typ.
- **Subgoal-Hinweise (LM-R8/OF-8):** Effekt ist klein; W4 prüft, ob `hints[0]` als Frage nach dem nächsten Teilziel formuliert werden soll, ohne alle bestehenden Fälle zu invalidieren.
- **Diagnose-/Guided-Practice-Rollen:** `schemas/learning-module.schema.json` unterstützt nur `curated`/`practice-space`; W4 muss entscheiden, ob `diagnostic`/`guided-practice` Rollen oder nur Milestone-Artefakte werden.
