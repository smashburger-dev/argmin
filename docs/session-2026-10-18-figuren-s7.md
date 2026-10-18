# Figuren S7: Pipeline und Schwellen

Basis: `1e017b749f0269ae738c967602225764b28f2688` (`figuren: Integration Welle 2`), Branch `feature/figuren-s7`, normaler Worktree `/Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s7`. Arbeitsbaum vor Installation sauber. Port ausschließlich 4408. Kein Push, kein Merge in `feature/figuren`.

## Lernentscheidungen vor der Geometrie

Die Lektüre erklärt Begriffe und Verträge. Die Figuren zeigen den jeweils konkreten Datenfluss frontal und ohne räumliche Requisiten. Beschriftete Ein- und Ausgänge, Datenkarten und Fehlerpfade bleiben bei Handygröße lesbar. Keine importierte Gesamtbühne, keine pauschale Kamerafahrt oder Quizpflicht.

- `goods-in`: Alterstext wird Zahl oder dokumentierter Datenfehler. Nur erwartete ValueErrors landen in der Fehlerrutsche; Programmfehler bleiben sichtbar.
- `cleaning-line`: exakt die acht Kundenzeilen der Lektüre; Schema, Duplikate und fehlende Zielwerte ergeben dieselben verbleibenden Zeilen wie die Anzeige. Der Verteilungsbezug kommt als S8a-Fragment.
- `fold-rotation`: Fold-Größen und Trainings-/Testzugehörigkeit stammen aus Zeilenindizes; ein über alle Zeilen gelernter Füllwert zeigt die verletzte Informationsgrenze.
- `token-conveyor`: feste Toy-Logits, berechnetes Argmax und Rückführung des Tokens in den Kontext; keine Behauptung echter Sprachfähigkeit.
- `mail-sorter`: Dokument bleibt Daten; Werkzeugwunsch passiert eine explizite Allowlist-Grenze.
- `house-ablation`: dieselben eingefrorenen Fälle mit und ohne Kontrolle; Fehler aus den Fallausgängen.
- `trades-stopwatch`: Laufzeit, Budget und Abbruch aus demselben Stage-Protokoll.
- F8: dieselben gelabelten Datensätze liefern Zuordnung, Konfusionsmatrix, Precision/Recall/F1 und Teilgruppenraten. Logistic behält den alten Checkpoint mit zwei Werten rechts der Grenze; Eval behält den Checkpoint F1 = 0,75 bei t = 0,5.

## Frühe Anfragen und Dateibesitz

An Integrator/S2b übergeben: Explore-Zahlenfeld für `threshold`, Compare mit gemeinsamem Modell und konsistenter Kamera sowie Antwortverträge für topologische Ordnung, Split-Grenze und optimale Schwellenwahl. Bis zur integrierten API-Übergabe bleiben diese Bedienungen offen. Keine privaten Runtime-, Compiler-, Schema- oder Grader-Forks.

K7 gehört S8b. Bedarf: gerichtete Kanten zwischen Stage-IDs, Zustands-/Vertragslabel und Split-Annotation. S7 legt keine zweite Graph-Datei an. Die eigenen festen Szenen verwenden vorhandene Ebenenprimitive.

S7 ist einziger Schreiber von `l-data-cleaning` einschließlich Markdown. `l-genai-rag` und `l-capstone-freeze` bleiben bei S8b; ihre vorhandenen JSON- und Markdown-Dateien wurden nicht verändert. In der verfügbaren Chatliste war keine laufende S8a-/S8b-/S2b-Session sichtbar; die konkreten Schnittstellenanfragen wurden früh an den Integrator übergeben.

Explizite Übergabe an **S8b bzw. Integrator**:

- `docs/figuren-s7/s7-l-genai-rag-fragment.md`: benannte Übergaben von Chunking, Index, Retrieval, Kontext und Antwortbildung. Nach dem Index-/Ranking-Abschnitt einfügen und mit S8bs Token-/K7-Beispiel abstimmen.
- `docs/figuren-s7/s7-l-capstone-freeze-fragment.md`: Freeze-Prüfung vor dem Lauf, konkrete IO-Schlüssel `docs`/`rankings`/`report` und Abgrenzung zum Laufzeit-Timeout. Nach dem Abschnitt „Pipeline-Stages mit IO-Verträgen“ auf Dopplungen prüfen und mit K7 verbinden.
- Maschinenlesbare Einfügevorschläge und vorgeschlagene neue `contentRef`s stehen in `docs/figuren-s7/foreign-fragments.json`. **Beide Fragmente sind nicht integriert.** Sie sind kein bereits kompilierter Teil der fremdbesessenen Lektionen.

An **S8a** offen: Ein Verteilungsfragment für `l-data-cleaning` wurde in dieser Session noch nicht übergeben. S7 erfindet keinen Ersatz für dessen F6-Modell. Die eigene Integration zeigt bereits vollständig die acht echten Lektionszeilen.

## Prüfstand

Basis nach `npm ci`: Compiler/Content und Typecheck/Coverage bestanden; der Node-Basislauf wurde ausgeführt. Der Abschlussbericht der Welle-2-Basis wurde gelesen und indexiert. Ein vollständiger neuer Browser-/Release-Basislauf vor der Änderung wurde nicht zusätzlich behauptet. `npm ci` meldete einen vorhandenen High-Befund; keine Abhängigkeitsversion wurde verändert.

Die elf angebotenen Figuren sind in ihre exklusiven Lektionen integriert. Alle elf vollständigen Lektionsprosen sind nach Zusammenfügen der Leseblöcke inhaltlich unverändert; einzig der Dateicode-Einleitungsblock ist nun wie seine Fortsetzung `worked-example`, damit die bestehende Stilprüfung die ganze Lektüre zusammensetzt. Die beiden übernommenen Checkpoints sind bis auf ihre Beat-Zuordnung wörtlich identisch. Alte `.viz.json` bleiben unverändert und über eine lokale Archivlektion referenziert.

| Abschlussprüfung | Ergebnis |
|---|---|
| Compiler und Inhaltsvalidierung | bestanden: 46 Kompetenzen, 50 öffentliche Lektionen, 290 Aktivitäten |
| Node gesamt | 2236 bestanden, 1 übersprungen, **3 fremde Strukturannahmen offen**, siehe unten |
| Bestehende Stilprüfung | 580/580 bestanden |
| Typecheck und Coverage | bestanden |
| Release einschließlich Public-/Leak-/Lizenzvalidierung | final erneut bestanden: 1006 Dateien, 46 Kompetenzen, 50 öffentliche Lektionen, 290 Aktivitäten |
| Project-Runner | 20 Prüfungen, davon 1 übersprungen, bestanden |
| Chromium Dev, Port 4408 | 96 bestanden, 25 übersprungen, **1 Glossar-A11y-Befund**; isolierter Nachlauf 6 bestanden/1 fehlgeschlagen |
| Chromium Release, Port 4408 | 94 bestanden, 27 übersprungen, **derselbe 1 Glossar-A11y-Befund** |
| Shrink Complexity | alle 15 eigenen Code-Dateien bestanden, maximale erlaubte Komplexität 10 |
| Diff-/Besitzprüfung | bestanden; kein eigener Compiler-, Runtime-, Schema-, CSS-, Vendor- oder Testdatei-Fork |

Die drei Node-Befunde wurden dem Integrator konkret gemeldet: `tests/lesson_content_genai.test.mjs` akzeptiert bei Nicht-viz-Blöcken nur Markdown; `tests/lesson_content_transformer.test.mjs` ebenso und zählt zusätzlich nur den ersten statt aller `worked-example`-Leseblöcke. Diese Bestandsannahmen passen nicht zu den erlaubten Figuren und Textsplits. Sie wurden nicht parallel zur anderen Transformer-Session umgeschrieben.

