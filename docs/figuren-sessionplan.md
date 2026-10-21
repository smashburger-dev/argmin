# Figuren: Sessionplan S2 bis S9

Aktuelle Prüfregel aus Noas S3-Review (17.10.2026): Keine neuen figurspezifischen Tests oder Snapshot-Sammlungen standardmäßig anlegen, auch nicht automatisch für neue Assets. Frühere entsprechende Pflichten dieses Plans sind aufgehoben. Vorhandene Löser, Compiler und Messwerkzeuge verwenden; Browser-Sichtung und Shrink Complexity bleiben. Neue dauerhafte Tests nur auf ausdrücklichen Auftrag. Siehe Skill workbench und docs/figuren-design-und-assets.md.


Stand 17.10.2026. Stil ist entschieden: A1 Tonale Werkbank als gemeinsame Bildsprache; jede Familie baut ihre eigene Welt aus dem Bühnenkatalog (Skill, Abschnitt 3a), nicht die Werkbank der Smoothie-Szene. Jede Session beginnt mit dem Skill `workbench` (`.devin/skills/workbench/SKILL.md`) und liest dann ihren Abschnitt hier plus den passenden Abschnitt in `docs/figuren-familienplan.md`. Eine Session baut genau eine Familie (oder die Engine-Arbeit von S2) und endet mit grünem Gate, Kontaktbogen und lokalem Commit. Kein Push, keine Löschung alter `.viz.json` ohne Noas Freigabe.

## Regeln für jede Session

- Nach Integrator 1 gilt der lokale Integrationscommit auf `feature/figuren` als Basis aller neuen Sessions. Workbench und `docs/figuren-s3/bedienung.md` bestimmen die gemeinsame Hülle einschließlich Hinweisen. Sichtbares „Ablauf als Text“ entfällt; zugängliche Zustandsbeschreibung und Druckfassung bleiben. Die Reviewkorrekturen zu Deckkraft, stabilen Screenshots und vollständig innerhalb der Karte liegenden Knöpfen stehen im Workbench-Skill.

- Seit Noas S3-Review: Darstellungsform pro Beispiel wählen, den Vorgang im Zusammenhang mit der Lektüre entwerfen. Sequenz, Kamerafahrt, Tafel-Zoom und vollständige Erklärung in der Bühne sind keine allgemeinen Anforderungen. Siehe `docs/figuren-lesson-and-stage.md` und den aktualisierten Skill. Konkrete Technikaufträge und Dateibesitz bleiben gültig.
- Branch von `feature/figuren-s1` (oder dessen Nachfolger) als `feature/figuren-s<N>`. Worktree mit eigenem Port (`E2E_PORT`).
- Reihenfolge: Modell und Tests, dann Geometrie, dann Inhalt, dann E2E, dann Kontaktbogen ansehen, dann Messung, dann Commit.
- Neue Kit-Bausteine (K1 bis K12 im Familienplan) nur, wenn die Familie sie braucht, immer mit Negativtest für das Tiefen-Orakel.
- Abweichungen vom Plan stehen im Session-Digest `docs/session-<datum>-figuren-s<N>.md` mit Grund. Der Digest nennt Messwerte (Frame-Zeit, Chunk) und die Pfade der Kontaktbögen.
- Done heißt: alle Punkte unter „Abnahme“ der Session erfüllt und im Digest belegt. Ein offener Punkt wird als offen gemeldet, nicht umformuliert.

## Anfragen aus Welle 1 und nächste Zuständigkeit

Gesammelt aus `session-2026-10-17-figuren-s2.md`, `session-2026-10-17-figuren-s3.md`, dem S3-Bedienungsnachtrag und `session-2026-10-17-figuren-s4a.md`. Die folgenden Punkte sind Übergaben, keine stillschweigend erfüllten Abnahmen.

### Nächste Integrator-/Engine-Session

- S2: Performance weiter messen. Smoothie erreicht beim Beat 5,1/4,8 ms, beim Ziehen 10,4/9,4 ms und bei Kamerafahrt 9,8/9,7 ms (Desktop/Mobil). Ziel Beat unter 4 ms, mindestens unter 6 ms; Ziehen/Kamera unter 8 ms. Projektionscache-Versuch ohne verlässlichen Gewinn wurde verworfen. Keine angenäherte Malreihenfolge mit falscher Tiefe wiederholen. Pro Optimierung ein gemessener Eingriff, mindestens 5 % Gewinn und korrekte Bilder/Tiefe.
- S2: Runtime-Budget von 10000 B gzip weiter beachten; S2 meldete 10431 B, Shared-Kit 4711 B separat. Bei weiteren Engine-Erweiterungen nicht hinter anderen Chunks verstecken. Neue Messung gehört in den jeweiligen Integrationsdigest.
  Integrator 1 nach der Reviewkorrektur: Runtime 10003 B gzip, Shared-Kit 5971 B separat; das strikte Runtime-Ziel bleibt um 3 B verfehlt. Gesamt-Lint über die 43 betroffenen Code-Dateien meldet 27 Bestands-Komplexitätsfehler; die integrierte Runtime, Engine, HintFigure und Smoothie bestehen den Lint-Aufruf.
