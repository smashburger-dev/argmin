# C2 – Formale, Schema- und Feasibility-Gegenprüfung der W2/W3a-Befunde

## Kurzvermerk

Dieser Bericht ist die formale Gegenprüfung der W2-Reports (B1a–B7) und der begleitenden Quellen C1 (Didaktik), E1 (Evidenz-Remap), E2 (Interaktiv-Audit), `docs/content-review/inventar.{json,md}`, `docs/authoring-guide.md` und der Schemata. Ziel ist die Unterscheidung zwischen echten v0.6-P0/P1/P2-Blockern, Katalog-Missverständnissen und Vorschlägen, die einen späteren Schema-/Runtime-PR brauchen.

Ergebnisstatus:

- `node tools/validate_content.mjs` und `node tools/build_coverage_matrix.mjs --check` laufen fehlerfrei: 46 öffentliche Kompetenzen, 46 Lektionen, 131 eindeutige `familyId`s und 253 `familyActivities`.
- 24 der 131 `familyId`s im Bundle haben **keine** entsprechende `content/families/*.json`-Datei. Sie werden ausschließlich aus JS-Generatoren gespeist (`assets/js/domain/exercise_registry.mjs` und `assets/js/core/*_families.mjs`). Das ist kein Build-Fehler, sondern eine Verletzung des public-first-Vertrags im Authoring-Guide.
- Viele als P0 klassifizierte „fehlende Familie / fehlender Fall / Unterdeckung der Mastery-Evidenz"-Befunde aus W2/E1 lösen sich auf, sobald man `bundle.familyActivities`, `evidence_engine.mjs` und Cross-Competency-Tagging betrachtet.
- Die echten v0.6-fähigen P0s sind fast ausschließlich **fachliche Fehler** in Prompts, Visualisierungen, Generator-Texten und Referenzlösungen. Sie benötigen **keine** Schemaänderung.
- Vorschläge für neue Blocktypen (`predict-then-verify-visualization`), neue Placement-Rollen (`diagnostic`, `guided-practice`) oder den Typ `multiple-choice` sind in v0.6 **plan-only**.

Es wurden keine Inhalts-, Schema- oder Runtime-Dateien geändert und keine Commits erstellt.

## Blockübergreifende Befunde

1. **[pfade] Der Build ist teilweise JS-first, nicht rein public-first.** `tools/compile_content.mjs:522` entdeckt Familien ausschließlich im Verzeichnis `content/families/`. `configureExerciseFamilies` in `assets/js/domain/exercise_registry.mjs:38` mischt diese statischen Dokumente aber mit 24 reinen JS-Familien aus `assets/js/core/foundations_*_families.mjs`, `deep_learning_generators.mjs` usw. Das aktuelle Public-Bundle enthält somit Familien wie `classify-error-hypothesis`, `trace-collection-state`, `formula-metric-spread-range` und `transform-expression-simplify-canonical`, die im Katalogverzeichnis nicht existieren. `validate_content.mjs` akzeptiert sie; sie sind daher **keine Ghost References**, sondern Katalog-Transparenz-Probleme.

2. **[schema] Es gibt nur neun erlaubte Exercise-Typen.** `schemas/exercise-family.schema.json:72–75` listet exakt `numeric`, `single-choice`, `vector`, `algebraic-expression`, `python-code`, `short-rationale`, `parsons`, `code-trace`, `predict-output`. `multiple-choice` existiert nicht. W2-Empfehlungen, die `multiple-choice` verwenden, müssen auf `single-choice` umgeschrieben oder als `plan-only` markiert werden.

3. **[machbarkeit] `masteryEligible` wird zur Laufzeit neu berechnet.** `assets/js/domain/family_registry.mjs:57` setzt `masteryEligible` nur für Fälle mit `masteryEligible: true` und `graderId !== 'manual-rubric'`. Ein Modul-Placement mit `masteryEligible: true` für einen `short-rationale`-Fall (z. B. `product-definition-rationale` in `content/modules/lm-linalg-matrices.json:88`) wird daher von der `evidence_engine.mjs:36` nicht als Mastery gezählt. Das ist eine **R15-Konsistenzlücke**, kein P0-Blocker.

