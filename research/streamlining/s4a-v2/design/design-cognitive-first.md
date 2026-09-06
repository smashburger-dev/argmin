# Design C: Cognitive-First — die Denkroute ist die Familie

Entwurf Architektur-Agent 1 von 4 (design-it-twice, S4A-v2). Stand: 2026-09-02.
Basis: `research/streamlining/s4a/summary.md` (v1: 268 Quellen -> 256 Familien), `research/streamlining/s4a-v2/inputs/*.json`, `docs/streamlining-umbauplan.md` (Abschnitte ExerciseFamily, Session S4C).

## Prämisse

V1 hat fast jede Quelle zur eigenen Familie erklärt, weil Kernlösungsweg, Activity-Interface, Answer-Vertrag, Darstellung und Transferanspruch *zusammen* passen mussten. Das ist die Ursache der Nicht-Kompression, nicht die Datenlage: dieselbe Denkroute (Residuen bilden, Gradient formeln, Update anwenden) taucht in W08, W19 und W25 auf; dieselbe Konfusionszählung in W11, W28, W29, W33, W34; dasselbe Skalarprodukt in fünf W05-Quellen plus einer geseedeten Zieldefinition. V1 spaltete sie, weil Grader und Aktivität differierten.

Cognitive-First dreht die Rangfolge um: **Familie ist die geteilte Lösungsprozedur mit ihrem Referenzmodell.** Aktivität, Grader, Woche und Domäne sind Projektions- und Platzierungseigenschaften, keine Familiengrenzen. Eine Familie kann als `numeric`, `predict-output`, `code-trace`, `single-choice` oder `python-code` *gerendert* werden; der Lösungskern bleibt gleich. Daraus folgt die Kompression: 268 Quellen auf grob 55–65 Familien (streng gezählt 64), nicht 256.

## Gliederung

Vier Ebenen, eine davon explizit entthront:

| Ebene | Eigentum | Beispiel |
|---|---|---|
| L1 Strang (`strand`) | Klasse der Denkoperation, Lösungsschritt-Vokabular, Muster für Property-Tests. Kein Code, kein Vertrag. 11 Stränge. | `formula-apply`, `aggregate-count`, `trace-state`, `classify-concept` |
| L2 Familie (`familyId`) | **Die Wiederverwendungseinheit.** Besitzt: Referenzmodell (formales Objekt + Invarianten), deterministischen Referenzsolver oder eindeutige Answer-Tests, Generator mit Seed-Vertrag, Diagnoseachsen (Fehlerklassen), Schwierigkeitsmodell, unterstützte Projektionen. | `formula-scalar-product`, `aggregate-confusion-metric` |
| L3 Falltyp (`caseTypeId`) | Parametrisierungsachsen der Instanz: Wertebereiche, Distraktorklassen, Instanzform, `frozenSeed` für historisch fixe Instanzen. | `entry-cij-seeded`, `vector3-mixed-signs` |
| Projektion (`projection`) | Bindung activityType + graderId + Answer-Vertrag-Schablone. Keine Ebene des Katalogs, sondern Attribut der Platzierung. | `numeric`, `predict-output`, `pyodide-python-code` |

Die Domäne (Foundations, Data-ML …) ist **keine** Taxonomieebene mehr. Sie wird zur Platzierungs- und Besitzeigenschaft der S4D-Sessions. 19 der 64 Familien liegen ohnehin domänenübergreifend (`aggregate-confusion-metric` in data-ml, genai-systems, research-capstone, transformer-llm); eine domänenstrukturierte Taxonomie könnte diese Teilung gar nicht ausdrücken.

Die elf Stränge aus den Inputs: `transform-terms` (Umformen), `trace-state` (Zustände tracen), `classify-concept` (Klassifizieren), `formula-apply` (Formel anwenden), `aggregate-count` (Aggregieren), `optimize-update` (Optimieren/Updaten), `validate-contract` (Validieren), `reproduce-hash` (Reproduzieren), `fit-model` (Fitten), `construct-program` (Konstruieren), `reflect-journal` (Reflektieren).

## Mitgliedschaftsregeln

Zwei Definitionen kommen in eine Familie, wenn **alle drei** Tests bestehen:

1. **Prozedurtest:** Die geordneten Denkschritte sind identisch. Praktischer Test: eine einzige Worked-Solution-Schablone mit Platzhaltern führt durch jede Mitgliederinstanz.
2. **Referenzmodelltest:** Ein deterministischer Solver derselben Klasse löst jedes Mitglied aus Falltyp-Parametern allein. Wenn der Solver eine Fallunterscheidung jenseits von Parametrisierung bräuchte, ist es keine Familie.
3. **Diagnosetest:** Die Fehlerklassen (Diagnoseachsen) sind deckungsgleich, sodass eine Feedback-Grammatik alle Mitglieder abdeckt.

Explizit **keine** Mitgliedschaftskriterien: `activityType`, `graderId`, `legacyWeekId`, Domäne, Promptsprache, fix versus geseedet, Schwierigkeit. Fixe Legacy-Instanzen sind Falltypen mit `frozenSeed` (Instantiierung ohne Seed-Parameter); das löst die sechs v1-`familyContractVariants`-Familien strukturell auf, statt sie als Varianten zu dokumentieren.

Getrennt bleiben müssen Definitionen, wenn Prozedur oder Referenzmodell differieren — auch bei gleicher Oberfläche. Beispiel: `transform-linear-equation-isolate` (w01-e1, w01-e8, f-algebra-both-sides-01, f-algebra-equivalence-01; skalare Äquivalenzumformung, eine Unbekannte, eine Lösung) versus `transform-system-2x2-elimination` (w05-e6, w05-e11, f-linalg-solve-system-01, f-linalg-column-vector-01, f-linalg-column-choice-01, f-linalg-final-boss-01; Eliminationsstrategie, Rückeinsetzen, Lösungs**paar**, andere Fehlerklasse: Eliminationswahl statt Vorzeichen). Gleicher Strang, verschiedene Familie. Umgekehrt bleibt v1s Trennung `linear-algebra-matmul-entry-row-column` vs. `linear-algebra-dot-product-component-sum` aufgehoben: Matrixeintrag und Vektorskalarprodukt sind dieselbe Prozedur auf demselben Referenzmodell (paarweise komponentenweise Produkte, dann Summe).

Einzelfamilien sind erlaubt und bei `classify-concept` häufig (27 Einzelfamilien strenger Zählung). Das ist kein Taxonomiefehler, sondern eine Platzierungslücke: die Prozedur „Beobachtung einem Konzeptsystem zuordnen" ist geteilt, aber das Referenzmodell ist das jeweilige Konzeptsystem (Git-Operationen, Missingness-Mechanismen, Angriffsfläche), und deshalb sind es eigene Familien. Die Lücke zeigt S4C, wo Geschwister-Generatoren fehlen.

## IDs & Persistenz

- `familyId` ist ein neuer Namensraum (`<strand>-<name>`, z. B. `aggregate-confusion-metric`). Historische Definitions-IDs werden **nie** zu Familien-IDs und nie umbenannt.
- Jede der 268 Quellen wird eine Platzierung: `placement = { placementId: sourceId, familyId, caseTypeId, projection, frozenSeed?, lessonIds, competencyIds, difficultyProfile }`. Kompetenzen hängen an der Platzierung, nicht an der Familie — eine Familie bedient sonst unvereinbar viele Kompetenzen mehrerer Domänen.
- `familyPlacementMap` (Generation 1 Artefakt) bildet jeden sourceId vollständig ab; 262 `preserve-id` bleiben unverändert lesbar. Attempts und Evidenz in IndexedDB v3 bleiben über `placementId` ansprechbar; `instance.meta.legacyPlacementId` verknüpft neue Instanzen rückwärts.
- Die fünf `merge-after-extraction`-Quellen (w05-e11, w05-e12, w05-e13, w17-e2, w37-e1) erhalten explizite `mergeMap`-Einträge auf Zielfamilien (hier: `transform-system-2x2-elimination`, `formula-scalar-product`, `formula-ratio-percent-metric`), bevor irgendeine Quelle still fällt.
- w05-e7 (`retire-blocked`) überlebt als Platzierung `reflect-guided-sequence` mit Alias für historische Attempts; die vier Freigabebedingungen aus S4A bleiben unangetastet.
- S4C-Golden-Path-Familie wird neu vergeben, nicht aus einer historischen ID abgeleitet.

## Feedback-Zielpfade