- S2/S5/S6a: `explore`, `compare` und erzeugte Trace-Beats besitzen vorbereitete Schema-/Compile-Verträge, aber noch keine vollständige Bedienung beziehungsweise fachliche Expansion. Gemeinsame Runtime-, Schema- und Compileränderungen vor Umsetzung zuweisen und seriell integrieren. Familien können parallel Modelle, eigene Szenen und Inhalte bauen; keine privaten Runtime-Forks.
- S3: Direkte Auswahl einzelner Ebenen/Zellen braucht einen eigenen Szenenvertrag mit Tastaturäquivalent und Rückmeldung am Gegenstand. S2s bestehende Erklärung statischer Teile ist kein allgemeiner Auswahlvertrag. Vor Bedarf für F1/F2 zentral klären.
- S3: Szenenauswahl im Figurenlabor und vorhandenen Messwerkzeug ergänzen; künftige Sessions sollen keinen HTTP-Auswahladapter benötigen.
- S2/S4a: Geerbte Gesamt-Lint-Befunde separat bearbeiten, falls uneingeschränkt grünes Bestands-Lint verlangt wird. S2 dokumentiert zwölf bestehende Komplexitätsbefunde, S4a 21 Komplexitäts- und fünf Promise-Executor-Meldungen in seinen betroffenen Bestandsdateien. Neue/geänderte Funktionen müssen weiterhin höchstens Komplexität 10 haben; keine Unterdrückung einbauen.
- Erledigt in Integrator 1: `kind: beats` in fünf S3-Spezifikationen; Workbench als endgültiger Skill und gemeinsame Hülle; S3s Flat-/Spatial-Vertrag; bestehende 27er-Mengenannahme entfernt, Browserselektoren auf ihre Figur begrenzt und alte Menüannahmen an S3 angepasst. Tour-Kontrastbefund aus S3 bleibt als historischer Befund dokumentiert; im integrierten Dev-Gesamtlauf trat er nicht auf.

### S4b, nächster F12-/Aufgabenlauf

- S4a: Antwortformat v1 `{ kind, schemaVersion, form, steps }`, `scene_answer.mjs`, `scene_build_grader.mjs` und `balance_model.mjs` unverändert als fachliche Grundlage verwenden. Kamera-/Pointerzustände gehören nicht in Antworten. Formularzustand in der Szene darstellen, Feldfehler aus `fields`, Feedbackzustand aus `simulation` übernehmen.
- S4a: Öffentliche Mixer-/Waagenfamilien erst mit funktionsfähiger UI registrieren. Deterministischen Registry-Pfad, `familyEventInput`, bestehende Mastery-, Offenlegungs- und Fresh-Seed-Regeln verwenden; Coverage regulär regenerieren. Datenbank-/Exportversion bleibt 3. Bestehende S4a-Roundtrip- und Golden-Nachweise nutzen; neue dauerhafte Tests/Baselines nur nach konkretem Auftrag.
- Integration: Dieselbe Workbench-Hülle auch im Hinweismodus verwenden; keine Kameramenüs, Abbildungspräfixe oder sichtbare Textausklappung erneut einführen. Der Hinweis teilt die erste Textstufe und bleibt nach Ausblenden gezählt. Materialtext mit tatsächlicher Deckkraft prüfen, Knöpfe vollständig innerhalb der mobilen Karte halten.

### S5, nächster F7-Lauf

- S2: Runtime- und Frame-Budgets oben als offene gemeinsame Basis mitführen; Familienleistung getrennt messen. S5 misst vor Ausbau 400 SVG-Kacheln gegen Canvas 2D und fordert benötigte gemeinsame Renderer-/Explore-Anbindung früh beim Integrator an.
- S3: Lektionsfluss, konkrete Änderung und grafisch geeignetes Beispiel vor Bühne und Detailgeometrie wählen. Ausgangswelten sind veränderbar; Tafel-Kamerafahrt ist optional. Neue Figuren wählen ausdrücklich flat/spatial. Reviewbilder erst im fertigen Zustand aufnehmen und Materialkontrast einschließlich Deckkraft messen.