4. **[pfade] `minimumDistinctDefinitions` ist für die meisten angefochtenen Kompetenzen runtime-seitig erfüllt.** `evidence_engine.mjs:36–44` zählt über alle `familyActivities` und deren `competencyIds`. `c-meta-learning` hat 4 mastery-fähige Aktivitäten, `c-linalg-independence` 2, `c-python-basics` 10, `c-python-functions` 24. Die W2-Befunde, die nur Modul-Placements oder statische `content/families/*.json`-Dateien zählen, unterschätzen Cross-Tagging und JS-Generatoren.

5. **[schema] `predict-then-verify-visualization` ist kein definierter Block- oder Exercise-Typ.** `schemas/lesson.schema.json:31` erlaubt nur `prose`, `definition`, `worked-example`, `checkpoint`, `visualization`, `exercise`, `reflection`, `project-step`, `source-note`. Eine Umsetzung bräuchte Schema, `src/app/types.ts`, `LessonView.tsx`, Grader-Erweiterung und Validierung. Alle entsprechenden W2-Vorschläge sind daher **plan-only** für v0.6.

6. **[pfade] `module.projectIds` und `module.explanationIds` sind formal vorhanden, aber UI-seitig inaktiv.** `assets/js/domain/learning_module.mjs:32–34` und `:99–100` lösen sie auf und nutzen sie für Minutenberechnung sowie `assertModuleBindings`. `indexLearningModules` in `:55–70` indiziert jedoch nur Tracks, Kompetenzen und Lektionen; `src/` hat keine `explanationIds`/`projectIds`-Konsumenten. Die allgegenwärtig leeren Arrays in 49 Modulen sind daher **keine Schemaverletzung**, sondern eine Navigations-/Discovery-Lücke (P2, keine P0-Blockade).

7. **[machbarkeit] Visualisierungen haben keine Eingabe- und keine Auto-Check-Funktion.** Nach E2 und `src/ui/VisualizationBlock.tsx` sind JSXGraph-Objekte `fixed: true`; es gibt Slider-Drag, aber keine Texteingabe, keinen Grader und keine Animation. Vorschläge, Viz mit gekoppelter Vorhersage zu erweitern, benötigen einen UI- und Grader-PR. Die mathematischen Fehler in bestehenden Viz-Dateien (`two-lines.viz.json`, `row-operation.viz.json`, `chunk-overlap.viz.json`) lassen sich dagegen **ohne Schemaänderung** korrigieren.

8. **[pfade] `followUpActivityIds` in Explanation-Cards werden nicht gegen den Bundle aufgelöst.** `content/explanations/foundations/*.json` verweist auf `f-collections-output-01`, `f-control-parsons-01`, `f-files-parsons-01`, `f-git-parsons-01` usw. Diese IDs existieren als `sourceId` in `tests/fixtures/*.json` oder als JS-Falltypen, aber nicht als `content/families/*.json`. `compile_content.mjs` validiert sie nicht; der Compiler wirft bei fehlenden **Placement**-`familyId`/`caseId`, aber nicht bei Erklärungs-Follow-ups. Das sind **dangling catalog references**, keine Runtime-Ghosts.

9. **[machbarkeit] `diagnostic`/`guided-practice` sind keine Placement-Rollen im Modul-Schema.** `schemas/learning-module.schema.json:62` kennt nur `curated` und `practice-space`. Im Milestone-Schema (`schemas/milestone.schema.json:41`) tauchen `diagnostic` und `guided-practice` als `requiredArtifacts`-Taxonomie auf. W2-Befunde, die diese Rollen direkt in `learning-module.schema.json` fordern, verwechseln Artefakt-Typen mit Placement-Rollen.

