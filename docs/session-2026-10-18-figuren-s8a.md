# Figuren S8a: Verteilungen und Bäume

Basis: `1e017b749f0269ae738c967602225764b28f2688`, `figuren: Integration Welle 2`. Neuer normaler Worktree `/Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s8a`, Branch `feature/figuren-s8a`, anfangs sauber. Port ausschließlich 4409. Kein Push und kein Merge in `feature/figuren`.

## Frühe Anfrage an S2b/Integrator

- F6 benötigt Explore für `binWidth`: ganzzahlig 1 bis 5, Schritt 1, Start 2. Endliche gültige Eingaben durch `validateParams`, bestehendes Zahlenfeld mit Pfeiltasten, sichtbares Label „Fachbreite“, mindestens 44 px Ziel. Änderung berechnet nur Fächer neu; Punkt-IDs und Werte bleiben identisch. „Von vorn“ setzt Parameter, Pose und Ansicht auf den Start zurück; Antworten pro Parametersatz trennen. Kein Familien-Runtime-Fork. Bis zur integrierten API nur feste Beispiele und Modelle, keine vorgetäuschte Reglerbedienung.
- F9 benötigt einen versionierten gemeinsamen Antwort-/Auswahlvertrag für `{feature, threshold}` innerhalb der S4a-Antworthülle. Kandidaten sind Mittelpunkte benachbarter verschiedener Merkmalswerte, keine leeren Kinder. Tastaturäquivalent als beschriftete Radioauswahl mit Pfeiltasten und Leertaste, mindestens 44 px Ziele. Auswahl am Zaun und durch Text kenntlich machen. Reset setzt die Auswahl zurück; Urteil beim Zurückgehen erhalten. Der vorhandene deterministische Löser bestimmt das minimale gewichtete Gini. Jeder Kandidat mit demselben Minimum innerhalb einer zentral festgelegten numerischen Toleranz ist richtig, unabhängig von der Reihenfolge. Kein neuer lokaler Grader und keine Ersatzaufgabe. Aufgabenabnahme bis zur integrierten Übergabe offen.
- Benötigt wird der konkret geprüfte Integrationscommit von S2b. Ein privater Nachbarbranch ist keine Abhängigkeit. Diese Anfrage wird als Digest übergeben; keine anderen Chats automatisch angeschrieben.

## Lernentscheidungen vor Geometrie

Alle vier angrenzenden Lektionen und die gemeinsamen Welle-3-Quellen gelesen. Aktuelle Workbench-Regeln gehen älteren Test-, Snapshot-, Menü- und Kamerapflichten vor.

- `eda-distributions`: Die Lektüre erklärt halboffene Fächer und nutzt `(2,4,4,4,5,5,7,9)`. Die Figur zeigt genau diese Punkte zunächst auf der Zahlengeraden, dann gezählt und als Quartile/Boxplot. Flach; keine Nagelbrett-Requisiten, da Zufallsentstehung hier nicht das Thema ist. Am Handy ein großer Plot je Zustand. `normal-density.viz.json` und dessen Lektionsblock bleiben bestehen.
- `ml-repro`: Die Lektüre erklärt getrennte Generatoren und fortgesetzte Ziehungen. Feste Aufzeichnungen des vorhandenen PRNG zeigen Seed 7; aufgezeichnete Seeds 8 und 9 ändern die Folge und den Split. Die NumPy-PCG64-Folge wird nicht mit dem Plattform-PRNG gleichgesetzt. Große lesbare Zahlkarten statt Würfeldekoration.
- `ml-error-analysis`: Die Lektüre nennt 95 % und 78 % Trefferquote. Die Figur verwendet dazu echte ganzzahlige Gruppen und zeigt Fehleranteile samt Nennern; die Gesamtquote wird gewichtet berechnet. Flacher Flussquerschnitt als Fehlerratenprofil, keine erfundenen choreografierten Zähler.
- `ml-ensembles`: Ein großes Feld mit Klasse als Form, optimale Zäune und Gini aus einem Modell. Rekursive zweite Teilung und Stimmen werden aus trainierten kleinen Bäumen berechnet. Mobile Zustände nacheinander statt winziger Felder nebeneinander. Lernfrage „Gini nach dem Split“; neue Split-Aufgabe bleibt bis zum gemeinsamen Vertrag offen.
- `l-data-cleaning` bleibt vollständig bei S7. Ein eigenes benanntes Fragment zeigt den Mittelwert vor/nach zielabhängigem Fehlen hoher Umsätze. Einbindung nur durch S7/Integrator.

