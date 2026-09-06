# Design-Vergleich S4A-v2: vier Familienmodelle adversarial geprüft

Stand: 2026-09-02. Adversarialer Review (design-it-twice). Grundlage: `research-basis.md`,
`design-cognitive-first.md` (C), `design-interaction-first.md` (I), `design-competency-first.md` (K),
`design-orthogonal-check.md` (O), `research/streamlining/s4a/summary.md` (v1: 268 Definitionen,
256 Familien, 623 Feedbackregeln, 348 unkonsumiert), `docs/idle-task-pre-s2b-integration.md`
Abschnitt 6. Alle Kompressionszahlen in Abschnitt 2 wurden gegen v1 nachgerechnet, nicht übernommen.

## 1. Bewertungsmatrix

| Kriterium | C cognitive | I interaction | K competency | O orthogonal |
|---|---:|---:|---:|---:|
| Depth (erklärt, warum Aufgaben sich unterscheiden) | 5 | 2 | 4 | 5 |
| Locality (Änderungsimpact) | 3 | 4 | 3 | 4 |
| Authoring-Touchpoints (neu: Familie/Fall/Modul) | 4 | 3 | 3 | 3 |
| Testbarkeit (Property-/Vertragstests je Ebene) | 4 | 5 | 4 | 5 |
| Tatsächliche Kompression (echte Wiederverwendung) | 4 | 2 | 3 | 3 |
| Feedback-Zielpfad-Tragfähigkeit (348 Regeln) | 4 | 5 | 3 | 5 |
| S4B/S4C-Fit | 4 | 2 | 4 | 4 |
| Persistenz-Sicherheit (v3-Attempts) | 5 | 4 | 5 | 5 |
| **Summe** | **33** | **27** | **29** | **34** |

Die Summe kürt bewusst keinen Sieger: O punktet mit einer Familiedefinition, deren Zahl die
Wiederverwendungs-Anforderung verfehlt; C punktet mit der Familiezahl unter einer Strenge, die O direkt bestreitet. Dieser Widerspruch ist die Entscheidungsvorlage.

