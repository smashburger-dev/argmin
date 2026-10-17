---
name: werkbank-figuren
description: Build, extend or review argmin figures (Werkbank kit, isometric SVG scenes, style A1). Use for any work on .fig.json, assets/js/figures, src/figures, hint figures in tasks, or a figure family session (F1 to F12).
---

# Werkbank-Figuren bauen

Verbindlich für jede Figuren-Session in argmin. Quellen: ADR `docs/adr/0018-figuren-werkbank.md`, Familienplan `docs/figuren-familienplan.md`, Sessionplan `docs/figuren-sessionplan.md`, Referenzszene `assets/js/figures/scenes/smoothie.mjs`. Wenn diese Datei und eine Quelle sich widersprechen, gilt diese Datei; melde den Widerspruch.

## 1. Was eine Figur ist

- Wähle zuerst die Darstellungsform am konkreten Beispiel: statischer Vergleich, direkte Objektinteraktion, Erkunden eines Parameters oder ein Ablauf in Beats. Sequenz, Vorhersage, Kamerafahrt und Textfläche sind Werkzeuge mit einem Zweck, keine gemeinsame Pflichtausstattung. Nutze nur bereits implementierte Figurenarten; fehlt ein sinnvoller Vertrag, beschreibe ihn als Anfrage statt das Beispiel in Beats zu zwingen.
- „Werkbank“ ist der Name des Kits. Die Smoothie-Szene begründet keine allgemeinen Vorgaben für Bühne oder Interaktion. Der Bühnenkatalog (Abschnitt 3a) gibt den Familien eine Ausgangswelt. Passe Ausschnitt, Teile und Interaktion an die jeweilige Lektion und das konkrete Beispiel an; Abweichungen vom Sessionauftrag stehen im Digest.
- Entwirf Lektion und Figur zusammen: Die vorhandene Lektüre erklärt Begriff und Rechnung; die Figur zeigt den Mechanismus und seine Veränderung. Lies vor dem Bau den Text direkt vor und nach der Figur. Ergänze Text nur für einen fehlenden Bezug zwischen Lektüre und Darstellung.
- Wähle das gezeigte Beispiel zuerst nach diesem Lektionskontext und seiner grafischen Eignung. Ein übernommener Checkpoint muss im Modell geprüft sein, ist aber kein vorgeschriebenes Hauptmotiv. Wird er zur Übertragungsfrage an einem anderen Vektorpaar, mache den Wechsel in der Frage oder Beat-Beschriftung erkennbar, ohne den alten Checkpoint umzuschreiben.
- Wähle den Inhalt der Bühne nach dem Vorgang. Beschriftungen, Zahlen und Formeln gehören hinein, wenn sie am Gegenstand etwas ablesbar machen, etwa Zellwerte, Posten oder eine Code-Zeile. Eine vollständige Erklärung oder zusätzliche Textfläche ist keine Pflicht. Ein Beat „Wo der Vergleich hinkt“ zeigt die Grenze am Gegenstand; der Lektionsabsatz kann sie erklären.
- Halte den Gegenstand im Blick. Eine Kamerafahrt verdient ihren Platz durch eine neue räumliche Einsicht oder ein notwendiges Detail. Ein bloßer Wechsel vom Gegenstand auf Erklärungstext ist kein Fortschritt des Vorgangs. Tafel und Lesefläche im Bühnenkatalog sind Möglichkeiten, keine Pflichtbausteine.
- Bewegung nur, wo sich im Gegenstand etwas ändert. Keine Deko-Bewegung, keine Requisiten. Jedes Teil gehört zum Mechanismus (Schublade mit Griff ja, Orange auf der Bank nein).
- Baue jede Szene aus den Teilen auf, die ihr eigener Mechanismus braucht. Wiederverwendung betrifft gezielte Primitive und fachlich gleiche Objekte; ein Import einer anderen vollständigen Szene braucht einen konkreten fachlichen Grund. Prüfe die erzeugte Item-Liste auf fremde Requisiten, versteckte Alt-Geometrie und unnötige Tiefensortierung.
- Jede Zahl, Länge, Höhe und Position kommt aus `model` und `pose`. Keine Zahl wird in die Darstellung getippt.