10. **[pfade] Die `competency-family-coverage.json` ist kein Katalog-Original, sondern eine Build-Ableitung.** `tools/build_coverage_matrix.mjs:10–23` iteriert `bundle.familyActivities`, zählt pro Kompetenz `familyIds` und `placedCaseCount` und schreibt die Datei. Sie ist konsistent mit `compileContent` (das wurde mit `--check` bestätigt). Missverhältnisse zwischen Coverage-Zahlen und Modul-Placements erklären sich also aus Cross-Tagging und JS-Generatoren, nicht aus veralteten Daten.

## W2/W3a-Finden pro Block

### B1a – Mathematik-Grundlagen

B1a meldet `caseMissing: true` für `transform-linear-equation-isolate` und `classify-error-hypothesis`-Fälle. Formal geprüft: `content/families/transform-linear-equation-isolate.json:4` hat `contract: null`; die seeded Fälle leben in `assets/js/core/foundations_construct_families.mjs`. `classify-error-hypothesis` ist eine reine JS-Familie (`assets/js/core/foundations_choice_families.mjs:319–334`). `node tools/validate_content.mjs` instantiiert diese Fälle erfolgreich (`buildFamilyActivity` in `tools/compile_content.mjs:689` ruft `EXERCISE_FAMILIES.instantiate` auf). Sie sind daher **keine Ghost References**.

B1a nennt ferner `classify-error-hypothesis`-Placements mit `masteryEligible: true` als P1/P0. Laufzeitseitig erlaubt `family_registry.mjs:57` Mastery für jeden nicht-`manual-rubric`-Fall, unabhängig vom `activityType`. Das widerspricht aber R14/Authoring-Guide und sollte auf `masteryEligible: false` korrigiert werden.

Konkrete Gegenempfehlungen:

- `[P1] content/families/transform-linear-equation-isolate.json` → Kommentar hinzufügen, dass `contract: null` beabsichtigt ist und die Fälle aus `assets/js/core/foundations_construct_families.mjs` kommen (Katalogklarheit, kein Runtime- oder Schema-Change).
- `[P1] assets/js/core/foundations_choice_families.mjs` → `masteryEligible: false` für `classify-error-hypothesis`-Fälle setzen und `fullSolution`-Notiz ergänzen (R14, v0.6 machbar, JS-Change).
- `[P1] assets/js/core/foundations_choice_families.mjs` → `feedbackRules[0].if: "choice !== 'observable-test'"` korrigieren; die Regel trifft auf keine reale `choiceId`, weil der Generator Buchstaben-IDs vergibt (`graders.js:62–65`). Korrektur auf tatsächliche `choiceId` oder Entfernen der Regel (R4, v0.6 machbar, JS-Change).
- `[P2] docs/content-review/inventar.json` → Kennzeichnung für generated-vs-static `caseMissing` einführen, damit nachfolgende Reviews den JS-first-Build nicht misslesen.

### B1b – Python-Grundlagen

B1b/`inventar.json` markiert `trace-assignment-state:reassign-two-variables-print`, `accumulate-reassign-print`, `slice-predict-output` und `comprehension-predict` als `caseMissing: true`. Diese `caseId`s existieren jedoch im `caseTypes`-Array des JS-Vertrags `TRACE_ASSIGNMENT_CONTRACT` in `assets/js/core/foundations_trace_families.mjs:229–235` und werden von `genPythonStateTrace` bzw. `genCodeReadingOutput` in `assets/js/core/foundations_fresh_generators.mjs:60` und `:114` generiert. `content/families/trace-assignment-state.json` dient nur als statische Fallbank für die `propertyTest: false`-Fälle (z. B. `gradient-loop-two-updates`); es hat selbst `contract: null` und ist daher kein eigenständiger Familienvertrag.

`c-python-basics` deckt runtime-seitig 10 mastery-fähige Aktivitäten ab, `c-python-functions` 24. Die Befunde, die `minimumDistinctDefinitions:2` nicht erfüllt sehen, unterschlagen die Cross-Tagging-Fälle (z. B. `trace-assignment-state:stable-softmax-rows-trace` für `c-python-basics` und `c-dl-attention`).