### Depth
C 5: einziges Design mit vollständigem, member-genauem Inventar; Singletons werden als
Placement-Lücken erklärbar statt als Taxonomiefehler. I 2: Protokollgleichheit erklärt
Maschinen-Wiederverwendung, nicht didaktische Differenz — eigene Risiko 3 („Fachliche Nivellierung")
konzediert, dass `numeric-exact` über sieben Domänen Vorzeichenfehler und Maskengeometrie nur noch
als Daten unterscheiden kann. K 4: Claim-Schnitt ist ECD-treu, aber der Lösungsweg ist zweite Ordnung;
zusammengehalten wird Same-Claim-different-Procedure nur durch M3(b) (gleicher Solver). O 5: R1–R7
plus das beste Diskriminierungsbeispiel aller vier Dokumente (`w12-e2` Berechnen vs. `w12-e4`
Implementieren: geteilte Kompetenz, getrennte Familien, kein Cross-Binding).

### Locality
C 3: 18–19 domänenübergreifende Familien kollidieren mit S4D-OWNED-PATHS (eigenes Risiko 2). I 4:
caseTypes domänen-lokal, 10 Verträge beim Orchestrator — natürlichster OWNED-PATHS-Fit; aber jede
Grader-Änderung ist Core-Eingriff mit plattformweitem Radius. K 3: kompetenzgeschnittene Familien
gegen domängeschnittene Sessions (Risiko 2). O 4: Content domänen-lokal, Archetypen code-besessen;
aber die Achsen-Leakage (Swap-Erkennung in `gradePair` ist Familienwissen im Archetyp-Code) erzwingt
Verschiebungen in `assets/js/core/graders.js` mit Testbegleitung.

### Authoring-Touchpoints
C 4: neuer Fall = dünner caseType unter existierender Familie; Strang→Familie→Fall ist ein flacher
Autorenfluss; die 51 existierenden Generatoren bleiben verwertbar. I 3: neuer Fall = JSON +
Generatormodul + Testdatei ohne Runtime-Änderung (beste GP2-Story), aber der Katalog bleibt mit
~241 caseTypes genauso groß wie v1, und die checkId-Stabilisierung in 95 Pyodide-Aufgaben ist ein
einmaliger, teurer Baseline-Diff (eigenes Risiko 2). K 3: P1/P2 bedeuten 146 einzeln zu prüfende
Primary-Zuweisungen plus einen Claim-Satz pro Familie — echte redaktionelle Vorarbeit, die K selbst
einräumt (Risiko 1); neue Kompetenzstufe = neue Familie ist der Normalfall. O 3: Autoren denken in
zwei Abstraktionen; der Binding-Lint gegen R1–R5 muss erst gebaut werden, R2-Injektivität ist
semi-manuell.

### Testbarkeit
I 5: Mapping mechanisch prüfbar (50+60+95+35+11+7+4+3+2+1 = 268), geschlossene Prädikatenmenge und
Vertragstests je 10× statt 256×. O 5: Registry-Abschluss, Binding-Lint, Archetyp-Akzeptanztests;
schwächste Stelle die semi-manuelle R2-Injektivität (eigenes Zugeständnis). C 4: drei
Mitgliedschaftstests sind property-testbar (Worked-Solution-Schablone, Generator-gegen-Solver,
Diagnoseachsen-Trigger), aber Projektionsverträge müssen getrennt getestet bleiben (Risiko 3) und
Grenzfälle sind nicht mechanisch entscheidbar (Risiko 5). K 4: M3/M4-Contract-Tests, monotone
Profilkante, Coverage-Compiler fail-closed; die Primary-Zuweisung selbst ist vor S4B untestbar.

### Tatsächliche Kompression
C 4: 64 Familien = 4,2× ist die einzige dramatische Familienkompression — aber Test 2 ist locker
(„Solver derselben Klasse", Selektoren erlaubt), und Composite-Mitglieder wie `w29-e4/e5/e6`
(Regelklassifikation plus F1 in `aggregate-confusion-metric`) dehnen das Referenzmodell (eigenes
Risiko 5: Grenzinstabilität). I 2: 10 Familien ist Vertrags-, nicht Familienkompression; nur 27
Definitionen fielen zusammen (Abschnitt 2). K 3: ~169 = 34 %, bewusste Einbuße. O 3: strikt
224–236 = 8–12 %, allein zu wenig; echte Kompression in der Vertragsfläche (27 kinds → 10–12,
7 Autoritätsmodi statt 268 Solververträge, Wachstumsmuster beendet).

### Feedback-Zielpfad-Tragfähigkeit
I 5: sieben erzwungene Pfade; der checkId-Kanal ist der einzige konkrete Runtime-Konsument für die
273 toten Pyodide-Regeln, `lines-diff@k` nimmt die 51 predict-output-Regeln auf. O 5: R2 macht
Unprojizierbarkeit zur Binding-Entscheidung — die sauberste Antwort auf die 348. C 4: Diagnoseachsen
decken die 623 ab, aber Python-Regeln landen nur in `answerNote`/`hintLadder`, und 3 sympy-Regeln
haben keine Tabellenzeile (Abschnitt 2). K 3: Tabelle vollständig, aber Risiko 5 parkt die 273 ohne
fertige Prädikate als `answerNote` — sichtbar, ohne `grade()`-Wirkung.

### S4B/S4C-Fit
K 4: S4B bekommt den Coverage-Prüfer gratis (Compiler lehnt Lücken fail-closed ab) — das liefert
kein anderes Design; dafür fetter Familienvertrag (mehrere answerContracts, Risiko 3) und kein
TaskArchetype-Level. C 4: Placement-Vierer-Tuple und GP2 mit existierenden Generatoren machbar; aber
die Projektion hängt an der Platzierung statt am CaseType — verletzt die Owner-Regel „CaseTemplate
bindet einen konkreten GraderAdapter" und öffnet Archetyp-Shopping. O 4: Tripel-Placements stimmig,
aber alles Flache (Coverage-Matrix, Progress-Aggregation, graphify-Seeds) muss auf Tripel umgestellt
werden (Failure Mode 4). I 2: aus einer Placement auf eine Protokollfamilie folgt keine Kompetenz —
S4B-Coverage wird unrekonstruierbar; eine kognitive Ebene fehlt.

### Persistenz-Sicherheit
C 5: `placementId = sourceId`, `instance.meta.legacyPlacementId`, explizite mergeMap-Einträge,
262 preserve-id unangetastet. K 5: `legacyDefinitionIds` am CaseType, `byDefinitionId`-Index,
`instance.definitionId` für gepinnte Cases, reviewQueue-Scheduling-Key unverändert. O 5:
Instance-ID bleibt `currentDefinitionId`, `bindingId` darf nie Attempt-Schlüssel werden, Migration
domäne für Domäne. I 4: `legacy-instance-map.json` zur Buildzeit ist ein guter Mechanismus ohne
IDB-Migration, aber 241 neue caseIds plus 10 familyIds werden gemintet und der Instance-Key
`familyId/caseId/seed` ist neu — mehr Neuprägung als bei C/K/O.

## 2. Zahlen-Audit der Kompressionsansprüche

Gegen v1 nachgerechnet (`research/streamlining/s4a/summary.md`):

1. **C, Domäntabelle:** 17+8+22+11+14+10+17 = 99 Familien, nicht 64. Konsistent nur durch
   Doppelzählung domänenübergreifender Familien: die 18 im Inventar annotierten tragen
   Sigma(k−1) = 35 Zweit- und Drittzählungen bei; 99 − 35 = 64. Das Inventar selbst ist konsistent:
   64 Familien, Mitgliedergrößen summieren exakt auf 268, 11 Stränge, 27 Singletons (26 in
   `classify-concept` plus `collection-state-trace`). Diskrepanz: Text behauptet 19
   domänenübergreifende Familien, annotiert sind 18 — Doku-Fehler, kein Rechenfehler.
2. **C, Feedback-Tabelle:** 275 + 273 + 72 = 620. Die 3 pyodide-sympy-Regeln (v1: 3 Vorkommen,
   0 konsumierbar) haben keine Zeile — 3 der 348 unkonsumierten Regeln ohne expliziten Zielpfad.
3. **I, caseTypes:** 38+20+56+23+29+23+52 = 241 = Schlagzeile; Klassenbestand 268 exakt gleich den
   v1-activityType-Zahlen. Aber 268 → 241 heißt: nur 27 Definitionen fanden einen gemeinsamen
   caseType; der Katalog schrumpft von 256 Familien auf 241 caseTypes (−15). Die Schlagzeile
   „10 Familien statt 256" vergleicht Vertragsobjekte mit Familien — Kategoriefehler. Die
   Wiederverwendung ist real (Grammatik, Property-Tests, Answer-Vertrag, Instance-Key je 10× statt
   256×), liegt aber nicht in Familieneinheiten.
4. **K, Zahlenwerk:** Ziel 33+17+41+16+19+16+27 = 169; Floor 20+12+36+12+15+12+15 = 122; v1-Spalte
   44+21+60+24+30+24+53 = 256; unkonsumierte Regeln je Domäne 14+13+87+42+49+44+99 = 348 — alles
   summiert exakt. Auch „146 Mehrfachdefinitionen" passt zur v1-Kompetenztabelle (426 Zuweisungen =
   268 + 158 Extra). K hat das sauberste Zahlenwerk aller vier Designs.
5. **O, Kopfzahlen:** strikte Spalte summiert 224–236, Schlagzeile „~225–245" (Obergrenze 9–19 über
   der eigenen Tabelle); starke Spalte summiert 192–209 gegen „~192–248 (real ~195–215)" — 248 ist
   unerklärt. Kleine Sache, aber ein Design, das „unbequem aber ehrlich" als USP führt, sollte die
   eigenen Summen nicht nach oben runden. Die Kernthese bleibt davon unberührt: strikt nur 5–12 %
   Familienreduktion (Stem-Clustering allein 256→255).
