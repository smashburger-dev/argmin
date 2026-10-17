---
name: werkbank-figuren
description: Build, extend or review argmin figures (Werkbank kit, isometric SVG scenes, style A1). Use for any work on .fig.json, assets/js/figures, src/figures, hint figures in tasks, or a figure family session (F1 to F12).
---

# Werkbank-Figuren bauen

Verbindlich für jede Figuren-Session in argmin. Quellen: ADR `docs/adr/0018-figuren-werkbank.md`, Familienplan `docs/figuren-familienplan.md`, Sessionplan `docs/figuren-sessionplan.md`, Referenzszene `assets/js/figures/scenes/smoothie.mjs`. Wenn diese Datei und eine Quelle sich widersprechen, gilt diese Datei; melde den Widerspruch.

## 1. Was eine Figur ist

- „Werkbank“ ist nur der Name des Kits. Die Werkbank mit Tafel ist die Bühne einer einzigen Szene (Smoothie). Jede Familie bekommt ihre eigene Welt aus dem Bühnenkatalog (Abschnitt 3a): Landschaft, Fließband, Bibliothek, Schaltwerk, Karte, schwebender Datenblock. Zwei Familien mit derselben Bühne sind ein Fehler, außer der Familienplan sagt es ausdrücklich.
- Die Analogie der Lektion als Objekt, das arbeitet, dann die Lesefläche mit derselben Rechnung, dann ein Beat „Wo der Vergleich hinkt“. Die Lesefläche gehört zur Welt: Tafel, Display am Gerät, Wegschild, Kartenblatt, Anzeigetafel, oder das Objekt selbst, wenn es schon formal ist (ein Zellgitter, eine Code-Zeile). Die Kamera fährt frontal an sie heran.
- Bewegung nur, wo sich im Gegenstand etwas ändert. Keine Deko-Bewegung, keine Requisiten. Jedes Teil gehört zum Mechanismus (Schublade mit Griff ja, Orange auf der Bank nein).
- Jede Zahl, Länge, Höhe und Position kommt aus `model` und `pose`. Keine Zahl wird in die Darstellung getippt.

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
- Halo unter dem Korpus: Ellipse durch die projizierte Grundfläche mal 1,05, weich, dezent.

## 3. Komposition und Kamera (für jede Welt)

- Der Gegenstand füllt in der Übersicht etwa 60 % der Bühne. Kein Sockel, keine Beine, kein Boden, der mehr Fläche frisst als der Gegenstand.
- Kamera nach Gegenstand: Iso (Azimut 35 bis 60°, Elevation 30°) für Objekte; Draufsicht (Elevation 70 bis 90°) für Karten, Felder, Graphen; tiefe Elevation (10 bis 20°) für Landschaften und Flächen; frontal (0°, 0°) für Leseflächen und rein zweidimensionale Diagramme. Eine Szene darf mehrere Presets je Beat haben.
- Nichts steht in der Frontalansicht vor der Lesefläche (Test „reading surface fully visible“, aus den Statics berechnet, nicht getippt).
- Lese-Beat: Lesefläche füllt 98 % der Breite, kleinster Text mindestens 14 px bei 343 px Bühnenbreite.
- Bühne 4:3 ab 560 px Kartenbreite, sonst 1:1. Lange Welten (Fließband) dürfen 16:9 sein und fahren mit der Kamera entlang.

## 3a. Bühnenkatalog (eine Welt pro Familie)

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

Neue Welten nur über den Familienplan. Wiederverwendbar sind Teile (Pfeil, Etikett, Zahlenfeld, Lesefläche), nicht Bühnen.

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
- Kein Text überlappt Text, Pfeilkopf, Ring oder Tick (Ebenen-Test plus DOM-Rechteck-Test unter 2 px²).
- Formeln als SVG-Textläufe `{ text, italic?, sub?: string, sup?: string }`, `sub` ist der Indextext. Mathe in `KaTeX_Main` / `KaTeX_Math`, Beschriftungen in var(--sans). Kein KaTeX in `foreignObject` (WebKit-Bug 23113).

