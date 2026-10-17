# Session S2: Engine und Hinweisfiguren

Worktree: `/Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s2`.
Zweig: `feature/figuren-s2`, Basis `51cbc90b` auf `feature/figuren`.
Normaler Git-Worktree mit gemeinsamer Git-Verwaltung in `argmin/.git`, außerhalb des Windsurf-Verzeichnisses. Port 4401. Kein Push, kein Merge.

## Basis-Gate vor der Umsetzung

17.10.2026, `npm ci`: 132 Pakete installiert. Der bestehende Lockfile meldet eine hohe npm-Sicherheitswarnung; keine Abhängigkeitsänderung in S2.

| Prüfung | Ergebnis |
|---|---|
| Compile und Content-Validierung | bestanden |
| Node | 2226 bestanden, 0 Fehler, 5 übersprungen, 43,25 s |
| Typecheck und Coverage | bestanden |
| Chromium Entwicklung, Port 4401 | 96 bestanden, 25 übersprungen, 58,2 s |
| Release-Build und Chromium, Port 4401 | 94 bestanden, 27 übersprungen, 37,5 s |

## Hinweiszählung

`src/ui/FamilyExerciseView.tsx`: `openHint` erweitert `shownHints` und schreibt `hint-used` über `recordAssistance` und `familyEventInput`. `submit` nimmt das Maximum aus `shownHints.length` und `instanceAssistance(...).hintsUsed` für das Attempt-Ereignis. Die Hinweisfigur öffnet dieselbe erste Hinweisstufe; nach einem Texthinweis kostet sie keine weitere Stufe. Ausblenden erstattet keinen Hinweis. Weitere Texthinweise bleiben weitere Stufen. `MASTERY_MAX_HINTS = 1` bleibt unverändert. Attempt-Format, IndexedDB und Grader bleiben im Besitz von S4a.

## Geometrische Lecksperre Smoothie

- [x] Gesuchte Gewichte erscheinen als Fragezeichen.
- [x] Strahlen zeigen Richtungen mit konstanter Länge, ohne Portionen oder Unterteilungen.
- [x] Keine resultierende Pfeilkette, aus der sich ein Gewicht abzählen lässt.
- [x] Keine Schaufeln, Portionenstriche oder berechnete Flüssigkeitshöhe im Hinweis.
- [x] Mixeranzeige „? Portionen“.
- [x] Klassifikation bekommt ein festes Nachbarbeispiel, keine Instanzparameter.
- [x] Fallparameter akzeptieren negative und gebrochene Lösungen.

## Umsetzung S2, Punkte 1 bis 7

1. ADR angenommen, Stil A1. `validateParams` und `model` erhalten den Modus. Smoothie liefert eigene Hinweis-Beats und einen Falladapter. Schema für `kind`, Trace-Beats, Zahlenfeld und Vergleich vorbereitet.
2. Zuordnung für alle Fälle von `transform-system-2x2-elimination` und ausschließlich `column-coefficients-double` der Klassifikationsfamilie. Klassifikation nutzt feste Nachbarparameter.
3. Compile-Gate gegen Familienlöser, einschließlich kuratierter Originalparameter und Seeds 0 bis 49 jedes bedienten Fall-/Profilpaars. Start, Mitte und Ende jedes Beats werden geprüft. Ein absichtliches Leck in `readout`, ein Leck nur während eines Beats und ein unwahres `answerValues` werden im Test abgefangen. Ganze Zahlen, Dezimalpunkt/-komma, Brüche und beide Minuszeichen sind abgedeckt. Fehler des Generators werden nicht als unbedientes Profil verschluckt.
4. Geometrische Checkliste oben. Hinweismodelle geben dem Renderer keine gesuchten Portionen oder gesuchten Längen zum Abzählen. Der Tiefensweep prüft 216 Kamerawinkel am Hinweiszustand mit derselben Malliste wie der Renderer.
5. Ein Hinweiszähler für Text und Figur, einschließlich Wiederöffnen und Reload. Eine Figur zur bereits geöffneten ersten Textstufe kostet keine zweite Stufe. Ausblenden erstattet nichts. Im Desktop steht die Karte in der 420-px-Spalte über dem nächsten Schritt, unter 1100 px direkt nach dem Hinweisstapel. Bei geöffneter Handyfigur folgt das Antwortfeld unmittelbar darunter, statt dass die Aktionsknöpfe beide auseinanderziehen. Ein stabiler Schlüssel erhält bereits getippte Eingaben beim Umordnen; der Browser-Test prüft beides. Nur eine Runtime ist gleichzeitig gemountet.
6. `beats`, `hint`, `static` und `inline` sind darstellbar. Statische Teile öffnen per Antippen eine Erklärung, die Tastatur öffnet die Gesamterklärung. Szenen können `describe(..., partId)` dafür verfeinern. Inline-Figuren haben keine Knöpfe und keinen Tab-Stopp, ihre Bühne ist höchstens 160 px hoch. Gespeicherter Beat, gespeicherter Zieh-Hinweis, Textalternative, Druckzustand, 150-ms-Kameraschnitt, adaptive Ruhe, Forced Colors und 200 % Schrift sind geprüft. Die Kameragrenzen erlauben echte Frontalansicht und Draufsicht. Größenänderungen passen die Kamera auch im Ruhezustand an. Ein außerhalb des Viewports beendeter Schnitt bleibt beim Zurückscrollen sichtbar.
7. S1-Hill-Climb übernommen, einen weiteren Projektionscache in drei Läufen gemessen und verworfen. Kein verlässlicher Gewinn über 5 %, mobile Kamerafahrt schlechter. Das genaue Sortierverfahren bleibt erhalten. Endstand ebenfalls dreimal gemessen.