### S6a, nächster F1-Lauf

- S2: Trace-Expansion mit deutschen Beschriftungen und vollständiger Compilerprüfung vor Nutzung des vorbereiteten `beats: { from: trace }` zentral zuweisen. Keine Expansion durch einen privaten Szenen-/Runtimevertrag umgehen.
- S3: Falls direkte Namens-/Objektauswahl nötig ist, Auswahlvertrag samt Tastaturäquivalent vorab anfordern. Vorhandene Trace-Familien und CPython gegenprüfen; keinen zweiten Python-Interpreter bauen. F2 bleibt später bei S6b.

### Nächster F3-/F4-Nachlauf, S5b

- S3: Sichere Hinweisadapter und Zuordnungen für `transform-rank-dependence-rowops`, `classify-rank-solution-case` und `formula-det2-independence` fehlen noch. Nur mit S2s Hinweisvertrag, Compile-Lecksperre und sicheren Nachbarbeispielen ergänzen.
- S3: `pca-shadow` und `kmeans-pizza` bleiben für S5b vorgemerkt. Die Matrixdarstellung wurde von Noa als passend bewertet; daraus folgt keine pauschale gestalterische Freigabe aller anderen Szenen. Alte `.viz.json` bleiben bis zur ausdrücklichen Freigabe erhalten.

## Anfragen aus Welle 2 und nächste Zuständigkeit

Stand 18.10.2026. Quellen: `session-2026-10-17-figuren-s4b.md`, `session-2026-10-17-figuren-s5.md`, `session-2026-10-17-figuren-s6a.md` und `figuren-s6a/trace-contract.md`. Diese Zuordnung ergänzt die offenen Welle-1-Punkte. Die aktuellen Regeln zu Tests und Dateibesitz gehen älteren Aufträgen unten vor.

### S2b, nächste gemeinsame Engine-/Vertragssession

- S5, Explore: Den vorhandenen Vertrag `{parameter,min,max,step,input:'number'}` tatsächlich bedienen. Endliche, bereichsgültige Werte erst nach `scene.validateParams` übernehmen, Modell neu berechnen und Pose/Kamera definiert zurücksetzen; Vorhersagezustand nach Parametersatz trennen. F7 benötigt `eta`. Keine private Familien-Runtime.
- S5, Compare: Benannte Parametersätze A/B durch denselben Modell-/Build-Pfad mit gleicher Kamera und gleichen Achsengrenzen führen. Mobil zugänglicher Umschalter oder lesbare Ansichten untereinander. Bei Ridge/Lasso den regularisierten Zustand vergleichen; Phase 0 zeigt zweimal unregularisierte Gewichte.
- S5, Canvas: 400 identische Kacheln ergaben isoliert SVG 2,4 ms, Canvas 0,7 ms. Ein gemeinsamer Layer braucht einen Vertrag für Größe/DPR, Kamera, Theme, Reduced Motion, Forced Colors, Druck und Viewport-Pause. Erst nach diesem Vertrag einbauen. Die veröffentlichte 64-Kachel-F7-Szene erreicht laut Digest 3,9 ms Beat / 7,2 ms Drag und benötigt keinen vorgezogenen Renderer-Fork.
- S5/S6a: Das integrierte Runtime-Budget erneut messen. Nach Integration beträgt FigureRuntime 10027 B gzip, also 27 B über dem strikten Ziel unter 10000 B; Shared-Kit 5975 B separat. S4bs Vereinfachung allein erreichte 9979 B, S6as Schrift-/Weißraum-Unterstützung und die gemeinsame Bündelung ändern das Ergebnis. Die früheren Branchwerte sind keine gemeinsame Budgetabnahme. Smoothie-Frame-Befunde aus Welle 1 bleiben offen.
  Integrator 2 hat drei vorhandene Messläufe wiederholt (4× CPU, Median der Laufmediane): Desktop/Mobil Beat 5,0/4,7 ms, Ziehen 9,8/9,4 ms, Kamerafahrt 9,5/8,8 ms. Bevorzugtes Beatziel und Zieh-/Kameraziele bleiben offen. Nachweise in `figuren-integration-welle-2/performance.json`.
