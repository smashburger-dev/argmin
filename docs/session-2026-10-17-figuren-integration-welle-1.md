# Figuren: Integration Welle 1

Datum: 17.10.2026. Worktree: `/Users/no8/.windsurf/worktrees/argmin/argmin-figuren`. Integrationszweig: `feature/figuren`. Kein Push.

## Reihenfolge und Konflikte

Vor Beginn wurde der einzige noch laufende Wellen-Dev-Server auf Port 4402 beendet. Auf 4391, 4401 und 4403 lief kein Server mehr. Der saubere Haupt-Worktree wechselte von `feature/figuren-s1` auf `feature/figuren`.

| Reihenfolge | Zweig | Mergecommit | Ergebnis |
|---|---|---|---|
| 1 | `feature/figuren-s2` | `e490041` | `--no-ff`, konfliktfrei |
| 2 | `feature/figuren-s3` | `d03e5e9` | `--no-ff`, drei Konfliktdateien, nach Rückfrage autorisiert aufgelöst |
| 3 | `feature/figuren-s4a` | `c9ef710` | `--no-ff`, konfliktfrei |

S3 hatte Konflikte in `docs/adr/0018-figuren-werkbank.md`, `src/figures/FigureRuntime.tsx` und `src/figures/figures.css`. Der Integrator hielt nach der ursprünglichen Stopp-Regel an. Noa wies anschließend ausdrücklich an, S3s Änderungen als endgültige gemeinsame Grundlage zu übernehmen und S2s Hinweismodus daran funktionsfähig anzubinden.

Die endgültige Hülle folgt S3: Skill `workbench`, Zurück und Weiter/Von vorn, kleiner Schrittstand dazwischen, Vorhersage nur im passenden Schritt vor der Navigation, direkte räumliche Gesten, flache Szenen ohne Orbit und Halo. S2s Modus, Hinweis-Beats, Modell-/Pose-/Beschreibungsmodus, statische und Inline-Figuren, Zustandsspeicherung, direkte Erklärung statischer Teile, Druckzustand, adaptive Ruhe und Forced Colors bleiben erhalten. Kein paralleles Kameramenü und keine zweite Hinweise-Hülle.

Die ADR enthält S2s Vertragsabsatz und den endgültigen Workbench-Pfad. Die fünf S3-Spezifikationen wurden um `kind: "beats"` ergänzt, damit sie S2s neues Schema erfüllen. Registry und Allowlist hatten keine Textkonflikte; ihre additiven Änderungen wurden zusammengeführt.

## Prüfungen nach den einzelnen Merges

| Stand | Node | Typecheck |
|---|---|---|
| S2 | 2231 bestanden, 0 Fehler, 0 übersprungen | bestanden |
| S3 | 2231 bestanden, 0 Fehler, 0 übersprungen | bestanden |
| S4a | 2240 bestanden, 0 Fehler, 0 übersprungen | bestanden |

Nach S2 scheiterte der erste Node-Lauf am alten generierten Release-Baum, nach S4a der erste Lauf an dessen veraltetem Split-Bundle. Reguläre Release-Neubauten behoben beide Abweichungen; keine generierten Dateien wurden von Hand bearbeitet. Die Tabelle nennt die danach erfolgreichen Läufe.

## Reviewkorrekturen während der Integration

Die vorhandene Node-Prüfung verlangt keine starre Anzahl von 27 alten Visualisierungen mehr. Sie prüft weiter eindeutige IDs, Lektionsverknüpfung, Platzierung und Spezifikation. Die vorhandenen Browserprüfungen begrenzen Selektoren auf ihre konkrete Figur und erwarten die endgültige S3-Navigation. Der erste angepasste Browserlauf hatte drei fehlerhafte Testannahmen des Integrators über die Reihenfolge der Figuren; diese wurden korrigiert. Es entstanden keine neuen Testdateien oder Snapshot-Baselines.

