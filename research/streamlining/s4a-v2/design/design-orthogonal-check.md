# Design-Check: Orthogonales Modell — CognitiveFamily x TaskArchetype

Agent 4 von 4, design-it-twice. Stand: 2026-09-02.
Basis: `research/streamlining/s4a/summary.md` (v1: 268 Definitionen, 256 Familien) und `s4a-v2/inputs/*-v1.json` (268 Einträge mit `answerContract`, `solverContract`, `proposedCaseType`).

## These

V1 hat Familien gefordert, in denen Lösungsweg, Grader-Interface, Answer-Vertrag, Darstellung und Transferanspruch ZUSAMMEN passen. Deshalb 256 Familien bei fast keiner Wiederverwendung: die Achsen sind in einem Objekt verklebt. Dieser Check trennt die kognitive Familie (was gedacht werden muss) vom Task-Archetyp (wie die Antwort geformt, geprüft und diagnostiziert wird) und macht die Kombination zum referenzierbaren Objekt.

Zwei Befunde aus den Inputs tragen das Modell:

1. Der Answer-Vertrag ist fast vollständig durch den Archetyp determiniert. `numeric` hat 50 Einträge aber im Kern einen Vertrag (Integer, exakter Vergleich, allenfalls `seeded-integer` als Autoritätsvariante); `predict-output` läuft immer auf `output-lines` mit Whitespace-Normalisierung hinaus. Umgekehrt ist die Vergabe undisziiniert: 27 verschiedene `answerContract.kind`-Werte, davon 7 Synonyme für python-code (`python-tests`, `hidden-pyodide-tests`, `pyodide-test-suite`, …) und 4 für single-choice (`choice-id`, `single-choice-id`, `correct-choice-id`, `single-choice`). Das ist driftender Instanz-Autorismus, kein kognitiver Unterschied.
2. Der `solverContract` ist der kognitive Kern und nahezu einzeln: 49 verschiedene bei 50 numeric-Einträgen, 58 bei 95 python-code-Einträgen. Die 7 Autoritätsmodi (`expected-answer` 109, `hidden-tests` 53, `seed-generator` 51, `reference-solver` 49, `sympy-equivalence` 3, `manual-rubric` 2, `numbas-exam` 1) sind dagegen eine kleine, geschlossene Menge.

Konsequenz, unbequem aber ehrlich: Die Orthogonalisierung komprimiert vor allem die VERTRAGSOBERFLÄCHE (Antwort-/Feedback-/Validierungs-Spezifikation), nicht dramatisch die Familienzahl. Die 268 Definitionen sind kognitiv tatsächlich fast 250 verschiedene Aufgaben. Wer anders rechnet, verkauft Mega-Familien als Fortschritt.

## 1. Achsen-Definitionen

### CognitiveFamily (families, ~10-30 Zeilen pro Familie, domänen-lokal)

Geteilt werden MUSSEN:

- `solutionPath`: der kanonische Lösungsweg auf Modell-Ebene (z. B. „Eintrag c_ij = Skalarprodukt i-te Zeile mal j-te Spalte, 1-basiert").
- `referenceModel`: EINE ausführbare Autorität, die für jeden gebundenen Fall die erwartete Antwort berechnet — Referenzsolver, Seed-Generator oder Symboläquivalenz. Der Autoritätsmodus ist Familieneigenschaft, nicht Falleigenschaft.
- `invariants`: die tragenden Eigenschaften (Fold-Komplement, Broadcast-Regel, Zeilen-/Spalten-Indexbasis).
- `errorHypotheses`: der Misconception-Raum, den die Familie unterscheidet (c11-Verwechslung, Teilsumme statt Endsumme, gedrehtes Paar). Nur die HYPOTHESE liegt hier; ihre Ausformulierung als Grader-Bedingung gehört zum Binding.
- `evidenceKind` und `competencyEvidence`: welche Kompetenz welchen Claim erfüllt (recall / trace / procedure / artifact / rationale).

Nicht geteilt wird: Darstellung, Antwortform, Feedback-Condition-Grammatik, Eingabevalidierung. V1s Kriterium „Darstellung und Transferanspruch zusammenpassen" entfällt als Familiengrenze und wird zur Binding-Entscheidung.

### TaskArchetype (globale, code-besitzte Registry; im Korpus 10 Stück)

Ein Archetyp ist `(answerForm, graderAdapter)` und muss teilen:

- kanonisches `answerContract` (EIN `kind`, exakt eine Normalisierungsvorschrift — die 27 v1-Kinds kollabieren auf ~10-12 kanonische).
- `graderAdapter` aus `assets/js/core/graders.js` (`gradeNumeric`, `gradeChoice`, `gradePredictOutput`, `gradeCodeTrace`, `gradeParsons`, `gradePython`, `gradePair`, `gradeSympyExpression`, `gradeRubric`, Numbas-Adapter).
- Eingabevalidierung und Antwort-Payload-Schema (Persistenzform des Attempts).
- die geschlossene Feedback-Condition-Grammatik (`value ===`, `choice ===`, `order-length-mismatch`, `value:<var>`, `element-count-mismatch` — die fünf Formen, die graders.js wirklich liest).

Im aktuellen Korpus ist Archetyp ≈ activityType (die 10 activityTypes bilden 1:1 auf Grader ab). Die Trennung lohnt trotzdem, weil der Archetyp Contract-Grammatik und Persistenz besitzt, nicht das Lern-Konzept. Wichtig: Die Registry ist CODE-besessen (Grader, Schemas, Akzeptanztest), nicht Content-besessen. Neuer Archetyp = Runtime-Änderung mit Test, kein Content-PR.

### CaseTemplate (das einzige Berührungsobjekt der Achsen)

Ein CaseTemplate lebt unter einem Binding (s. u.) im Content und hält die konkreten Generierungsparameter: Seed-Generator-Bindung oder fixe Parameter, Snippet, Choice- und Distraktor-Gerüst, Rubrik. Ablageort, wenn die Achsen getrennt sind: Familie und CaseTemplate sind Content (`content/`-Baum, domänen-lokal, `content/exercise-definitions/<domaene>/` bleibt Heimat der Definitionen), der Archetyp ist Code (`assets/js/core/graders.js` plus Schema). Das CaseTemplate ist die EINZIGE Datei, die beide IDs nennt — dadurch bleibt der Cross-Product-Schnitt lesbar und auditierbar (Build kann nicht-lebende Bindings fail-closed melden). Es deklariert:

- `familyId` + `archetypeId` (das Binding),
- die Projektion: wie der Output des family-Referenzmodells in die Antwortform des Archetyps abgebildet wird (Skalar -> Integer-Feld; Endzustand -> variable-values; Ausgabefolge -> output-lines),
- `authorityMode`: `static` (fixe Instanz) oder `seeded` (Generator). Dies löst v1s `familyContractVariants` auf: `w05-e1` (fix, `referenceSolvers.matmulEntry`) und `f-linalg-matmul-entry-01` (geseedet, `genMatmulEntryFresh`) sind zwei CaseTemplates desselben Bindings — kein Familienkonflikt mehr.

### Binding (abgeleitete, dünne Entität)

`bindingId = familyId + "@" + archetypeId`. Enthält: erlaubte Difficulty-Profile, die Projektionstauglichkeit der `errorHypotheses` gegen die Archetyp-Grammatik (welche Hypothesen als Bedingung ausdrückbar sind, welche nur als Hint), Legalitätsnachweise (Regeln R1-R5, Abschnitt 3). Bindings werden nie freihändig autoriert; sie entstehen mit dem CaseTemplate und werden geprüft.

### DifficultyProfile

V1s vier Stufen bleiben (`basic-recall` 61, `core-application` 129, `advanced-transfer` 42, `final-boss-synthesis` 36). Der Profile gehört zur KOMBINATION: `profile = f(kognitiver Anspruch der Familieninvarianten, Case-Parameter, Interaktionsreibung des Bindings)`. Beleg aus den Daten: `w18-e1` (single-choice, Diff. 1) und `w18-e3` (predict-output, Diff. 2) sind dieselbe Shape-Algebra — der Unterschied ist Binding-Reibung, nicht Familienwechsel. Jedes Binding deklariert die legale Profilmenge; ein Placement darf kein Profil anfragen, das das Binding nicht trägt.

### ExercisePlacement

Referenziert IMMER das Tripel `(familyId, archetypeId, caseTemplateId)` plus Policy (Modulnutzung, Wiederholung, Mastery-Anforderung), `difficultyProfile` und `legacyWeekId`. Module kennen keine Familien ohne Binding — das verhindert stillen Default-Archetyp.

### SeededInstance

Materialisiert `(caseTemplateId, seed)`; die erwartete Antwort wird vom Familien-Referenzmodell DURCH die Binding-Projektion berechnet. Öffentliche Instanz-ID bleibt `currentDefinitionId`/`sourceId` (Persistenzkompatibilität, v3-Attempts). Determinismus: gleicher Seed, gleiches Template, gleiches Ergebnis — unabhängig davon, welcher Archetyp projiziert.

## 2. Identität: Was bekommt S4Cs instantiate()?

**Option A — `familyId` ist die kognitive Familie.** `instantiate(familyId, seed, difficulty, caseId)` ist dann unterbestimmt, sobald die Familie mehr als ein Binding hat: der Archetyp muss aus `caseId` (implizit) oder einem Default folgen. Konsequenzen: Signatur braucht `archetypeId` oder `caseId` wird faktisch Pflicht; „Default-Archetyp" ist versteckte Magie und gefährdet Placement-Eindeutigkeit. Gewinn: Familien überleben Darstellungswechsel; Mastery aggregiert kognitiv ehrlich über Antwortformen; IDs bleiben domänensprechend.

**Option B — `familyId` ist die Kombination.** Dann ist instantiate voll bestimmt und Tooling bleibt flach. Konsequenzen: Der ID-Raum wächst M x N; die Kombination stirbt, wenn eine Darstellung stirbt (genau v1s Krankheit: 256 Familien, weil Darstellung Familieneigenschaft war); Cross-Form-Reuse ist in Analytics unsichtbar; der Pairing-Zwang re-flacht das Modell.

**Empfehlung: Option A, hart diszipliniert.** Primärschlüssel der Familie ist kognitiv; S4C-Signatur wird `instantiate(familyId, archetypeId, caseId, seed, difficultyProfile)`. `archetypeId` darf nur weggelassen werden, wenn die Familie EXAKT ein Binding hat (validierte Invariante, kein Konfigurations-Meinungsrecht). Placements speichern das Tripel explizit. Tooling-intern darf der abgeleitete `bindingId` als Kurzschlüssel dienen — aber er ist parsbar und nie eigenständige Autoring-Oberfläche.

Konkrete Aufrufe gegen die Beispiele aus Abschnitt 6:

- `instantiate("linear-algebra-matmul-entry-row-column", "numeric-integer", "f-linalg-matmul-entry-01", 4101, "core-application")` — Familie eindeutig, Archetyp redundant (ein Binding), aber erlaubt.
- `instantiate("dl-tensor-shape-algebra", "predict-output-lines", "w18-matmul-broadcast-ndim", seed, "core-application")` — ohne `archetypeId` ILLEGAL, zwei Bindings vorhanden.
- `instantiate("dl-tensor-shape-algebra", "numeric-integer", …)` — Registry-Fehler: dieses Binding existiert nicht (R1/R4), Fail-closed beim Kompilieren, nicht erst zur Laufzeit.

Option-B-Pendants bräuchten je eine eigene kombinierte ID (`dl-tensor-shape-algebra@predict-output-lines` als FAMILY-ID); bei zehn Archetypen wäre der ID-Raum faktisch wieder darstellungsgetrieben und jede Analytics-Frage „Wie steht es um Shape-Algebra?" müsste über N IDs aggregieren.

## 3. Cross-Produkt-Verbot (wann ein (family, archetype)-Binding NICHT existieren darf)

Ein Kreuzprodukt aus ~240 Familien x 10 Archetypen wäre theoretisch ~2400; real gelten fünf harte Regeln plus zwei Budgetregeln:

- **R1 Ausdrückbarkeit (Projektion existiert):** Der Output des Familien-Referenzmodells muss verlustfrei in die Antwortform projizierbar sein. Eine Familie mit exakter rationaler Lösung darf nicht auf `integer` binden; ein Numbas-Score ist kein Symbolvergleich.
- **R2 Diagnose-Auflösung (Injektivität):** Verschiedene `errorHypotheses` müssen verschiedene falsche Antworten erzeugen können. Können zwei Misconceptions dieselbe falsche Antwortform liefern (Loop-Abbruchfehler vs. Verzweigungsfehler in einem single-choice mit vier Optionen), darf das Binding diese Hypothesen nicht CLAIMEN — sie werden Hints oder das Binding existiert nicht, wenn mehr als die Haelfte unprojizierbar ist. Das ist die strukturelle Antwort auf v1s Befund, dass 348 von 623 Feedbackregeln keinen Konsumenten haben: Unprojizierbarkeit wird zur Binding-Entscheidung, nicht zu totem Content.
- **R3 Evidence-Kompatibilität:** `evidenceKind` der Familie muss zur Antwortform passen. Eine prozedurale Familie (Code-Artefakt) bindet nicht auf single-choice; eine Begründungs-Familie nicht auf numeric.
- **R4 Difficulty-Boden:** Das Binding darf den kognitiven Anspruch der Familie nicht unterlaufen. `final-boss-synthesis`-Familien bekommen keine Recall-Antwortform — sonst war die Familiengrenze falsch gezogen.
- **R5 Registry-Abschluss:** Archetypen sind eine geschlossene, code-besitzte Menge. Ein neuer Archetyp erfordert Grader-Adapter, Schema und Akzeptanztest.
- **R6 Budget:** maximal 3 Bindings pro Familie ohne Human Review; ein Placement pinned genau ein CaseTemplate (kein Archetyp-Shopping innerhalb eines Moduldurchlaufs).
- **R7 Autorität:** Familien mit `authorityMode`-Konflikt (fix vs. geseedet) bleiben eine Familie; der Konflikt ist CaseTemplate-Eigenschaft. Nur wenn die REFERENZMODELLE verschieden sind (Rechenweg vs. Codevertrag), sind es zwei Familien — dann teilen sie eine Kompetenz, nicht eine Familie.

## 4. Kompressionsschätzung pro Domäne

Methode: striktes Modell (Familie = identischer Pfad + Referenzmodell + Fehlerhypothesen; Namens-Stem-Clustering der v1-IDs plus manuelle Prüfung der Cross-Archetyp-Kandidaten aus den Objectives). Das crude Stem-Clustering allein findet fast nichts (256 -> 255): die echten Merges sind semantisch, nicht namentlich.

| Domäne | v1-Familien | orthogonal (strikt) | orthogonal (stark, nur Referenzmodell geteilt) | Bemerkung |
|---|---:|---:|---:|---|
| foundations | 44 | 38-40 | 32-35 | Akkumulator-Cluster (predict-output + code-trace), Set-Dedup-Paar, function-call-Paar |
| linear-algebra | 21 | 17-18 | 14-15 | matmul-entry und dot-product teilen den Skalarprodukts-Pfad |
| data-ml | 60 | 55-57 | 48-52 | Fold-Cluster teilt nur die Invariante, nicht den Pfad |
| deep-learning | 24 | 18-20 | 14-16 | Shape-Algebra-Cluster (choice + predict + numeric) |
| transformer-llm | 30 | 26-28 | 22-24 | |
| genai-systems | 24 | 22-23 | 19-21 | |
| research-capstone | 53 | 48-50 | 43-46 | |
| **Summe** | **256** | **~225-245** | **~192-248** (real ~195-215) | |

Ehrliche Lesart: ~5-12 % Familienreduktion im strikten Modell, ~15-20 % im starken. Die eigentliche Kompression liegt woanders:

- 268 autorenspezifizierte Answer-Verträge -> 10 Archetypen mit je EINEM kanonischen Vertrag (~12 Kinds inkl. seeded-Varianten statt 27 driftender).
- 623 Feedbackregeln mit 348 Toten -> `errorHypotheses` pro Familie mit Binding-Projektivitätsflag; Unprojizierbares wird sichtbar entsorgt oder zum Hint.
- Sieben Autoritätsmodi statt 268 einzeln formulierter Solver-Verträge.
- Künftige zweite Darstellung einer Familie = neues Binding + CaseTemplate (dünne Objekte), nicht neue Familie. v1s Wachstumsmuster (jede Darstellung eine Familie) ist strukturell beendet.

## 5. Migration von v1

Alle 268 `sourceId`s/`currentDefinitionId`s bleiben erhalten (262 `preserve-id`, 5 `merge-map-required`, 1 `retire-blocked` unverändert). Abbildung:

1. **Familien-Split:** Jede v1-`proposedFamilyId` wird zerlegt: Interaktionssuffix (`-predict-output`, `-choice`, `-trace`, …) und `activityType`+`graderId` wandern in den Archetyp (Registry-Lookup, 10 Werte), der Rest wird zur kognitiven `familyId` (kuratiert; v1-ID bleibt Alias in der Migrationsmap).
2. **`proposedCaseType` -> CaseTemplate** unter dem zugehörigen Binding; die 268 Falltyp-Dokumentationen (Lösungsweg, Fehlermuster, Darstellung, Transfer, Diff-Begründung) bleiben vollständig erhalten — sie verteilen sich nur auf Familie (Pfad, Fehler) und Binding (Darstellung, Transferreibung).
3. **`familyContractVariants` (6 Familien):** dissolvieren zu `authorityMode` der CaseTemplates (z. B. `linear-algebra-matmul-entry-row-column`: `w05-e1`/`w05-e12` static, `f-linalg-matmul-entry-01` seeded). S4C muss keinen gemeinsamen Familienvertrag mehr erfinden.
4. **Merge-Kandidaten (`w05-e11`, `w05-e12`, `w05-e13`, `w17-e2`, `w37-e1`):** Merge-Maps jetzt auf Binding-Ebene (`w17-e2` -> Binding `data-ml-cv-fold-spread@numeric-integer`; `w37-e1` -> `capstone-golden-freeze@single-choice`).
5. **`w05-e7` (Numbas):** bleibt `retire-blocked` mit den vier offenen Bedingungen. Der Numbas-Archetyp bekommt exakt ein Legacy-Binding und ist für Neues geschlossen — er erfüllt R1 nicht beweisbar (keine symbolische Garantie dokumentiert).
6. **Feedback-Regeln:** alle 623 Vorkommen werden als `errorHypotheses`-Projektion neu ausgedrückt; die 72 deterministischen Regeln außerhalb der fünf geschlossenen Formen und die 276 pyodide-seitigen Regeln ohne Konsumenten werden pro Binding entschieden (Hint, Nachautorisierung oder Löschung nach Review).
7. **Schrittweise:** S4C kann Domäne für Domäne umstellen, weil Placements das Tripel referenzieren und Instanz-IDs unangetastet bleiben.

## 6. Worked Examples (echte IDs)

**(a) `linear-algebra-matmul-entry-row-column` — Varianten auflösen.** Familie: Skalarprodukts-Pfad Zeile x Spalte, Referenzmodell `matmulEntry`, Fehler: c11-Verwechslung, Teilsumme. Binding `@numeric-integer`. Drei CaseTemplates: `w05-e1` (static, Eintrag c12), `w05-e12` (static, anderer Eintrag), `f-linalg-matmul-entry-01` (seeded, `genMatmulEntryFresh`, 2000 getestete Seeds). v1 brauchte dafür `familyContractVariants`; hier ist es eine `authorityMode`-Zeile pro Template. Nachbar-Binding: dieselbe Familie koennte künftig `@code-trace` (Zwischensummen je Iteration) bekommen — R2 prüft, ob c11-Verwechslung und Teilsummenfehler im variable-values-Format unterscheidbar bleiben (ja: verschiedene Variablenwerte). Und direkt daneben die Grenze: `linear-algebra-dot-product-component-sum` (`w05-e3`, `w05-e13`) teilt denselben Referenzmodell-Kern — im strikten Modell eigene Familie (anderer Lösungsweg-Zuschnitt: ganzes Skalarprodukt statt Eintrag-Auswahl), im starken Modell Merge-Kandidat über das gemeinsame Skalarprodukt-Modell.

**(b) Shape-Algebra in deep-learning — eine Familie, zwei Bindings.** `w18-e1` (`deep-learning-shape-contracts-matmul-rule`, single-choice, Diff. 1, „Ergebnisform von XW + b bestimmen") und `w18-e3` (`deep-learning-shape-tracing-predict-run`, predict-output, Diff. 2, „stdout mit Matmul-/Broadcast-Shapes vorhersagen") teilen Referenzmodell und Invarianten (Matmul-Formregel, Bias-Broadcast). Orthogonal: Familie `dl-tensor-shape-algebra`, Bindings `@single-choice` (Profil basic-recall) und `@predict-output` (Profil core-application, Projektion: Modelloutput -> Ausgabezeilen `(4, 5)\n(4, 5)\n2 2 1`). Zwei v1-Familien werden eine; der Difficulty-Unterschied lebt korrekt im Binding.

**(c) `w12-e2` vs. `w12-e4` — Cross-Produkt-Verbot.** Beide handeln von k-Fold (Lektion `l-ml-cv`). `w12-e2` (`data-ml-cv-fold-spread`, numeric, seeded `genCvSpread`) verlangt das BERECHNEN der Spannweite über Fold-Accuracies; `w12-e4` (`data-ml-kfold-index-implementation`, python-code, hidden tests) verlangt das IMPLEMENTIEREN von `kfold_indices(n, k, seed)` inkl. Restverteilung und ValueError. Referenzmodelle verschieden (Arithmetik vs. Codevertrag), Evidence-Kinds verschieden (interpret vs. artifact) => R7: zwei Familien, geteilte Kompetenz `c-ml-cv`, KEIN Binding der Implementierungsfamilie auf numeric und keines der Spread-Familie auf python-code (R3). Genau hier wäre ein flaches Modell („alles CV") falsch.

## 7. Failure Modes — wo das orthogonale Modell wehtut

- **Autoring:** Autoren müssen in zwei Abstraktionen denken („was ist der Pfad, was ist die Form"). Risiko: Binding-Creep und Archetyp-Shopping (leichtere Antwortform für bessere Mastery-Raten). R4/R6 sind Gegenmittel, brauchen aber Durchsetzung im Review.
- **Achsen-Leakage im Bestandscode:** `gradePair` hat die Swap-Erkennung fest eingebaut — Archetyp-Code enthält Familienwissen („x und y vertauscht" ist eine Misconception des 2x2-Systems, nicht aller Paar-Antworten). Das Modell erzwingt Verlagerungsentscheidungen in `assets/js/core/graders.js` — Riskant, weil Core-Grader behutsam zu behandeln sind und jede Verschiebung Tests berührt.
- **Review-Komplexität:** R2-Injektivität ist semi-manuell. Falsch eingeschätzte Projektion erzeugt UNDIAGNOSIERBARE falsche Antworten — schlimmer als v1s tote Regeln, weil jetzt Claims dahinterstehen. Braucht ein Tooling-Check (Binding-Lint gegen die fünf geschlossenen Grammatikformen).
- **Tooling:** Alles, was flache IDs annahm (Coverage-Matrix, Progress-Aggregation, graphify-Seeds), muss auf Tripel bzw. bindingId umgestellt werden; Debug-Pfade werden länger (instance -> case -> binding -> family + archetype).
- **Mega-Familien-Drift:** Das starke Modell lädt zu „Shape-Algebra"-Sammlbecken ein. Grenze muss die Kohärenz der `errorHypotheses` bleiben, nicht die Themenähnlichkeit.
- **Difficulty-Comparability:** Mastery pro Familie aggregiert künftig über Antwortformen — didaktisch richtig, aber wochenweise Difficulty-Reports werden über Bindings nicht vergleichbar sein; Placement-Politik muss das ausgleichen.
- **Persistenz:** Abgeleitete IDs (`bindingId`) dürfen nie Attempt-Schlüssel werden — Instanz-ID bleibt `currentDefinitionId`, sonst brechen v3-Attempts bei Binding-Renames.

## Empfehlung

Orthogonal einführen, aber mit dem strikten Familienbegriff (Pfad + Referenzmodell + Fehlerhypothesen), Option A für S4C (`instantiate(familyId, archetypeId, caseId, seed, difficultyProfile)`), Placement auf Tripel, Archetyp-Registry im Code, Binding-Lint fuer R1-R5. Erwartung: ~225-245 kognitive Familien, 10 Archetypen, ~256 dünne Bindings/CaseTemplates, Vertrags-Oberfläche stark geschrumpft, `familyContractVariants` und der tote-Regel-Bestand strukturell aufgelöst. Wer mehr Kompression verspricht, merged Themen statt Pfaden.