- S6a/S6b: Direkte Namens-, Objekt- und Zellenauswahl zentral festlegen: Auswahlziel, Tastaturäquivalent und Rückmeldung am Gegenstand. Kein universeller Auswahlvertrag ist bereits vorhanden. F2 darf Modelle, Geometrie und feste Lektionsbeispiele parallel entwickeln, interaktive Auswahl erst nach Übergabe dieses Vertrags.
- S6a, dauerhafte CPython-Gegenprüfung: Datenvertrag für Code, Eingaben, Aufrufrahmen, sichtbare Ereignisse und normalisierte Objektidentitäten entwerfen. Aliasgleichheit statt Speicheradressen vergleichen; return, print und Exceptions unterscheiden. Die einmaligen S6a-Proben sind keine dauerhafte Suite. Neue permanente Prüfungen erst nach Noas konkretem Auftrag implementieren.
- S6a, Hinweis-Präfix: Pro Fall Ziellinie, gesuchte Namen/Werte und letzten erlaubten Zustand festlegen. Spätere Bindungen, Objekte, Ausgabe und Ausnahmeklassifikation auch geometrisch verbergen. Bis zum sicheren Vertrag bleiben die sechs neuen F1-Szenen im Hinweismodus gesperrt.
- Gemeinsame Aufgabenverträge für `pick-learning-rate` und `tag-after-line` vor einer Umsetzung zuweisen. S4as Antwortformat und deterministische Grader bleiben maßgeblich. Freie F1-Parameter benötigen erzeugte, gegengeprüfte Spuren und den gemeinsamen Eingabevertrag; für das Kurzschlussbeispiel fehlt noch ein passender vorhandener Familienfall.
- Welle-1-Nachlauf: Labor-Szenenauswahl und Messwerkzeug sowie die dokumentierten Bestands-Komplexitätsbefunde bleiben eigene Aufträge. Keine pauschale Reparatur fremder Funktionen während einer Familienintegration.

### Nächster F7-Nachlauf nach S2b

- Explore/Compare mit den vorhandenen F7-Modellen anbinden und Lernrate sowie regularisierten Ridge/Lasso-Vergleich selbst im Browser bedienen. Neue Hinweise erst nach sicherem Fall-/Nachbarvertrag und bestehender Lecksperre; gesuchtes neues Gewicht numerisch und geometrisch verbergen. `pick-learning-rate` ist weiterhin offen. Keine neue Szene als Ersatz für fehlende gemeinsame Bedienung erfinden.
- Die vorhandene 400-/64-Kachel-Messung und Abstandskorrekturen aus `figuren-s5/` verwenden. Gemeinsamer Readout ist noch 13 px; seine lesbare Typografie gehört S2b. Familienlayout und tatsächliche Trägerkontraste erneut bei mobiler Größe prüfen.

### Nächster F1-Nachlauf nach den gemeinsamen Verträgen

- Die sechs festen Programme und Compiler-Expansion sind integriert. `beats: {from: 'trace'}` wird zentral in normale, validierte Beat-Arrays erweitert; dieser frühere Welle-1-Blocker ist erledigt. Keine zweite Expansion in Runtime oder Lektionen bauen.
- Sichere Hinweise, direkte Auswahl, `tag-after-line`, freie Parameter und Kurzschluss-Familienfall bleiben offen. Den genauen Zustand aus `docs/figuren-s6a/trace-contract.md` übernehmen. CPython-Nachweise aus dem Digest erhalten, nicht als Freigabe beliebiger Programme auslegen.

### F12 / S4b abgeschlossen, gemeinsame Schnittstellen erhalten

- S4b meldet keine offene Schnittstellenanfrage. `stepContent`, `onRestart`, kanonische Objektantworten und das Entfernen alter SVG-Items beim Modellwechsel sind integriert. `spec.predict` geht direkt an das vorhandene Fragenpanel. F12 und die beiden Aufgaben sind lokal reviewbar; eine visuelle Freigabe durch Noa ist damit nicht behauptet.

### Welle 3: vier Familien parallel, gemeinsame Dateien eindeutig zuweisen