Die 24 reinen JS-Familien ohne `content/families/*.json`-Datei sind: `aggregate-accumulator-count`, `aggregate-majority-rule-count`, `aggregate-topk-relevance-arithmetic`, `classify-control-construct`, `classify-error-hypothesis`, `classify-exception-placement`, `classify-git-operation`, `classify-python-collection-choice`, `classify-set-operation-semantics`, `classify-string-immutability`, `classify-test-attitude`, `construct-guarded-loop`, `construct-regression-test-suite`, `construct-safe-bugfix-workflow`, `construct-test-structure-aaa`, `count-remaining-rows-cleaning-rule`, `formula-count-from-construction`, `formula-metric-spread-range`, `optimize-backprop-path-sum`, `trace-collection-state`, `trace-dict-state-update`, `trace-exception-path`, `transform-expression-simplify-canonical`, `transform-power-log-exponent`.

Konkrete Gegenempfehlungen:

- `[P2] content/families/trace-assignment-state.json` → Dateikopf erweitern, der erklärt, dass diese Datei eine statische Case-Bank für den JS-Vertrag ist (`contract: null`), keine eigenständige Familie (Katalogklarheit).
- `[P2] docs/content-review/inventar.json` → `caseMissing: true` für generated-only Cases entfernen oder auf `generated` stellen.
- `[P2] assets/js/core/foundations_trace_families.mjs` → Kommentar bei jedem `caseId`, das nur zur Laufzeit generiert wird, um `inventar.json`-Tools nicht zu täuschen.

### B2 – Lineare Algebra / Daten

B2 führt `c-linalg-independence` als unterdeckt. Prüfung des Bundles ergibt zwei mastery-fähige Definitionen: `transform-rank-dependence-rowops:rank-3x3-staircase` und `classify-rank-solution-case:rank-system-authored`. `evidencePolicy.minimumDistinctDefinitions:2` ist somit erfüllt.

Das Placement `product-definition-rationale` in `content/modules/lm-linalg-matrices.json:88` setzt `masteryEligible: true`, obwohl der Fall in `content/families/formula-scalar-product.json:261–298` `graderId: manual-rubric` und `masteryEligible: false` hat. Laufzeitseitig gewinnt `family_registry.mjs:57` und `isMasteryEligible`; die Aktivität ist nicht mastery-fähig. Das ist R15, kein P0.

Die Visualisierungen `two-lines.viz.json` und `row-operation.viz.json` enthalten fachliche Fehler, die C1 als P0 bestätigt. Sie lassen sich durch Korrektur der JSXGraph-Parameter/Formeln beheben, ohne Schema- oder UI-Änderung.

Konkrete Gegenempfehlungen:

- `[P0] content/lessons/linear-algebra/two-lines.viz.json` → Korrektur der Geradendarstellung oder des Schnittpunkts (fachlicher Fehler, v0.6 machbar).
- `[P0] content/lessons/linear-algebra/row-operation.viz.json` → Korrektur der Zeilenumformungsvisualisierung (fachlicher Fehler, v0.6 machbar).
- `[P1] content/modules/lm-linalg-matrices.json:88` → `masteryEligible` auf `false` setzen oder den Fall auf einen `graderId: deterministic`-Fall umstellen (R15, v0.6 machbar).
- `[P2] docs/content-review/raw/b2-linalg-daten.md` → `c-linalg-independence` P0-Mastery-Befund auf P2 herunterstufen, da `minimumDistinctDefinitions` erreicht ist.

### B3 – Machine Learning

B3 wirft mehreren ML-Kompetenzen „fehlende Familien" vor. Tatsächlich sind einige relevante Familien JS-only, z. B. `formula-metric-spread-range` für `c-ml-cv` und `c-ml-repro`. Sie erscheinen in `bundle.familyActivities` und `competency-family-coverage.json`, sind aber nicht unter `content/families/*.json` auffindbar. Das ist das gleiche JS-first-Phänomen wie in B1.

