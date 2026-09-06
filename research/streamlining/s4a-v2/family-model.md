# S4A-v2 Familienmodell — verbindlicher Vertrag vor dem Shard-Dispatch

Stand: 2026-09-02 (Arbeitsblock A der Continuation, `docs/idle-task-pre-s2b-continuation.md`).
Basis: `design/design-comparison.md` Abschnitt 3 und 4 (Hybrid-Empfehlung nach adversarialem Vier-Wege-Vergleich), `design/research-basis.md`, `research/streamlining/s4a/summary.md` (v1: 268 Quellen, 256 Familien, 623 Feedbackregeln, 348 unkonsumiert), `canonical-families.json` (64-Familien-Hypothese), `archetypes.json`, `taxonomy.schema.json`, `assemble-v2.mjs`, `selftest.mjs`.

Dieses Dokument ist der verbindliche Modellvertrag für alle S4A-v2-Implementer, Reviewer und den Cross-Domain-Council. Die vier Designentwürfe unter `design/` sind historische Einzelvorschläge; wo ihre Prosa von diesem Dokument oder der Registry abweicht, verliert die Prosa.

## 1. Das Modell in einem Satz

Die Taxonomie trennt, was die 268 Baseline-Definitionen (Commit `1998d57`, inklusive des in S1B retired `w05-e7`) kognitiv eint, von dem, was sie Interaktion macht: **CognitiveFamily** (gemeinsamer Lösungsweg, Referenzmodell, Fehlerhypothesen) und **TaskArchetype** (Antwortform, Gradermaschinerie, Feedbackgrammatik) sind orthogonale Achsen; das **CaseTemplate** ist das einzige Objekt, das beide verbindet; das **ExercisePlacement** pinnt genau ein CaseTemplate in ein LearningModule; die **SeededInstance** entsteht aus CaseTemplate plus Seed und behält die historische Instanz-ID als Attempt-Schlüssel.

## 2. Achsen und ihre Eigentümer

| Achse | Bedeutung | Besitzer im Zielbild | Zahl (Hypothese) |
|---|---|---|---|
| `CompetencyClaim` | primary Claim je Placement (`competencyClaim.primary` aus `content/competencies/core.json`), `coEvidence` instrumental. S4B-Coverage fail-closed. | Placement (S4B) | 46 Kompetenzen |
| `FamilyGroup` | fachliche Großfamilie/Strang; nie Domäne. Nur atomic-cases. | Orchestrator | 11 (`canonical-families.json`) |
| `CognitiveFamily` | gemeinsamer Lösungsweg, Referenzmodell, mengen-identische `errorHypotheses`. Wiederverwendungseinheit. | Orchestrator (Registry) | 64 Hypothese, erwartete Landung 64–90 |
| `TaskArchetype` | Interaktion/Graderklasse aus geschlossener Registry mit `status: active \| historical-retired`. | Runtime (S4C) | 10 (9 aktiv, 1 historisch) |
| `CaseTemplate` | einziges Bindeglied Familie×Archetyp; genau ein `graderAdapter`; `authorityMode: static \| seeded`. | Content (S4D) | abgeleitet |
| `DifficultyProfile` | kognitiv-prozedurale Anforderung; alte 1–5-Zahl nur Migrationsabbildung. | Binding/Placement | 4 Profile |
| `ExercisePlacement` | `(familyId, archetypeId, caseTemplateId)` plus Lektions-/Modulnutzung und Review-Policy. | S4B | 268 |
| `SeededInstance` | `(caseTemplateId, seed)`; öffentliche Instanz-ID bleibt `currentDefinitionId`/`sourceId`. | S4C-Runtime | Laufzeit |

## 3. Entry-Formen (QTI-Analogie Item vs. Section/Test, nur als Modellanalogie)

Jeder der 268 Einträge ist genau eine der beiden Formen (`entryForm`, Schema erzwingt):