Konkrete Entwurfs- und Remix-Regeln: `docs/figuren-design-und-assets.md`. Vor Detailgeometrie eine kleine Ansicht von Anfang, entscheidender Änderung und Ergebnis prüfen. Im Digest Lernfrage, vorhandene Lektüre, gewählte Darstellung, nötige Teile und mobile Lesbarkeit festhalten. Analogie und Lektionsbeispiel dürfen zugunsten der verständlicheren Darstellung angepasst werden; geschützte Checkpoints bleiben unverändert.

## 2. Stil A1 Tonale Werkbank (Noas Wahl, 17.10.2026)

Tokens (`src/figures/figures.css`, Namensraum `--fig-a1-*`), hell / dunkel:

| Ton | Zweck | hell | dunkel |
|---|---|---|---|
| paper | Bühne = Kartenfarbe | var(--surface) | var(--surface) |
| lo | Sockel, Füße, Boden, Rahmen | #bdb3a5 | #3a343f |
| mid | Struktur: Korpus, Platte, Pfosten | #d8d0c4 | #4a4450 |
| hi | der Gegenstand | #ece6dc | #615a68 |
| lit | genau EIN Akzent pro Beat | #6d3fd4 | #b79cff |
| line | Kanten 0,6 px | #5c5650 | #a89f94 |
| fluid | Flüssigkeiten | mittel-dunkler Tonwert | mittel-dunkler Tonwert |
| glass | Glas: Tönung mit fill-opacity 0,22, Umriss, nie deckend | | |
| ghost | was es nicht gibt (negative Portion): gestrichelter Akzent-Umriss 1,2 px, 15 % Akzent-Tönung | | |
| board | Tafel und Etiketten: glatt, kontraststark, nie schattiert | | |

Regeln:
- Vier Schattierungsstufen aus der kamerarelativen Lichtrichtung (`shadeOf`). Oben hell, Bildschirm-links mittel, Bildschirm-rechts dunkel.
- Glatte Flächen (Zylindermantel, runde Kanten) ohne Kantenstrich, mit Strich in Füllfarbe gegen Antialias-Nähte; Silhouette je Teil als ein Umriss.
- Akzent nie für Struktur, Glas oder Flüssigkeit. Ein beleuchtetes Etikett bekommt Akzent-Text und 1 px Akzent-Umriss auf glatter Platte, keine violette Fläche.
- Farbe nie allein: der Akzent-Teil hat immer auch Form, Position oder Beschriftung.
- Text und Trägerfläche als Kontrastpaar behandeln. Auf Objekten gesetzter Text muss in hell und dunkel mindestens 4,5:1 zur tatsächlichen gerenderten Fläche erreichen, einschließlich Schattierung, Deckkraft und Akzentzuständen. Seitenkontrast oder ein passender Tokenname genügt nicht. Für lesbare Werte bei Bedarf eine ungeschattete Lesefläche verwenden. Asset-Karten nennen dieses Paar und den Kontrastprüfung; Beschriftungen nicht als farblich unveränderbare Bitmap einbacken.
- Halo unter dem Korpus: Ellipse durch die projizierte Grundfläche mal 1,05, weich, dezent.

## 3. Komposition und Kamera (für jede Welt)