`c-ml-logistic` hat 4 mastery-fähige Aktivitäten, `c-ml-cv` 9, `c-ml-repro` 9. Mastery-Argumente gegen diese Kompetenzen entfallen runtime-seitig.

Konkrete Gegenempfehlungen:

- `[P1] assets/js/core/deep_learning_generators.mjs` oder `ml_generators.mjs` → ggf. `formula-metric-spread-range` und verwandte JS-Familien in die Dokumentation des public-first-Vertrags aufnehmen, wenn sie kanonisch sein sollen (Katalog/Doku, v0.6 machbar, kein Code-Change).
- `[P2] docs/content-review/raw/b3-ml.md` → Mastery-Unterdeckung-Befunde für `c-ml-cv`/`c-ml-repro` zurückziehen, sofern sie nur auf fehlende `content/families/*.json` gestützt waren.

### B4 – Deep Learning

B4 nennt `optimize-gradient-update-rule.json:head-only-finetune` und `fit-weight-decay-ablation` als fachlich problematisch. Diese Fälle existieren, sind im Bundle auflösbar und haben `expected.kind: reference-solver` passend zu `activityType: python-code` und `graderId: pyodide`. Die Probleme liegen in der mathematischen/algorithmischen Korrektheit der Tests oder Lösungstexte (z. B. `head-only-finetune`/`fit-weight-decay-ablation`), nicht in der Referenzierung.

Ein separater fachlicher P0 ist der Text in `assets/js/core/deep_learning_generators.mjs:196`: `Skalierung 1/p = ${p}` behauptet fälschlich `1/p = p`. Das ist ein Content/Generator-Fehler, der ohne Schema-Änderung korrigiert werden kann.

Konkrete Gegenempfehlungen:

- `[P0] assets/js/core/deep_learning_generators.mjs:196` → fullSolution korrigieren zu `Skalierung 1/p = ${(1/p).toString().replace('.', ',')}` oder Formulierung `Skalierungsfaktor 1/p` verwenden (fachlicher Fehler, v0.6 machbar, JS-Change).
- `[P0] content/families/optimize-gradient-update-rule.json` → `head-only-finetune`-Test oder Referenzsolver auf fachliche Korrektheit prüfen und korrigieren (C1, v0.6 machbar).
- `[P1] content/families/fit-weight-decay-ablation.json` → `compare_decay` und `train_decay` auf Abgleich zwischen Prompt, Test und `referenceSolver` prüfen (R15, v0.6 machbar).
- `[P2] schemas/exercise-family-cases.schema.json` → optional `expected.kind` pro `activityType`/`graderId` normieren, falls zukünftig Validierung gewünscht ist (Schema-PR, plan-only für v0.6).

### B5 – GenAI und Forschung

B5 hebt `chunk-overlap.viz.json` (`content/lessons/research/chunk-overlap.viz.json:16`) als fachlichen P0 hervor. Die Visualisierungsdatei existiert, ist schemakonform und wird gerendert; der Fehler liegt in der Berechnungsformel/Parametrisierung. Keine Schemaänderung nötig.

Für GenAI-Follow-ups in Explanation-Cards oder Lektionen gilt dasselbe Dangling-Reference-Muster wie in B6: einige `followUpActivityIds` verweisen auf `f-rag-*` oder `f-research-*`, die als JS-Falltypen oder Test-Fixture-IDs existieren, aber nicht als `content/families/*.json`.

Konkrete Gegenempfehlungen:

- `[P0] content/lessons/research/chunk-overlap.viz.json` → Korrektur der Chunk-Anzahl-Formel oder der Slider-Boundingbox (fachlicher Fehler, v0.6 machbar, kein Schema-Change).
- `[P2] content/explanations/genai/*.json` → `followUpActivityIds` auflösbare `sourceId`s oder entfernte Links prüfen; wenn nicht kanonisch, als `plan-only` markieren.

### B6 – Projekte und Explanation-Cards