- S6b/F2 auf 4407, S7/F5+F8 auf 4408, S8a/F6+F9 auf 4409 und S8b/F10+F11+statische Figuren auf 4410 starten vom finalen lokalen Welle-2-Integrationscommit. Normale Git-Worktrees unter `/Users/no8/Desktop/life/Lifemaxxing/`, kein Push und kein Merge durch Familien.
- Geteilte Lektionen haben genau einen Schreiber: S7 besitzt `l-data-cleaning`; S8a liefert dafür einen Vorschlag im eigenen Digest. S8b besitzt `l-genai-rag` und `l-capstone-freeze`; S7 liefert dafür Vorschläge im eigenen Digest. Das umfasst jeweils Lektions-JSON und bestehende Markdown-Dateien. Neue eigene Fragmentdateien sind erlaubt, ihre Einbindung übernimmt der Besitzer beziehungsweise Integrator.
- S8b besitzt neue gemeinsame Graph-Primitive K7; S7 fordert benötigte Schnittstellen an und arbeitet bis zur Übergabe an eigenen reinen Modellen. Kein paralleles Anlegen derselben Kit-/Objektdatei. Bestehende gemeinsame Dateien bleiben beim Integrator.
- S2b kann parallel ausschließlich die oben zugewiesenen gemeinsamen Verträge bearbeiten (4411). Familien verwenden bis zu deren Übergabe den vorhandenen Vertrag; keine Ersatzbedienung und kein fremder Schema-/Runtime-Fork. S2b vor abhängigen Familienänderungen integrieren und die konkrete Basisübergabe dokumentieren. Vollständige Prompts und Übergabereihenfolge: `docs/figuren-welle-3-prompts.md`.
- S5b/PCA/K-Means und die sicheren F3/F4-Hinweise bleiben ein separater Nachlauf aus Welle 1. Nicht stillschweigend einem der vier Welle-3-Zweige zuweisen.

## S2 Engine, Bedienung, Hinweismodus in Aufgaben

Ziel: Die Figur wird zur Lösungshilfe in Aufgaben, die Engine ist bereit für alle Familien.

1. **Vertrag erweitern** (ADR-0018 auf „Angenommen“, Abschnitt Stil = A1):
   - `hintParams(familyId, caseParameters) → params | null` und `hintBeatIds` in Szenen mit Hinweismodus.
   - `validateParams(params, { mode })`: im Modus `hint` gelten die Wertebereiche der Aufgabenfamilie (Smoothie: ganzzahlige und gebrochene Lösungen, auch negativ; Portionen werden im Hinweismodus nicht als einzelne Schaufeln gezählt).
   - Erzeugte Beats (`"beats": { "from": "trace" }`) und `explore`-Parameter mit Zahlenfeld nur als Schema und Compile-Regel vorbereiten; gebaut werden sie in S5 und S6.
2. **Zuordnung Aufgabe zu Figur**: neue Datei `content/figure-hints.json` mit Schema `schemas/figure-hints.schema.json`: Einträge `{ familyId, caseIds?, scene, source: "case" | "neighbor", neighborParams? }`. `source: "neighbor"` ist Pflicht für Klassifikationsfamilien (die Figur zeigt dann die Klassen an einem festen Nachbarbeispiel, nie die Instanz). Erste Einträge: `transform-system-2x2-elimination`, `classify-column-combination` (`column-coefficients-double`) mit der Smoothie-Szene.
3. **Lecksperre als Build-Gate**: `compile_content` rendert für jeden zugeordneten kuratierten Fall und die Seeds 0 bis 49 alle Hinweis-Beats (`build` im Modus `hint`, `readout`, `describe`) und bricht ab, wenn der erwartete Wert der Aufgabe (aus dem Löser der Familie, nicht nur `answerValues`) in einer üblichen Schreibweise erscheint: ganze Zahl, Dezimalzahl mit Komma und Punkt auf 0 bis 3 Stellen, Bruch, beide Minuszeichen.
4. **Geometrisches Leck**: Im Hinweismodus zeigt die Tafel die gesuchte Größe nie abzählbar. Smoothie: Der gesuchte Pfeil ist ein gestrichelter Strahl ohne Unterteilung in Portionen und ohne Koeffizient, der Mixer zeigt „? Portionen“. Checkliste für jede Szene im Digest abhaken.
5. **Hinweis-UI** (`src/ui/ExerciseFrame.tsx` und die Views, die `hints` zählen):
   - Hat eine Aufgabe eine Hinweisfigur, steht neben „Hinweis anzeigen“ ein zweiter Knopf „Hinweis als Figur“. Beide zählen als ein Hinweis gegen `MASTERY_MAX_HINTS = 1` über denselben Zähler, den die View heute für Texthinweise nutzt (Zählpfad vorher finden und im Digest nennen). „Lösung anzeigen“ bleibt getrennt.
   - Ab 1100 px Breite: Die Figur erscheint in der rechten Spalte als klebende Karte über „Dein nächster Schritt“; die Spalte wird dafür 420 statt 320 px breit (`.exercise-layout.has-figure-hint`), damit die Tafel im Tafel-Beat mindestens 14 px Text hat und die Figur sichtbar bleibt, während man die Antwort eintippt.
   - Unter 1100 px: Die Figur steht direkt unter dem Hinweisstapel in voller Breite, mit „Figur ausblenden“ (der Hinweis bleibt gezählt). Kein zweites Scrollen nötig, um zwischen Figur und Antwortfeld zu wechseln: Die Karte ist höchstens 70 % der Viewport-Höhe hoch.
   - Kopfzeile der Karte: „Hinweis · Abb. · {Titel}“. Keine Vorhersage im Hinweismodus. Bedienung wie in der Lektion (vier Knöpfe).