1. **`atomic-case`**: genau eine `cognitiveFamily`, ein `taskArchetype`, ein `caseTemplate`, eine `familyGroup`. Kein `compositePlacement`.
2. **`composite-placement`**: geordnete Komposition bestehender atomic-cases (`components` mit `sourceId`-Referenzen, mindest zwei, eindeutig, kein Selbstbezug, keine Komposit-Komponente) plus `sequenceContract` und optional `partialScoreContract`/`synthesisContract`. Keine eigene CognitiveFamily — bewusst: **keine erfundene Familie nur zur Aufnahme einer Sequenz.**

Beide Formen tragen vollständig `competencyClaim`, `placement`, `persistence`, `humanReview`, `uncertaintyDispositions` und `feedbackDispositions` (Schema + Assembler erzwingen das fail-closed).

Retire-Kopplung: `persistence.status: retire-blocked` ⇔ `composite-placement` mit `compositePlacement.status: retired` ⇔ `placement.reviewEligible: false`. Ein retired Composite darf über `historicalArchetypeId` nur einen `historical-retired`-Archetypen nennen — kein zukünftiger GraderAdapter, kein ausführbarer Review.

### Pflichtgegenfall `w05-e7`

- historical composite-placement, `status: retired`, `historicalArchetypeId: numbas-exam-retired`.
- Komponenten verweisen fachlich auf die erhaltenen Aufgabenpfade `w05-e1` (Produkteintrag numeric), `w05-e5` (Termvereinfachung sympy), `w05-e6` (2×2-System Paar) — mit je einer `role`-Beschreibung.
- `persistence.note` nennt die explizite S1B-Freigabe (Assembler prüft).
- Historische Attempts und Evidence bleiben erhalten; die v1-Matrixzeile wird nicht gelöscht.
- `feedbackDispositions: []` ist korrekt (w05-e7 hat 0 Feedbackregeln); die lokale Numbas-Score-Semantik wird im `partialScoreContract`/`sequenceContract` dokumentiert, nicht als Runtime-Zielpfad wiederauferstehen gelassen.

### Ehrlichkeitsregel für weitere Composites

Eine Composite-Form ist nur zulässig, wo die Quelle wirklich mehrteilig war (Sequenz-, Teilscore- oder Syntheseforderung über die Einzelteile hinaus). Keine Convenience-Composites zum Zusammenfassen thematisch verwandter atomic-cases. Prüfauftrag an jeden Implementer und Reviewer: „Ist diese Quelle ein echter Mehrteiler?" Die v1-Daten sprechen dafür, dass `w05-e7` der einzige echte Composite ist; wer einen weiteren behauptet, muss ihn gegen die Quell-Definition (z. B. `content/exercises/wNN.json`) belegen.

## 4. Mitgliedschafts- und Grenzregeln (CognitiveFamily)

Zwei Quellen kommen in dieselbe Familie nur, wenn **alle drei** Tests bestehen (aus `design-cognitive-first.md`, verschärft um die ausführbare-Autoritäts-Klausel aus `design-orthogonal-check.md`):

1. **Prozedurtest**: eine Worked-Solution-Schablone mit Platzhaltern führt durch jede Mitgliederinstanz.
2. **Referenzmodelltest**: eine ausführbare Autorität (Referenzsolver, Seed-Generator oder Symboläquivalenz) derselben Klasse löst jedes Mitglied aus Fallparametern allein; Variation zwischen Mitgliedern ist rein parametrisch, nie programmatisch verzweigt.
3. **Diagnosetest**: die Fehlerhypothesen (`errorHypotheses`) sind mengen-identisch, sodass eine Feedbackgrammatik alle Mitglieder abdeckt.

Explizit **keine** Familiengrenzen: activityType, graderId, Domäne, `legacyWeekId`, Promptsprache, fix versus geseedet, Schwierigkeit. Ein Family-Multi-Archetyp ist zulässig, wenn Lösungs- **und** Evidence-Vertrag identisch bleiben. Umgekehrt: getrennte Familien bei differierender Prozedur oder Referenzmodell, auch bei gleicher Oberfläche (Beispiel `transform-linear-equation-isolate` vs. `transform-system-2x2-elimination`).