Die Familie besitzt die `feedbackGrammar` als geordnete Diagnoseachsen (z. B. `formula-scalar-product`: `product-sign-error`, `component-missed`, `row-column-swap`, `partial-sum-stopped-early`). Jede der 623 Regeln aus dem S4A-Inventar bekommt bei der Extraktion genau einen Zielpfad:

| Regelbild | Zielpfad | Umfang (aus S4A) |
|---|---|---|
| Konsumierbare geschlossene Formen (`value === n`, `choice !== x`, `value:x+value:z`, `order-length-mismatch`, `element-count-mismatch`) | `graderPredicate` an der Familien-Grade-Stufe, Diagnoseachse als Key | 275 Vorkommen |
| Nachricht benennt Fehlerursache zu einer beobachtbaren Antwort | `answerNote` auf Diagnoseachse (post-grade) plus `hintLadder`-Sprosse (generisch, seed-unabhängig) | Großteil der 273 python-code-Regeln und der 72 off-grammar deterministischen |
| Nachricht beschreibt Lösungsschrittfolge | `workedSolution` aus der Familien-Worked-Solution-Schablone | Restgruppe derselben 345 |
| Nachricht erklärt, warum Distraktor X falsch ist | `editorialDiagnosis` an der Klassifizierungs-Familie | überwiegend single-choice-Restmengen |
| Bedingung prüft Eingabeform vor Wert | `inputValidation` (pre-grade-Guard) | kleine Restgruppe |
| Kein Bezug zu Diagnoseachse, Referenz oder Distraktor | `retireAfterExtraction` mit Begründung im Extraktionsprotokoll | Einzelfälle, menschlich zu prüfen |

Kein Pfad führt zu einem LLM. `pyodide` bleibt auf die `pyodide-python-code`-Projektion beschränkt; der Familiensolver kreuzprüft weiterhin unabhängig.

## Kompressionsschätzung

Methode: manuelle Zuordnung aller 268 Quellen nach Lesen der `preservedDidacticContent.solutionPath`-, `solverContract`- und `answerContract`-Felder der sieben v2-Input-Shards; Strang- und Familiengrenzen nach den drei Mitgliedschaftstests. Strenges Ergebnis: 64 Familien, 11 Stränge, 0 nicht zugeordnete Quellen, 19 Familien domänenübergreifend.

| Domäne | Quellen | Familien (strikt) | Begründung |
|---|---:|---:|---|
| Foundations | 49 | 17 | `trace-state` verschmilzt vier v1-Familien (predict-output, code-trace, parsons); `classify-concept` spaltet in 8 konzeptsystem-Familien; Gleichungs-/Termumformung trennt zwei Familien. |
| Lineare Algebra | 26 | 8 | Stärkster Effekt: matmul-entry + dot-product + Loop + seeded + Rationale in `formula-scalar-product`; 2×2-Systeme aus W05 und f-linalg in einer Familie. |
| Data und ML | 61 | 22 | W08/w19-Gradientenkern in `optimize-gradient-update`; `seeded-split-repro` sammelt W09/W12/W17; viele Einzel-Konzeptklassifikationen bleiben Einzelfamilien. |
| Deep Learning | 24 | 11 | W19 komplett eine Familie; Shape-/Broadcast-Verträge in `validate-shape-contract` gemeinsam mit W05 und W18. |
| Transformer und LLM | 30 | 14 | `optimize-softmax-attention` (W22 plus w21-e4, w24-e5), `decode-loop`-Familie über W23/W24; W26-Metrikdifferenzen gehen an `formula-ratio-percent-metric` und `aggregate-confusion-metric`. |
| GenAI-Systeme | 24 | 10 | W28/W29-Konfusions- und Regelklassifikation teilen Familien mit data-ml und research; TF-IDF/Kosinus in `aggregate-retrieval-ranking`. |
| Research und Capstone | 54 | 17 | Drei große Familien tragen den Shard: `validate-required-fields` (13), `aggregate-confusion-metric`, `reproduce-pipeline-status` (9), `reproduce-seeded-split` (11). |
| **Global** | **268** | **64 strikt / ~55 konsolidiert** | Kompression ≈ 4,2× strikt; 27 Einzelfamilien, überwiegend `classify-concept`. |

Konsolidierung auf ~55 entstünde, wenn Klassifizierungs-Einzel familien mit benachbartem Konzeptsystem zusammengelegt werden (z. B. `classify-freeze-scope` bereits w35-e1 + w37-e1). Ich empfehle die strikte Zählung als Planbasis; Konsolidierung ist S4B-Verhandlungssache, keine Designannahme.

