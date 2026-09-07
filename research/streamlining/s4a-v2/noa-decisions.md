# Noa-Entscheide zur S4A-v2-Queue

Stand: 2026-09-03. Menschliche Freigaben, die der Assembler nicht erfinden darf.
Shards und `decision-queue.json` bleiben bis zum jeweiligen Domain-Gate
unverändert. S4D liest diese Datei vor jedem Merge.

## 2026-09-03: `w37-e1` Trennung

Quelle: Noa, mündlich im S2B-Vorbereitungsgespräch. Vorlage war der Council
(Domänenreview, zwei Zweitprüfungen, Gegenreview) plus der Integrationshandoff.

Entscheidung:

- Kein Merge mit `w34-e1`.
- Heimat bleibt die Singleton-Familie `classify-freeze-purpose`.
- `w34-e1` bleibt Hash-Semantik / Freeze-Inhalt, `w37-e1` bleibt Freeze-Zweck.
- Attempt-Schlüssel bleibt `w37-e1` (`merge-map-required` mit
  `mergeInto: classify-freeze-purpose`, Vollzug erst in S4D7).

Nicht entschieden:

- Wo in Woche 37 die Evidence für `c-genai-security` herkommt, wenn dieser
  Eintrag die Kompetenz nicht mehr trägt. Das bleibt S4B-Bindung / S4D7.

Die drei Rank-0-Queue-Punkte und der Rank-3-Spiegel an `w34-e1` sind damit
für die Familienfrage erledigt. Die Queue-JSON bleibt absichtlich offen, bis
S4D7 die Shards umstellt.

## 2026-09-04: S3A-Freigaben und S4-Richtung (alle acht Punkte)

Quelle: Noa, schriftlich. Gilt für S3A-Commit, S3B-Start und S4D-Vorbereitung.

1. **S3A-Commit ja.** Nebenwirkung auf migrierte Reviews akzeptiert (Punkt 2
   des Reviews). Falls daraus echte Probleme entstehen, dann schlaue Lösung
   erzwingen und Ergebnis prüfen, nicht vorher.
2. **`c-genai-security`-Ersatz ja.** S4B schlägt vor, wo in Woche 37 die
   Evidence herkommt. Bis dahin bleibt der Mit-Beleg an `w37-e1`.
3. **W05-Merges ja als Varianten.** Zustimmung zur Bündelung. Richtung:
   Familien sollen künftig 10–30 Varianten generieren können. Produktidee
   Noa: pro Lektüre kuratierte Aufgaben plus ein Übungsplatz, der Varianten
   en masse über alle Lektüren anbietet. S4B/S4C berücksichtigen das im
   Authoring-Modell (Familie als Erweiterungsstelle, Falltyp + Seed + Profil).
4. **`w17-e2`-Umzug ja.** Merge nur mit `c-ml-repro`-Migration auf die
   Zielaufgabe.
5. **Prozent-Grenzen: Agent bestimmt.** Noa lernt selbst mit der Plattform und
   beurteilt Grenzwerte nicht vorab. S4D setzt je Aufgabe einen Wert mit
   Begründung (Flüchtigkeitsfehler verziehen, Konzeptfehler nicht).
6. **Kopier- vs Teil-Architektur: S4D entscheidet.** Faustregel aus dem Review
   (stabile Technik teilen, geprüfte Integration kopieren) als Vorlage, S4D
   legt die Fälle einzeln vor.
7. **Bearbeitungsnachweis ja.** Nur autoritative Versuche zählen als Können,
   Reflexionen als Bearbeitung. Bereits umgesetzt, bleibt so.
8. **Lektionszuordnung: Vorschlag.** S4B schlägt das Zuhause für `w05-e3`,
   `w05-e15` und Capstone vor, Noa bestätigt pro Modul.

## 2026-09-04: S4B-Freigaben (Review + Fixes)

Quelle: Noa, schriftlich, nach Gegenreview mit zwei Fix-Auflagen.

- S4B-Commit ja nach Review-Fixes (ModuleView faul, Vor/Zurück nach
  Modulreihenfolge, Validator-Chunkmuster). Initial-JS 78.1 KiB zur Kenntnis
  (über S0-Soll 77.5, unter Validator 150); S6-Ziel bleibt.