B6 identifiziert korrekt, dass `followUpActivityIds` in `content/explanations/foundations/*.json` auf `f-collections-output-01`, `f-control-parsons-01`, `f-files-parsons-01` und `f-git-parsons-01` verweisen. Diese IDs existieren in `tests/fixtures/canonical-families.json` bzw. als JS-Shard-Falltypen (`assets/js/core/foundations_construct_families.mjs`), nicht als `content/families/*.json`. `compile_content.mjs` validiert `followUpActivityIds` nicht; der Validator wirft auch nicht, weil `explanation-card.schema.json` das Feld nur als String-Array ohne Referenzprüfung definiert. Sie sind **Dangling References** im Katalog, aber keine Runtime-Ghosts.

`diagnosticCodes` in Explanation-Cards (`exception-boundary`, `unsafe-workflow`, `off-by-one`, …) haben keine Entsprechung in den `errorType`-Werten aus `assets/js/core/graders.js`. Die UI (`src/`) verwendet `diagnosticCodes` nirgends, daher sind sie derzeit eine Taxonomie ohne Runtime-Verbraucher.

Alle 49 Module enthalten `projectIds`; sie sind fast durchgängig leer. Projekte sind real über `milestones/*/core.json` und Tracks sichtbar (`ms-foundations`, `ms-ml-repro`, GenAI-Capstone). Nur `git-basics.json` enthält `explanationIds` (`x-git-workflow`).

Konkrete Gegenempfehlungen:

- `[P1] tools/compile_content.mjs` → `validateExplanations` um Prüfung der `followUpActivityIds` gegen `bundle.familyActivities` oder bekannte `sourceId`s erweitern, falls die Referenzen verbindlich sein sollen (Runtime-/Tool-Change, später-PR oder v0.6 mit kleinem Compiler-PR).
- `[P2] content/explanations/foundations/*.json` → `diagnosticCodes` auf die `errorType`-Werte aus `graders.js` abbilden oder Dokumentation ergänzen, dass es sich um Erklärungs-Taxonomie handelt (Katalogklarheit, v0.6 machbar).
- `[P2] content/modules/*.json` → Bei leeren `projectIds`/`explanationIds` bleibt es bei P2: keine UI-Blockade, aber Navigationslücke. Eine sinnvolle Verdrahtung bedarf `src/ui/ModuleView.tsx`/`TrackView.tsx`-Recherche, bevor Inhalt geändert wird.

### B7 – Tracks und Milestones

B7/`inventar.json` wirft `c-meta-learning` vor, nur eine Definition zu besitzen. Runtime-Bundle zeigt 4 mastery-fähige Aktivitäten: `classify-error-hypothesis:base-vs-exponent-confusion`, `classify-error-hypothesis:seeded-error-pattern-cases`, `classify-error-hypothesis:error-journal-next-test` und `classify-test-attitude:csv-off-by-one-reproduce-smallest` (alle JS-only). `minimumDistinctDefinitions:2` ist erfüllt.

B7 verwechselt außerdem `diagnostic`/`guided-practice` aus dem Milestone-Schema (`schemas/milestone.schema.json:41`) mit Modul-Placement-Rollen. Im Modul-Schema (`schemas/learning-module.schema.json:62`) gibt es nur `curated` und `practice-space`. Ein diagnostiches Artefakt kann als `curated`-Placement mit `masteryEligible: false` oder als Lektions-Checkpoint umgesetzt werden.

Konkrete Gegenempfehlungen:

- `[P2] docs/content-review/raw/b7-tracks-milestones.md` → `c-meta-learning` P0 auf P2 herunterstufen; Coverage aus `competency-family-coverage.json` bzw. `bundle.familyActivities` berücksichtigen.
- `[P2] docs/authoring-guide.md` → Klärung, dass `diagnostic`/`guided-practice` Milestone-Artefakte sind, nicht `learning-module`-Placement-Rollen. Wenn ein Modul diese Rollen braucht, ist ein Schema-PR erforderlich (plan-only).
- `[P1] content/milestones/core.json` → Prüfung, ob alle in `coverage[].requiredArtifacts` genannten `lesson`/`evidence-families` tatsächlich im Katalog liegen und `releaseStatus !== 'local-only'` haben (Katalogkonsistenz, v0.6 machbar).

