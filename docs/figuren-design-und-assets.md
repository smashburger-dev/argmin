# Figuren entwerfen und gezielt wiederverwenden

Verbindliche Konkretisierung des Skills nach Noas S3-Review am 17.10.2026. Gilt für neue Figuren und Remixe. Die Regeln betreffen die Auswahl der Darstellung ebenso wie deren Ausführung.

## Vor der Detailgeometrie

Für die Figur fünf kurze Antworten im Session-Digest festhalten:

1. Welche Beziehung oder Veränderung soll der Lernende sehen?
2. Welche Information liefert bereits der angrenzende Lektionsabsatz?
3. Welche Ansicht zeigt die Beziehung am deutlichsten: flaches Diagramm, Objektansicht, direkter Eingriff oder Ablauf?
4. Welche Teile sind dafür notwendig? Welche dürfen entfallen?
5. Was bleibt in der kleinsten Zielgröße erkennbar?

Zuerst eine einfache Ansicht von Anfang, entscheidender Änderung und Ergebnis bauen. Diese bei tatsächlicher Handygröße ansehen, bevor Requisiten, Materialien oder weitere Beats entstehen. Gleich aussehende Bilder sind ein Anlass, den Ablauf zu kürzen oder den Mechanismus zu ändern. Eine Textänderung allein begründet keinen weiteren visuellen Schritt.

## Perspektive und Analogie

Isometrie einsetzen, wenn die räumliche Beziehung selbst etwas erklärt: etwa der gemeinsame Schnitt mehrerer Ebenen. Bei Zahlenvergleich, Zeilenoperationen und ebenen Flächen zuerst eine frontale Darstellung prüfen. Räumliche Verkleinerung und Schrägstellung dürfen die zentrale Information nicht verschlechtern.

Die Analogie ist veränderbar. Ein Café muss keine Kasse, Theke und Zettelspieße in jede Ansicht mitbringen. In S3 bleiben zwei Einkaufszettel für die Preiselimination sinnvoll; drei allgemeine Bedingungen stehen dagegen als große erweiterte Matrix. Die Lektion stellt den Übergang von Preisen zu Variablen her. Begriffe, Beispielzahlen und Text dürfen gemeinsam angepasst werden, wenn Aussage und Lernziel erhalten bleiben. Geschützte Checkpoints und Referenzlöser bleiben maßgeblich.

## Abstände in tatsächlichen Pixeln

Für die kleinste vorgesehene Bühne beginnen wir mit diesen Arbeitswerten: mindestens 16 px äußerer Freiraum, 12 px zwischen unabhängigen Gruppen und 8 px zwischen Beschriftung und einem fremden Zeichen oder Objekt. Das sind Ausgangswerte für das Review, keine mathematischen Naturgesetze. Eine fachlich nötige Kreuzung ist erlaubt; unbeabsichtigte Berührung von Label, Pfeilkopf, Zielring oder Nachbarwert nicht.

Benötigte Beschriftungen mindestens 14 px. Zahlenreihen erhalten erkennbare Zeilen- und Spaltenabstände. Nicht nur Bounding-Boxen prüfen: mathematische Indizes, Minuszeichen und eng benachbarte Pfeilspitzen müssen auch als Formen auseinanderzuhalten sein. Mindestens Anfang, größte Ausdehnung, engster Zwischenzustand und Ergebnis ansehen. Eine automatisch bestandene Kollisionsprüfung ersetzt diese Sichtung nicht.

Bei Platzmangel zuerst unnötige Teile entfernen, dann gruppieren, Ansicht wechseln oder Zustände nacheinander zeigen. Nicht die ganze Bühne stauchen oder alles kleiner skalieren. Datenbedingte kurze Pfeile behalten ihre wahre Länge; ihre Namen werden versetzt. Ebene Diagramme erhalten gleiche Achsenmaßstäbe und unverzerrte Winkel. Render-Teilungen dürfen keine unbegründeten mathematischen Kanten erzeugen.

## Was als wiederverwendbares Asset gilt

Text auf einem Asset ist ein eigenes Kontrastpaar: tatsächliche Schriftfarbe gegen tatsächliche Trägerfläche in hell und dunkel, mindestens 4,5:1 für normalen Text. Materialschattierung, Transparenz und Hervorhebung gehören zur Messung. Ein semantisch klingender Farbname oder ein bestandener Seiten-A11y-Test reicht nicht. Die S3-Zettel zeigten zunächst graue Schrift auf ähnlich grauem Papier im Dunkelmodus; eine dunkle Lesefläche und eine Messung der gerenderten Farben korrigieren das. Für Remixe den Kontrast erneut am neuen Material prüfen. Text möglichst separat rendern; bei Bitmap-Schrift Varianten und Kontrast vorab prüfen.

Ein Asset ist ein gezieltes Objekt oder Verfahren mit einer kleinen Schnittstelle. Eine vollständige Szene ist ein Kompositionsbeispiel. Sie wird nicht zur allgemeinen Vorlage, nur weil sie einmal funktioniert hat.

Eine Asset-Karte dokumentiert:

- Zweck, Eingaben, Einheiten und bedeutungstragende Teile;
- passende Aufgaben und Fälle, in denen das Asset ungeeignet ist;
- notwendige Labels, freie Ränder, größte zulässige Datenmenge und geeignete Kameras;
- Anfang, Änderung und Ergebnis bei kleiner und großer Bühne, hell und dunkel;
- nachvollziehbare fachliche und visuelle Prüfnachweise sowie bekannte Grenzen;
- Status: experimentell, visuell geprüft oder von Noa freigegeben, jeweils mit Datum und Beleg.

Nur nachweislich geprüfte Eigenschaften werden weiterverwendet. Ein Remix wählt die benötigten Teile ausdrücklich aus und begründet Projektion, Labels und Datenbereich für die neue Lektion erneut. Keine versteckten Altteile, kein Import einer ganzen anderen Szene ohne fachlichen Grund. Ein neuer Datenbereich oder eine andere Anzahl von Elementen verlangt eine neue kleine Referenzansicht. Referenzbilder werden erst nach Sichtung ersetzt.

Der kleine S3-Katalog steht unter `docs/figuren-s3/assets.md`. Er ergänzt die vorhandenen Kit-Primitive; er führt keinen zweiten Renderer und keine neue Komponentenbibliothek ein.

## Prüfaufwand begrenzen

Noa hat im weiteren S3-Review die automatische Anlage neuer Figurentests und Snapshot-Sammlungen verworfen. Solche Tests bestätigten oft die selbst gewählte Konstruktion, während die Komposition sichtbar misslang. Für neue Szenen, Sequenzen und Assets entstehen deshalb standardmäßig keine neuen Testdateien. Vorhandene Löser, Compiler und Messwerkzeuge nutzen, notwendige Prüfungen einmalig ausführen und die wichtigen Zustände selbst ansehen. Neue dauerhafte Tests nur auf ausdrücklichen Auftrag. Shrink Complexity bleibt. Bestehende Projekt-Gates am Integrationspunkt ausführen, nicht nach jedem Spacing-Eingriff.

## Abnahme

Lektion und Figur zusammen ansehen, zusätzlich die einzelnen mobilen PNGs in Originalgröße. Aussage, Perspektive, Proportionen, Raum zwischen Dingen, Kantenbedeutung und Unterschiede der Zustände beurteilen. Mathematik, Bedienung, Kontrast und nötige Laufzeitmessungen mit vorhandenen Werkzeugen prüfen. Keine Liste interner Eigenschaften als neue Testsuite nachbauen. Technisch bestandene Prüfungen beweisen keine hilfreiche oder gelungene Figur.

## Bedienung und Kamera nach dem weiteren S3-Review

Der Skill heißt jetzt Workbench (`.devin/skills/workbench/SKILL.md`). Neue Szenen wählen ausdrücklich `viewMode=flat` oder `spatial`. 2D-Diagramme, Matrizen und die Zettel bleiben flach und ohne Orbit-Bedienung; der Würfel bleibt räumlich. Das ist eine fachliche Wahl, keine gemeinsame Stilpflicht. Textauswahl wird nur auf der manipulierten Bühne unterbunden. Lektüre und Formulare bleiben auswählbar. Maus- und Touch-Gesten müssen das vertikale Scrollen erhalten.

Schrittstand, Erklärung, gegebenenfalls Frage und die zwei Navigationsschaltflächen bilden einen gemeinsamen Bereich. Die Frage wird erst am zugehörigen Schritt sichtbar, oberhalb von Zurück/Weiter. Keine zusätzliche Ankündigung des Frageschritts. Kein zusätzliches Kameramenü. Tastaturbedienung für räumliche Ansichten bleibt. Kleine Typografie bedeutet lesbare 14–16 px bei weiter mindestens 44 px hohen Berührungszielen.

Ein Schatten ist eine Projektion der wirklichen Grundfläche. Die Bildschirm-Bounding-Box eines gedrehten Rechtecks eignet sich nicht als wechselnder Ellipsenradius: sie erzeugt den beobachteten wachsenden Außenring. Runde Grundflächen bei mehreren Drehwinkeln auf konstante Ausdehnung, tatsächlichen Kontakt und freien Rand prüfen. In flachen Szenen entfällt der Bodenschatten.

Titel enthalten keine automatische Abbildungsnummer. Sichtbare generische Bedienungshilfen zu Pfeiltasten, Reset und Kamera entfallen. Der Schrittstand erscheint einmal klein zwischen Zurück und Weiter. Zwischen Hauptbereichen 20–24 px Luft lassen. Der gewonnene Platz wird nicht durch weitere Statuszeilen aufgefüllt. Tastaturinformation bleibt zugänglich am fokussierbaren Element.

Diese Fassung ist bei der geplanten Integration maßgeblich für alle Figurenhüllen, auch S2-Hinweise. Die dort noch vorhandenen Drei-Punkte-/Kameramenüs und Bedienungstexte werden entfernt, statt parallel weitergeführt. Gemeinsame Implementierung: FigureBlock, FigureRuntime und figures.css; eine separate Hinweise-Hülle übernimmt dieselben Regeln.