6. **v1-Baseline bestätigt:** 623 = 275 konsumierbar + 348 tot; 348 = 273 pyodide + 3 sympy + 72 off-grammar.
   O und K rechnen das korrekt; I verwechselt nie 273 mit 348.

## 3. Empfehlung: Hybrid „orthogonale Achsen, kognitiv konsolidiert"

Kein einzelnes Design erfüllt alle Owner-Constraints. Empfohlen wird die Hierarchie aus Abschnitt 6
mit beigetragener Disziplin aus drei Designs — O liefert das Gerüst, C die Familiendefinition und
das Inventar, I die Archetyp-Maschinerie, K die Claim-Ebene:

- **CompetencyClaim** (aus K): deklarative Claim-Objekte; **primary Claim je ExercisePlacement**,
  nicht je Familie (Abweichung von K, nötig weil C zu Recht domänenübergreifende Familien zulässt);
  `coEvidence` instrumental nach Ks M2. S4B behält so den fail-closed Coverage-Prüfer.
- **FamilyGroup** (aus C): die 11 Stränge (`formula-apply`, `trace-state`, …). Die fachliche Domäne
  bleibt Placement-Eigenschaft — eine domänengeschnittene Group könnte 18+ querliegende Familien
  nicht ausdrücken (Cs stärkstes Strukturargument).