6. **Aus `docs/figuren-parallelplan.md` Teil A, alles in S2:** Feld `kind` mit Compile-Regeln je Art (Laufzeit baut zunächst `beats`, `hint`, `inline`, `static`; `explore` und `compare` als Schema, gebaut in S5); Kamera-Überblenden; `sessionStorage` für den letzten Beat und den Zieh-Hinweis; „Ablauf als Text“; Druckansicht; adaptive Ruhe; Forced-Colors; Screenshot-Referenzen für Smoothie; `tools/new_figure_scene.mjs` mit Vorlage, erprobt an einer Wegwerf-Szene, die wieder gelöscht wird.
7. **Frame-Budget**: Ergebnis des Hill Climbs aus S1 übernehmen (`docs/figuren-perf-hillclimb.tsv`); wenn ein Ziel offen ist, die dort genannte nächste Maßnahme umsetzen.

Abnahme: Compile bricht bei einem absichtlich eingebauten Leck ab (Test); E2E für beide Breiten (Figur erscheint am richtigen Ort, Hinweiszähler steigt um genau 1, Kompetenzbeleg-Hinweis wie bei Texthinweisen); axe ohne serious/critical; Kontaktbogen der Aufgabenansicht mit Hinweisfigur bei 1440 und 375 px, hell und dunkel, angesehen.

## S3 Familien F3 und F4

Szenen laut Familienplan: `smoothie-row-and-column` (ersetzt `two-lines`), `solution-cases-3d` (ersetzt `solution-cases`), `span-carpet` (ersetzt `span-2d`), `receipt-elimination` (ersetzt `row-operation`), `receipt-echelon-3x3`. `pca-shadow` und `kmeans-pizza` folgen in S5b, wenn S3 zu groß wird (dann im Digest sagen).

Kit: K4 Ebenen im Raum, K5 Punktwolke (nur wenn PCA drin ist), K6 Weltpfeil, K11 Zahlenfeld-Steuerung, K2 Zellgitter als Ebene, Fliesen.

Abnahme: jede Lektion des Moduls mit Figur; alte Checkpoints wörtlich übernommen und vom Compiler gegen das Modell geprüft; Hinweisfiguren für `transform-rank-dependence-rowops`, `classify-rank-solution-case` (Nachbarbeispiel), `formula-det2-independence` (Nachbarbeispiel); Frame-Zeit je Szene im Digest.

## S4 Familie F12 und Aufgabentyp `scene-build`

Erst die Datenseite (Recherche §7a): Format der strukturierten Antwort im Attempt-Datensatz und im JSON-Import mit Roundtrip-Test, Golden-Korpus, Mastery-Regeln, Review-Routing für frische Seeds, `activityTypeLabels`, Titelregeln, Coverage-Matrix. IndexedDB-Schema nur mit getesteter Migration ändern.

Dann Szenen `balance-isolate`, `bag-unpack` (ersetzt `distributive-law`), `power-stack`, und die Aufgaben `mix-to-target` (F3) und `balance-solve` (F12) mit Grader über Eigenschaften. Kanonische Eingabe ist ein Formular; die Szene stellt den Formularzustand dar.

Abnahme: Import-Roundtrip-Test, Golden-Korpus erweitert, E2E mit falscher Antwort zeigt die Simulation (Differenzpfeil, kippende Waage), Noas Review.

## S5 Familie F7 (Messlatte)

Szenen `mse-landscape` (ersetzt `mse-bowl`, `secant-tangent`), `residual-springs` (ersetzt `residuals`), `rubber-band-coefficients` (ersetzt `ridge-shrink`), `training-book` (ersetzt `lr-step`), `early-stopping-flag` (ersetzt `early-stopping`).

Kit: K1 Kachelfläche bis 400 Kacheln mit Höhenlinien und Bodenprojektion; Erkunden (Lernrate als Zahlenfeld). Vorab messen: 400 Kacheln im SVG gegen Canvas 2D unter dem SVG, Entscheidung mit Zahlen im Digest.