Die sechs v1-`familyContractVariants` (Familien mit fixen Legacy-Antworten neben geseedeten Zieldefinitionen) lösen sich strukturell auf: `authorityMode` am CaseTemplate. **Kanonische Abbildung: `seeded` genau bei v1 `solverContract.kind = seed-generator` (51 Quellen, Generator erzeugt die Instanz zur Laufzeit aus einem Seed); alle anderen Arten sind `static` — auch wenn ein Referenz-Solver die Erwartung über fixe Parameter berechnet oder hidden tests fixen Code prüfen, und auch wenn ein historischer Seed in der Quelle eingebettet und damit eingefroren ist.** Referenzbeispiel: `w05-e1` (matmulEntry über fixe Matrizen) = static neben `f-linalg-matmul-entry-01` (genMatmulEntryFresh) = seeded; `w01-e1` static neben `w01-e8` (genLinearEquation) = seeded. Implementer setzen pro Quelle korrekt; Reviewer prüfen die sechs Fälle einzeln.

Jede Singleton-CognitiveFamily braucht eine schriftliche Begründung aus Lösungsweg, Claim, Invarianten und Graderanforderung. Klassifikations-Singletons mit eigenem Konzeptsystem sind legitim (Referenzmodell = das Konzeptsystem), aber begründungspflichtig.

### Kompressionsregel

Keine erzwungene Zielzahl. Erwartung: substanziell unter 256 echten CognitiveFamilies (Planbasis 64, Toleranzband 64–90). Jeder Split/jeder Merge folgt den drei Tests plus Evidence Claim und ausführbarer Autorität — nie Themenähnlichkeit, nie Interaktionsgleichheit allein. Nicht erreichte Kompression braucht konkrete fachliche Begründung pro Familie.

## 5. Registry, Namen und Ableitbarkeit (A1, A4)

- **`canonical-families.json` ist die kanonische Registry** (Orchestrator): Familienverträge (`familyGroup`, `summary`, `membershipEvidence`) und `expectedMemberCount` als überprüfte Erwartung. `hypothesisMemberSourceIds` sind nicht-authoritative Starthilfen aus dem Designprozess.
- **Mitgliedschaften, Domains und Counts werden aus den Shards abgeleitet.** Der Assembler leitet sie her (`aggregates.cognitiveFamilies.byFamily`, crossDomainFamilies) und schreibt sie mit `--write` in die Registry zurück (`memberSourceIds`, `domains`, `memberCount`). Manuell gepflegte Domänenlisten neben ableitbarer Mitgliedschaft sind verboten.
- Shards, die eine Registry-Familie verwenden, übernehmen deren Vertrag **zeichengetreu** (Assembler erzwingt byte-Gleichheit von summary, solutionPath, referenceModel und mengen-Gleichheit der errorHypotheses).
- Neue Familien (Splits nach Ratsbeschluss) laufen über den Orchestrator: Im Zwischenlauf gilt `--allow-new-families`, der finale Lauf verlangt eine reconcilierte Registry (jede Familie genau einmal, jede erwartete Anzahl gleich der abgeleiteten).
- **Namen:** `familyId` = kebab-case, kanonisch nur der Registry-Eintrag. Der Assembler prüft maschinell das Namensschema und lehnt stille Varianten mit gleichem Token-Multiset ab (`trace-assignment-state` vs. `assignment-state-trace` ist der Referenzgegenfall). Die Design-Prosa (`design-cognitive-first.md` benutzt u. a. `assignment-state-trace` und enthält den Tippfehler `reflect-guided-seasure`) hat keine Namensgültigkeit; kanonisch sind ausschließlich die 64 Registry-IDs. Aliase gibt es nur als explizite Migrationsmetadaten.

## 6. TaskArchetype-Registry (A3)

Zehn Archetypen (`archetypes.json`), jeder mit `status`:

- **aktiv** (9): `numeric-exact` (50), `choice-diagnose` (60), `code-test` (95, packageProfile pure/numpy, checkId-Kanal), `output-predict-lines` (35), `state-trace-vars` (11), `program-ordering` (7), `tuple-exact` (4), `expression-equivalence` (3), `rationale-note` (2, ausdrücklich nicht-autoritativ).
- **historical-retired** (1): `numbas-exam-retired` (1 Sitz, `graderAdapter: null`). Keine zukünftige Graderklasse.