Der gemeinsame Glossar-Popover meldet während des Einblendens 3,37:1 bzw. 4,28:1 statt 4,5:1. Ein separater Axe-Lauf nach 700 ms enthält keinen Farbkontrastbefund mehr, aber `scrollable-region-focusable` an einer vorhandenen `.katex-display`-Formel. Nachweis: `docs/figuren-s7/glossary-settled-check.json`. Dieser gemeinsame Timing-/Renderer-Nachlauf ist offen, keine bestandene Gesamt-A11y-Abnahme.

## Sichtung, Kontrast und Bedienung

136 angebotene Ansichten bei 375/1440 px und hell/dunkel wurden aufgenommen; alle elf Kontaktbögen in `docs/figuren-s7/review/<scene>-contact.png` wurden selbst geöffnet. Zusätzlich angesehen: mobile Logistic-Frage, Eval-Ergebnis, Fold-Leakage, Werkzeuggrenze sowie die ganzen Fragekarten, Forced Colors und 200-%-Ansicht. Aufnahmen erst nach `data-settled=true`, SVG-Deckkraft 1 und mit freiem Ausschnitt; überholte Debugbilder wurden entfernt. Keine neuen Snapshot-Assertions.

Messung: kleinste tatsächliche Bühne 309 px, Schrift mindestens **14,0455 px**. Keine Text-Text-Überlagerung und kein abgeschnittenes Label in den 136 Zuständen. Text gegen Bühnenpapier mindestens 5,6359:1; einschließlich der tatsächlichen getönten Kartenflächen mindestens **5,1013:1**. Volle Textdeckkraft in beiden Themes. Matrixglyphen horizontal innerhalb 0,00001 px und vertikal innerhalb 0,119 px vom Fachmittelpunkt. Belege: `visual-measurements.json` und `carrier-contrast.json`.

Eigene Browserbedienung: Frage anfangs unsichtbar, im vorgesehenen Schritt sichtbar, Weiter bis zur richtigen Antwort gesperrt, Urteil beim Zurückgehen erhalten; Tastatur wechselt Schritte, Mausziehen lässt die flache Kamera unverändert. Echte Touch-Gesten scrollten die Seite um 363 bzw. 348 px. Lektüre/Beschriftung bleiben auswählbar; die Bühnensperre ist lokal. Ziele mindestens 44 px, letzter Knopf 17 px innerhalb der Karte. Beleg: `interaction-measurements.json`. Forced Colors und 200-%-Ansicht wurden selbst geöffnet; bei den Zusatzaufnahmen wurden darüberliegende Kopfzeilen ausgeblendet, ohne Produktdateien zu verändern.

**Gemeinsame offene Bedienabnahme:** Beim Wiederbesuch eines bereits gemalten Endzustands kann der unveränderte Painter alte Geometrie stehen lassen. Konkrete Folge: Logistic Schritt 1 → richtige Antwort → Schritt 2 → Zurück zeigt die Frage/den Schrittstand 1, aber noch die Labels aus Schritt 2 (`review/logistic-question-card.png`). `dirtyItems` merkt Objekt+Kamera/Style, während die DOM-Bindung nach Item-ID wiederverwendet wird: A → B → A überspringt den erneuten Anstrich von A. Das betrifft prinzipiell auch „Von vorn“, wenn dabei dieselbe Kamera und bereits gemalte Objekte wiederkehren. S7 nutzt die vorhandene Endzustandsmemoisierung des gezielt wiederverwendeten `figure()`-Kompositionshelfers. Der Integrator wurde mit Ursache und Reproduktion informiert. Kein privater Painter-Fork oder Cache-Umgehung in elf Familienmodulen; die erneute Darstellung früherer Zustände bleibt bis zur zentralen Korrektur offen.

## Fachliche Autorität und Grenzen

39 Gegenproben gegen die vorhandenen JS-/CPython-Löser bestanden, zusätzlich wurde die vorhandene Leakage-Klassifikation abgefragt. Details und konkrete Fälle in `docs/figuren-s7/model-checks.md`. Jede Matrix, Metrik, Teilgruppenrate und Zuweisung stammt aus Einzelfällen; kein choreografierter Zähler. Die optimale Paritätsauswahl wurde mit der bestehenden CPython-Referenz geprüft, nicht mit einem neuen Grader.