## 5. Bedienung (gleich auf Handy und Desktop)

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

1. Familienplan-Abschnitt lesen, Lektionstext lesen (Analogie, „Wo der Vergleich hinkt“), Löser der Aufgabenfamilie finden.
2. Modell und Pose mit Node-Tests zuerst, dann `build`, dann `.fig.json`.
3. Pflichttests je Szene: Zahlen gegen Löser, Stetigkeit, stabile Topologie, `paintOrderErrors` 0 über Azimut 0 bis 355 in 5°-Schritten bei 15, 30, 50° Elevation plus Tafelkamera, Tafel frei, Tafeltext 14 px, Etiketten-Überlappung, Lecksperre im Hinweismodus, Compile-Regeln.
4. E2E: Füll- und Pixel-Wächter (`tests/e2e/figures.spec.ts`) für die neue Szene ergänzen.
5. Kontaktbogen erzeugen und die PNGs selbst öffnen und ansehen. DOM-Prüfungen ersetzen das Ansehen nicht: Drahtgitter, deckendes Glas und verdeckte Tafeln haben DOM-Tests in S1 bestanden.
6. Frame-Zeit messen (unten), Chunk-Größe messen.
7. Ersetzte `.viz.json`: Checkpoint wörtlich übernehmen; die alte Datei erst nach Noas Freigabe löschen.

## 8. Budgets und Messung

- Szene unter 12 kB gzip, Laufzeit unter 10 kB gzip.
- Frame-Skriptzeit bei vierfacher Drosselung (Median): Beat unter 4 ms (mindestens unter 6), Ziehen und Kamerafahrt unter 8 ms. Messen: `FIGURE_PERF=1 FIGURE_PERF_STYLES=a1 E2E_REUSE_SERVER=1 E2E_PORT=<port> npx playwright test tests/e2e/figures-perf.spec.ts --project=chromium`, drei Läufe, Median der Mediane. Optimierungen nach dem Protokoll in `docs/figuren-perf-hillclimb.tsv`: eine Änderung pro Lauf, behalten nur bei mindestens 5 % Gewinn und grünen Wächtern.
- Mehr als etwa 600 Flächen (Kachelfläche F7): zuerst Canvas 2D unter dem SVG prüfen.

## 9. Fehler, die schon passiert sind (nicht wiederholen)

- Requisiten statt Mechanismus; Tafel in der Frontalansicht verdeckt; Beine, die 40 % der Höhe fressen.
- `sub` als Schalter statt als Indextext; zu große Pfeilköpfe; Ringe größer als eine Zelle.
- Malreihenfolge nur nach Schwerpunkt (Kistenwand vor Inhalt). Renderer und Orakel nutzen dieselbe `paintList`.
- Cache-Schlüssel pro Item statt pro Fläche: alle Körper wurden Drahtgitter. Jede Optimierung braucht den Pixel-Wächter.
- Deckendes Glas versteckt die Flüssigkeit.
- aria-label, das den sichtbaren Text nicht enthält; Vorhersage-Panel, das das Urteil sofort ausblendet; Freischalten bei unlesbarer Eingabe.
- JSON-Dateien beim Bearbeiten neu formatiert. Nur echte Änderungen im Diff.
- Pauschales `tabIndex` auf Abschnitten. Nur Elemente, die wirklich scrollen, bekommen einen Tab-Stopp.

## 10. Prüfung vor jeder Übergabe

```bash
node tools/compile_content.mjs && node tools/validate_content.mjs
node --test tests/
npm run typecheck && npm run coverage:check
E2E_PORT=<port> npm run test:e2e -- --project=chromium
npm run test:e2e:build
~/.bun/bin/bun lint -f agent --rule 'complexity: [error, 10]' <geänderte Dateien>
```
Kein Commit, kein Push ohne Freigabe des Leads beziehungsweise Noas.