- `w05-e3` und `w05-e15` nach `l-linalg-matrices` bestätigt.
- Capstone-Split bestätigt (`l-capstone-baseline` Hash/Ledger/Doppel-Lauf,
  `l-capstone-pipeline` Freeze/Manifest/Verdict, Milestone bleibt Abschluss).
- `c-genai-security`-Ersatz bestätigt (Mit-Beleg an `w37-e1`, `w37-e4/e5/e6`
  als Ersatz, Vollzug S4D7).
- Danach S4C.

## 2026-09-04: S4C-Freigaben (alle fünf Ja)

Quelle: Noa, schriftlich, nach Gegenreview.

- S4C-Commit ja (ohne diese Datei).
- GP2 auf `classify-git-operation` statt neuer Familie bestätigt.
- Übungsplatz auf dieselbe Familie bestätigt.
- 0 Minuten für GP2-Placements bestätigt, Zeitbudget ist S4D.
- Keine UI bestätigt. S4D-Voraussetzungen: Identitätsabbildung
  (steht im Umbauplan), GP2-Dubletten auflösen, ExerciseView anschließen.
- Danach S4D an Muse: Migration plus eigene Lektüren, interaktives Lernen
  auch mit neuen UI-Features, Übungsplatz mit Varianten en masse.

## 2026-09-04: S4D1-Entscheidungen (Orchestrator, Noa-Veto möglich)

- Trace-Tabelle ja (Noa, schriftlich). Startet mit Zuweisungs-Traces
  (reassign, chain3, accumulate) als Interaktionsvariante, kein neuer
  Archetyp. Schleifen-, Aufruf-, Collection-, Dict- und
  Exception-Tabellen folgen, sobald ihre Generatoren Zustände kennen.
- Singleton-Regel gelockert (Orchestrator): zentrale Registry verlangt
  mindestens einen Falltyp statt zwei. Kanonische Singletons haben genau
  einen echten Shard-Fall; ein erfundener Zweitfall wäre
  Content-Authoring und bleibt verboten. Null Fälle bleiben fail-closed.
- Familien-Runtime liegt in `family_registry.mjs` (eine Semantik, kein
  Duplikat); dünne Domänen-Registries nutzen sie. Neue Module in
  Export-Allowlists (`export_open_core.mjs`, `build_public.mjs`)
  aufgenommen; Open-Core-Test wieder grün.
- Fremde Content-Eingriffe revertiert (Orchestrator): `content/`-Edits
  plus `growth/`- und `stray.txt`-Neuzugänge kamen nicht aus S4D1,
  brachen den Content-Compile und liegen unter `/tmp/s4d1-aside/`.
  S4D1 authorisiert keinen Content außer eigenen Lektüren.
  Auffällig: Die `growth/`-Namen spiegeln das Temp-Fixture aus
  `tests/content_compiler.test.mjs` (`l-growth-extra`).

## 2026-09-04: S4D2-Entscheidungen (Orchestrator, Noa-Veto möglich)

- Keine neuen Lektüren nötig: 9 Foundations-Lektionen existieren und
  lehren bereits Tracetabellen. S4D2 klammert sie per Modul:
  Lektionen, kuratierte Aufgaben, Übungsplatz. Layout blieb, es
  passte bereits. Keine Subagents: Module sind 9 schema-gebundene
  JSONs aus der Familien-Landkarte, alles andere Single-Writer.
- 9 neue Module (`lm-foundations-*`), 32 kuratierte + 24
  Übungsplatz-Placements, alle per `instantiate` verifiziert.
  Placements ohne `estimatedMinutes` (wie S4C); Zeitbudget offen.
- Antwort-Inputs je Aktivitätstyp gemeinsam für Definitionen und
  Familien (`AnswerControls`); Familien-View prüft jetzt auch
  numerisch, Parsons, algebraisch und Code (inline-Editor).
- Hinweise strikt aus Instanzdaten: Stufe 1 Strategie, Stufe 2
  Distraktor-Ausschluss, Zahlen-Richtung, Parsons-Erstzeile,
  Trace-Zeilenzeiger. Mastery-Max bleibt 1 Hinweis.
