# Design 2: Interaction-First — Interaktionsprotokoll als Primärstruktur der Aufgabenfamilien

Agent: Architektur-Agent 2 von 4 (design-it-twice). Stand: 2026-09-02.
Prämisse: Nicht der Fachinhalt strukturiert die Familien, sondern das Interaktionsprotokoll — Antwortform, Grader-Maschinerie und Feedback-Grammatik. Fachlichkeit ist eine Case-Dimension, keine Strukturdimension.

## These

S4A-v1 hat 268 Definitionen in 256 Familien gelegt und damit fast nichts komprimiert. Der Grund: v1 schneidet Familien entlang des Lösungswegs, also entlang der Fachlichkeit. Das ist die falsche Achse für die Maschinerie. Die tatsächliche Wiederverwendung im Produkt liegt woanders: `gradeNumeric` vergleicht ein Skalarprodukt (w05-e3) exakt so wie Maskenzellen (w22-e2) und LoRA-Parameter (w25-e2) — ganzzahliger Vergleich, `value === <n>`-Diagnose, Seed-Vertrag. Drei Domänen, ein Protokoll. Gleiches gilt für 60 Single-Choice-Aufgaben, 95 Pyodide-Code-Aufgaben und 35 Predict-Output-Aufgaben. Das Interaction-First-Modell macht diese Protokoll-Gleichheit zur Primärstruktur: wenige Familien mit hartem Vertrag, Fachlichkeit als Case-Daten darunter. Die 268 Definitionen werden zu 10 Familienverträgen plus etwa 240 Case-Datensätzen plus eingefrorenen Seeds.

Nebeneffekt mit eigenem Wert: Die Feedback-Grammatik, heute fünf closed forms in `assets/js/core/graders.js`, wird pro Interaktionsklasse genau einmal definiert. Damit bekommt jedes der 623 Regelvorkommen einen erzwungenen Zielpfad, statt dass 348 Regeln weiter unkonsumiert neben der Maschinerie liegen.

## Gliederung

Vier Ebenen. Die oberste ist Code, die mittleren sind Vertrag plus Daten, die unterste ist Laufzeit.

### Ebene 0: `interactionClass` — Antwortform x Grader-Maschinerie

Neun Klassen plus ein expliziter Retire-Fall. Eine Klasse ist genau ein Runtime-Modul: Eingabe-UI-Vertrag, `grade`-Pipeline, geschlossene Feedback-Grammatik, Eingabevalidierung. Sie ersetzt die heutigen closed forms in `graders.js` durch benannte, testbare Verträge.

| classId | heute (activityType/graderId) | Bestand |
|---|---|---:|
| `numeric-exact` | numeric/deterministic | 50 |
| `choice-diagnose` | single-choice/deterministic | 60 |
| `code-test` | python-code/pyodide | 95 |
| `output-predict-lines` | predict-output/deterministic | 35 |
| `state-trace-vars` | code-trace/deterministic | 11 |
| `program-ordering` | parsons/deterministic | 7 |
| `tuple-exact` | vector/deterministic | 4 |
| `expression-equivalence` | algebraic-expression/pyodide-sympy | 3 |
| `rationale-note` | short-rationale/manual-rubric | 2 |
| — (kein Klassenziel) | numbas-exam/numbas | 1, retire-after-approval |

`code-test` trägt ein Feld `packageProfile: pure | numpy` (heute 46 reine gegen 49 NumPy-lastige Verträge), weil das die Pyodide-Allowlist und damit den Sicherheitsvertrag betrifft — Maschinen-, nicht Fachunterschied.

### Ebene 1: `ExerciseFamily` — der S4C-Vertrag

Zehn Familien, identisch zu den Klassen, außer `code-test` mit zwei Profilen (`code-test-pure`, `code-test-numpy`). Die Familie besitzt:

- `familyId`, `interactionClass`, `answerContract` (Eingabeform, Vergleichssemantik, Toleranz),
- `answerAuthority`-Präzedenz: `referenceSolver > seedGenerator > staticExpected`; jeder caseType deklariert genau eine Autorität,
- Seed- und Determinismusvertrag plus Instance-Key-Regel,
- `feedbackGrammar`: die geschlossene Prädikatenmenge, die der Grader dieser Familie auswertet,
- Schwierigkeitssemantik (`basic-recall` bis `final-boss-synthesis`) als Skala pro Familie,
- Invarianten und Property-Tests (Vertragsebene, fachunspezifisch).

Vertragssketch, den S4C konsumiert:

```ts
interface ExerciseFamily {
  familyId: string;                      // "fam/numeric-exact"
  interactionClass: InteractionClassId;
  answerContract: AnswerContract;        // input shape, comparison, tolerance
  answerAuthority: 'referenceSolver' | 'seedGenerator' | 'staticExpected';
  feedbackGrammar: Predicate[];          // closed set, grader evaluates only these
  caseTypes: Map<CaseId, CaseType>;      // fachliche Daten, kein Code pro Fach
  difficultyScale: DifficultyProfile[];  // basic-recall .. final-boss-synthesis
}
instantiate(familyId, seed, difficulty, caseId?): ExerciseInstance
grade(instance, answer): Promise<GradeResult>
```

### Ebene 2: `caseType` — Fachlichkeit als Daten