Regeln (Assembler): atomic-cases binden nur aktive Archetypen mit reellem `graderAdapter`, und `caseTemplate.graderAdapter` muss zum Archetyp-Adapter passen. Die abgeleitete Sitzzahl jedes aktiven Archetyps muss dessen `expectedSourceCount` exakt treffen (das ist die v1-activityType-Verteilung); historische Archetypen haben null atomic-Bindungen. Unbekannte archetypeIds bleiben fail-closed. Neue Archetypen sind Runtime-Events mit eigenem Vertragstest (S4C), niemals Content-PRs.

## 7. Feedback-Zielpfade (alle 623 Vorkommen)

Jedes v1-Feedbackvorkommen erhält genau einen von sieben Zielpfaden (`feedbackDispositions[].targetPath`, Assembler erzwingt exakte ruleIndex-Deckung):

| Pfad | Bedeutung |
|---|---|
| `grader-predicate` | Bedingung kompiliert in die geschlossene Grammatik des Archetyps (heute: `value === n`, `choice ===/!== id`, `value:<var>`, `order-length-mismatch`, `element-count-mismatch`; v2 typisiert weiter: sign-flip, off-by-one, lines-diff@k, pair-swapped). |
| `answer-note` | Diagnose aus autoritativem Grader-/Pyodide-Test; für `code-test` der checkId-Kanal (`__check`-Test schlägt unter stabiler ID fehl → mappt auf Diagnose/Hindsight). Der Hebel für die 273 unkonsumierten Python-Regeln. |
| `input-validation` | Eingabeform-Prüfung vor der fachlichen Bewertung (PrairieLearn `format_errors`-Analogie). |
| `generic-hint` | konzeptionelle Hinweisleiter, seed-unabhängig, solution-disqualifying wie heute. |
| `worked-solution` | Nachricht beschreibt Lösungsschrittfolge → Familien-Worked-Solution. |
| `editorial-diagnosis` | Autorendiagnose ohne Runtime-Konsumenten (ehrlich dokumentiert statt Scheinkonsum). |
| `retire-after-intent-extraction` | bewusster Verzicht nach Dokumentation der Absicht. |

Die 275 heute konsumierten Regeln bleiben verhaltensstabil (sie sind `grader-predicate`-Fälle oder behalten ihren heutigen Kanal); die 348 unkonsumierten (273 pyodide + 3 pyodide-sympy + 72 deterministisch off-grammar) bekommen erstmals einen ehrlichen Zielpfad. Kein Pfad führt zu einem LLM; ein LLM ist nie Grader.

## 8. Persistenz und IDs

- Attempt-Schlüssel bleiben definitions-ID-basiert: `currentDefinitionId` = v1-Quell-ID, 262× `preserve-id`.
- 5× `merge-map-required` (`w05-e11`, `w05-e12`, `w05-e13`, `w17-e2`, `w37-e1`) mit konkretem `mergeInto` (Ziel-Familie oder -Instanz), bevor irgendeine ID fällt; Attempts, Evidence und Reviews bleiben unter der alten definitionId lesbar.
- 1× `retire-blocked` (`w05-e7`) nach expliziter S1B-Freigabe, als retired Composite (Abschnitt 3).
- Abgeleitete IDs (bindingId, caseId-Kombinationen) dürfen nie Attempt-Schlüssel werden. Keine neue ID wird Attempt-Schlüssel; keine Generator-Baseline wird in S4A-v2 verändert (reines Forschungsartefakt, keine Produktions-/Content-/Schemaänderung).

## 9. Dispositionsregeln (57 Human-Reviews, 235 Unsicherheiten)

Erlaubte Dispositionen (Schema-Enum): `resolved-with-code-evidence`, `resolved-with-source-evidence`, `resolved-by-review-council`, `requires-noa-decision`, `requires-empirical-data`, `deferred-to-s4b`, `deferred-to-s4c`, `deferred-to-domain-migration`.