- GP2-Dubletten ohne Löschung aufgelöst: Die vier
  Definitions-Placements behalten ihre Karten, ihre
  `familyId`-Annotationen zeigen auf die einzige kanonische
  Git-Familie `classify-git-operation`. Lösch-Option offengehalten.
- JS-Budget 80.3 KiB gzip (vorher 78.3), Validator feuert bei 150.

## 2026-09-04: S4D3-Entscheidungen (Orchestrator, Noa bestätigt 1-3)

- Zeitbudgets (Noa): kuratiert intro 5, core 8, stretch 12,
  challenge 15 Minuten; Übungsplätze 0. Modulsummen zeigen echte
  Zeiten, z. B. Git 61, Algebra 122, Testing 87.
- Git-Karten: drei Definitions-Placements entfernt (Choice,
  Next-Action, Parsons). Merge-Debug bleibt, bis eine Familie den
  Konflikt-Fall abdeckt. Definitionen bleiben im Content
  (Coverage, Milestones unberührt).
- Trace-Tabellen Schleifen und Aufrufe (Noa): While eine Zeile je
  Durchlauf, For-Filter eine je Element mit Listenstand, Aufrufe
  innen vor außen in beiden Bahnen, statisch aus Fläche und Umfang
  gerechnet. elif bleibt reine Vorhersage (Zweigentscheidung ohne
  Zustand). Review-Ergebnis: Generatoren unangetastet
  (Golden-Corpus), Ableitung im Family-Layer wie bisher, kein
  Interpreter, keine neue Engine.

## 2026-09-04: S4D4-Entscheidungen (Orchestrator, Hebelwahl)

- Zuerst Merge-Debug statt W05: Pilot für das Muster
  statische-Definition-als-Falltyp, das W05-Merges im Maßstab
  brauchen. Git-Domäne damit vollständig migriert.
- Kein neue Familie: Taxonomie ordnet `f-git-merge-debug-01`
  `classify-git-operation` zu. Dritter Falltyp
  `merge-conflict-test-flow`, statisch (`propertyTest: false`),
  gepinnt byte-identisch aus w03, Seed rotiert nur Positionen.
  51er-Baseline unangetastet (eigener Lookup).
- Letzte Definitions-Karte aus dem Modul ersetzt; Definition
  bleibt im Content. S4D0-E2E klickt jetzt per exaktem Href
  (erster Link ist seit dem Umbau die Merge-Karte).

## 2026-09-04: S4D5-Entscheidungen (Orchestrator, Deep-Module-Linse)

- Ein Adapter hinter dem Registry-Seam statt neuer Wege:
  `formula-scalar-product` mit geseedetem Matmul-Fall plus vier
  statischen w05-Fällen (e1, e12, e13, e3). Modul, Üben, Review
  funktionieren ohne neuen Code.
- w05-e16 (Code-Ausgabe) und w05-e9 (Begründung) bleiben
  Definitionen: anderer Lösungsweg und andere Antwortform,
  kein Familienvertrag möglich. Abweichung von der
  Memberliste dokumentiert.
- Ziehlogik steht jetzt einmalig in `generator_draw_kit`
  (`familySubseed`, `drawFamilyInstance`); Trace nutzt sie
  mit, Byte-Verhalten unverändert (Korpus-Digest stabil).
- Familien-Prompts rendern Mathe (`MathMarkup`), sonst bliebe
  LaTeX roh stehen.

## 2026-09-04: S4D6-Entscheidungen (Orchestrator, Linalg-Batch)

- Sieben neue Familien im selben Modul: zwei Choice-Statiken,
  Parsons-Vertrag, Det-Seed, Rang-Statik, System-Seed plus
  zwei Statiken, Shape-Seed plus w18-Statik. Vier kanonische
  Familien ohne Quelle bleiben offen (Column-Choice,
  Rank-Debug, Gauss-Choice, Final-Boss): kein Content-Authoring.
- w05-e16 und w05-e9 bleiben Definitionen (Form-Fehlpass),
  w05-e8 bleibt Definition (Code-Fall ohne eigenen Vertrag).