## Generatorprobe

`node tools/new_figure_scene.mjs s2-wegwerf --world Prüffeld --kind beats` erzeugte Modul, Spezifikation, Node-Test, Browser-Test und alphabetische Registry-Einträge. Node- und Browser-Test bestanden. Danach wurden alle vier Wegwerf-Dateien und beide Registry-Ergänzungen entfernt.

Der Generator legt neue Spezifikationen unter `content/figures/` ab. Eine neue Datei direkt unter `content/lessons/` wäre ohne Lektionsverweis verwaist und würde das bestehende Gate sperren. Die Familien-Session bindet den Entwurf mit `contentRef` in ihre eigene Lektion ein und ersetzt das Referenzmodell durch den fachlichen Mechanismus. Bestehende Dateien werden nicht überschrieben.

## Messungen

Chromium, vierfache CPU-Drosselung, je drei Läufe, Median der Mediane, volle Bewegung. Das opt-in Perf-Harness setzt `window.__argminFigurePerf`; während dieser Messung greift die adaptive Ruhe nicht ein, damit die Messung die volle Arbeit bewertet. Die Ruheumschaltung wird separat mit 30 langsamen Frames getestet.

| Skriptzeit pro Frame | 1440 px | 375 px | Ziel |
|---|---:|---:|---:|
| Beat | 5,1 ms | 4,8 ms | unter 4 ms, mindestens unter 6 ms |
| Ziehen | 10,4 ms | 9,4 ms | unter 8 ms |
| Kamerafahrt | 9,8 ms | 9,7 ms | unter 8 ms |

Protokoll: `docs/figuren-perf-hillclimb.tsv`. Der Versuch mit eindeutigen Mesh-Vertices wurde zurückgenommen. Die Kamera-/Viewport-Version und die Forced-Colors-Töne sind Korrekturen, keine angenommene Performance-Optimierung.

| Hinweisfigur im Tafel-Beat | 1440 × 900 | 375 × 812 |
|---|---:|---:|
| Kartenhöhe, hell und dunkel | 690,6 px | 566,3 px |
| Kleinster Tafeltext | 19,9 px | 15,9 px |
| 70 % der mobilen Höhe | entfällt | 568,4 px |

## Sichtprüfung und Referenzen

Den Kontaktbogen mit der tatsächlichen Aufgabenansicht bei 1440 und 375 px, jeweils hell und dunkel, selbst als PNG geöffnet und angesehen. Auch die einzelnen Desktop- und Handyansichten wurden geöffnet. Der erste Bogen zeigte einen Strahl, der die Formel berührte; die Strahlen liegen jetzt in einem getrennten Bereich. Die Karte enthält keine Portionenwerte, die Formeln sind lesbar und alle vier Knöpfe passen in eine Reihe.

- Kontaktbogen lokal: `.figure-shots/s2/kontaktbogen.html` und `.figure-shots/s2/kontaktbogen.png`.
- Einzelansichten und DOM-Messungen: `.figure-shots/s2/task-<breite>-<theme>.png`, `metrics-<breite>-<theme>.json`.
- Zwölf eingecheckte Chromium-Referenzen: `tests/e2e/figures-s2.spec.ts-snapshots/`, Übersicht, Tafel und Schlussbeat, beide Breiten und Themes. Erstmals mit bewusstem `--update-snapshots` erzeugt. Die vier Tafelbilder wurden danach einmal wegen der korrigierten echten Frontalansicht erneuert. Der plattformabhängige Dateisuffix wurde entfernt. Weitere Prüfläufe vergleichen ohne Snapshot-Update.

