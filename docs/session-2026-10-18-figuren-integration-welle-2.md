# Figuren: Integration Welle 2

18.10.2026. Normaler Git-Worktree `/Users/no8/.windsurf/worktrees/argmin/argmin-figuren`, Zweig `feature/figuren`. Ausgangspunkt `2836575`. Kein Push.

## Merges und Konflikte

Zu Beginn lauschte weder auf 4391 noch auf den Wellenports ein Dev-Server. Die zusätzliche Prozessprüfung fand keinen laufenden Vite-/Preview-Server der Wellen-Worktrees. `git checkout feature/figuren` bestätigte den bereits aktiven Integrationszweig und einen sauberen Arbeitsbaum.

| Reihenfolge | Zweig | Mergecommit | Konflikte |
|---|---|---|---|
| 1 | `feature/figuren-s4b` | `346684d` | keine |
| 2 | `feature/figuren-s5` | `4527f6e` | ausschließlich Registry-Zeilen in `assets/js/figures/scenes/index.mjs` und `src/figures/registry.ts` |
| 3 | `feature/figuren-s6a` | `2cea4ad` | ausschließlich Registry-Zeilen/Imports in denselben beiden Dateien |

Alle Merges verwenden `--no-ff`. Bei den Registry-Konflikten blieben sämtliche Einträge beider Seiten erhalten und wurden alphabetisch eingeordnet. Es gab keine anderen Konflikte. Die Public-Allowlist wurde automatisch zusammengeführt; der Mengenvergleich gegen alle drei Branchstände bestätigt 288 Einträge ohne fehlende Einträge oder Duplikate. Keine generierten Release-Dateien wurden von Hand geändert.

## Prüfung nach jedem Merge

| Stand | Node | Typecheck einschließlich Compiler/Coverage |
|---|---|---|
| S4b | 2240 bestanden, 0 Fehler, 0 übersprungen; 43,28 s | bestanden |
| S5 | 2240 bestanden, 0 Fehler, 0 übersprungen; 43,38 s | bestanden |
| S6a, endgültiger Produktstand | 2240 bestanden, 0 Fehler, 0 übersprungen; 43,24 s | bestanden |

Der erste S4b-Node-Lauf beanstandete einen veralteten generierten Split-Inhaltsstand (`verify_content_delivery`). Ein regulärer Release-Neubau und der erneute vollständige Node-/Typecheck-Lauf bestanden. Vor den Prüfungen der folgenden Merges wurden die abgeleiteten Inhalte/Release-Dateien ebenfalls regulär neu gebaut. Keine Assertions wurden abgeschwächt und keine neuen Testdateien oder Snapshot-Baselines angelegt. Die von Noa in S4b freigegebene Ergänzung des vorhandenen Familien-Golden-Korpus bleibt Bestandteil des gemergten Zweigs.

## Abschluss-Gate auf Port 4400

Maßgeblich ist der umbenannte Skill `.devin/skills/workbench/SKILL.md`. Dev und Release liefen nacheinander mit eigenen, strikt gebundenen Servern auf 4400. Die letzte Produktänderung ist die Registry-Auflösung des S6a-Merges; danach wurden nur Dokumentation und Review-Artefakte ergänzt.

| Prüfung | Ergebnis |
|---|---|
| Inhaltscompiler und Inhaltsvalidierung | bestanden; 46 Kompetenzen, 50 Lektionen, 290 Aktivitäten |
| vollständige Node-Suite | 2240 bestanden, keine Fehler oder Überspringungen |
| Typecheck und Coverage-Check | bestanden |
| Release-/Public-Build einschließlich Inhalts-, Lizenz-, Leak- und Next-Build-Prüfung | bestanden; 953 Dateien |
| zusätzliche Inhaltsvalidierung von `build-next` | bestanden |
| Chromium Dev, 4 Worker, `E2E_PORT=4400` | 96 bestanden, 26 bestehende Überspringungen; 46,1 s |
| Chromium Release, 4 Worker, `E2E_PORT=4400` | 95 bestanden, 27 bestehende Überspringungen; 34,7 s |
| Project-Runner | 20 Prüfungen, eine bestehende Überspringung, keine Fehler |
| Lint über alle 36 geänderten Code-Dateien, Komplexität höchstens 10 | elf geerbte Komplexitätsfehler |
| Lint über die 34 Dateien außerhalb der beiden Bestandsmodule | bestanden, null Fehler, zwei Bestandswarnungen |
| Workbench-Skill-Validator | bestanden mit vorhandener `prime`-Python-Umgebung |
| drei vorhandene Frame-Messläufe auf 4400 | technisch bestanden; Smoothie-Zielbudgets weiter überschritten, Werte unten |
| `git diff --check` | bestanden |

Das Gesamt-Gate ist wegen Bestands-Lint, Runtime- und Smoothie-Framebudget nicht uneingeschränkt grün. Es wurden keine Unterdrückungen oder fachfremden Refaktoren eingebaut.