Vor Detailausbau werden Anfang, Änderung und Ergebnis bei 375 px im Browser geprüft. Prüfwerte und Reviewbilder folgen unten.

## Umsetzung und fachliche Gegenproben

Vier feste Lektionsfiguren eingebunden, jeweils zwischen dem zusammenhängenden Begriffstext und dem folgenden Abschnitt. Die ursprüngliche Lektüre bleibt in den Markdown-Splits erhalten; kurze neue Bezüge erklären Quartil-/Whisker-Konvention, PRNG-Unterschied und die mögliche falsche Ensemblemehrheit. `normal-density.viz.json`, sein Block und alle alten Checkpoints bleiben unverändert. Keine Änderungen an S7s Lektions-JSON, Markdown oder Pipeline.

`distribution-points` verwendet dieselben Punkt-IDs und Werte für Zahlengerade, feine Fächer, Kanten 0/4/9 und Boxplot. Lineare NumPy-Quartile, ausdrücklich Min/Max-Whisker. Fachbreiten 1 bis 5 ändern nur die Bin-Zuordnung; die Achse umfasst auch eine über 10 hinausgehende letzte Fachkante. `copies` ist ein reiner Messparameter und keine öffentliche Lernbedienung.

Die vorhandenen Referenzlöser wurden einmalig mit dem vendorten Pyodide und NumPy ausgeführt. Kein CPython-/NumPy-Ersatz, keine neue dauerhafte Testsuite. Nachweis: `docs/figuren-s8a/oracles.json`.

| Vergleich | Ergebnis |
|---|---|
| formula-descriptive-stats-numpy | n=8, Mittel=5, Median=4,5, Populations-Standardabweichung=2; feine Fächer [0,1,5,1,1], grobe [1,7] stimmen exakt |
| NumPy quantile, linear | Q1=4, Median=4,5, Q3=5,5; Fachbreiten 1 bis 5 verändern keinen Datenwert |
| formula-metric-spread-range | tatsächliche Baseline-Treffer 1/4,1/4,2/4 ergeben 25 Prozentpunkte Spannweite, vorhandener Löser bestätigt |
| formula-stat-from-table | derselbe Nennervertrag des eval-batch-rates-Lösers bestätigt aus 240/100 Fällen und 12/22 Fehlern die gewichtete Gesamtgenauigkeit 90 % |
| reproduce-seeded-split | vorhandener NumPy-Löser wiederholt Seed 7 exakt: Test-IDs [8,0,7,1], Train [3,6,2,4,5,9]. Der Plattform-PRNG wird ausdrücklich nicht als PCG64 ausgegeben; seine eigene Folge und Split-IDs sind wiederholbar |
| optimize-tree-best-split | alle sieben Kandidaten gegengeprüft; 2,5 und 6,5 haben denselben Minimalwert 1/3. Die zweite Frage ergibt insgesamt Blatt-Gini 1/4. Alle Optima bleiben im Modell enthalten |
| Bootstrap-Abstimmung | vorhandene Split-Suche für die drei tatsächlichen Bootstrap-Stichproben rekursiv verwendet; Python bestätigt Stimmen [0,0,1] für x=7. Die Mehrheit 0 ist hier falsch, was die angrenzende Lektüre ausdrücklich erklärt |

Gleichstände werden nicht auf die erste gefundene Schwelle reduziert. `optimalSplits` liefert die vollständige Menge; die kleinere Schwelle ist ausschließlich die reproduzierbare Darstellung. Die neue Split-Auswahlaufgabe wird ohne gemeinsamen Gradervertrag nicht registriert. Die numerische Gini-Vorhersage verwendet den bereits vorhandenen Figuren-Checkpointpfad.