### Familieninventar (streng, vollständig)

Größe je Familie; Domänen hinter Semikolon bei domänenübergreifenden Familien (found = Foundations, linalg, dml = Data-ML, dl, tf = Transformer-LLM, genai, cap = Research-Capstone):

- **transform-terms** (4): `linear-equation-isolate` (4), `expression-simplify-canonical` (7; found+linalg), `system-2x2-elimination` (6), `rank-dependence-rowops` (4).
- **trace-state** (4): `assignment-state-trace` (14; found+linalg+dml+dl+cap), `call-composition-trace` (2), `exception-path-trace` (3; found+cap), `collection-state-trace` (1).
- **formula-apply** (4): `scalar-product` (7), `ratio-percent-metric` (13; dml+tf+genai+cap), `count-from-construction` (5; dl+tf), `stat-from-table` (8).
- **aggregate-count** (4): `accumulator-count` (12; found+dml+dl+tf+cap), `validate-and-count-records` (4; dml+found), `confusion-metric` (20; dml+tf+genai+cap), `retrieval-ranking-metric` (5).
- **optimize-update** (3): `gradient-update-rule` (14; dml+dl+tf), `softmax-attention-mask` (7; dl+tf), `decode-greedy-loop` (11; tf+genai+cap).
- **validate-contract** (4): `shape-contract-validate` (12; linalg+dml+dl+tf), `required-field-validate-raise` (13; dml+tf+cap), `text-normalize-match` (5; dml+genai+cap), `test-design-coverage` (4).
- **reproduce-hash** (3): `canonical-hash-verify` (6), `pipeline-status-report` (9; cap+genai), `seeded-split-repro` (11; dml+dl+cap).
- **fit-model** (1): `fit-predict-metrics` (9; dml+dl).
- **construct-program** (1): `guarded-loop-construct` (4).
- **reflect-journal** (1): `error-journal-rationale` (2; found+linalg).
- **classify-concept** (35): `classify-git-operation` (4), `classify-control-construct` (2), `classify-error-hypothesis` (2), `classify-cv-leakage` (2), `classify-error-drift` (2), `classify-regularizer-effect` (2), `classify-unsupervised-method` (2), `classify-freeze-scope` (2), `classify-evidence-vs-demo` (2) sowie 26 Einzelfamilien: `classify-missingness` (w06-e1), `classify-confounding` (w07-e1), `classify-task-type` (w09-e1), `classify-sigmoid-regime` (w11-e1), `classify-ensemble-effect` (w15-e1), `classify-repro-contract` (w17-e1), `classify-matrix-shape` (w05-e2), `classify-tensor-broadcast` (w18-e1), `classify-training-curve` (w20-e1), `classify-dropout-regime` (w21-e1), `classify-attention-roles` (w22-e1), `classify-subword-principle` (w23-e1), `classify-decoding-strategy` (w24-e1), `classify-lora-tradeoff` (w25-e1), `classify-benchmark-reading` (w26-e1), `classify-rag-stage` (w27-e1), `classify-eval-hazard` (w28-e1), `classify-attack-surface` (w29-e1), `classify-tool-policy` (w30-e1), `classify-question-quality` (w31-e1), `classify-provenance-duty` (w32-e1), `classify-fairness-aggregation` (w33-e1), `classify-hash-semantics` (w34-e1), `classify-python-collection-choice` (f-collections-choice-01), `classify-exception-placement` (f-files-choice-01), `classify-test-attitude` (f-testing-choice-01).

Summe: 268 Quellen, 64 Familien, 0 Rest. Dieses Inventar ist die Prüfgröße für S4B: jede Abweichung von dieser Karte ist eine dokumentierte Grenzentscheidung, keine stillschweigende.

## Verbraucher: was S4B und S4C aus dieser Taxonomie ziehen