- Der Gegenstand füllt in der Übersicht etwa 60 % der Bühne. Kein Sockel, keine Beine, kein Boden, der mehr Fläche frisst als der Gegenstand.
- Arbeitswerte bei kleinster Bühne: 16 px äußerer Freiraum, 12 px zwischen unabhängigen Gruppen, 8 px Abstand einer Beschriftung zu fremden Zeichen oder Objekten. Fachlich nötige Kreuzungen ausnehmen und begründen. Alle Zwischenzustände prüfen. Bei Platzmangel zuerst vereinfachen, gruppieren oder Zustände trennen.
- Plane freien Raum zwischen Formen und um Beschriftungen bereits vor der Detailgeometrie. Prüfe die Komposition bei 343 px: Hauptform, mathematisch nötige Überlagerungen und einzelne Beschriftungen müssen getrennt lesbar bleiben. Eine ganze Figur kleiner zu skalieren schafft keine Ordnung in einem überladenen Gegenstand. Entferne zuerst unnötige Konturen und Teile; wähle eine 2D-Ansicht, wenn Tiefe hier nichts erklärt.
- Geometrische Diagramme behalten ihre Winkel und Maßstäbe. Prüfe vor Details die Projektion und die tatsächliche Pixelgröße des Hauptmotivs. Vermeide eine flache Raumkamera für eine ebene Flächenaussage; zwei Diagramme gehören nur nebeneinander, wenn beide auf dem Handy gut lesbar bleiben. Sonst die Darstellung vergrößern oder zwischen klar bezeichneten Zuständen wechseln.
- Sichtbare Kanten tragen Bedeutung: Objektgrenze, Datengrenze oder erklärte Hilfslinie. Interne Mesh-Teilungen und Tiefensortier-Zellen dürfen nicht unbeabsichtigt wie mathematische Unterteilungen aussehen. Prüfe durchgehende Konturen beim Drehen; fehlende oder zusätzliche Kanten sind kein Stilmittel, solange das Modell sie nicht begründet.
- Kamera nach Gegenstand: Iso (Azimut 35 bis 60°, Elevation 30°) für Objekte; Draufsicht (Elevation 70 bis 90°) für Karten, Felder, Graphen; tiefe Elevation (10 bis 20°) für Landschaften und Flächen; frontal (0°, 0°) für Leseflächen und rein zweidimensionale Diagramme. Eine Szene darf mehrere Presets je Beat haben.
- Falls eine Lesefläche für den Vorgang gebraucht wird: freie Sicht aus den Statics prüfen; beim Lesen kleinster Text mindestens 14 px bei 343 px Bühnenbreite. Eine reine Textvergrößerung rechtfertigt keinen eigenen Beat.
- Bühne 4:3 ab 560 px Kartenbreite, sonst 1:1. Lange Welten (Fließband) dürfen 16:9 sein und fahren mit der Kamera entlang.

## 3a. Bühnenkatalog (Ausgangswelten)

| Familie | Welt | Lesefläche | Kamera |
|---|---|---|---|
| F1 Python, Schleifen | Stellwerk mit Gleisrunde: eine Schleife ist eine Runde des Zugs um die Kehre, ein Zähler am Signal zählt Durchläufe; Namensschilder hängen an Wagen (Werte) | Stellpult mit Code-Zeilen, die aktuelle Zeile leuchtet | Iso, Draufsicht für die Kehre |
| F2 Matrizen, Tensoren, Attention | Archiv: schwebende Zellblöcke, Regale mit Buchrücken (Keys), Leselampen (Gewichte) | das Zellgitter selbst, frontal | Iso, frontal |
| F3 Vektorraum | Kartentisch mit Wegweisern, für 3D ein Glaswürfel auf einem Drehteller | Kartenblatt am Tischrand | Iso, Draufsicht |
| F4 Elimination | Café-Theke mit Zettelspieß und Kasse | Kassendisplay | Iso, frontal |
| F5 Pipeline | Fertigungshalle mit Förderband und Stationen, Fehlerrutsche | Anzeigetafel über der Halle | Kamerafahrt entlang des Bands |
| F6 Verteilung | Nagelbrett mit Fächern, Würfelband | Messleiste am Fächerrand | frontal leicht von oben |
| F7 Optimierung | offene Landschaft im Nebel, Wanderer, Wegspur, keine Werkbank | Wegschild mit Rechnung | tiefe Elevation, Draufsicht für Höhenlinien |
| F8 Schwellen | Postsortierraum mit Rutsche und Fächern | Zählwerk an den Fächern | Iso |
| F9 Bäume | Feld mit Zäunen von oben, Urne für Stimmen | Feldschild | Draufsicht |
| F10 Graph, Autograd, Git | Wechselstuben-Netz als schwebende Stationen mit Leitungen; Git als Gleisplan | Anzeigetafel am Knoten | Draufsicht, Iso |
| F11 Token | Setzkasten und Band mit Lettern | Druckzeile | frontal, Iso |
| F12 Waage | Marktstand mit Balkenwaage | Preisschild | Iso |
| Deep Learning (Training, Regularisierung) | Schichtturm aus Lampenreihen, Signale laufen hoch, Gradienten zurück | Schaltpult am Turmfuß | Iso, frontal |