## Konflikte

| Konflikt | W2/E1/Quelle A | C1/Runtime/Quelle B | Auflösung für den Konsolidierer |
|---|---|---|---|
| Fehlende Familie / `caseMissing: true` | `inventar.json` und B1a/B1b/B3/B7 melden fehlende Fälle, weil keine `content/families/*.json` existiert. | Bundle enthält 131 `familyId`s, 24 davon JS-only. `validate_content.mjs` läuft durch. | Keine Runtime-Ghosts. Die Fälle sind public-first-Kataloglücken, nicht v0.6-Blocker, es sei denn der public-first-Vertrag wird hart durchgesetzt. |
| Mastery-Unterdeckung | B1a/B7 behaupten `c-meta-learning`, `c-python-basics`, `c-linalg-independence` unterschreiten `minimumDistinctDefinitions:2`. | `evidence_engine.mjs:36–44` zählt Cross-Tagging; Bundle zeigt 4, 10 bzw. 2 mastery-fähige Definitionen. | P0-Priorisierung sollte auf Bundle-Evidence zurückgestuft werden; ggf. R14-Policy-Frage. |
| Choice als Mastery | R14/Authoring-Guide: Choice-Fälle sind Bearbeitungsnachweis, nicht Mastery. | `family_registry.mjs:57` erlaubt Mastery für `single-choice` mit `masteryEligible: true`. | Policy-Gate: entweder Runtime an R14 anpassen oder R14 lockern. Für v0.6 kann man die Fälle manuell auf `masteryEligible: false` setzen. |
| Visualisierung passiv vs. fachlich falsch | E2/B1a/B4 kritisieren fehlende Transferfrage. | Einige Viz haben mathematische Fehler (C1/B4/B5). | Transferfragen sind plan-only (neuer Block/Typ). Mathefehler sind P0 und ohne Schemaänderung korrigierbar. |
| Projekte/Explanations in Modulen | B6 fordert Verdrahtung von `projectIds`/`explanationIds` in Modulen. | `learning_module.mjs` nutzt sie für Zeit/Binding, `indexLearningModules`/`src` indiziert sie nicht; Projects kommen über Milestones/Tracks. | Leere Felder sind kein P0; bewusste Verdrahtung braucht UI-Review. |
| `diagnostic`/`guided-practice` Rolle | B7 schlägt diese Placement-Rollen vor. | `learning-module.schema.json:62` kennt sie nicht; nur `milestone.schema.json:41` als Artefakt-Typen. | Es handelt sich um ein Missverständnis zwischen Milestone-Coverage und Modul-Rollen. Kein Schemafehler. |

## Machbarkeits-Gates