Die elf Lintfehler betreffen vier bestehende Funktionen in `FamilyExerciseView.tsx` (Komplexität 16, 62, 29, 12) und sieben Compilerfunktionen (59, 11, 15, 20, 19, 16, 20). Die sieben Compilerfunktionen sind gegenüber der Welle-1-Basis bytegleich. `parseFamilyRef` und `workspaceOutput` sind ebenfalls bytegleich; bei View und Submit wurde die Verzweigungszahl gegenüber der Basis nicht erhöht. Die S4b-/S6a-Digests dokumentieren dieselben Komplexitätswerte. Neue/geänderte Figurenfunktionen haben keine Überschreitung. Warnungen betreffen unter anderem eine geerbte Zuweisung in `build_public.mjs` und den vorhandenen Catch im Golden-Korpus.

Der Dev-Lauf meldete weiterhin die fehlende vendorte `pyodide.mjs.map`; alle Browserprüfungen bestanden. Standard-Python hatte kein `yaml`; der Skill-Validator bestand anschließend mit dem vorhandenen Interpreter `/Users/no8/.local/share/uv/tools/prime/bin/python`. Keine Abhängigkeit wurde dafür geändert.

## Eigene Browser-Sichtung

Einmalige Skripte außerhalb des Repositorys bedienten die echte Anwendung auf 4400. Es entstand keine neue dauerhafte Testsuite.

- Alle 15 neuen Lektionsfiguren bei 375 und 1440 px, jeweils hell/dunkel, durch ihre angebotenen Schritte bedient: 288 Zustände und 60 finale Kartenaufnahmen. Kein Seitenfehler, kein horizontaler Überlauf, keine sichtbaren Knöpfe unter 44 px. `data-settled=true` und SVG-Deckkraft 1 wurden vor den Aufnahmen geprüft.
- Die vier finalen Kontaktbögen wurden selbst geöffnet. Zusätzlich wurden mobile Einzelbilder von MSE und Aliasing sowie die Aufgabenbilder geöffnet. In den finalen Desktopbildern verdeckt keine Sticky-Kopfzeile die Karte. Die Aufnahmehöhe wurde dafür an die ganze Karte angepasst; die Bühnenbreite blieb bei der jeweiligen Zielgröße.
- `balance-solve/isolate/7/intro` und `mix-to-target/unique/7/intro` jeweils in allen vier Ansichten mit falscher und anschließend korrekter Formularantwort bedient. Die gültigen Umformungen/Portionen stammen aus den vorhandenen deterministischen Familienmodulen. Alle acht korrekten Antworten wurden angenommen.
- Die isolierten Browserprofile enthalten jeweils erst einen falschen und dann einen korrekten Attempt mit einem Antwortobjekt `{kind:'scene-build', schemaVersion:1, ...}`. Insgesamt 16 strukturierte, nicht in Strings umgewandelte Antworten. `tasks.json` enthält diese gespeicherten Ergebnisse. Das zusätzliche Textmuster für Fehlerrückmeldungen traf beim Mixer, beim Waagenkriterium „x steht allein“ dagegen nicht; die gespeicherte Bewertung bestätigt dort ebenfalls den falschen Erstversuch.

Die Darstellung zeigt die neue gemeinsame F12-Formularhülle, berechnete F7-Endzustände und F1-Bindungen/Objektidentitäten samt getrennten Ausgaben. Explore-Zahlenfeld, Compare-Umschalter und sichere F1-Hinweise werden weiterhin nicht als verfügbar behauptet. S5s gemeinsamer 13-px-Readout bleibt als Anfrage dokumentiert. Die Familien-Digests enthalten die fachlichen Referenz-/CPython-Gegenprüfungen und die weitergehenden eigenen Familienmessungen; diese unveränderten Modelle wurden während der Integration nicht neu entworfen.

Review-Artefakte unter `docs/figuren-integration-welle-2/`:

- [Mobil hell](figuren-integration-welle-2/contact-375-light.png), [mobil dunkel](figuren-integration-welle-2/contact-375-dark.png)
- [Desktop hell](figuren-integration-welle-2/contact-1440-light.png), [Desktop dunkel](figuren-integration-welle-2/contact-1440-dark.png)
- `review.json`: Kartenmaße, besuchte Zustände, Bedienziele und Seitenfehler
- `tasks.json`: Formular-/Attempt-Ergebnisse; Einzelbilder `balance-task-*` und `mixer-task-*`

## Größe und Leistung

Finaler Release-Baum, `node:zlib.gzipSync` mit Standardeinstellung:

| Chunk | Bytes gzip |
|---|---:|
| FigureRuntime JS | 10027 |
| FigureRuntime CSS, separat | 1376 |
| gemeinsames figure-kit, separat | 5975 |
| gemeinsamer F1 trace-stage | 3090 |
| gemeinsame F7 optimization-plot-Helfer | 1747 |
| gemeinsame F12-Diagramme | 1110 |
| lazy SceneBuildControls JS | 2143 |
| lazy SceneBuildControls CSS | 475 |

Die Runtime überschreitet das strikte Ziel unter 10000 B um 27 B. S4bs einzelner Branch erreichte nach seiner freigegebenen Vereinfachung 9979 B; dieser Wert gilt nicht für die kombinierte Fassung. Shared-Chunks werden separat ausgewiesen.

Die neuen Szenenchunks bleiben jeweils unter 12000 B gzip. Der größte ist `mse-landscape` mit 2742 B; seine gemeinsamen Modell-/Bühnen-/Kit-Chunks sind zusätzlich und werden nicht in diesem Wert versteckt.

Drei Läufe der vorhandenen `tests/e2e/figures-perf.spec.ts`, A1, Chromium, vierfache CPU-Drosselung, ein Worker und wiederverwendeter Dev-Server aus diesem Checkout auf 4400. Keine parallelen Builds oder Browserarbeiten während der Messung. Alle sechs Messprüfungen bestanden ihre technischen Sample-/Frame-Prädikate. Median der drei Laufmediane, Millisekunden:

| Smoothie-Szenario | 1440 px | 375 px | Ziel |
|---|---:|---:|---|
| Beat | 5,0 | 4,7 | unter 4; mindestens unter 6 |
| Ziehen | 9,8 | 9,4 | unter 8 |
| Kamerafahrt zur Tafel | 9,5 | 8,8 | unter 8 |

Damit wird die Mindestgrenze für Beats eingehalten, das bevorzugte Beatziel sowie Drag-/Kameraziele bleiben verfehlt. Die Werte bestätigen den gemeinsamen offenen Engine-Auftrag; es wurde keine Performanceoptimierung während der Integration behauptet. Rohzusammenfassungen aller Läufe und Mediane stehen in `figuren-integration-welle-2/performance.json`, die vorhandenen Messausgaben in `perf-run-1.log` bis `perf-run-3.log`. Diese Messung betrifft die gemeinsame Smoothie-Referenz, nicht eine Wiederholung sämtlicher Familienmessungen aus S4b/S5/S6a.

## Anfragen und Welle 3

Die Digests aller drei Zweige und der F1-Trace-Vertrag wurden ausgewertet. `docs/figuren-sessionplan.md` enthält unter „Anfragen aus Welle 2 und nächste Zuständigkeit“ die konkrete nächste Session:

- S2b: Explore/Compare, direkter Auswahlvertrag, möglicher Canvas-Lifecycle, Runtime-/Framebudget, Readout-Typografie, dauerhafter CPython-Datenvertrag und sichere Trace-Präfixe. Neue permanente Prüfungen bleiben an Noas konkreten Auftrag gebunden.
- F7-Nachlauf nach S2b: vorhandene Modelle an gemeinsame Bedienung anbinden; sichere Hinweise und `pick-learning-rate` bleiben offen.
- F1-Nachlauf: Hinweise, Auswahl, `tag-after-line`, freie Parameter und Kurzschluss-Familienfall. Die zentrale Compiler-Expansion ist inzwischen integriert und ausdrücklich als erledigter früherer Blocker vermerkt.
- S4b: keine offene Schnittstellenanfrage. Die freigegebenen Formular-/Restart-/Modellwechsel-Schnittstellen sind integriert. Eine visuelle Freigabe durch Noa folgt daraus nicht.
- Die offenen Welle-1-Punkte einschließlich S5b/PCA/K-Means/F3-F4-Hinweisen, Labor-Szenenauswahl und Bestands-Lint bleiben sichtbar.

Die vollständigen Startprompts stehen in [figuren-welle-3-prompts.md](figuren-welle-3-prompts.md). S6b/F2 auf 4407, S7/F5+F8 auf 4408, S8a/F6+F9 auf 4409 und S8b/F10+F11/statische Figuren auf 4410 können parallel starten. S2b auf 4411 ist ein zusätzlicher gemeinsamer Auftrag. Neue Bedienverträge werden vor abhängigen Familienabschlüssen seriell integriert.

Geteilte Lektionen haben eindeutige Schreiber: S7 für `data-cleaning`, S8b für `genai-rag` und `capstone-freeze`. Die jeweils andere Familie liefert Fragmente statt derselben Datei. Neue gemeinsame Graph-Primitive K7 liegen bei S8b. Keine Welle-3-Chats oder Worktrees wurden automatisch angelegt.

Der eigene Sichtungs-/Messserver wurde beendet. Abschließend lauscht auf 4391 und 4400 bis 4406 kein Server mehr.

Abschlusscommit: `figuren: Integration Welle 2`. Kein Push.