Noa beanstandete den blassen Desktop-Hinweis, den Ausblenden-Knopf am mobilen Kartenrand und die sichtbare Textausklappung. Zwei Ursachen beim blassen Bild wurden getrennt geprüft: Der erste Screenshot lag noch in einer Überblendung; zusätzlich zeichneten die normalen Smoothie-Texte mit `tone: mid` nur 80 % Tinte. Auf der tatsächlichen Tafelfläche ergab das 3,78:1 hell und 4,20:1 dunkel. Die gemeinsame Textprimitive dieser Szene verwendet jetzt volle Tinte, ohne die Tonabstufung der Linien und Materialien zu verändern. Kontrast gegen die frontale Tafelfläche danach 5,82:1 hell und 5,71:1 dunkel.

Die sichtbare Option „Ablauf als Text“ wurde auf Noas Wunsch entfernt. SVG-Name und Live-Beschreibung erklären den aktuellen Zustand weiterhin zugänglich; die vollständige Beschreibung erscheint in der Druckfassung. Die mobile Bühne berücksichtigt die verbleibende Hülle. Der letzte Knopf liegt vollständig innerhalb der Karte. Workbench und Design-Guardrails verlangen jetzt die Deckkraftberechnung, fertige Überblendungen, von Sticky-Kopfzeilen freie Bildausschnitte und mindestens 12 px inneren Rand hinter dem letzten Knopf.

## Eigene Browser-Sichtung

Ein einmaliges lokales Playwright-Skript bediente die echte Elimination-Aufgabe auf Port 4400. Keine neue permanente Testsuite. Nach Öffnen der Hinweisfigur wurden deren Schritte, Ausblenden, Wiederöffnen und Reload in vier Ansichten geprüft. Der Hinweis bleibt bei effektiv `hintsUsed: 1`; erneutes Öffnen kann einen weiteren Assistenzdatensatz mit demselben Wert schreiben, erhöht aber nicht den effektiven Hinweiswert. Nach Reload bleibt der gespeicherte Beat 2 erhalten. Gesuchte Werte erscheinen nur als Fragezeichen; die Compiler-Lecksperre läuft weiterhin.

| Hinweis im Tafelzustand | 1440 × 1000 | 375 × 812 |
|---|---:|---:|
| Kartenhöhe, hell/dunkel | 662 px | 559,77 px |
| Kleinster Tafeltext | 19,86 px | 15,35 px |
| Abstand Knopfunterkante zur Kartenunterkante | 17 px | 13 px |
| Maximale mobile Kartenhöhe | entfällt | 568,4 px |

Alle finalen Kartenbilder wurden selbst geöffnet und angesehen, einschließlich der mobilen Einzelbilder. Der Text ist im Endzustand deckend, die zwei Schrittknöpfe passen nebeneinander, und der Ausblenden-Knopf sitzt innerhalb der Kontur. Die Seitenbilder zeigen auch die Platzierung relativ zum Antwortfeld.

- [Desktop hell](figuren-integration-welle-1/hint-1440-light.png)
- [Desktop dunkel](figuren-integration-welle-1/hint-1440-dark.png)
- [Mobil hell](figuren-integration-welle-1/hint-375-light.png)
- [Mobil dunkel](figuren-integration-welle-1/hint-375-dark.png)
- Aufgabenansichten unter `figuren-integration-welle-1/task-<breite>-<theme>.png`.

## Abschluss-Gate

Alle folgenden Prüfungen wurden nach der letzten Produktkorrektur ausgeführt. Browserport war durchgehend 4400; Dev und Release liefen nacheinander mit eigenen Servern.