Die Spalte Lesefläche nennt eine Möglichkeit, keine Baupflicht. Ein anderer Gegenstand oder eine andere Raumansicht ist sinnvoll, wenn das Beispiel dadurch verständlicher wird. Bei laufenden parallelen Sessions den vereinbarten Dateibesitz und Szenenvertrag einhalten und nötige Erweiterungen im Digest anfordern. Wiederverwende Teile und Verfahren; übernimm eine ganze Bühne nur, wenn der Mechanismus derselbe ist.

## 3b. Spielraum im Stil

A1 bleibt die gemeinsame Sprache (Tonstufen, Linien, ein Akzent). Pro Welt erlaubt:
- eine eigene Grundfläche (Boden, Gelände, Wand, leerer Raum) und Kamera;
- eine Datenpalette, wenn Farbe der Gegenstand ist: Gewichte und Wahrscheinlichkeiten als sequentielle Violett-Rampe (5 Stufen von Papier zu Akzent), Klassen höchstens drei Tinten plus Form als zweites Merkmal;
- Licht als Gegenstand (Leselampen, Signale) über Helligkeit der Fläche, nicht über Glow-Filter;
- flache 2D-Diagramme (frontale Kamera, nur Ebenen), wenn Tiefe nichts erklärt.
Was nie variiert: Akzentregel, Lesbarkeit (14 px), Tastatur- und Touch-Bedienung, Tiefenprüfung, Budgets.

## 4. Koordinatenfeld auf einer Lesefläche (Ebenenkoordinaten, v nach unten)

- Gitter mit quadratischen Zellen (Winkel bleiben wahr), Bereich deckt Ursprung, alle Ziele und Zwischenpunkte.
- Tick-Beschriftung außerhalb des Gitters; die unterste y-Linie bekommt keine Zahl, wenn die x-Reihe dort beginnt. Gitter Ton lo 0,12, Achsen Ton mid 0,26.
- Pfeil: Schaft 0,32, Kopflänge min(1,1, 0,35 · Länge), Spitze exakt auf dem Ziel. Beschriftung nur Vektorname, Koeffizient nur bei Bruch oder Geist.
- Kein Text überlappt Text, Pfeilkopf, Ring oder Tick (Sichtprüfung bei tatsächlicher Zielgröße; bei Bedarf einmalig per DOM-Rechteck-Messung prüfen).
- Formeln als SVG-Textläufe `{ text, italic?, sub?: string, sup?: string }`, `sub` ist der Indextext. Mathe in `KaTeX_Main` / `KaTeX_Math`, Beschriftungen in var(--sans). Kein KaTeX in `foreignObject` (WebKit-Bug 23113).

## 5. Bedienung von Beats (gleich auf Handy und Desktop)

- Eine Reihe, höchstens vier Knöpfe: Zurück, Weiter (auf dem letzten Beat „Von vorn“), Nochmal (Symbol), Ansicht (Symbol, öffnet fünf Knöpfe: links, rechts drehen, steiler, flacher, zurücksetzen). Alle 44 px hoch.
- „Schritt k von n“ mit Punkten steht auf der Zeile der Beat-Beschriftung, ist kein Knopf.
- Ziehen waagerecht dreht (Pointer-Capture, `touch-action: pan-y`), senkrecht scrollt die Seite. Tasten: Pfeile links/rechts Schritt, Leertaste Nochmal, Umschalt plus Pfeil drehen, Pfeil hoch/runter neigen, Pos1 Ansicht zurücksetzen.
- Sichtbarer Knopftext steht im zugänglichen Namen. Symbolknöpfe haben aria-label und title.
- Höchstens 4 s pro Beat, kein Autoplay. Reduzierte Bewegung springt an das Beat-Ende. Vorhersage sperrt Weiter bis zu einer lesbaren Antwort (`result.ok`) oder Überspringen; das Urteil bleibt sichtbar.

