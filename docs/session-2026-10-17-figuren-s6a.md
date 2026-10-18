# Figuren S6a · 17.10.2026

Fortgeführt am 18.10.2026 nach Unterbrechungen durch Nutzungslimits. Status: sechs Lektionsfiguren implementiert und selbst gesichtet, keine Abnahme durch Noa. Basis `2836575e2f6f62f51d1e7c618bdd4a249ecb5309` (Integration Welle 1), sauberer neuer normaler Worktree `argmin-figuren-s6a`, Zweig `feature/figuren-s6a`. Kein Push und kein Merge. Port ausschließlich 4406 mit `--strictPort`.

## Lernentscheidungen vor dem Bau

Alle sechs Figuren werden frontal und `flat`: Code, Bindungen und Objektidentität brauchen keine perspektivische Verzerrung. Keine Stellwerk-Requisiten. Die vorhandene Lektüre trägt die Analogien. Anfang, Änderung und Ergebnis werden zuerst bei 375 px Viewport / 343 px Bühne gesichtet.

| Figur / Einfügeort | Lernfrage | Bereits erklärt / Text danach | Darstellung und nötige Teile | Mobile Entscheidung |
|---|---|---|---|---|
| name-tags / vor „Wert und Typ“ | Was ändert eine Neuzuweisung an den Bindungen? | Namensschild, rechte Seite zuerst, Beispiel mit Tracetabelle / Typen | Code, Schilder, getrennte Objektmarken, Bindungslinien, Ausgabefeld | Kurzer Vierzeiler, Zustände unter dem Code statt daneben |
| bouncer / vor „Bedingung vorhersagen“ | Wird die rechte Seite von `and` überhaupt erreicht? | Türsteher und Grenze der Analogie / Bedingung in Teile zerlegen | Zwei Prüfstellen, ausgeführte Zeile, übersprungener rechter Ausdruck | Kurzschluss ausdrücklich am unbetretenen Pfad, nicht nur in einer Beschriftung |
| vending-frame / vor „Lokal denken“ | Was kommt zurück, was wird nur gedruckt? | Automat, return/print und verschachtelte Aufrufe / lokale Namen | Kurzer Codeausschnitt, Aufrufrahmen, Rückgabefach und Ausgabe getrennt | Nur aktuell nötige Codezeilen; ein Rahmen statt zweier kleiner Tafeln |
| ledger / vor „Bausteine, die du tracest“ | Welche Zeile läuft nach dem Schleifenkörper? | Kassenbuch, Sprünge und durchgerechnete Schleife / Slice, join, Comprehension | Codezeiger, begrenztes Buch ausgeführter Zeilen, aktueller Zustand | Letzte Buchungen statt wachsender Tabelle |
| two-tags-one-list / nach „Mutation und Aliase sichtbar halten“ | Ändert sich das Objekt oder hängt ein Name um? | Liste/Dictionary/Set, Mutation, `y = x` und Kopie / KI-Bezug | Zwei Schilder mit getrennten Wegen zu einer Objektmarke, Listenfächer; eigener Dictionary-Fall | Keine durch Körper laufenden Verbindungen; Objekt-ID auch als Text |
| smoke-detector / vor „Diagnosefolge“ | An welcher Operation bricht der Ablauf ab? | Rauchmelder, Arrange/Act/Assert / erste falsche Zustandsänderung suchen | Eingabeobjekt, Zugriff, Ausnahme und unerreichter Folgeschritt | Kleinstes Grenzbeispiel; kein nachgebauter Projektprüfer |

## Schnittstellen und Zuweisung

- Frühbefund: `validateFigureSpec` kehrt bei nicht als Array vorliegenden Beats zurück; `assertFigureNumbers` und die Runtime erwarten Arrays. `scene.trace` allein erzeugt keine fachlichen Beats.
- Noa hat am 17.10.2026 in dieser Session die eng begrenzte gemeinsame Trace-Expansion S6a zugewiesen („Wenn du das machen kannst, dann mach du das und stell sicher, dass down the line alles passt“). Die Expansion gehört in den Compiler; die Runtime erhält ihren bestehenden Array-Vertrag. Keine private Expansion in den Szenen oder Lektionsdateien.
- Direkte Auswahl mit Tastaturäquivalent und `tag-after-line` haben weiterhin keinen zugewiesenen Aufgaben-/Antwortvertrag. Keine Erweiterung der S4a-Antworthülle und keine Aufgabe als erledigt markieren.
- Dauerhafte CPython-Trace-Prüfung: als separate Integrator-Anfrage mit festzulegendem Datenvertrag offen. In dieser Session nur einmalige Gegenprüfung, keine neue permanente Prüf-/CI-Suite.