- **S4B (Lektionen und Platzierungen)** konsumiert Platzierungen, keine Familien allein: eine Lektion referenziert `(familyId, caseTypeId, projection, difficultyProfile)` und behält `lessonIds`/`competencyIds` an der Platzierung. Beim Autoring neuer Aufgaben wählt S4B zuerst Strang und Familie, dann Falltyp und Projektion — die Falltypliste einer Familie ist die Erweiterungsstelle für Variation, nicht der Prompt.
- **S4C (Generatoren und Solver)** konsumiert pro Familie genau ein Generator-/Solverpaar mit Seed-Vertrag plus eine Invariantenmenge. Existierende Generatoren bleiben verwertbar: `genMatmulEntryFresh`, `dotProduct`, `genPythonStateTrace`, `genConfusionCount`, `genF1orPrecision`, `genLinearEquation` sind bereits Familienvariatoren und werden heimatlos in ihren Familien platziert, statt neu geschrieben zu werden. Die Generator-Baseline ändert sich nur durch explizite Diff-Freigabe (S4C-Gate).
- **S4D (Fachmigrationen)** konsumieren die `familyPlacementMap` domänengefiltert; jede Session bearbeitet die Platzierungen ihrer Domäne und lässt Familiendefinitionen unangetastet (Besitzkonflikt siehe Risiko 2).
- **Die Feedback-Extraktion** konsumiert die Diagnoseachsen als Zielnamesraum für alle 623 Regeln (Tabelle oben).

## Golden-Path-Fit (S4C)

```ts
instantiate(familyId, seed, difficulty, caseId?): ExerciseInstance
grade(instance, answer): Promise<GradeResult>
```

- `instantiate` läuft dreistufig: Familien-Generator erzeugt Instanzdaten aus Seed und Falltyp; Schwierigkeitsmodell der Familie wählt die Parameterhülle (`basic-recall` bis `final-boss-synthesis` sind Familienachsen, keine Darstellungstricks); die Platzierung wählt die Projektion und rendert Prompt/Eingabeform. `frozenSeed`-Falltypen instantiieren ohne Seed deterministisch.
- `grade` ist immer deterministisch: Familiensolver oder Answer-Test entscheidet; die Projektion liefert nur den Vergleichsmodus (exakter Integer, zeilenweise stdout-Normalisierung, Paar-Vergleich inklusive Swap-Erkennung, Pyodide-Testbündel). Der Solver bleibt unabhängig vom Generator (Kreuzprüfungspflicht aus S4C).
- Invarianten der Familie werden Property-Tests: Generator gegen Solver über viele Seeds, `frozenSeed`-Instanzen gegen historische `expectedAnswer`-Werte, Diagnoseachsen gegen jede mindestens einmal getriggerte Fehlerklasse.
- S4B platziert `(familyId, caseTypeId, projection, difficultyProfile)` in Lektionen und LearningModules; Kompetenzen und Lektionszuordnung bleiben Platzierungseigenschaften und damit S4D-kompatibel.
- Abnahme: Golden Path 2 mit `formula-scalar-product` (zwei echte Falltypen, mehrere Schwierigkeitsprofile, drei Projektionen) ist mit existierenden Generatoren (z. B. `genMatmulEntryFresh`, `dotProduct`) ohne neue Mathematik machbar.

## Risiken

1. **Strang `classify-concept` dominiert die Einzelfamilien** (27 von 64). Ohne Referenzmodell-Disziplin wird er zum Abstellplatz. Gegenmittel: Konzeptsystem-Regel ist Pflichtgate in S4B.
2. **Domänenübergreifende Familien (19) kollidieren mit dem S4D-Sessionsbesitz** (S4D1–S4D7 je Domäne). Vorschlag: Familien gehören dem Strang-Eigentümer (Orchestrator), S4D-Sessions besitzen nur Platzierungen. Muss vom Orchestrator entschieden werden.
3. **Projektionen verwischen Grader-Strenge.** Dieselbe Familie als `numeric` (deterministisch exakt) und `pyodide-python-code` (Testbündel) hat unterschiedliche Fail-Closed-Semantik; die Projektionsverträge müssen getrennt getestet bleiben.
4. **Schwierigkeitsmodell driftet zur Darstellung.** Weil Darstellung keine Familiengrenze mehr ist, muss das Schwierigkeitsmodell prozedural definiert sein (Stufenzahl, Vorzeichenmix, Distraktordichte), sonst wird Schwierigkeit ein zufälliger Nebeneffekt der Projektion.
5. **Grenzfälle sind Verhandlungssachen:** `formula-ratio-percent-metric` vs. `aggregate-confusion-metric` überlappen bei w26-e4, w33-e2, w34-e2 (beide Tests bestehen teils). Meine Zuordnung ist eine Designschätzung aus Lösungswegtexten, keine Code-Autopsie; Einzelfälle kann S4B mit Solver-Inspektion anders legen.
6. **Menschliche Reviewpflichten (57) bleiben** und wandern mit den Platzierungen; die beiden hohen Unsicherheiten (w37-e1-Merge, w05-e7-Retire) werden von diesem Design nicht vorab entschieden.