Die zusätzliche eigene Kaltstartprüfung im gebauten Release fand am 19.10. einen zyklischen Import: Seed und Baum luden über die Generator-Sammelmodule `FamilyExerciseView`, das mit `TypeError: re is not iterable` abbrach. Ein direkter Import des vorhandenen Foundation-Generators reproduzierte denselben Fehler. Die festen Beispiele verwenden deshalb `objects/seeded-examples.mjs`: ausschließlich Datenaufzeichnungen, erzeugt mit dem unveränderten kanonischen `rng` und `shuffle`, ohne PRNG-Kopie. Der öffentliche Szenenparameter akzeptiert vorerst nur Seed 7. Alle Folgen und Permutationen für 7/8/9 sowie Bootstrap-Ziehungen für 3/7/11 wurden erneut exakt gegen den vorhandenen PRNG geprüft; Split-IDs, Kennzahlen, Optima, Gini und Stimmen bleiben identisch zu `oracles.json`. Freie Seeds benötigen von S2b/Integrator eine zyklusfreie gemeinsame PRNG-Importgrenze. Der Fehler wurde mit derselben einmaligen Browserprobe vor/nach der Korrektur nachgewiesen; keine dauerhaften Tests ergänzt und keine gemeinsamen Bundlerdateien verändert.

Nach dem erneuten vollständigen Release-Gate alle vier neuen Figuren im echten Release bei 375×812 px selbst bedient: fehlerfrei geladen, zu Schritt 2 gewechselt, SVG-Deckkraft 1. Die Gini-Antwort wurde als richtig bewertet. `release-review.json` und vier `release-*.png` belegen diese Prüfung; Bilder geöffnet. Die zwölf Seed-Endbilder und ihr Kontaktbogen wurden aus dem endgültigen Release erneuert.

## Übergabe an S7

Eigene, nicht in den öffentlichen Lektionskatalog eingebundene Dateien:

- `docs/figuren-s8a/s8a-missing-high-sales-fragment.md`
- `docs/figuren-s8a/missing-high-sales.fig.json`
- zugehörige reine Szene `assets/js/figures/scenes/missing-high-sales.mjs` und Modell `missingSalesModel`.

Konkreter Einfügepunkt: nach dem vollständigen Abschnitt „Fehlende Werte: zufällig oder zielabhängig“, einschließlich der Frage „Warum fehlt der Wert“, und vor „Sentinel-Werte“. S7/Integrator kopiert die Spezifikation nach `content/lessons/data-ml/missing-high-sales.fig.json`, übernimmt das Markdown als eigenen Lektionsblock und fügt danach `{ "blockId": "data-cleaning-s8a-mean-shift", "type": "figure", "contentRef": "lessons/data-ml/missing-high-sales.fig.json" }` ein. Die vorhandene S7-Pipeline bleibt unverändert; die Grenze von zwei Beats-/Explore-Figuren beachten.

Die Szene zeigt fünf synthetische bekannte Umsätze, von denen gerade 600 und 900 fehlen. Mittelwert 382 → 136,666… Euro. Die übrigen drei x-Werte bleiben gleich. Ihre bedeutungsfreie Höhe ist versetzt, damit 90 und 120 Euro mobil getrennt sichtbar sind. Die unbekannten realen Zielwerte lassen sich daraus nicht rekonstruieren. Das Fragment liegt absichtlich unter docs, da ein unreferenzierter Inhalt unter content/lessons vom bestehenden Orphan-Gate abgewiesen wird. Kein Validator wurde dafür aufgeweicht. Der Browser-Preview ersetzt nur temporär eine geladene Lektionsantwort, keine Quell- oder Builddatei.

## Eigene Sichtung

Workbench angewendet. Fünf Kontaktbögen und mobile Einzelbilder selbst geöffnet und beurteilt, einschließlich der nachkorrigierten zweiten Baumteilung und der fünf getrennten Umsatzpunkte. Alle 17 Zustände bei 375/1440 px in hell/dunkel, zusammen 68 PNGs. Die 375-px-Seite hat eine tatsächliche Bühne von 309×309 px. Aufnahmen nur mit `data-settled=true`, SVG-Deckkraft 1 und freiem Ausschnitt. Sticky-Header und Lektions-Fortschrittsknopf ausschließlich für die Aufnahme ausgeblendet.

Gemessene Minima: SVG-Schrift 14,0455 px, Glyphen-Außenrand 16,7 px, Textkontrast einschließlich Deckkraft 5,6359:1, Knopfhöhe 44 px, Innenrand unter letztem Knopf 17 px. Alle Texte auf ungeschatteter Fläche mit Deckkraft 1. Farb-/Material- und Bereichsgrenzen stehen in `docs/figuren-s8a/assets.md`, Einzelwerte in `review-metrics.json`. Die gemeinsame Readout-Schrift bleibt 13 px und gehört weiterhin zur S2b-Anfrage.