- Nicht-endgültig aufgelöste Dispositionen brauchen `owner`, `decision`, `evidence`, `latestGate` (Schema erzwingt).
- **`resolved-by-review-council` darf kein Implementer vergeben.** Schema verlangt `councilReviewRef` auf `reviews/<name>.md`; der Assembler prüft, dass der referenzierte unabhängige Reviewbericht existiert und den `sourceId` ausdrücklich behandelt. Vor Block C existieren keine Reviewberichte — die Disposition ist für Implementer strukturell unerreichbar.
- Eine Agentenbewertung ist nie eine menschliche didaktische Releasefreigabe. Offene Noa-Fragen landen als `requires-noa-decision` in der Entscheidungsqueue (risikopriorisiert, Assembler generiert `decision-queue.json`).

## 10. Bekannte Grenzfälle — explizite Review-Pflichten (A5)

Jeder Implementer und jeder Reviewer behandelt diese Fälle ausdrücklich; pauschale Freigaben sind unzulässig:

1. **18-gegen-19-Diskrepanz domänenübergreifender Familien**: Der Design-Text behauptet 19, das Inventar annotiert 18. Aufgelöst wird aus den tatsächlichen abgeleiteten Mitgliedschaften (`aggregates.cognitiveFamilies.crossDomainFamilies`); der Council (D1) dokumentiert den Endwert.
2. **Unvollständige/leere `domains` und `memberSourceIds` in der alten WIP-Registry**: behoben durch Ableitung (Abschnitt 5); Reviewer prüfen die abgeleiteten Domänen gegen die fachliche Erwartung.
3. **`w17-e2` ohne bestätigten Merge-Zielpfad**: v1 schlägt die cv-fold-spread-Familie vor; der Implementer legt einen konkreten `mergeInto` mit Beleg fest oder dispgniert `requires-noa-decision` mit owner/decision/evidence/latestGate. „Irgendwohin mergen" ist keine gültige Angabe.
4. **`w37-e1` mit kompetenzübergreifender Merge-Frage**: hohe v1-Unsicherheit. Mindestens zwei unabhängige Reviewer plus adversarialer Gegenreview (D3); Endentscheidung kann nur Noa treffen.
5. **Grenzziehung `formula-ratio-percent-metric` gegen `aggregate-confusion-metric`** (besonders `w26-e4`, `w33-e2`, `w34-e2`): beide Mitgliedschaftstests bestehen teils. Jede der drei Quellen wird einzeln nach Lösungsweg, Zählobjekt und Fehlerhypothesen entschieden; Domänenreviewer und D1 dokumentieren jede Entscheidung.
6. **Composite-Aufgaben und mehrteilige Sequenzen**: Prüfauftrag „echter Mehrteiler?" (Abschnitt 3).
7. **Sechs v1-`familyContractVariants`** zwischen statischen und geseedeten Verträgen: Auflösung über `authorityMode`; jede der sechs Familien wird einzeln geprüft (Abschnitt 4).

## 10b. Council-Entscheide aus Block C/D (bindend für D1–F und S4C)

- **Rationale-note-Ausnahme** (Linalg-F2, Foundations-F3): `w05-e9` und
  `w01-e11` bleiben als nicht-autoritative Mitglieder in ihren Familien.
  Korpusweit genau 2 Quellen dieser Archetypklasse, beide
  `reviewEligible: false`, Freitext ist prinzipiell nicht grammatikfähig.
  Zwei neue Singletons würden das fragmentierte System ohne Diagnosegewinn
  aufblähen. D1/D2 bestätigen die Ausnahme. S4C-Konsequenz: Beide
  Freitext-Mitglieder nehmen an keinem Familien-Property-Test teil und zählen
  nur als Bearbeitungsnachweis.
- **Leerlaufende Schablonenschritte** (vacuous-axis-Präzedenz DL `w19-e4`/`w19-e5`,
  angewandt auf GenAI-F1): Eine Familien-Schablone darf Schritte enthalten, die
  für einzelne Mitglieder leer laufen, wenn Lösungsweg und Referenzmodell
  identisch bleiben. Die leeren Schritte stehen in den Rationales, nicht still.