## Drei worked examples

**1. `formula-scalar-product` (Strang `formula-apply`, 7 Quellen).** Mitglieder: w05-e1 (numeric, fix, `referenceSolvers.matmulEntry`), w05-e3 und w05-e13 (numeric, `referenceSolvers.dotProduct`), w05-e12 (numeric, fix), w05-e16 (predict-output, Zeile-mal-Spalte im Loop), f-linalg-matmul-entry-01 (numeric, geseedet, `genMatmulEntryFresh`, Schwierigkeit 2), w05-e9 (short-rationale, Begründungsprojektion). Referenzmodell: zwei gleichlange Ganzzahlvektoren; Solver: komponentenweise Produkte summieren; Invariante: Operandenreihenfolge irrelevant. Diagnoseachsen: `product-sign-error`, `component-missed`, `row-column-swap`, `partial-sum-stopped-early`. Projektionen: numeric, predict-output, short-rationale. Falltypen: `entry-cij-fixed` (frozenSeed), `entry-cij-seeded`, `vector3-mixed-signs`, `loop-entry-accumulation`. V1 brauchte dafür zwei Familien plus eine Rationale-Ausnahme; die Feedback-Regeln von w05-e1/w05-e3 (je 2, fully-consumed) werden `graderPredicate` auf genau diesen Achsen.

**2. `aggregate-confusion-metric` (Strang `aggregate-count`, 20 Quellen, 4 Domänen).** Mitglieder ua. w11-e2 (numeric, geseedet `genConfusionCount`), w11-e4/w11-e5 (python-code), w28-e2 (numeric, `genF1orPrecision`, Precision in Prozent), w29-e4/w29-e5/w29-e6 (Regelklassifikation + f1, pyodide), w33-e4/w33-e5 (Gruppen-FPR-Differenz, pyodide), w34-e3/w34-e5 (bereinigte vs. naive Quote), w37-e5, w13-e4, w28-e3, w28-e6, w30-e2, w11-e3, w33-e6, w26-e4. Referenzmodell: Zählobjekt `{tp, fp, fn, tn}` plus Metrikselektor; Solver: geschlossene Metrikformel mit Nullteilerschutz. Diagnoseachsen: `wrong-denominator`, `direction-confusion`, `percent-rounding`, `zero-division-assumed`. Falltypen: `count-from-matrix`, `metric-direction-seeded`, `rule-classify-then-count`, `group-difference`, `cleaned-vs-naive`. Der existierende Generator `genF1orPrecision` ist bereits ein Familienvariator (variiert metrische Richtung) — Beleg, dass der Content die Familiengrenze schon andeutet. Die 273 nicht konsumierten Python-Regeln aus genau diesen Wochen finden hier ihre `answerNote`/`hintLadder`-Heimat.

**3. `trace-assignment-state` (Strang `trace-state`, 14 Quellen, 5 Domänen).** Mitglieder: w01-e3 (predict-output), w01-e4 (code-trace, `value:x+value:z`-Prädikat existiert), w01-e6, w01-e7 (parsons, Temp-Swap), w02-e1 (Slices), f-python-state-trace-01 (predict-output, geseedet `genPythonStateTrace` chain3), f-code-reading-output-01, w05-e15, w17-e3 (Generatorzustand Fortsetzung vs. Neustart), w20-e3, w21-e3, w15-e3, w31-e3, w32-e3. Referenzmodell: Umgebungstabelle plus stdout-Puffer; Solver: mini-Interpreter, der Zuweisungen in Ordnung auswertet (RHS liest alten Zustand) — existiert faktisch in den Predict-Generatoren. Diagnoseachsen: `reads-new-value`, `overwrite-forgotten`, `print-order`, `state-object-confusion`. Falltypen: `chain3-overwrite`, `three-variable-chain`, `rng-continuation-vs-reset`, `slice-reassignment`. Zeigt den Kern des Designs: v1 verteilte diese Quellen auf mindestens sechs Familien über fünf Domänen, weil Aktivität und Grader differieren; die Denkroute ist eine.
