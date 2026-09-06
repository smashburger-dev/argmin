# Design 3: Competency-First — Evidenzanspruch als Familiengrundlage

Stand: 2026-09-02. Agent 3 von 4 (Design-it-Twice). Basis: S4A-v1-Matrix (268 Definitionen, 256 Familien, 268 Falltypen), `s4a-v2/inputs/*-v1.json`, `docs/streamlining-umbauplan.md`.

## Prämisse

Der Evidenzanspruch ist die Struktur. Eine Aufgabenfamilie existiert, um genau einen überprüfbaren Mastery-Spruch über genau eine Kompetenz zu erheben; wo die Familie im Lernpfad steht (LearningModule, S4B) und welcher Interaktionstyp gerendert wird, ist abgeleitet. Kompetenz und Lektion sind 1:1 (46/46), deshalb ist der Kompetenzbesitz zugleich die natürliche Lektionsverankerung. Lösungsweg und Interaktion sind Familienattribute zweiter Ordnung: sie unterscheiden Falltypen, nicht Familien.

Konsequenz, bewusst opinionated: Domänen und Wochen verschwinden vollständig aus der Familiengliederung. `c-numpy-basics` gehört den Familien, die NumPy primär evidenzieren — nicht den Data-ML-Wochen, die NumPy nur benutzen. Ein Kompromiss toward Interaktionsfamilien („alle numeric-Zählaufgaben in einer Familie") wird explizit abgelehnt: er erzeugt Familien ohne einzigen gemeinsam anspruchsbaren Mastery-Spruch und macht Modul-Coverage unrekonstruierbar.

## Gliederung

Vier Ebenen, eine Runtime-Ebene:

| Ebene | Objekt | Anzahl (Ziel) | Besitzt |
|---|---|---:|---|
| L0 | Track (Placement-Scope, seven domains) | 7 | nur Authoring-Reihenfolge, keine Familienidentität |
| L1 | Competency (46) = Evidence Owner | 46 | Familienliste, Lektionsverankerung, Mastery-Spruch |
| L2 | EvidenceFamily = Claim innerhalb einer Kompetenz | ~169 (Band 160–185) | Generator+Seed-Vertrag, Referenzsolver/Answer-Tests, Feedback-Grammatik, Invarianten |
| L3 | CaseType + difficultyProfile (zwei orthogonale Achsen) | 268 CaseTypes (alle erhalten) + 4 Profile | activityType, answerContract, Darstellung, legacyIds |
| L4 | ExerciseInstance (Runtime) | n/a | seed, definitionId, cycle |

Wichtigste Strukturentscheidungen:

1. **L1 ist der einzige Besitzer.** Eine Familie hat genau eine `evidenceCompetencyId`. Es gibt keine domänenbesessenen Familien.
2. **L2 ist der Claim, nicht die Kompetenz.** Kompetenzen mit heterogenen Ansprüchen (`c-capstone-pipeline`, `c-testing-debugging`) zerfallen in mehrere Claim-Familien; Kompetenz ist nicht automatisch Familie.
3. **`activityType` steht auf L3.** Dieselbe Mastery-Aussage als Choice, Numeric oder Parsons gerendert ist derselbe Claim mit anderen Falltypen — sofern derselbe Referenzsolver die korrekte Lösung berechnet.
4. **Schwierigkeit ist eine Achse, keine Familie.** Die v1-Leiter (pro Woche e1=d1 … e6=d4) kollabiert in eine Familie mit Profilen `basic-recall` (61), `core-application` (129), `advanced-transfer` (42), `final-boss-synthesis` (36).

### Datenbasis der Ableitung

Die Struktur ist aus der S4A-v1-Matrix gerechnet, nicht geraten:

- 146 der 268 Definitionen tragen mehr als eine Kompetenz. Deshalb ist M1/M2 der Kern der Taxonomie, nicht ein Randfall.
- Primärbestand je Kompetenz: Median 6, Maximum 30 (`c-capstone-pipeline`), Minimum 2. 27 Kompetenzen halten 5–7 primäre Definitionen — das ist die klassische Wochenscheibe mit fester Leiter e1 (choice, d1) → e2 (numeric, d2) → e3 (predict/trace, d2) → e4/e5 (python-code, d2–d3) → e6 (python-code, d4).
- Querkompetenzen nach Vorkommen überall: `c-numpy-basics` 32, `c-python-reading` 31, `c-python-functions` 24 — aber primär nur 3, 2 beziehungsweise 3 Definitionen. Der Unterschied ist genau die instrumental/primary-Differenzierung aus M2.
- Alle 268 v1-Falltypen sind bereits eindeutig (`distinct proposedCaseType = 268`), fallen also unverändert auf L3 durch.

## Mitgliedschaftsregeln

- **M1 Primary Claim.** Jede Definition erhebt genau einen primären Evidenzanspruch. Default ist `competencyIds[0]` (in `data-ml` durchgängig die Fachkompetenz der Woche; `c-numpy-basics` steht dort in 17 Vorkommen nie an erster Stelle), redaktionell geprüft gegen `learningObjective`. Die Zuweisung wird pro Eintrag im Familienindex dokumentiert.
- **M2 Instrumental Evidence.** Die übrigen 146-Definitionen betreffend: weitere Kompetenzen werden als `coEvidence: [{competencyId, level: "instrumental"}]` geführt, nie als Miteigentümer. Instrumentale Evidenz zählt für Frische (LearningPolicy, S3A), aber nicht für Mastery ohne eine primäre Prüfung.
- **M3 Claim-Identität fusioniert.** Zwei Definitionen kommen in dieselbe Familie, wenn gilt: (a) derselbe Mastery-Spruch in derselben Kompetenz, (b) derselbe Referenzsolver bzw. dieselbe Answer-Test-Menge die richtige Lösung berechnet, (c) kompatible answerContracts über die Falltypen. Erkennen vs. Konstruieren ist ein anderer Claim (`basic-recall`-Wissen über Freeze-Bestandteile ist nicht die Beherrschung der Freeze-Sequenz).
- **M4 Leiter-Kollaps.** Gleiches Claim-Paar über aufsteigende Schwierigkeit → eine Familie; Struktursprünge (eine Schicht / zwei Schichten / beliebige Tiefe) werden CaseTypes, nicht Familien.
- **M5 Jede Definition genau einmal, jeder Falltyp überlebt.** Alle 268 v1-Falltypen erscheinen als CaseType wieder. Kompression geschieht auf L2, nie durch Verlust von L3.
- **M6 Contract-Varianten.** Die sechs v1-Familien mit `familyContractVariants` (feste Legacy-Antworten plus geseedete Ziele) lösen sich auf: Der CaseType trägt seinen eigenen `answerContract`; die Familie verlangt, dass der Referenzsolver beide reproduziert.
- **M7 Keine Familie ohne autoritativen Grader.** Ein Claim ohne deterministischen Solver oder eindeutige Answer-Tests ist keine Familie.

### Randfälle mit Vorentscheidung

- **Manual-Rubrics** `w01-e11` und `w05-e9`: keine `evidenceCompetencyId`, keine Familie, kein Placement. Sie bleiben reine Bearbeitungsnachweise (M7) und damit außerhalb der Evidenzmaschine.
- **Numbas** `w05-e7`: bleibt `retire-blocked` unter allen S4A-Bedingungen; die drei Teilziele sind durch `w05-e1`, `w05-e5`, `w05-e6` primär evidenziert.
- **Merge-after-extraction** `w05-e11`, `w05-e12`, `w05-e13`, `w17-e2`, `w37-e1`: didaktischer Gehalt wird als CaseType in die Zielfamilie extrahiert, die Quell-ID lebt in `mergeMap` weiter.
- **short-rationale** (2 Definitionen): rationale-Text ist nicht deterministisch gradierbar. Der Claim wird, wo möglich, als konzept-CaseType mit eindeutigem Answer-Test geführt; die freie Begründung bleibt Journal-Feld ohne Evidenzwirkung.

### Ableitungsprozedur (für S4D-Sessions)

- **P1** Primary Claim festlegen: `competencyIds[0]` übernehmen, gegen `learningObjective` prüfen, Abweichung mit Begründung im Familienindex vermerken.
- **P2** Claim-Satz je Kompetenz schreiben: eine Zeile pro Familie — „Kann die lernende Person X" — als maschinenprüfbarer Mastery-Spruch. Zwei Definitionen mit identischem Satz sind Kandidaten für M3/M4; unterschiedliche Sätze blockieren Fusion unabhängig von activityType.
- **P3** Leiter zuordnen: gleicher Satz → dieselbe Familie, Strukturunterschied wird CaseType, `currentDifficulty` wird Profil.
- **P4** `coEvidence` für alle übrigen Kompetenzen vermerken; Familienfremde Kompetenzen erhalten keine Placement-Rechte.
- **P5** Contract-Test füttern: Solver-Äquivalenz über alle CaseTypes der Familie, Profilkante monoton, alle `legacyDefinitionIds` erreichbar.

### Worked Examples (reale IDs)

**Beispiel 1 — Leiter-Kollaps (`c-dl-tensors`, 6 Definitionen → 4 Familien).** `w18-e4` (d2, single-layer ValueError-Vertrag), `w18-e5` (d3, two-layer ReLU + Parameterzählung), `w18-e6` (d4, beliebige Tiefe) evidenzieren denselben Claim „Forward-Pass mit Dimensionsverträgen implementieren", alle `python-code`/pyodide mit `reference-solver`. Neue Familie `ef-dl-tensors-forward-contracts` mit CaseTypes `single-layer-contract` (legacy `w18-e4`, core-application), `two-layer-relu` (`w18-e5`, advanced-transfer), `arbitrary-depth-chain` (`w18-e6`, final-boss-synthesis). Getrennt bleiben `w18-e1` (Claim: Shape-Regeln erkennen), `w18-e2` (Parameter zählen), `w18-e3` (stdout vorhersagen) — drei eigene Familien unter derselben Kompetenz.

**Beispiel 2 — Kompetenz zerfällt in Claims (`c-testing-debugging`, 6 Definitionen → 5 Familien).** `w04-e2` + `f-branch-coverage-01` hatte v1 bereits als `foundations-branch-coverage-count` fusioniert (gleicher Claim, bestätigt M3). Dagegen bleiben `w04-e1` (Exception-Fluss vorhersagen), `w04-e3` (Regression-Tests autoren), `f-testing-choice-01` (nächsten Debug-Schritt wählen), `f-testing-parsons-01` (Teststruktur anordnen) vier getrennte Claim-Familien trotz teils gleicher activityType-Nachbarschaft. Analog `c-capstone-pipeline`: 30 Definitionen → ~10 Stufen-Claim-Familien (freeze, manifest, toposort, pins, timeouts, runner-Zustände, integration, verdict, scope, budget), jede mit eigener Leiter.

**Beispiel 3 — Primary vs. instrumental.** `w39-e6` (`[c-capstone-pipeline, c-research-capstone]`, hidden-tests-Verdict) gehört primär zur Claim-Familie `ef-capstone-pipeline-verdict`; `c-research-capstone` wird `coEvidence`. Spiegelbeeld `w07-e3` (`[c-eda-viz, c-numpy-basics]`): Die Definition gehört in die Claim-Familie der NumPy-Summary-Vorhersage unter `c-eda-viz` (v1: `data-ml-numpy-summary-output-prediction`) und würde nie eine `c-numpy-basics`-Familie bilden, weil NumPy dort nur Werkzeug ist.

## IDs & Persistenz

- **familyId-Schema:** `ef-<competency-slug>-<claim-slug>`, z. B. `ef-dl-tensors-forward-contracts`, `ef-testing-debugging-branch-coverage`. Kein Domänen-, kein Wochenpräfix. Familiennamen sind ein neuer Namespace und kollidieren nicht mit v1-`proposedFamilyId`s.
- **Historische IDs überleben auf L3.** Jeder CaseType trägt `legacyDefinitionIds`. Der Familienindex führt `byDefinitionId: { "w18-e5": { familyId, caseId, profile } }`. Migrationen in S4D minten keine neuen definitionIds für bestehende Inhalte — der gepinnte Case rendert unter seiner Legacy-ID.
- **Instance-Kontinuität:** `instantiate` setzt für gepinnte CaseTypes `instance.definitionId = legacyDefinitionId` (Attempts und `instanceId = definitionId:seed` bleiben lesbar, v3 wird nie still unlesbar). Nur genuinely neue generierte Instanzen minten `ef-<family>:<case>:<seed>`.
- **Merge/Retire-Maps:** die fünf `merge-after-extraction`-Definitionen (`w05-e11`, `w05-e12`, `w05-e13`, `w17-e2`, `w37-e1`) bekommen explizite `mergeMap`-Einträge auf CaseType-Ebene; `w05-e7` bleibt `retire-blocked` mit Alias-Anforderung aus S4A, unverändert.
- **Reviews:** `reviewQueue` bleibt an definitionId gebunden; der Familienindex macht familyId→definitionIds auflösbar, ohne den Scheduling-Key zu ändern.

## Feedback-Zielpfade

Familien besitzen die Feedback-Grammatik; pro-Definition-Regellisten verschwinden aus dem Content. Zielpfade für alle 348 nicht konsumierten Regeln (275 konsumierte laufen weiter über `assets/js/core/graders.js`):

| Quelle | Regeln | Zielpfad |
|---|---:|---|
| pyodide/python-code | 273 | `diagnosisRules` der Implementier-Familie: deterministische Prädikate auf strukturierten Runner-Ergebnissen (fehlgeschlagene Test-IDs, exitcode, stderr-Klasse, stdout-Diff), gebunden an die S4A-`errorPatterns`. `grade()` liefert `diagnosisCode`. Kein LLM, keine neuen Autoritätsquellen. |
| deterministic/predict-output | 51 | Grader-Prädikaterweiterung (element-weise Mismatch-Diagnose); Rest → `diagnosisRules` der Anwenden-Familie |
| deterministic/code-trace | 7 | `value:<var>`-Grammatik auf mehrere Variablen erweitern |
| deterministic/vector | 5 | answer-validation der Algebra-Familien oder `retire-after-extraction` |
| pyodide-sympy | 3 | answer-note auf dem algebraic-expression-Vertrag der Familie |
| deterministic/parsons | 2 | order-pair-Prädikate oder editoriale Diagnose |
| single-choice/numeric defekt | 7 | input-validation beziehungsweise editoriale Korrektur |

Unverbraucht pro Domäne: foundations 14, linear-algebra 13, data-ml 87, deep-learning 42, transformer-llm 49, genai-systems 44, research-capstone 99. Fallback-Parkbahn: jede Regel, der kein Prädikat zugeordnet werden kann, landet als `answerNote` am CaseType — sie bleibt sichtbar, geht aber nicht in `grade()` ein.

## Kompressionsschätzung

Mechanischer Floor (primary competency × Claim-Klasse über alle 268 Definitionen): 122. Realistische Schätzung nach M3/M4-Prüfung der Leitern (Floor unterschätzt heterogene Claims wie `c-testing-debugging`, `c-capstone-pipeline`; v1 mit 256 überschätzt, weil es die Leiter nicht kollabieren lässt):

| Domäne | Definitionen | v1-Familien | Floor | Ziel | Bemerkung |
|---|---:|---:|---:|---:|---|
| foundations | 49 | 44 | 20 | ~33 | 11 Kompetenzen; `c-testing-debugging` 5 Claims, `c-algebra-basics` 3–4 |
| linear-algebra | 26 | 21 | 12 | ~17 | v1 hat bereits fusioniert (matmul-entry ×3, elimination ×3); wenig Hebel |
| data-ml | 61 | 60 | 36 | ~41 | numpy/reading sind instrumental (M2), bleiben bei ihren primären Claims |
| deep-learning | 24 | 24 | 12 | ~16 | 4 Primärkompetenzen × 4 (Leiter-Kollaps e4–e6) |
| transformer-llm | 30 | 30 | 15 | ~19 | 5 Kompetenzen; e4/e5 fusionieren, e6 (Kopfzerlegung) eigener Claim |
| genai-systems | 24 | 24 | 12 | ~16 | 4 Kompetenzen × 4 |
| research-capstone | 54 | 53 | 15 | ~27 | `c-capstone-pipeline` 30 → ~10 Stufen-Familien; größter Einzelgewinn |
| **Gesamt** | **268** | **256** | **122** | **~169** | Band 160–185 |

Das sind ~34 Prozent weniger Familien als v1 bei vollständiger Erhaltung aller 268 Falltypen und aller 268 Quell-IDs. Die Kompression ist bewusst niedriger als das, was eine Interaktions-first-Taxonomie erreichen könnte: Die Prämisse kauft Platzierungs- und Coverage-Garantien, nicht maximale Familienreduktion. 27 der 46 Kompetenzen halten 5–7 primäre Definitionen (Median 6); sie tragen typischerweise 3–5 Claim-Familien. Die scheinbar großen Kompetenzen der v1-Tabelle (`c-numpy-basics` 32, `c-python-reading` 31, `c-python-functions` 24 Vorkommen) verlieren den größten Teil ihres Bestands an M2: ihre echten primären Bestände sind 3, 2 beziehungsweise 3 Definitionen.

### Mehrfach- und Split-Effekte auf die 46 Kompetenzen

Die 46 ist nicht der Familiennenner, sondern nur die Besitzerebene; zwei Effekte korrigieren die naive Erwartung „46 Kompetenzen ≈ 46 Familien" in entgegengesetzte Richtungen:

- **Mehrfach-Evidenz verkleinert.** 146 Definitionen tragen 2+ Kompetenzen, aber nur der Primary Claim erzeugt Familienzugehörigkeit. Sekundäre Kompetenzen erhalten null zusätzliche Familien. Effekt: `c-numpy-basics` behält von 32 Vorkommen 3 primäre, `c-python-reading` von 31 nur 2 — diese Kompetenzen werden im Zielbild schmal, aber ehrlich: ihre Beherrschung wird in `coEvidence` sichtbar, nicht durch Scheinfamilien in fremden Domänen.
- **Claim-Split vergrößert.** Heterogene Kompetenzen zerfallen: `c-capstone-pipeline` (30 primäre Definitionen) → ~10 Stufen-Familien, `c-testing-debugging` (6) → 5, `c-linalg-matrices` (10) → ~5 thematische Claims (Matmul-Eintrag, Elimination, Dot-Produkt, Unabhängigkeit-nah). Keine Kompetenz wird pauschal auf eine Familie gestutzt; der Claim-Satz ist das Maß.

Beide Effekte zusammen ergeben die ~169: rund 120 Familien aus den 34 homogenen Leiter-Kompetenzen plus rund 50 aus den Split-Kompetenzen, minus die instrumental gewordenen Querschnittsbestände.

## Golden-Path-Fit

**S4B (LearningModule).** Ein Modul deklariert Kompetenzen und Übungsplatzierungen:

```json
{ "familyId": "ef-dl-tensors-forward-contracts",
  "difficulty": "advanced-transfer", "caseId": "two-layer-relu", "count": 1 }
```

Auflöse-Kette: Modul beansprucht Kompetenz → Compiler prüft, dass mindestens eine Platzierung auf eine Familie mit `evidenceCompetencyId == claimedId` zeigt → Placement wählt CaseType und Profil → Dauer wird aus Lektions- und Placement-Gewichten abgeleitet. Weil Familie↔Kompetenz 1:n primary ist, bekommt S4B den Coverage-Prüfer gratis; der Compiler lehnt Lücken fail-closed ab. Genau das kann eine Interaktions-first-Gliederung strukturell nicht liefern, weil dort aus einer Platzierung nicht folgt, welche Kompetenz geprüft wird. Reverse-Indizes (definitionId→Modul) laufen über den Familienindex. Keine unscharfen Kompetenzschnittmengen — Mitgliedschaft liegt allein bei M1. Golden Path 1 (neues Kompetenzmodul aus Bestehendem) reduziert sich auf: zwei neue Autoring-Dateien (Modul-JSON plus Familien-Placement), keine zentrale Liste.

**S4C (ExerciseFamily).** Zielinterface passt ohne Erweiterung:

```ts
instantiate(familyId, seed, difficulty, caseId?): ExerciseInstance
grade(instance, answer): Promise<GradeResult>
```

`caseId` ist bei gepinnten Legacy-Cases verpflichtend und wählt activityType + answerContract; `difficulty` wählt das Profil innerhalb der vom CaseType erlaubten Menge. `GradeResult` erweitert sich um `evidenceCompetencyId` und `diagnosisCode` (Feedback-Zielpfade). Generator und Referenzsolver bleiben fachlich getrennte Implementierungen pro Familie („nicht blind verschmolzen"); die Registry führt einen Contract-Test, der M3/M4 prüft: gleicher Claim-Slug, Solver-Äquivalenz über alle CaseTypes, Profilkante monoton. Golden Path 2 (neue Familie, zwei echte Falltypen, mehrere Profile) ist der Normalfall dieses Modells — eine neue Familie ist genau ein neuer Claim unter einer bestehenden Kompetenz, am bewährten Muster `w18-e4`/`w18-e5`/`w18-e6`. Golden Path 3 (Synthese-Lektion als JSON plus Markdown) konsumiert nur Placement-Referenzen und verändert keine Familie.

## Risiken

1. **Primary-Zuweisung ist redaktionell.** 146 Mehrfachdefinitionen müssen einzeln geprüft werden; `competencyIds[0]` ist eine starke Voreinstellung, aber kein Beweis. Falsche Primärzuordnung bricht stille Modul-Coverage — aufgefangen durch den S4B-Coverage-Prüfer, aber erst nach S4B wirksam.
2. **Besitz vs. S4D-Sessionschritte.** Die Fachmigrationen S4D1–S4D7 sind domänengeschnitten, Familien sind kompetenzgeschnitten. `c-numpy-basics`- und `c-python-*`-Familien werden von mehreren Domänenmodulen platziert. Empfehlung an den Orchestrator: S4D-Sessions besitzen Platzierungen in ihren Modulen, eine benannte Session besitzt die quergelegten Kompetenzfamilien.
3. **Familienvertrag wird fetter.** activityType auf L3 heißt: eine Familie muss mehrere Renderings und answerContracts validieren. Guard: Cases pro Familie begrenzen (Regelwert 6) und gemeinsamen Referenzsolver erzwingen.
4. **Leiter-Kollaps kann echte Struktursprünge verwischen** (`w18-e5`→`w18-e6` ist eine Generalisierung, kein Parameterwechsel). Guard: CaseType-Property-Tests plus erhaltene `difficultyRationale` aus S4A als Review-Anker.
5. **Die 273 pyodide-Diagnoseregeln sind der lange Balken in S4C.** Ohne fertige Prädikate parken sie als `answerNote` — sichtbar, aber ohne `grade()`-Wirkung; Fortschritt muss getrennt gemessen werden.
6. **Geringere Kompression als konkurrierende Ansätze** (~169 vs. vermutlich deutlich weniger bei Interaktions-first). Bewusste Einbuße; der Gegenwert ist die Coverage-Ableitbarkeit und die S4B-Placement-Einfachheit.
7. **`ef-`-Namespace und v1-Slugs können kollidieren**, wo v1 bereits kompetenzähnliche Präfixe wählte. Der Migrations-Compiler muss die 256 v1-IDs als Alias-Tabelle führen, nicht als Verweis.
8. **Review denkt in definitionId, Module denken in familyId.** Der Bidirektional-Index (`byDefinitionId`, `byFamilyId`) muss vor S4E stehen, sonst verliert das Review-Scheduling bei Fusionen den Anschluss an historische Attempts.