Abnahme: alle Punkte aus Recherche §6a (Fläche, Gradientenpfeil mit Komponenten, Spur, Divergenz bei zu großer Lernrate aus derselben Rechnung, nachvollziehbarer Bezug zu `w ← w − η · ∂L/∂w` im Lektionsfluss, Live-Anzeige mit echten Werten); die Tafel-Kamerafahrt ist nach dem S3-Review optional. Frame-Zeit beim Ziehen unter 8 ms gedrosselt.

## S6 Familien F1 und F2 (zwei Sessions, F1 zuerst)

F1: Trace-Stepper mit erzeugten Beats, Spuren aus den Trace-Familien, CPython-Prüfung der Spuren über `sys.settrace` im Python-Job. Kit K3, K12.
F2: Matrix- und Tensorbank, ersetzt `column-picture`, `matrix-transform`, `softmax-temperature`. Kit K2 in 3D.

## S7 Familien F5 und F8

Pipeline und Schwellen-Sortierer laut Familienplan; ersetzt `sigmoid-threshold`, `precision-recall-threshold`. Kit K7, K9.

## S8 Rest

F6, F9, F10, F11, statische Figuren, Siegel mit echtem SHA-256 (Test gegen `node:crypto`); ersetzt `chunk-overlap`. Ziel: alle 50 Lektionen haben eine Figur oder eine begründete Ausnahme.

## S9 optional

Erstes argmin-Video aus einer vorhandenen Szene mit ganglion (Szene ist eine reine Funktion von Parametern, Beat, Zeit und Kamera). JSXGraph entfernen, wenn keine `.viz.json` übrig ist (eigene Entscheidung, ADR).

## Anfragen aus Welle 3 und nächste Zuständigkeit

Stand 21.10.2026, Integrator 3. Diese Zuordnung ergänzt die offenen Punkte aus Welle 1 und 2. Die Familienlieferung ist keine Abnahme noch fehlender Bedienungen oder eine gestalterische Freigabe durch Noa. Es werden keine neuen Chats automatisch gestartet.

Die gemeinsame Basis ist `8172c3e82599d5aad2ae1e5291905dd9c480451f`, nach S2b-Merge mit Compiler, allen 2240 bestehenden Node-Prüfungen und Typecheck geprüft. Explore-Zahlenfeld, benannter A/B-Vergleich am regularisierten Zustand und der reine Lektionsauswahlvertrag sind integriert. F7 benennt Lernrate und Vergleichsvarianten ausdrücklich; der Szenentitel unterscheidet Ridge und Lasso. Der Painter bindet seinen Cache an das zuletzt in dieselbe DOM-Gruppe gemalte Item. Die reale A-B-A-Probe stellt A wieder her. Familiennachläufe beginnen vom finalen geprüften Welle-3-Integrationsstand und übernehmen keinen privaten Nachbarzweig.

### Nächste gemeinsame Engine-/Vertragssession, S2c

- Die verbleibenden Runtime-/Framebudgets anhand der Welle-3-Messungen bearbeiten. Readout ist mit S2b 14 px; die kleine Schrittanzeige bleibt 13 px. Kein relativer Optimierungserfolg ersetzt die Budgetabnahme. Ein gemeinsamer Canvas-Layer bleibt ein eigener Auftrag mit DPR, Größenänderung, Kamera, Themes, Reduced Motion, Forced Colors, Druck und Viewport-Pause. S8as 1024-Punkte-Probe ist kein freigegebenes Unterrichtsbeispiel.
- Versionierte Antwort-/Graderverträge für Topologie, Split-Grenze, optimale Schwelle, Baum-Split `{feature, threshold}`, `layer-chain`, Attention-Maske, `pick-learning-rate` und `tag-after-line` zuerst eindeutig zuweisen. S4as Hülle `{kind:'scene-build',schemaVersion:1,form,steps}` und vorhandene deterministische Löser bleiben maßgeblich. Gleichwertige gültige Antworten und numerische Toleranzen zentral festlegen. Direkte Lektionsauswahl ist keine bewertete Antwort.
- `python-trace/v1` und `trace-hint-prefix/v1` sind dokumentierte Folgeanforderungen in `figuren-s2b/contracts.md`, keine implementierte Freigabe beliebiger Programme oder sicherer Hinweise. Neue dauerhafte CPython-Prüfungen benötigen weiterhin Noas konkreten Auftrag.
- Zugänglichen Öffnen-/Schließen-/Fokus-/ARIA-Vertrag vor aufklappbaren statischen Belegkarten liefern. Labor-Szenenauswahl, Bestands-Komplexität und die gemeldeten Glossar-/Formelbefunde anhand des Integrationsgates weiterführen.

### Nächster F2-Nachlauf, Besitzer S6b