| Prüfung | Ergebnis |
|---|---|
| Inhaltscompiler und Inhaltsvalidierung | bestanden, 46 Kompetenzen / 50 Lektionen / 286 Aktivitäten |
| Node | 2240 bestanden, 0 Fehler, 0 übersprungen, 43,95 s |
| Typecheck inklusive Coverage-Check | bestanden |
| Release-/Public-Build und Release-Inhaltsvalidierung | bestanden, 881 Dateien |
| Bestehende Build-/Leak-Prüfungen in Node und Release | bestanden |
| Chromium Dev, `E2E_PORT=4400`, 4 Worker | 96 bestanden, 26 bestehende Überspringungen, 43,7 s |
| Chromium Release, `E2E_PORT=4400`, 4 Worker | 95 bestanden, 27 bestehende Überspringungen, 32,6 s |
| Project-Runner | 20 Prüfungen, bestanden, 1 bestehende Überspringung |
| Runtime / Engine / HintFigure / Smoothie, `complexity <= 10` | bestanden |
| Vollständiger Lint über 43 betroffene Code-Dateien | 27 Bestands-Komplexitätsfehler, siehe unten |
| Workbench-Skill-Validator | bestanden, vorhandene `prime`-Python-Umgebung |

Das gesamte Lint-Gate ist somit nicht grün. Die 27 Befunde liegen in `graders.js` (10), `progress_migration.mjs` (1), `progress_store.js` (3), `FamilyExerciseView.tsx` (5), dem unveränderten zweiten Testcallback in `content_visualizations.test.mjs` (1) und fremden Compilerfunktionen (7). S2 und S4a dokumentierten diese Bestandsbereiche bereits; es wurden keine Unterdrückungen oder pauschalen Refaktoren ergänzt. Die während der Integration bearbeitete Figurenimplementierung besteht den separaten Lint-Aufruf.

Standard-Python und die Graphify-Python-Umgebung hatten zunächst kein `yaml`; der Validator lief anschließend mit der vorhandenen `prime`-Umgebung erfolgreich. Ein fehlendes Pyodide-Sourcemap erzeugt im Dev-Server weiterhin eine Warnung, ohne fehlgeschlagene Browserprüfung. Der historische Tour-Kontrastfehler aus S3 trat in den vollständigen integrierten Dev-/Release-Läufen nicht auf.

## Größe und offene Budgets

Gzip direkt mit `node:zlib` aus dem finalen Release-Baum gemessen:

| Chunk | Bytes gzip |
|---|---:|
| FigureRuntime | 10003 |
| Shared figure-kit, separat | 5971 |
| Smoothie | 9552 |
| HintFigure | 624 |
| smoothie-row-and-column | 2167 |
| solution-cases-3d | 1731 |
| span-carpet | 1440 |
| receipt-elimination | 1362 |
| receipt-echelon-3x3 | 1362 |

Das strikte Runtime-Ziel unter 10000 Bytes bleibt um 3 Bytes verfehlt. Szenen bleiben unter 12000 Bytes. Die Frame-Budgetüberschreitungen aus S2 wurden nicht durch eine neue Performanceoptimierung behoben; die historischen Drei-Lauf-Werte bleiben ausdrücklich offen. Der Integrator behauptet keine neue Frame-Abnahme. Beides steht für die nächste Engine-Session im Sessionplan.

## Anfragen und Welle 2

Die Anfragen sind unter „Anfragen aus Welle 1 und nächste Zuständigkeit“ in `docs/figuren-sessionplan.md` eingetragen: Performance/Runtime und Bestands-Lint, Explore-/Compare-/Trace-Verträge, direkte Auswahl, Labor-Szenenauswahl, S4a-Formular-/Grader-/Ledger-Anbindung für S4b und die noch fehlenden sicheren F3/F4-Hinweise sowie PCA/K-Means für S5b. Bereits integrierte S3-Hülle, `kind` und korrigierte Bestandsselektoren sind als erledigt abgegrenzt.

Die vollständigen Startprompts stehen in `docs/figuren-welle-2-prompts.md`. S4b/F12 auf 4404, S5/F7 auf 4405 und S6a/F1 auf 4406 können parallel ihre Familienarbeit beginnen. Gemeinsame Runtime-/Schema-/Compilererweiterungen werden beim Integrator angefragt, zugewiesen und seriell zusammengeführt. Alle drei starten vom finalen lokalen Welle-1-Integrationscommit, laden Workbench samt S3-SoT und enthalten die letzten Kontrast-/Mobil-/Textausklapp-Entscheidungen. Es wurden keine Welle-2-Chats gestartet und keine Pushes ausgeführt.