## Prüfprotokoll

### Basis nach npm ci

Ein vollständiger Basislauf auf Welle 1 vor der Implementierung: Compiler, Inhaltsvalidierung, Node (2240 Tests, keine Fehler), Typecheck, Coverage, Release-Build, Project-Runner sowie vorhandene Chromium-Dev- und Release-Prüfungen mit `E2E_PORT=4406` jeweils Exit 0. `npm ci`: 132 Pakete installiert. Der damalige Audit-Hinweis meldete eine bestehende hohe Schwachstelle; keine ungefragten Abhängigkeitsänderungen.

### CPython und vorhandene Referenzlöser

Die Aufzeichnungen stammen aus CPython 3.14.7 und `sys.settrace`. Nach einer ausgeführten Zeile wird ihr Zustand am nächsten Trace-Ereignis aufgenommen. Aufruf und Rückgabe bleiben eigene Ereignisse; reine Definitionsschritte sowie die doppelte Zeilenmeldung unmittelbar vor return/exception werden für die sichtbare Folge zusammengefasst. Ein Anfangszustand ohne Bindungen wird ergänzt. Der Renderer führt keinen Python-Code aus.

Erneute Ausführung vergleicht Bindungen, Objektidentitäten, Objekttyp/-inhalt, Zeilennummer, Ereignis, Rückgabe, Ausgabe und Ausnahmetyp in jedem angebotenen Zustand. Die ergänzende Dictionary-Spur ist fachlicher Beleg und keine weitere veröffentlichte Szene.

| Spur | Zustände einschließlich Anfang | Unabhängiger Abgleich |
|---|---:|---|
| name-tags | 5 | `trace-assignment-state`, Form reassign, `a0=3, k1=4, k2=2`: Ausgabe `5 7` |
| bouncer | 4 | CPython liest den ungebundenen Namen ticket bei age=16 nicht; Ausgabe False. Gegenfall age=18 erreicht ticket und wirft NameError. Für diese Kurzschlussform existiert kein passender Fall der vorhandenen Trace-Familien; kein Ersatzinterpreter ergänzt |
| vending-frame | 7 | `trace-call-composition`, linear-both-orders, `(fa,fb,ga,gb,v)=(1,10,3,0,2)`: `16 36`; die erste Komposition ist die gezeigte. Aufruf g(2), return 6, Aufruf f(6), return 16, globale Bindung und print sind getrennt |
| ledger | 14 | Zusätzlich vorhandener Löser `aggregate-accumulator-count`, while mit `(n0,step,stop)=(3,1,0)`: `6 0` |
| two-tags-one-list | 7 | `trace-collection-state`, list-alias-negative, Seed 3 intro: erste vier Codezeilen und sieben Zustandszellen stimmen. Zusätzliche Neuzuweisung `x = [0]` und Ausgabe von y separat durch CPython geprüft |
| Dictionary-Beleg | 5 | `trace-dict-state-update`, dict-start-key-steps, Seed 0 intro: alle vier Codezeilen und Zustandszellen stimmen |
| smoke-detector | 3 | `trace-exception-path`, indexerror: IndexError im Act; die nachfolgende Assertion wird nicht ausgeführt |

Der tatsächliche Project-Runner `tools/learner_project_check.py:run_project` startete diese Gegenprüfung als temporäres Projekt unter `/private/tmp/figuren-s6a-check`. Zuerst `tool-missing` wegen fehlendem pytest. Danach isolierte Umgebung `/private/tmp/figuren-s6a-python` mit pytest 9.1.1, keine Änderung am Repository oder an der CI. Ergebnis am 18.10.: Report `57e9115d-bc3b-4d80-a50e-95f1ffc312eb`, Status passed, Exit 0, neun Prüfungen bestanden. Darunter ein zusätzlicher print-only-Aufruf: return None, Ausgabe `8\nNone\n`. Die temporäre Prüfsuite wird nicht eingecheckt.

### Lektions- und Vertragsumfang

