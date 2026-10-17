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