## Abschluss-Gate

Compile/Content-Validierung, Typecheck und Coverage bestanden. Node-Gesamtsuite: 2240 bestanden, 0 Fehler, 0 übersprungen, 44,20 s. Die fünf vorher übersprungenen Prüfungen laufen nach dem Release-Bau ebenfalls. Ein Zwischenlauf gegen den noch alten, vor der Schemaänderung erzeugten `build-next` scheiterte erwartbar am neuen Pflichtfeld `kind`; nach dem regulären Neubau ist der vollständige Lauf grün. Keine generierten Bäume von Hand geändert.

| Finale Prüfung | Ergebnis |
|---|---|
| Compile und Content-Validierung | bestanden |
| Node, vollständiger Lauf nach Release-Bau | 2240 bestanden, keine Fehler oder übersprungenen Tests |
| Typecheck und Coverage | bestanden |
| Chromium Entwicklung, Port 4401 | 105 bestanden, 26 übersprungen, 50,9 s |
| Release-Build und Chromium, Port 4401 | 101 bestanden, 30 übersprungen, 37,0 s |
| Bild-, Pixel- und Bedienwächter nach Painter-Aufteilung | 21 bestanden, 2 übersprungen |
| S2-Abnahmen einschließlich Zoom, statischer Teile und Inline | 10 bestanden |
| axe in allen vier Aufgabenansichten | keine serious/critical Befunde |
| Lint Engine, Runtime, Painter und S2-Browsertests | keine Befunde |
| Vollständiges Lint der geänderten Dateien | zwölf vorbestehende Komplexitätsbefunde, siehe unten |

Gzip direkt aus dem finalen `build-next/assets/` mit `node:zlib` gemessen:

| Chunk | gzip |
|---|---:|
| Smoothie | 9471 Bytes |
| FigureRuntime | 10431 Bytes |
| Gemeinsames figure-kit | 4711 Bytes |
| Lazy HintFigure | 627 Bytes |
| Figuren-CSS | 1476 Bytes |

Kleine Implementierungscommits: `d2b4b19`, `82443d5`, `a78064c`, `29e06f5`, `c270f56`, `c7e9d2c`. Der letzte Commit dieser Session enthält Abnahmen, zwölf Referenzbilder, Messprotokoll und diesen Digest. Kein Push und kein Merge.

## Offene Punkte und Anfragen an den Integrator

- Frame-Ziel unter 4 ms sowie Ziehen/Kamerafahrt unter 8 ms bleiben offen. Der Mindestwert unter 6 ms für Beats ist erfüllt. Für eine nächste Optimierung ist ein weiterer gemessener Ansatz nötig; eine winkelweise angenäherte Malreihenfolge wurde bereits in S1 wegen falscher Tiefe verworfen und wurde nicht erneut eingebaut.
- Das dezimale Runtime-Ziel unter 10000 Bytes gzip wird um 431 Bytes überschritten. Die Szene bleibt unter 12000 Bytes. Der gemeinsame Kit-Chunk ist separat ausgewiesen; er ist nicht in der Runtime-Zahl versteckt. Anfrage an den Integrator: das Runtime-Budget bei den nächsten Engine-Erweiterungen berücksichtigen und nur anhand der Bild- und Tiefenwächter verkleinern.
- Der vollständige Lint-Aufruf findet weiter zwölf bereits in der Ausgangsbasis vorhandene Komplexitätsfehler in `FamilyExerciseView` und fremden Compiler-Abschnitten. Ein direkter Vergleich mit dem S1-Checkout bestätigt dieselben Funktionen und Werte, einschließlich View-Komplexität 62. Alle neuen S2-Funktionen sowie Engine, Runtime und Painter bestehen `complexity <= 10`. Keine Unterdrückung der bestehenden Fehler eingeführt. Anfrage an den Integrator: diese zwölf Befunde in einer eigenen Refaktorierung bearbeiten, falls ein uneingeschränkt grünes Gesamt-Lint verlangt wird.
- `explore`, `compare` und Trace-Beats besitzen Schema-/Compile-Vorbereitung; die dazugehörige Bedienung und fachliche Erzeugung bleiben wie geplant bei S5/S6 und Integrator. Keine fremden Familien oder S4a-Datenverträge geändert.
- Alte `.viz.json` bleiben erhalten. Kein Löschen ohne Freigabe.