Alle sechs Lektionen enthalten die neue `.fig.json`. Fünf bisherige Markdown-Blöcke wurden am dokumentierten Einfügeort aufgeteilt; ihre Absätze sind erhalten. `testing-debugging` bleibt im Endstand vollständig zusammen, und `smoke-detector` folgt als Anwendung nach dem bestehenden Projektschritt. Die vorhandene Stilprüfung liest bei diesem Blocktyp nur die ursprüngliche Markdown-Datei; die zunächst versuchte Teilung verursachte deshalb zwei Fehler (fehlender KI-Abschnitt und fehlendes Schlussglossar). Die Platzierung wurde korrigiert, ohne die Prüfung oder die Blockart zu ändern. Alle bestehenden `.viz.json` und Checkpoints sind unverändert. Keine fremde Szene wurde als Bühne importiert. Modelle und Anzeige basieren auf eingefrorenen Aufzeichnungen; freie Code- oder Zahlenparameter werden abgewiesen.

Der Compiler erzeugt gewöhnliche Beat-Arrays, prüft Zeile/Bindungen/Objekte/Ausgabe, validiert das erzeugte Dokument gegen das Figurenschema und wendet dieselben Reihenfolge-, Zahlen-, Vorhersage- und Lernertextprüfungen an. Die Runtime erhält keine Trace-Sonderbehandlung. Der gemeinsame Painter bekommt lediglich die Code-Schrift mit erhaltenem Weißraum; diese notwendige F1-Ergänzung ist im Diff separat erkennbar.

Hinweise sind für die neuen Szenen gesperrt, solange der Präfix-/Ziellinienvertrag fehlt. Kein Eintrag in `figure-hints.json`, keine Änderung der Hinweiszählung oder Lecksperre. So gelangen weder zukünftige Bindungen noch Ergebniswerte durch neue Hinweisgeometrie in Aufgaben. Die Familien-UI für `tag-after-line` wird nicht als umgesetzt behauptet.

### Eigene Bildsichtung und Bedienung

Die einfache mobile Hauptansicht wurde zuerst als Anfang/Änderung/Ergebnis aufgebaut und im ersten Kontaktbogen angesehen. Danach korrigiert: Codeschrift auf mindestens 14,13 px in der tatsächlichen 309-px-Bühne, doppelte Zustandsausgabe entfernt, Code-Einrückung im SVG erhalten, mehr Abstand zwischen Code, Bereichstiteln und Platten. Die zusätzliche Plattenprüfung fand das zu breite summe-Schild; kompakte Monospace-Bindungslabels beseitigen den Befund.

Endstand: 160 Aufnahmen, jeweils erst nach `data-settled=true` und abgeschlossener Überblendung. Alle 24 Kontaktbögen in `docs/figuren-s6a/review/contact-*.png` selbst geöffnet: jede Szene, jeder angebotene Zustand, 375/1440 px und hell/dunkel. Zusätzlich mobile Einzelbilder in Originalgröße geöffnet, insbesondere `vending-frame-375-dark-2.png`, `ledger-375-light-11.png` und `two-tags-one-list-375-dark-5.png`. Rückgabe und Ausgabe sind getrennt, beide Aliase landen an derselben Marke, bei Neuzuweisung bleibt die alte Liste an y. Die Linien laufen im freien Korridor und nicht durch die Körper.

Für die Übergabe bleiben 24 Kontaktbögen und 26 gezielte mobile Einzelbilder, außerdem der historische Prototyp-Kontaktbogen. Redundante Einzelaufnahmen nach Sichtung entfernt. Keine neue Snapshot-Assertion oder dauerhafte Browser-Testsuite.

Einmalige Browser-Bedienung im Endstand:

- Alle Zustände ohne über den Bühnenrand ragende Texte oder über ihre Platten hinausragende Labels; keine Seitenfehler. Sichtbare Navigationsziele 44 px hoch.
- Kontrast aller angebotenen Zustände gegen die tatsächlichen Trägerflächen und unter Berücksichtigung der Deckkraft: mindestens **5,10:1 hell**, **5,71:1 dunkel**. Die Rückgabe in Akzent auf der Platte ist eingeschlossen. Normale Schrift und Akzent haben Deckkraft 1.
- Pfeiltasten wechseln Schritte. Umschalt+Rechts lässt die flache Ansicht bei Azimut 0,0°. Antwort 5 und Urteil „Richtig“ bleiben nach Weiter/Zurück erhalten.
- Vertikale echte CDP-Touch-Geste auf der Bühne scrollt die Seite im Endlauf um 171 px hell / 168 px dunkel. Keine Orbit-Geste in flat.
- Code-Einrückung durch tatsächliches SVG-Rendering und `white-space: pre` geprüft. Kein Kameramenü, keine Bedienungsuntertexte und kein zweiter Schrittstand hinzugefügt.