- **CognitiveFamily** (aus C, gehärtet durch O): Cs drei Mitgliedschaftstests (Prozedur,
  Referenzmodell, Diagnoseachsen) mit O-Verschärfung — eine ausführbare Autorität, Variation über
  Mitglieder rein parametrisch (Selektoren sind Parameter, keine Codepfade), `errorHypotheses`
  mengen-identisch, Multi-Archetyp nur bei identischem Solution- plus Evidence-Vertrag (O R3/R7).
  Planbasis: Cs 64er-Inventar als einziges vollständiges; erwartete Landung nach adversialem Review
  ~64–90 (Split-Kandidaten: Regelklassifikation-plus-Metrik-Composites `w29-e4/e5/e6`, Grenzfälle
  `w26-e4`/`w33-e2`/`w34-e2`, Projektions-Mitglieder wie `w05-e16`).
- **TaskArchetype** (aus O mit Is Maschinerie): code-besessene, geschlossene Registry (10 Archetypen,
  10–12 kanonische answerContract-kinds); der Archetyp besitzt die geschlossene
  Feedback-Prädikatenmenge, Eingabevalidierung, Attempt-Payload-Schema, `answerAuthority`-Präzedenz
  und für `code-test` den checkId→Diagnose-Kanal (der Runtime-Konsument für die 273 Python-Regeln)
  plus `packageProfile: pure | numpy`.
- **CaseTemplate** (aus O): einziges Objekt, das `familyId` und `archetypeId` zusammen nennt; bindet
  genau einen GraderAdapter; besitzt `authorityMode: static | seeded`, `frozenSeed`,
  Generierungsparameter, Distraktorengerüst. Löst v1s sechs `familyContractVariants` auf und
  repariert Cs Projektionsloch (Graderwahl liegt nicht mehr an der Platzierung).
- **DifficultyProfile** (aus O): die vier v1-Profile als Vokabular, Legalität pro Binding;
  Semantik `f(Invariantenanspruch der Familie, Case-Parameter, Interaktionsreibung)`;
  monotone Profilkante als Contract-Test. Die 1–5-Zahl bleibt nur als Migrationsabbildung.
- **ExercisePlacement:** referenziert das Tripel `(familyId, archetypeId, caseTemplateId)` plus
  Policy, `difficultyProfile`, primary Claim, `legacyWeekId`; pinned genau ein CaseTemplate (O R6).
- **SeededInstance:** `(caseTemplateId, seed)`; öffentliche Instance-ID bleibt
  `currentDefinitionId`/`sourceId`; `bindingId` ist nie Attempt-Schlüssel.

### Zur Wiederverwendungs-Anforderung (der ehrliche Zahlenteil)