Die festen Szenen sind keine Abnahme einer freien Explore-/Compare-Bedienung. Neue Aufgaben zur topologischen Ordnung, Split-Grenze und optimalen Schwellenwahl wurden ohne gemeinsamen Antwortvertrag nicht registriert. Sichere Hinweisadapter sind ebenfalls nicht behauptet.

## Größe und Leistung

Die eigenen Beats wurden bei 375/1440 px mit vierfacher CPU-Drosselung dreimal pro Szene über die bestehende Engine-Instrumentierung gemessen. Median der Laufmediane **0,1 bis 1,0 ms**, damit unter 4 ms. Rohzusammenfassungen aller 66 Läufe: `docs/figuren-s7/performance.json`. Die Szenen sind flach und besitzen weder Drag- noch Kamerafahrten; dafür werden keine erfundenen eigenen Werte angegeben. Die gemeinsame Smoothie-Messung wird separat ausgewiesen.

Eigene Lazy-Szenenchunks liegen zwischen **516 und 659 B gzip**. Zusätzliche geteilte Chunks werden nicht darin versteckt: Pipeline-Modell 1458 B, Pipeline-Darstellung 2791 B, Schwellen-Modell/Darstellung 2694 B, wiederverwendeter `optimization-plot`-Helfer 1747 B, `linalg-stage` 1018 B, `f12-diagram` 1110 B. Gemeinsames `figure-kit` **5975 B** separat. **FigureRuntime 10027 B gzip**: der bereits in Welle 2 bestehende Verstoß gegen strikt unter 10000 B bleibt um 27 B offen. Keine Runtimeänderung in S7.

Das vorhandene Smoothie-Messwerkzeug wurde zusätzlich dreimal mit `FIGURE_PERF=1 FIGURE_PERF_STYLES=a1 E2E_REUSE_SERVER=1 E2E_PORT=4408 npx playwright test tests/e2e/figures-perf.spec.ts --project=chromium --workers=1` ausgeführt. Median der Laufmediane Desktop/Mobil: Beat **5,1/5,7 ms**, Drag **10,7/9,4 ms**, Kamerafahrt **10,6/9,9 ms**. Damit bleibt das bevorzugte gemeinsame Beatziel unter 4 ms sowie Drag/Kamera unter 8 ms offen. Die gemeinsamen Befunde werden nicht als eigene Familienüberschreitung umgedeutet. Beleg: `performance-shared.json` mit allen drei Läufen und Aggregation.

## Lokaler Abschluss und offene Übergaben

Lokale Commits: `75515bb` — Modelle/Szenen und additive Registry; `46144f1` — exklusive Lektionsintegration, alte Checkpoints, Archiv und additive Allowlist. Ein weiterer Abschlusscommit enthält diesen Digest, die expliziten fremdbesessenen Fragmente, Asset-Karte, Messungen und selbst gesichtete Reviewbilder.

Der eigene Dev-Server wurde vor dem Release-Gate gestoppt. Der Release-Prüfserver wurde danach beendet; Port 4408 ist frei. Kein Push und kein Merge in `feature/figuren`. Die vollständige Abnahme bleibt ausdrücklich offen für:

1. die zentrale Painter-Korrektur für erneut aufgerufene Endzustände;
2. die drei gemeinsamen Node-Strukturannahmen sowie den Glossar-/Formel-A11y-Nachlauf;
3. Explore/Compare, gemeinsame Antworten für Topologie/Split/optimale Schwelle und K7;
4. den noch nicht gelieferten S8a-Verteilungsbezug und die **nicht integrierten** S7-Fragmente für S8bs zwei Lektionen;
5. die bekannten gemeinsamen Runtime- und Smoothie-Budgets und Noas gestalterische Freigabe.