| Datei | Vorgeschlagene Änderung | Schema-/Runtime-Änderung nötig? | v0.6-feasible / plan-only / later-PR |
|---|---|---|---|
| `content/families/transform-linear-equation-isolate.json` | Klarstellung `contract: null` + Hinweis auf JS-Generator | Nein | v0.6 (Katalogkommentar) |
| `assets/js/core/foundations_choice_families.mjs` | `masteryEligible: false` für Choice-Fälle; Feedback-Regel korrigieren | Nein | v0.6 (JS-Content) |
| `assets/js/core/foundations_trace_families.mjs` | Kommentare für generated-only `caseId`s | Nein | v0.6 (Dokumentation) |
| `content/lessons/linear-algebra/two-lines.viz.json` | Korrektur der Geraden/Formeln | Nein | v0.6 (Content) |
| `content/lessons/linear-algebra/row-operation.viz.json` | Korrektur der Zeilenumformung | Nein | v0.6 (Content) |
| `content/lessons/research/chunk-overlap.viz.json` | Korrektur Chunk-Anzahl-Formel | Nein | v0.6 (Content) |
| `assets/js/core/deep_learning_generators.mjs:196` | Korrektur `1/p = p` im fullSolution | Nein | v0.6 (JS-Content) |
| `content/families/optimize-gradient-update-rule.json` | `head-only-finetune` Referenzsolver/Tests prüfen | Nein | v0.6 (Content) |
| `content/families/fit-weight-decay-ablation.json` | `train_decay`/`compare_decay` Prompt/Test/Ref-Alignment | Nein | v0.6 (Content) |
| `content/modules/lm-linalg-matrices.json:88` | `masteryEligible: false` für `product-definition-rationale` | Nein | v0.6 (Content) |
| `content/explanations/foundations/*.json` | `followUpActivityIds` auflösen oder entfernen | Ggf. `compile_content.mjs` | später-PR oder v0.6 (nur Katalog) |
| `content/explanations/foundations/*.json` | `diagnosticCodes` an `graders.js` anpassen | Nein | v0.6 (Katalog/Taxonomie) |
| `content/modules/*.json` | `projectIds`/`explanationIds` befüllen | UI-Review nötig | plan-only / später-PR |
| `schemas/lesson.schema.json` + `src/app/types.ts` + `LessonView.tsx` | `predict-then-verify-visualization` Blocktyp | Ja | plan-only |
| `schemas/learning-module.schema.json` | `diagnostic`/`guided-practice` als Placement-Rollen | Ja | plan-only |
| `schemas/exercise-family-cases.schema.json` | `expected.kind` pro `activityType` validieren | Ja | later-PR |
| `docs/authoring-guide.md` | Klärung public-first vs. JS-first | Nein | v0.6 (Dokumentation) |
| `docs/content-review/inventar.json` | `caseMissing` für generated Cases korrigieren | Nein | v0.6 (Inventar) |

## Offene Validierungen

1. **Public-first-Policy-Entscheidung:** Soll der v0.6-Build alle 131 Familien als `content/families/*.json` enthalten? Falls ja, müssen 24 reine JS-Familien (siehe B1b/B3-Listen) aus den Generatoren in statische JSON-Verträge migriert werden; das ist kein Content-Patch, sondern ein Architektur- und Review-PR.

2. **R14-Runtime-Alignierung:** Entweder `family_registry.mjs:57` muss `activityType: 'single-choice'` generell von Mastery ausschließen, oder der Authoring-Guide muss Choice-Mastery explizit erlauben. Ohne Entscheidung bleiben B1a/B7-"Choice-Mastery"-P1s politisch ungelöst.

3. **UI-Verbraucher für `projectIds`/`explanationIds`:** Es ist ungeklärt, ob `ModuleView`/`TrackView` diese Felder jemals rendern wird. Eine Befüllung im Content lohnt sich erst, wenn `src` sie konsumiert.

4. **Viz-Eingabe/Grader-PR:** `predict-then-verify` ist ein sinnvolles didaktisches Konzept, aber die Realisierung benötigt Schema, `src/app/types.ts`, `VisualizationBlock.tsx`, Grader und `graders.js`. Es sollte in v0.6 nicht implementiert werden.

5. **Validator-Erweiterung:** `followUpActivityIds` und ggf. `diagnosticCodes` sollten in `compile_content.mjs`/`validate_content.mjs` geprüft werden, wenn sie verbindlich sein sollen. Derzeit sind es stille Katalog-Felder.

6. **Reale fachliche P0s finalisieren:** Die mathematischen Fehler in `two-lines.viz.json`, `row-operation.viz.json`, `chunk-overlap.viz.json`, `deep_learning_generators.mjs:196` sowie in `head-only-finetune`/`fit-weight-decay-ablation` sollten von Fachexpert:innen mit den Referenzsolvern abgeglichen werden. Sie sind formal alle ohne Schemaänderung korrigierbar.

---

Validator-Status: `node tools/validate_content.mjs` meldete bei Erstellung dieses Berichts: `Content-Bundle: 46 Kompetenzen, 46 Lektionen, 253 Aktivitäten` (Erfolg). `node tools/build_coverage_matrix.mjs --check` meldete `Kompetenz-Familien-Coverage aktuell`.