## 6. Szenenvertrag (rein, `assets/js/figures/scenes/<name>.mjs`)

Exporte: `id`, `beatIds`, `validateParams`, `model`, `beatDuration`, `pose`, `build`, `cameraFor`, `ground`, `readout`, `describe`, `answerValues`, `predictValue`, `displayNumbers`, bei Aufgaben `evaluate`, bei Hinweisfiguren `hintParams`.
- `pose(model, beat, t)` stetig: `pose(k, 0)` gleich `pose(k − 1, Ende)`.
- `build` liefert für jede Pose dieselben Items und Prim-Keys; Verstecktes über `visible: false`. Statische Items sind dieselben Objekte (memoisiert), nur bewegte Teile neu.
- Kompositkörper bekommen `part`-Indizes; ineinander steckende Teile sind getrennte Items mit `on`.
- Szene in die Registry `scenes/index.mjs` und `src/figures/registry.ts` (Lazy-Import).

## 7. Arbeitsablauf einer Familien-Session

Noas Regel aus dem S3-Review, 17.10.2026: **Keine neuen figurspezifischen Tests oder Snapshot-Sammlungen standardmäßig schreiben.** Das gilt für Szenen, Sequenzen und neu zusammengestellte Assets. Die frühere Pflicht zu einer Testdatei pro Szene oder Kit-Erweiterung ist damit aufgehoben. Neue dauerhafte Tests nur auf ausdrücklichen Auftrag. Bereits vorhandene Projektprüfungen und Referenzlöser weiterverwenden.

1. Familienplan und angrenzenden Lektionstext lesen. Lernfrage, geeignete Darstellung und nötige Teile festlegen. Erst eine einfache mobile Ansicht der entscheidenden Zustände prüfen, dann Details bauen.
2. Zahlen mit vorhandenem Referenzlöser oder einer unabhängigen direkten Rechnung vergleichen; Compiler für den Szenenvertrag und übernommene Checkpoints verwenden. Kein zweites Modell im Testcode nachbauen.
3. Die Figur selbst im Browser bedienen: entscheidende Zustände, Zwischenzustände, kleinste Zielgröße, hell/dunkel, Tastatur und Touch ansehen. Proportionen, Freiraum, Kantenbedeutung und Text auf Materialflächen ausdrücklich beurteilen. Bei Bedarf einmalig Messwerkzeuge für Kontrast, Überlappung oder Tiefe verwenden; dafür keine neue permanente Testsuite anlegen.
4. Kontaktbogen und notwendige Einzelbilder selbst ansehen. Sie sind Review-Artefakte, keine automatisch zu aktualisierenden Snapshot-Assertions. Vorhandene generische Messwerkzeuge für Frame-Zeit und Chunk-Größe nutzen, soweit der Auftrag dies verlangt.
5. Shrink Complexity auf den geänderten Code anwenden. Ergebnisse und Grenzen im Digest festhalten. Rückmeldungen von Noa gezielt korrigieren; die eigene visuelle Qualitätskontrolle nicht an Noa abgeben.
6. Ersetzte .viz.json: Checkpoint wörtlich übernehmen; die alte Datei erst nach Noas Freigabe löschen.

## 7a. Assets und Remixe

Gezielte Objekte und Verfahren wiederverwenden, vollständige Szenen als Kompositionsbeispiele behandeln. Ein Asset bekommt eine Karte mit Zweck, Eingaben/Einheiten, Einsatzgrenzen, Labels/Rändern, unterstützter Elementzahl und Kameras, Referenzbildern, Prüfnachweis und Status. „Experimentell“, „visuell geprüft“ und „von Noa freigegeben“ unterscheiden. Der S3-Katalog `docs/figuren-s3/assets.md` zeigt das Format. Bei einem Remix Auswahl der Teile und Eignung für die neue Lektion erneut prüfen; geänderte Datenbereiche, Projektionen und Elementzahlen brauchen neue mobile Referenzansichten. Keine pauschale Übernahme von Bühne oder Perspektive.