Letzte Geometriekorrektur: Bindungen und Objekte wechseln atomar zum aufgezeichneten Zustand. Ein früherer interpolierter Linienendpunkt konnte zwischenzeitlich im freien Raum liegen. Eine einmalige Ausführung aller Szenen bei 0 / 0,01 / 0,325 / 0,65 Sekunden prüfte danach 214 sichtbare Bindungsendpunkte: jeder endet am zugehörigen sichtbaren Objekt. Die gesichteten ruhenden Zustände bleiben identisch; die abschließende Leistungsmessung verwendet diese korrigierte Fassung.

### Einmalige Compiler-Gegenproben

Vorhandene `tests/figures_compile.test.mjs`: sieben Prüfungen bestanden. Zusätzliche temporäre Proben, ohne neue Testdatei im Repository: ungültige Zeile, fehlendes Bindungsziel, ungültiger Objektwert, unbekanntes Ereignis, Beschriftung über 140 Zeichen, doppelte Schritt-ID, nicht modellierte Zahl, Rückgabe ohne Ergebnisobjekt, falscher Vorhersagewert und nicht freigegebener Hinweis-Modus werden jeweils abgewiesen.

### Abschluss-Gate

Das Gesamt-Gate wurde am Abschluss einmal vollständig ausgeführt. Dabei traten die zwei oben erklärten Stilprüfungsfehler der geteilten Projektschritt-Datei auf; alle übrigen Befehle waren erfolgreich. Nach der Platzierungskorrektur wurden Compile, Inhaltsvalidierung, vollständiger Node-Lauf, Release-Build und Release-Inhaltsvalidierung erneut ausgeführt. Der protokollierte abschließende Node-Lauf bestätigt 2240/2240 bestanden, keine Fehler oder übersprungenen Tests.

| Prüfung | Ergebnis |
|---|---|
| `node tools/compile_content.mjs` | bestanden |
| `node tools/validate_content.mjs` | bestanden |
| `npm test` | 2240 bestanden, 0 fehlgeschlagen |
| `npm run typecheck` | bestanden |
| `npm run coverage:check` | bestanden |
| `npm run build:release` einschließlich öffentlicher Inhalts-, Lizenz- und Build-Prüfung | bestanden |
| `node tools/validate_content.mjs --dir build-next` | bestanden |
| Project-Runner mit isoliertem Python auf PATH | 20 bestanden; zusätzlich neun tatsächliche CPython-Spurprüfungen wie oben beschrieben |
| Chromium Dev, `E2E_PORT=4406 npm run test:e2e -- --project=chromium` | 96 bestanden, 26 übersprungen |
| Chromium Release, `E2E_PORT=4406 npm run test:e2e:build` | 95 bestanden, 27 übersprungen |
| `git diff --check` | bestanden |

Die Browser-Gates liefen vor der abschließenden Platzierungskorrektur des Rauchmelders; die anschließende Frame-Messung öffnete alle sechs endgültig kompilierten Lektionen erneut bei beiden Breiten. Der eigene Server wurde danach beendet, Port 4406 ist frei. Die abschließende Whitespace-Prüfung gegen die gesamte Basis fand noch überzählige Leerzeilen am Dateiende der Aufzeichnungen und sechs Wrapper. Ausschließlich diese Leerzeilen wurden entfernt, alle übrigen Quellbytes sind identisch. `measurements.json` hält den gemessenen und den bereinigten Aufzeichnungs-Hash getrennt fest; dafür wurde keine inhaltlich identische Messserie wiederholt.