Die Anforderung „deutlich mehr Wiederverwendung als 256 Familien" wird auf zwei Ebenen erfüllt. Familiezahl: Planbasis 64 (C), erwartete Landung ~64–90 — das ist Substanz, kein
Renaming, weil die größten Familien code-bewiesen sind: `genF1orPrecision` variiert bereits metrische
Richtung, `genMatmulEntryFresh`/`dotProduct` und `genPythonStateTrace` sind existierende
Familienvariatoren. O warnt, wer mehr Kompression verspreche, merge Themen statt Pfade — aber Os Gegenzahl („kognitiv
fast 250 verschiedene Aufgaben") stützt sich auf 49 verschiedene solverContract-Strings bei 50
numeric-Einträgen, während O im selben Abschnitt nachweist, dass solche Felder driftender Autorismus
sind (27 kinds, 7 Synonyme für python-code). Das Drift-Argument trifft damit Os eigenen Familienboden
ebenso; die ausführbare-Autoritäts-Verschärfung ersetzt String- durch Verhaltensgleichheit. Sollte der Review über ~150 Familien
landen, greift die Singleton-Begründungspflicht (Abschnitt 6 verlangt sie ohnehin), und die
Vertragsfläche bleibt als zweite Wiederverwendungs-Ebene: 27 kinds → 10–12, 623 Regeln → projektive
errorHypotheses plus checkId, Feedback-Grammatik und Property-Tests 10× statt 256×.

## 4. Bindende Entscheidungen

1. **Identität `familyId`:** familyId benennt die CognitiveFamily (`<strand>-<name>`, Cs Namensraum),
   nie die Familie×Archetyp-Kombination (O Option A, nicht B). FamilyGroup = Strang (11). Domäne ist
   nie Familien-, nur Placement-Eigenschaft. Historische Definitions-IDs werden nie zu familyIds.
2. **Mitgliedschafts-/Merge-Regel:** Cs drei Tests, verschärft zu „eine ausführbare Autorität,
   Variation rein parametrisch, errorHypotheses mengen-identisch"; Multi-Archetyp nur bei identical
   Solution- plus Evidence-Vertrag; jedes Merge braucht Generator-Evidenz oder dokumentierten Review;
   jeder Singleton eine schriftliche Begründung (Lösungsweg, Claim, Invarianten, Graderanforderung).
3. **TaskArchetype-Registry:** code-besessen und geschlossen (10 Archetypen); neuer Archetyp =
   Runtime-Event mit eigenem Vertragstest, niemals Content-PR. Archetyp besitzt Feedback-Grammatik,
   Eingabevalidierung, Payload-Schema; `code-test` trägt `packageProfile` und den checkId-Kanal.
4. **CaseTemplate:** einziges Objekt mit beiden IDs; bindet genau einen GraderAdapter; besitzt
   `authorityMode`, `frozenSeed`, Distraktorengerüst. Placement pinned genau ein CaseTemplate.
   `instantiate(familyId, seed, difficulty, caseId)` behält die Owner-Signatur: `archetypeId` wird
   aus dem CaseTemplate abgeleitet; `caseId` ist Pflicht, sobald die Familie mehr als ein Binding
   hat (Validator-Fehler statt Default-Archetyp).
5. **DifficultyProfile-Semantik:** vier Profile, Legalmenge pro Binding, Bedeutung
   kognitiv-prozedural (Invariantenanspruch, Case-Parameter, Bindungsreibung); monotone Profilkante
   ist Contract-Test; die 1–5-Zahl stirbt bis auf die Migrationsabbildung.
6. **CompetencyClaim:** primary Claim genau eine je ExercisePlacement, `coEvidence` instrumental;
   S4B-Coverage-Compiler lehnt Module ohne primary-Decke fail-closed ab; Claims sind deklarative
   Objekte, LLM niemals Grader (M7 aus K übernommen; `rationale-note` bleibt nicht-autoritativ).
7. **Persistenz und Merge/Retire-Format:** Attempt-Schlüssel bleiben definitions-ID-basiert; Map
   `definitionId -> { disposition: preserve-id | merge-after-extraction | retire-blocked, familyId,
   archetypeId, caseTemplateId, frozenSeed?, difficultyProfile, mergeTarget? }` deckt 262/5/1 aus
   v1 vollständig ab und wird zur Buildzeit zu `legacy-instance-map.json` kompiliert (Mechanismus
   aus I). `w05-e7` bleibt retire-blocked mit Lese-Alias; `w37-e1` braucht zwei unabhängige Reviewer
   plus Gegenreview (Abschnitt 6), kein Design zieht das vorab.
8. **Feedback-Disposition:** jedes der 623 Vorkommen bekommt genau einen von acht Pfaden
   (binding-projiziertes Familienprädikat, checkId-Diagnose, inputValidation, hintLadder,
   workedSolution, answerNote, editorialDiagnosis, retireAfterExtraction); O R2 entscheidet als
   Projektivitätsflag zwischen Prädikat und Hint; Ausgabe ist maschinenlesbares
   `feedback-disposition.json` für S4C; kein Pfad führt zu einem LLM.

## 5. Offene Restpunkte (nicht vom Vergleich entscheidbar)

FamilyGroup-/Familienbesitz beim Orchestrator gegen S4D-Sessions (Cs Risiko 2 und Is Risiko 4
beschreiben dieselbe Eigentumsfrage); `w37-e1`-Merge und `w05-e7`-Retire bleiben
Noa-Entscheidungen; die checkId-Stabilisierung ist ein einmaliger, explizit freizugebender
S4C-Baseline-Diff. Alle 57 Human-Reviews und 235 Unsicherheiten disponiert erst der Deep-Review.