## 8. Budgets und Messung

- Szene unter 12 kB gzip, Laufzeit unter 10 kB gzip.
- Frame-Skriptzeit bei vierfacher Drosselung (Median): Beat unter 4 ms (mindestens unter 6), Ziehen und Kamerafahrt unter 8 ms. Messen: `FIGURE_PERF=1 FIGURE_PERF_STYLES=a1 E2E_REUSE_SERVER=1 E2E_PORT=<port> npx playwright test tests/e2e/figures-perf.spec.ts --project=chromium`, drei Läufe, Median der Mediane. Optimierungen nach dem Protokoll in `docs/figuren-perf-hillclimb.tsv`: eine Änderung pro Lauf, behalten nur bei mindestens 5 % Gewinn und grünen Wächtern.
- Mehr als etwa 600 Flächen (Kachelfläche F7): zuerst Canvas 2D unter dem SVG prüfen.

## 9. Fehler, die schon passiert sind (nicht wiederholen)

- Requisiten statt Mechanismus; Tafel in der Frontalansicht verdeckt; Beine, die 40 % der Höhe fressen.
- `sub` als Schalter statt als Indextext; zu große Pfeilköpfe; Ringe größer als eine Zelle.
- Malreihenfolge nur nach Schwerpunkt (Kistenwand vor Inhalt). Renderer und Orakel nutzen dieselbe `paintList`.
- Cache-Schlüssel pro Item statt pro Fläche: alle Körper wurden Drahtgitter. Bei Optimierungen vorhandene Pixel-Wächter verwenden und das Bild selbst vergleichen; keine neue Snapshot-Sammlung anlegen.
- Deckendes Glas versteckt die Flüssigkeit.
- aria-label, das den sichtbaren Text nicht enthält; Vorhersage-Panel, das das Urteil sofort ausblendet; Freischalten bei unlesbarer Eingabe.
- JSON-Dateien beim Bearbeiten neu formatiert. Nur echte Änderungen im Diff.
- Pauschales `tabIndex` auf Abschnitten. Nur Elemente, die wirklich scrollen, bekommen einen Tab-Stopp.

## 10. Prüfung vor jeder Übergabe

Für Figurenänderungen: eigene Browser-Sichtung, fachliche Gegenprüfung mit vorhandenen Lösern, betroffene Inhaltsvalidierung und Shrink Complexity. Beispiel:

```bash
node tools/compile_content.mjs && node tools/validate_content.mjs
~/.bun/bin/bun lint -f agent --rule 'complexity: [error, 10]' <geänderte Code-Dateien>
```

Bestehende Gesamt-Gates aus dem Sessionauftrag, den Repository-Regeln oder der Release-Abnahme einmal am passenden Integrationspunkt ausführen. Nicht nach jeder visuellen Korrektur das gesamte Projekt erneut testen. Veraltete fremde Assertions im Digest konkret benennen; keine neuen Assertions nur für interne Geometrie, Beat-Anzahl oder selbst erzeugte Referenzbilder hinzufügen.

Commits nur auf dem eigenen Session-Zweig, kein Push, kein Merge in feature/figuren (das macht die Integrator-Session).

## 11. Pflicht aus `docs/figuren-parallelplan.md` (Teil A)

- Jede `.fig.json` hat ein `kind` (`beats`, `explore`, `compare`, `static`, `inline`, `hint`, `task`); höchstens zwei `beats`/`explore` pro Lektion.
- Kamera: Fahrt bei gleichem Gegenstand, sonst 150 ms Überblenden; eine Bewegung pro Beat.
- Bei Beats: Beschriftung höchstens 140 Zeichen. Eine Vorhersage einsetzen, wenn sie eine prüfbare Einsicht unterstützt; reine Objektinteraktion braucht kein Quiz.
- Pro Figur: „Ablauf als Text“, Druckansicht, `sessionStorage` für den letzten Beat, adaptive Ruhe nach 30 langsamen Frames, Forced-Colors, Screenshot-Referenzen.
- Dateibesitz und Ports laut Parallelplan Teil B; fremde Bereiche nur über „Anfrage“ im Digest.