- `selectionTargets` auf dem geprüften gemeinsamen Vertrag an den eigenen Matrix-/Tensor-/Attention-Szenen ergänzen. Sichtbare eindeutige Ziele, modellbasierte Adressen/Werte und mindestens 44 px Trefferfläche prüfen; bei Bedarf Matrixblöcke statt zu kleiner Einzelzellen wählen. S2bs temporäre Adapter waren keine Familienimplementierung.
- Temperatur, Top-k, kompatible Tensorformen und Rang erst nach Anpassung der eigenen Modellvalidierung an die angebotenen Bereiche als Explore-Verbraucher veröffentlichen. Reset, getrennte Antworten und sämtliche angebotenen Modelle prüfen. `layer-chain`, Maskenaufgabe und Hinweise bleiben bis zu den zugewiesenen gemeinsamen Verträgen offen.

### Nächster Pipeline-/Schwellennachlauf, Besitzer S7

- S8as Fragment für fehlende große Umsätze unter dem alleinigen Lektionsbesitz von S7 in `l-data-cleaning` übernehmen. Die zwei S7-Prosa-Fragmente für RAG und Freeze werden unter S8bs Lektionsbesitz zusammen mit dessen K7-Darstellungen eingebunden. Kein zweites konkurrierendes IO-Bild ergänzen.
- Explore für Schwellen sowie Compare erst mit angepassten eigenen Parametersätzen, gleicher Datenprojektion und gemeinsamem Reset-/Antworterhalt abschließen. Topologie-, Split- und optimale Schwellenaufgaben bleiben bis zum deterministischen Vertrag offen. K7 ist durch S8b als reiner Graphvertrag verfügbar; eine Aufgabenbedienung folgt daraus nicht.

### Nächster F6-/F9-Nachlauf, Besitzer S8a

- `binWidth` als Explore-Verbraucher für die ganzzahligen Werte 1 bis 5, Startwert 2, anbinden. Punkt-IDs und Daten bleiben unverändert; Reset und getrennte Antworten prüfen. Das reine Zahlenfeld allein erfüllt diese Familienabnahme nicht.
- Baum-Split erst nach zugewiesenem kanonischem Antwort-/Auswahlvertrag mit vorhandenem Gini-Löser veröffentlichen. Alle gleich guten Kandidaten akzeptieren. Große Punktmengen bleiben bis zum gemeinsamen Renderer-Nachweis offen.

### Nächster Graph-/Token-/Belegnachlauf, Besitzer S8b

- Topologische Auswahl und aufklappbare Belegkarten erst nach den oben zugewiesenen gemeinsamen Verträgen ergänzen. Bis dahin bleiben die vollständigen festen Darstellungen maßgeblich. Die integrierten RAG-/Freeze-Fragmente und K7 besitzen genau einen Schreiber, S8b.
- Die Bestandsübersicht aus dem isolierten S8b-Zweig wird durch die tatsächliche Welle-3-Integrationsübersicht ergänzt. Eine Figur in einer Lektion bedeutet weder Ablösung sämtlicher JSXGraph-Bestände noch Abnahme aller Aufgaben und Hinweise.

### S5b bleibt offen

S5b besitzt weiterhin `pca-shadow`, `kmeans-pizza` und die sicheren F3-/F4-Hinweisadapter für Rang, Lösungsfall und Determinantenfall. Eine vorhandene Matrixfigur ist keine pauschale Freigabe dieser Nachläufe. Alte `.viz.json` erst nach ausdrücklicher Freigabe löschen.

### F7-Nachlauf bleibt offen

Die vorhandene Lernratenbedienung und der regularisierte Ridge-/Lasso-Vergleich sind gemeinsam integriert. Sichere Fall-/Nachbarhinweise, `pick-learning-rate`, mobile Familienabnahme und Noas gestalterische Freigabe bleiben beim nächsten F7-Lauf. Das numerisch oder geometrisch gesuchte Gewicht darf in Hinweisen nicht vorweggenommen werden. Die gemeinsamen Performancegrenzen bleiben separat offen.

### F1-Nachlauf bleibt offen

Die sechs festen Programme und die zentrale Compiler-Expansion bleiben erhalten. Direkte Namens-/Objektauswahl muss an den geprüften Auswahlvertrag angebunden werden; Aliasnamen behalten getrennte Ziele mit gemeinsamer Objektmarke. Sichere Hinweise, `tag-after-line`, freie Parameter und Kurzschluss-Familienfall bleiben offen. Der dokumentierte CPython-/Präfixvertrag ist vor diesen Erweiterungen umzusetzen und gegen echte Spuren zu prüfen.