Kontaktbögen: `docs/figuren-s8a/contact-distribution-points.jpg`, `contact-seed-ribbon.jpg`, `contact-subgroup-river.jpg`, `contact-tree-vote-field.jpg`, `contact-missing-high-sales.jpg`. Mobile Originale heißen `<szene>-375-<light|dark>-<schritt>.png`. Die Gini-Antwort `0,3333333333` und „Richtig.“ bleiben beim Vor-/Zurückgehen in beiden Themes und Breiten erhalten.

## Gates, Leistung und offene Abnahme

Der große Renderer-Lastfall mit 1024 tatsächlich montierten SVG-Punkten überschreitet das Beatziel. Drei Läufe, 4× CPU, Median der Laufmediane je Übergang: schlechtester mobiler Übergang 13,1 ms, Desktop 13,2 ms. Dies ist keine Abnahme großer interaktiver Punktmengen. Die veröffentlichten Unterrichtsfiguren verwenden acht Punkte. Anfrage an S2b/Integrator: vorhandene SVG-Primitive bündeln oder den gemeinsamen Canvas-Layer-Vertrag für Größe/DPR, Kamera, Theme, Reduced Motion, Forced Colors, Druck und Viewport-Pause übergeben. Keine lokale zweite Painter-Implementierung. Der Lastparameter bleibt eine Messprobe.

Eigene Frame-Messung mit vorhandener Engine-Instrumentierung, 4× CPU und drei seriellen Läufen pro Bedingung. Die Tabelle nennt den schlechtesten Übergang pro Szene, jeweils als Median der drei Laufmediane; vollständige Mediane/P95/Max/Samplezahlen in `performance.json`. Alle Unterrichtsbeispiele liegen unter dem bevorzugten 4-ms-Ziel. Die Szenen sind flach, daher gibt es keine eigene Orbit-/Kamerafahrt-Abnahme.

| Szene | 375 px | 1440 px |
|---|---:|---:|
| distribution-points, 8 Punkte | 1,0 ms | 1,0 ms |
| seed-ribbon | 0,2 ms | 0,2 ms |
| subgroup-river | 0,4 ms | 0,5 ms |
| tree-vote-field | 0,9 ms | 0,9 ms |
| missing-high-sales, Fragment | 0,4 ms | 0,5 ms |
| distribution-points, Lastprobe 1024 Punkte | 13,1 ms | 13,2 ms |

Gemeinsame Referenz separat, unveränderte `tests/e2e/figures-perf.spec.ts`, A1, drei Läufe, 4× CPU; Werte in `performance-shared.json`:

| Gemeinsamer Smoothie | 375 px | 1440 px |
|---|---:|---:|
| Beat | 4,4 ms | 4,7 ms |
| Ziehen | 8,9 ms | 9,6 ms |
| Kamerafahrt | 7,6 ms | 9,3 ms |

Bevorzugtes gemeinsames Beatziel sowie Ziehen und Desktop-Kamerafahrt bleiben offen. Diese Bestandswerte werden nicht der F6-/F9-Geometrie zugerechnet und nicht durch einen eigenen Painter umgangen.

Buildgrößen, echte gzip-Bytes; vollständige Namen, Importe und SHA-256 der endgültigen Quellen stehen in `measurements.json`:

| Chunk | gzip |
|---|---:|
| distribution-points | 1586 B |
| seed-ribbon | 1573 B |
| subgroup-river | 1200 B |
| tree-vote-field einschließlich Baummodell | 2251 B |
| feste gemeinsame Seed-/Bootstrap-Daten | 270 B |
| missing-high-sales | 1125 B |
| gemeinsames S8a-Verteilungsmodell | 1090 B |
| wiederverwendeter optimization-plot | 1747 B |
| wiederverwendeter linalg-stage | 1018 B |
| gemeinsames figure-kit | 5975 B |
| FigureRuntime | 10027 B |

Alle eigenen Szenen bleiben unter 12000 B gzip. Das gemeinsame Runtime-Ziel unter 10000 B bleibt mit 27 B Überschreitung exakt wie in der integrierten Basis offen. Seed und Baum importieren die separat ausgewiesenen festen Daten mit 270 B; der zyklische `family-core`-Pfad wird von den Szenen nicht mehr geladen. Gemeinsame Helfer und Runtime sind vollständig separat ausgewiesen. Keine neue PRNG-Kopie und keine gemeinsame Bundleränderung.