Ein caseType ist Lösungsweg plus Darstellung plus Fehlermodell eines Fachinhalts in einer Familie. Er besitzt Generator- oder Solver-Implementierung (die heutigen 51 Generator-IDs bleiben eigene Implementierungen, registriert am caseType — genau das, was der Umbauplan unter „fachlich unterschiedliche Generatoren dürfen getrennte Implementierungen behalten" verlangt), Payload-Schema, Musterlösung und fachliche Diagnoseeinträge. CaseTypes kreuzen keine Domänengrenze.

### Ebene 3: Instanz

`(familyId, caseId, seed, difficulty)` — on-demand generiert oder als historischer Seed eingefroren. Alte statische Aufgaben sind eingefrorene Seeds, keine eigenen Definitionen mehr.

## Mitgliedschaftsregeln

1. Die Klasse folgt allein aus `activityType` und `graderId` der Quelldefinition. Keine fachliche Erwägung. Die 268 Quellen Mapping ist damit mechanisch prüfbar: 50+60+95+35+11+7+4+3+2+1.
2. Zwei Definitionen gehören zum selben caseType gdw. gleiche Klasse, gleiche Domäne, gleicher Kernlösungsweg und gleiche Darstellung. Andere Zahlen, Seeds, Schwierigkeitsstufen und deklarierte „Übungsvarianten" sind Instanzdimensionen, keine eigenen caseTypes (w05-e13 ist w05-e3 als Seed, nicht als Typ).
3. Der Wechsel der `answerAuthority` (statisch → Generator) ist Autoritätsmigration innerhalb des caseType, kein Familiengrenzgrund. Genau das löst die sechs `familyContractVariants` aus S4A-v1 auf.
4. Ein neuer Familieintrag entsteht nur durch neue Interaktion: neue Antwortform, neue Vergleichssemantik oder neue Grader-Maschinerie. Neuer Fachinhalt erzeugt niemals eine neue Familie.
5. `rationale-note` bleibt ausdrücklich nicht-autoritativ: kein Mastery, kein Review-Fortschritt, nur Bearbeitungsnachweis ( Vertrag wie heute w01-e11, w05-e9).
6. Numbas (`w05-e7`) wird keine Klasse. Seine drei Teilziele werden auf `numeric-exact` (via w05-e1), `expression-equivalence` (w05-e5) und `tuple-exact` (w05-e6) abgebildet; die lokale Score-Semantik wird dokumentiert und retitiert.

## IDs und Persistenz

- Familien und caseTypes bekommen einen neuen Namensraum (`fam/numeric-exact`, `case/linalg-dot-product`). Historische Quell-IDs sterben nicht: Die S4A-Matrix wird zur Buildzeit zu `legacy-instance-map.json` kompiliert: `definitionId -> { familyId, caseId, frozenSeed, difficulty }`. v3-Attempts bleiben über ihre gespeicherten `definitionId`s lesbar, der Lookup läuft über die Karte. Keine IndexedDB-Migration, keine Umbenennung gespeicherter Attempts.
- Neue Attempts nutzen den kanonischen Instance-Key `familyId/caseId/seed` — eine Regel, wie S3A sie verlangt. Die Karte ist damit auch der Alias-Mechanismus.
- Die fünf Merge-Kandidaten (`w05-e11`, `w05-e12`, `w05-e13`, `w17-e2`, `w37-e1`) erhalten `mergeMap`-Einträge auf ihre Zielfamilieninstanz nach Extraktion. `w05-e7` erhält einen Lese-Alias für historische Attempts. Beides ist genau der Status, den S4A als `merge-map-required` und `retire-blocked` fixiert hat — dieses Design zieht ihn nicht vor, sondern liefert den Zielcontainer dafür.

## Feedback-Zielpfade

Die Familie erzwingt für jedes Regelvorkommen genau einen von sieben Pfaden; die Grammatik ist geschlossen, kein Fuzzy-Matching, kein LLM:

1. **Grader-Prädikat**: Bedingung kompiliert in die Familiengrammatik. Numeric: `value === n` (heute 109 konsumierte bleiben), neu auch `value > expected`, `sign-flip`, `off-by-one` als typisierte Prädikate. Tuple: `pair-swapped` (heute in `gradePair` hartkodiert — wird formalisiert) und `pair-noninteger`. Predict-Output: `element-count-mismatch` plus neu `lines-diff@k` mit Zeilenindex (nimmt die 51 unkonsumierten output-lines-Regeln auf).
2. **checkId-Diagnose für `code-test`**: Der Hebel für die 273 unkonsumierten Pyodide-Regeln. Benannte `__check`-Tests der 95 Code-Aufgaben schlagen unter stabilen IDs fehl; die Familie mappt `checkId -> (Diagnose, Hindsight)`. Damit bekommen z. B. w23-e4s Regeln zu eos-per-word, trailing-space und special-token-accepted erstmals einen echten Konsumenten: den fehlgeschlagenen Check selbst.
3. **Answer-Note**: Nicht als Prädikat erreichbare Nahbereichs-Hinweise wandern in die Antwortkarte neben die Musterlösung.
4. **Input-Validierung**: Formatregeln (ganzzahliges Paar, Marker-Syntax) werden Vorab-Prüfung der Eingabe statt nachträgliche Diagnose.
5. **Generische Hinweisleiter**: konzeptionelle Hinweise als Hint-Stufen 1–2, solution-disqualifying wie heute.
6. **Editoriale Diagnose**: verbleibende Regeln werden als Autorendaten klassifiziert, nicht Runtime — ehrlicher als der heutige Scheinkonsum.
7. **Retire-after-extraction**: nur w05-e7 (0 Regeln; Dokumentation der lokalen Score-Semantik).

Pfad 1–2 sind die pharmakologische Kernforderung: Maschine konsumiert nur, was in ihrer Grammatik liegt; alles andere hat einen benannten Nicht-Runtime-Zielpfad.

## Kompressionsschätzung

268 Definitionen -> 10 Familienverträge (plus 1 Retire). CaseTypes nach Domäne (Schätzung nach v1-Vergleichen und Übungsvarianten-Zusammenfall):

| Domäne | Definitionen | Familien berührt | caseTypes | Begründung |
|---|---:|---|---:|---|
| foundations | 49 | 8 | ~38 | w01–w04-Statische + kanonische geseedete Paare fallen zusammen (z. B. branch-coverage, loop-accumulator, state-overwrite); viele no-rules-Definitionen werden reine Seed-Daten |
| linear-algebra | 26 | 9 | ~20 | matmul 3->1, system 3->1, dot-product 2->1; Numbas retitiert |
| data-ml | 61 | 5 | ~56 | nur cv-fold-spread und w17-e2 fallen zusammen; breiteste Fachstreuung |
| deep-learning | 24 | 5 | ~23 | fast keine mechanischen Dubletten |
| transformer-llm | 30 | 5 | ~29 | v1 sah keine; Konzept-Choices bleiben eigene caseTypes |
| genai-systems | 24 | 4 | ~23 | analog deep-learning |
| research-capstone | 54 | 6 | ~52 | w37-e1-Merge; viele Synthese-Code-Aufgaben als caseTypes unter `code-test` |

Gesamt: ~241 caseTypes, 10 Familien, 268 eingefrorene Seeds als Bookkeeping. Der entscheidende Unterschied zu v1 (256 Familien): Property-Tests, Feedback-Grammatik, Answer-Vertrag und Instanz-Key existieren 10-mal statt 256-mal; die Fachlast liegt in schema-validierten Daten ohne eigenen Code.

## Golden-Path-Fit

- **Golden Path 2** (neue Familie, max. drei fachliche Dateien, keine UI/Ledger/Buildlist-Änderung): Unter diesem Design ist der Normalfall einer „neuen Aufgabe" ein neuer caseType — ein JSON plus ein Generatormodul plus eine Testdatei, null Runtime-Änderung, weil Familie und Maschinerie schon stehen. Eine echte neue Familie (neue Interaktion) ist selten und ausdrücklich ein Runtime-Event mit eigenem Vertragstest — genau die Unterscheidung, die S4Cs „Registry und Contract-Test sind gemeinsam" haben will.
- **S4C-Konsum**: `instantiate(familyId, seed, difficulty, caseId)` validiert Autorität und caseId gegen die Familie und delegiert an den caseType-Generator; `grade(instance, answer)` läuft in der Klasse und reichert das Ergebnis mit der familieneigenen Diagnosetabelle an. Die neue Generator-Baseline wird pro Familie einmal gesetzt; die 51 existierenden Generator-Implementierungen werden unverändert übernommen und am caseType registriert.
- **S4D-Passung**: Domänen-Sessions besitzen caseTypes und Generatoren ihrer Fachdomäne; die 10 Familienverträge gehören dem Orchestrator. Disjunkte OWNED PATHS bleiben damit natürlich einhaltbar — kein Domänen-Agent muss eine gemeinsame Datei einer anderen Domäne anfassen.

## Risiken

1. **Komplexitätsverschiebung statt -reduktion**: ~241 caseTypes werden zum neuen großen Katalog. Gegenargument: sie sind Daten unter 10 geprüften Schemas, nicht 256 Code- und Testpfade. Aber das Case-Registry-Design muss schema-strikt sein, sonst entsteht der zweite `catalog.json`-Zoo.
2. **checkId-Stabilität**: Pfad 2 verlangt benannte, stabile `__check`-IDs in 95 Pyodide-Aufgaben. Das berührt eingebettete Tests und erzeugt Baseline-Diff — S4C muss das als expliziten, einmaligen Baseline-Set dokumentieren.
3. **Fachliche Nivellierung**: Eine Familie `numeric-exact` über sieben Domänen kann didaktische Unterschiede (Vorzeichenfehler vs. Maskengeometrie) nur über Daten tragen. Wenn Diagnosen zu generisch werden, verliert die Plattform ihre Fehlerdidaktik. Gegengewicht: Das Fehlermodell ist Pflichtfeld pro caseType und S4A hat es für alle 268 bereits erhoben.
4. **Domänenübergreifende Familien-Eigentumsfrage**: Familien sind domänenneutral, Sessions S4D1–S4D7 domänenorientiert. Familienänderungen brauchen den Orchestrator — Engpass, aber bewusst, weil sie alle Domänen gleichzeitig betreffen.
5. **`tuple-exact`-Verallgemeinerung**: Paar-Semantik (x vor y, swap-Diagnose) ist heute hart in `gradePair` und fachlich mit Reihenfolge-Didaktik aufgeladen; die Verallgemeinerung auf n-Tupels darf die swap-Diagnose nicht verwässern.
6. **`rationale-note`-Vertrag**: Nicht-autoritativ muss im UI- und Ledger-Vertrag kodiert sein (kein Mastery, kein Review), sonst wird die Klasse doch zum Grading-Ersatz.

## Beispiele

### Beispiel 1 — `numeric-exact`, caseType `case/linalg-dot-product`

w05-e3 (Seed 533, Autorität `referenceSolver: dotProduct`) und w05-e13 sind derselbe caseType; e13 ist ein zweiter eingefrorener Seed mit härterer Vorzeichenmischung, kein eigener Typ. Zielzuweisung im Detail:

- Feedback `value === -2` (abgebrochene Zwischensumme) und `value === 34` (Vorzeichenfehler dritter Term): Pfad 1, bleiben konsumiert.
- `preservedDidacticContent.errorPatterns` wird das Pflichtfeld `errorModel` des caseType.
- Persistenz: e3 bleibt `preserve-id`; e13 erhält einen `mergeMap`-Eintrag plus zweiten Frozen-Seed. Der Human-Review-Punkt aus S4A bleibt die Freigabe dieses Merges — das Design zieht sie nicht still.

### Beispiel 2 — `tuple-exact`, caseType `case/linalg-system-2x2-elimination`

w05-e6, w05-e11 und f-linalg-solve-system-01 werden ein caseType mit drei eingefrorenen Seeds und der Autorität `seedGenerator: genLinear2Fresh` (2000 getestete Seeds); die Substitutions- gegen Additions-Technik wird eine geseedete Fallfacette (`strategy: substitution | addition`), keine Typgrenze. Zielzuweisung:

- swap-Diagnose aus `gradePair` (heute hartkodiert): Pfad 1 als formalisiertes Familienprädikat `pair-swapped`.
- noninteger-Regel (heute unerreichbar): Pfad 4, Eingabevalidierung vor dem Vergleich.
- Probe-Pflicht aus `preservedDidacticContent`: Pfad 5 als letzte Hinweistufe plus Musterlösungsschritt.
- Persistenz: w05-e6 `preserve-id`; w05-e11 behält seine `mergeMap`-Pflicht aus S4A exakt.

### Beispiel 3 — Achsentrennung über Domänen hinweg

w22-e2 (`case/tf-attention-maskenzellen`, Autorität `seedGenerator: genAttentionShape`, Seed 2211), w23-e3 (`case/tf-tokenizer-encode-lesen`, statische Autorität) und w23-e4 (`case/tf-tokenizer-roundtrip` unter `code-test`) zeigen die Trennung in einem Dreiklang:

- w22-e2 und w05-e3 teilen die Familie `numeric-exact`, obwohl sie fachlich nichts teilen — Protokoll vor Fach.
- w23-e3 und w23-e4 teilen das Fach Tokenizer, liegen aber in `output-predict-lines` beziehungsweise `code-test` — verschiedene Antwortform, verschiedene Maschine.
- w23-e3s unkonsumierte `output-lines-mismatch`-Regel wird `lines-diff@k`-Prädikat (Pfad 1); w23-e4s drei semantische Regeln (eos-per-word, trailing-space, special-token-accepted) werden checkId-Diagnosen (Pfad 2) und erhalten damit den ersten echten Konsumenten ihrer Historie.