- **Multi-Archetyp mit Doku** (`w26-e4` in ratio, `w24-e3` in decode-loop,
  `w01-e6` in call-composition, Sammel-Traces): zulässig bei identischem
  Lösungs- und Evidence-Vertrag; die Aufnahme steht im Review begründet.
- **Dehnungen ohne Verhaltenswirkung** (`w21-e3`, `w38-e3` in assignment-state):
  festgehalten, kein Umzug, keine Grammatikwirkung.
- **Test-attitude gegen error-hypothesis** (D1-L4, kein Merge):
  `classify-test-attitude` = Haltung zur Testpraxis,
  `classify-error-hypothesis` = Einordnung des Fehlerbilds. Verschiedene
  Konzeptsysteme, Vereinigung würde ungeprüfte Achsen aufzwingen.
- **`mergeInto`-Konvention** (D1-L2): Das Ziel nennt die Heimat-Familie des
  Eintrags (Präzedenz `w05-e11`, `w17-e2`); der Merge vollzieht sich erst in
  S4D. `w37-e1` folgt der Konvention seit der D3-Reparatur.
- **Noa 2026-09-03, `w37-e1`:** Kein Merge mit `w34-e1`. Heimat bleibt
  `classify-freeze-purpose`. Attempt-ID bleibt `w37-e1`. Ersatzevidenz für
  `c-genai-security` in Woche 37 ist S4B/S4D7. Protokoll:
  `noa-decisions.md`.
- **Hypothesen-Hygiene** (D1-L1, revidiert D2-F3-Entscheid): Stale
  `hypothesisMemberSourceIds` sind gestrichen; die Originale stehen im Anhang
  von `block-c-decisions.md`. Die Registry führt keine zweite
  Mitgliedschaftswahrheit.
- **18/19-Auflösung**: 15 shardübergreifende Familien aus abgeleiteten
  Mitgliedschaften (D1 verifiziert). Beide alten Zahlen waren falsch.

## 11. Forschungsbasis — übernommene Muster und bewusster Verzicht

Übernommen als Muster (nie als Software): ECD (Claim→Evidence→Task→Assembly; evaluation von aggregation getrennt), AIG (cognitive model/item model/Instanz plus mitgenerierte Rationale), PrairieLearn (generate/parse/grade; `format_errors` getrennt von fachlicher Bewertung; seeded Variants), STACK (Question-Tests als Aufgaben-Regressionstests; Answer-Notes als maschinenlesbare Diagnosezweige), QTI 3 (Item ≠ Section/Test als Datenmodellidee für atomic vs. composite).

**Bewusst nicht übernommen**: QTI-XML, PrairieLearn-Runtime (Server/DB/Container), STACK-CAS (Maxima), Numbas-Runtime (nur historische Referenz für Variablen, Randomisierung und mehrteiliges Marking; keinesfalls Rückkehr), jede Serverabhängigkeit, jede neue externe Bibliothek. Bayes/Psychometrie-Kalibrierung entfällt zugunsten deterministischer Regeln. Ein LLM ist nie autoritativer Grader, Mastery-Vergeber oder Planstatus-Änderer.

## 12. Verifikation (reproduzierbar)

- Schema-Kompilierung und beide Entry-Formen plus alle Fail-closed-Gegenfälle: `node research/streamlining/s4a-v2/selftest.mjs` (27 Checks).
- Assembler (Trockenlauf, validiert Shards gegen Schema, v1-Inputs, Archetyp-Registry, Familien-Registry, Kompetenzen): `node research/streamlining/s4a-v2/assemble-v2.mjs`.
- Finale Artefakte: `node research/streamlining/s4a-v2/assemble-v2.mjs --write` (nach Council-Abgleich; schreibt `migration-matrix-v2.json`, `feedback-disposition.json`, `decision-queue.json` und leitet Mitgliedschaften in `canonical-families.json` ab). Frische-Beweis: nochmaliger Lauf ohne `--write`.