Shrink-Complexity-Lauf über alle 13 geänderten/neuen JS-/TS-Dateien mit Grenze 10: keine Überschreitung in neuen oder geänderten Funktionen. Der Gesamtaufruf endet dennoch mit Exit 1 wegen sieben unveränderter Compilerfunktionen: `validateChallengeContracts` 59, `validateChoiceContract` 11, `validateVisualizationExpressions` 15, `mathDelimiterErrorIndex` 20, `stripLearnerMathSpans` 19, `learnerTextWalk` 16 und `attachSourceModuleUsage` 20. Ihre Quellabschnitte wurden gegen die Basis verglichen und sind identisch. Keine Lint-Unterdrückungen und keine neue permanente Testdatei.

### Frame-Messung der endgültigen Fassung

Die Messfunktionen aus `tests/e2e/figures-perf.spec.ts` wurden unverändert für Aufnahme und Auswertung wiederverwendet. Nur das Öffnen und Vorblättern führte im temporären Treiber zu den tatsächlich kompilierten Lektionen auf Port 4406. Chromium, vierfache CPU-Drosselung, je drei Läufe bei 1440 und 375 px, jeweils der entscheidende nächste Schritt. Keine gleichzeitigen Builds, Tests oder weiteren Browseraufgaben. 36 Läufe, mindestens 75 aufgezeichnete Skript-Samples je Lauf, null lange Frames. Keine Zieh-/Kameramessung, da diese Figuren flat sind und keine direkte Manipulation anbieten.

| Szene | Übergang ab Beat-Index | 1440 px: Median der Mediane, ms | 375 px: Median der Mediane, ms |
|---|---:|---:|---:|
| name-tags | 2 | 0,4 | 0,4 |
| bouncer | 1 | 0,5 | 0,4 |
| vending-frame | 1 | 0,4 | 0,4 |
| ledger | 4 | 0,1 | 0,2 |
| two-tags-one-list | 4 | 0,0 | 0,2 |
| smoke-detector | 1 | 0,1 | 0,1 |

Alle Mediane liegen unter dem Beat-Ziel von 4 ms. Der vorhandene Auswerter rundet auf 0,1 ms; `0,0` bedeutet keine messbare Dauer in dieser Auflösung. Höchster Skript-Einzelwert aller Läufe: 1,9 ms. Die Einzelmediane, P95-/Max-Werte, Samples und SHA-256 der endgültigen Szenenquelle sowie der CPython-Aufzeichnungen stehen in [measurements.json](figuren-s6a/measurements.json). Das ist eine Messung dieser festen Beispiele, keine neue Leistungsabnahme der gemeinsamen Engine.

### Release-Chunks

Finaler Release-Build, gzip mit Node `zlib.gzipSync`, drei identische Messungen je Datei. Größen in Bytes; der gemeinsame F1-Chunk enthält Darstellung und Aufzeichnungen aller sechs Szenen sowie den Dictionary-Beleg. Er wird separat ausgewiesen und nicht im kleinen Szenen-Wrapper versteckt.

| Chunk | gzip-Bytes |
|---|---:|
| name-tags | 438 |
| bouncer | 423 |
| vending-frame | 390 |
| ledger | 317 |
| two-tags-one-list | 501 |
| smoke-detector | 301 |
| gemeinsamer trace-stage | 3090 |
| gemeinsames figure-kit | 5971 |
| FigureRuntime JS | 10047 |
| FigureRuntime CSS | 1376 |

Auch Wrapper plus gemeinsamer F1-Chunk bleibt pro Szene unter 12000 Bytes; zusätzlich fällt das unveränderte gemeinsame Kit an. Das strikte gemeinsame Runtime-Ziel unter 10000 Bytes bleibt **um 47 Bytes verfehlt**. Welle 1 meldete 10003 Bytes; die Codeschrift-/Weißraum-Ergänzung erhöht dies um 44 Bytes. Das ist ein offener Integrationspunkt, keine bestandene Budgetabnahme. Die bestehende Smoothie-Engine wurde nicht nebenbei verändert.

### Grenzen der Übergabe

Die sechs festen Lektionsbeispiele sind umgesetzt. Offen bleiben die in [trace-contract.md](figuren-s6a/trace-contract.md) beschriebenen Integrationsverträge: dauerhafte CPython-Prüfung, sichere Hinweis-Präfixe, direkte Auswahl mit Tastaturäquivalent, `tag-after-line`, freie Parameter und ein bestehender Familienfall für Kurzschluss. Diese Punkte sowie Noas visuelle Abnahme werden nicht als abgeschlossen gemeldet. F2 und fremde Familien-/Graderdateien wurden nicht bearbeitet.