Tastatur links/rechts selbst bedient; vertikale CDP-Touch-Gesten scrollten bei allen vier Lektionen rund 198–200 px. `touch-action: pan-y`, Auswahl außerhalb der Bühne `auto`, Azimut 0. Druckbeschreibung sichtbar, Navigation verborgen. Bei 640 px mit 200 % Schrift bleiben Client-/Scrollbreite der Karten identisch 606 px. Forced-Colors-Bilder geöffnet, keine Seitenfehler. Nachweis `accessibility.json` und vier zusätzliche Forced-Colors-PNGs.

| Abschluss-Gate auf 4409 | Ergebnis |
|---|---|
| Compiler und Inhaltsvalidierung | bestanden, 50 Lektionen und 290 Aktivitäten |
| Typecheck einschließlich Coverage | bestanden |
| Release samt Public-/Leak-/Lizenzprüfung | bestanden, 976 Dateien |
| Node | 2240/2240 bestanden |
| Project-Runner | 20 bestanden |
| Chromium Dev | 96 bestanden, 26 regulär übersprungen |
| Chromium Release | 95 bestanden, 27 regulär übersprungen |

Der erste Dev-Gesamtlauf verlor bei der Onboarding-Axe-Prüfung durch parallele Kompilierung den Seitenkontext; seriell wiederholt bestanden. Keine fremde Assertion angepasst. Die anfänglichen Compilerbefunde zu `displayNumbers` und unreferenzierten S7-Fragmenten wurden an den eigenen Modellen beziehungsweise durch Auslagern der Fragmente nach docs behoben. Keine Lecksperre oder Orphan-Prüfung aufgeweicht.

Auch nach der Release-Importkorrektur erneut seriell abgeschlossen: Chromium Dev 96 bestanden/26 übersprungen, Chromium Release 95 bestanden/27 übersprungen; jeweils zwei Worker, Port 4409 strikt, Exit 0. Im Dev-Server bleibt der bestehende Hinweis auf die fehlende `vendor/pyodide/pyodide.mjs.map`; diese Sourcemap fehlt bereits in der Basis und betrifft keine geänderte Quelle. Der eigene Preview-Server wurde gestoppt, Playwright beendete seinen Dev-Server; Port 4409 anschließend ohne Listener.

Shrink Complexity auf allen elf geänderten Code-Dateien: Exit 0, keine Komplexitätsfehler. Ein vorhandener `no-useless-assignment`-Hinweis in `tools/build_public.mjs`, `thirdPartyNotices`, bleibt; der Funktionskörper wurde nicht geändert. `git diff --check` besteht. Fehlenden Worktree-Graphen mit `graphify update` aufgebaut, anschließend mit explizitem `--graph` abgefragt; konkrete Quellen vor Änderungen geprüft.

Die Umsetzung und ursprünglichen Messungen stammen vom 18.10.2026. Nach Unterbrechungen durch Nutzungsgrenze und Kapazitätsfehler der automatischen Freigabeprüfung am 19.10. fortgesetzt. Release-Importkorrektur, kanonischer Datenabgleich, Seed-Bilder, Seed-/Baum-Frames, Quell-Hashes, Chunkgrößen und Abschluss-Gates anschließend erneuert. Die übrigen Szenen und ihre Geometrien sind unverändert.

Offen bleiben Explore-Fachbreite, Split-Auswahlaufgabe, freie Seeds mit zyklusfreier gemeinsamer PRNG-Grenze, S7-Einbindung, großes SVG-Punktbudget, die genannten gemeinsamen Engine-Budgets und die gemeinsame 13-px-Readout-Schrift. Kein integrierter S2b-API-Übergabecommit liegt dieser Session vor. Keine neuen Tests oder Snapshots, kein eigener Grader, keine Runtime-/Schema-/Compileränderungen und kein zweiter Canvas-Painter. Noas visuelle Freigabe ist nicht vorweggenommen.

Lokaler Umsetzungscommit: `f88c9da`, `figuren(s8a): Verteilungen und Baumabstimmung ergänzen`, direkt auf der festgehaltenen Welle-2-Basis. Reviewbilder, Messdaten und dieses Übergabedokument folgen in einem eigenen lokalen Dokumentationscommit. Nach den grünen Gates ausschließlich überzählige Leerzeilen am Dateiende entfernt; Quell-Hashes danach aktualisiert. Kein Push, kein Merge, kein laufender Server auf 4409.