- Statik-Lösungen ohne Lehrbuch-Zitate: Public-Build verbietet
  private Marker auch in Runtime-JS, Test prüft gegen
  `sanitizePublicValue`. Marker in eigenen Kommentaren
  ebenfalls entfernt.
- Ziehlogik einmalig im Draw-Kit; Solver aus `w05_generators`
  und `solveShape`-Export wiederverwendet, nichts nachgebaut.

## 2026-09-04: S4D7-Entscheidungen (Orchestrator, Noa-freigegeben)

- Vier autorierte Statiken nach Katalog-Vorgaben (solutionPath,
  Fehlerhypothesen): Spalten-Koeffizienten, Stufenform-Fall,
  Zeilenoperations-Gültigkeit, Drei-Vertrags-Synthese.
- W05-Rest logisch zugeordnet: e16 Predict-Fall und e9
  Rubric-Fall in Skalarprodukt, e8 Code-Fall im Matvec-Vertrag.
  Antwortform und Grader gelten pro Fall (CaseTemplate
  verbindet Familie und Archetyp), Registry reicht durch.
- Code-Fall nutzt exakt die Definitions-Tests
  (Verzweigung im Testbauer); E2E beweist den Browser-Lauf.
- Lösungen ohne Lehrbuch-Zitate (Public-Regel), Test prüft
  gegen die Pipeline-Redaktion.

## 2026-09-06: S4D8a-Entscheidungen (E1–E8, Noa-freigegeben)

- E1: Statischer Content lebt in `content/families/<familyId>.json`
  (Root `families`, Schema `exercise-family-cases`), nicht in
  Runtime-JS. Ein generischer Adapter (`staticFamilySpec`,
  `registerStaticCases`, `staticCaseBody`) in der Registry; neue
  statische Aufgabe = eine JSON-Datei, null Codezeilen.
- E2: Statischer Fall = genau ein Profil (aus dem S4A-Shard:
  basic-recall→intro, core-application→core,
  advanced-transfer→stretch, final-boss-synthesis→challenge; ohne
  Quelle: Modulplatzierung, sonst core; Synthese challenge).
  Familienprofile werden aus den Fällen abgeleitet; falsches
  Profil wirft. Statik-only-Familien nicht im Übungsraum.
- E3: `masteryEligible` pro Fall: Einstiegs-MC (choice-diagnose,
  intro) und manual-rubric zählen nicht; Rest zählt. Linalg an
  diese Regel angeglichen (shape-product-drawn,
  dependent-pair-double, product-definition-rationale → false).
- E4: Python-Fälle nehmen Startcode/Referenz/Tests 1:1, gleicher
  Pyodide-Grader.
- E5: `formula-metric-spread-range` eine Familie; W17 bekommt einen
  eigenen neuen Repro-Fall (Vorschlag beim W17-Schnitt).
- E6: Data/ML = 12 Module, eines pro Lektion.
- E7: Dieses Repo ist das Public-Profil. Private/Public-Trennung
  wird in S5B entfernt, W01-Bibliotheksverweise werden öffentliche
  Links. Bis dahin bleiben die 14 Validator-Fehler Baseline.
- E8: 7.268 Runtime-LOC ist keine geprüfte Zahl (9.085·0,8). Ziel
  wird nach Messung gesetzt; Test-LOC wird mitgemessen, an
  verschobenen/gelöschten Code gekoppelte Tests fallen mit.
- Schema `exercise-family` erlaubt jetzt einen Falltyp
  (Runtime-Regel seit S4C).

## 2026-09-06: S4D8 W06 Datenbereinigung (umgesetzt)

Erstes Data/ML-Modul `lm-data-cleaning` nach E1–E6: 4 Familien (1 seeded,
3 statisch als JSON), 6 Fälle, `w06.json` bleibt. Die damalige Sitzungsnotiz
wurde aus dem öffentlichen Baum entfernt.

## 2026-09-06: S4D9 W07 EDA (umgesetzt) und E9

E9: Fälle dürfen `competencyIds` der Familie überschreiben (wochenüber-
greifende Familien). CI-Workflows werden in S5B eingerichtet (Noa, „ok“).
Die damalige Sitzungsnotiz wurde aus dem öffentlichen Baum entfernt.
