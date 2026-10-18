# S4b: F12-Teile und Sichtungsbelege

Stand 18.10.2026. „Visuell geprüft“ bezeichnet die eigene Sichtung durch den implementierenden Agenten. Eine Freigabe durch Noa wird damit nicht behauptet.

| Teil | Zweck und Schnittstelle | Eignung und Grenzen | Nachweis |
|---|---|---|---|
| `objects/f12-diagram.mjs`: Primitive | Beschriftung, Linie, Rechteck und Pfeil auf einer frontalen Leseebene; gezielte Wiederverwendung von `readingPlane`, `text` und `fitZoom` | Kleine, flache Lehrdiagramme im Koordinatenbereich 0…100. Keine räumliche Bühne oder universelle Szenenvorlage. | Alle fünf Kompositionen bei 375/1440 px in beiden Themes geöffnet. |
| `diagramScene` | Reine Komposition mit kontinuierlicher Phase und Überblendung zwischen fachlichen Zuständen | Kurze feste Lektionsbeispiele, gemeinsame Runtime übernimmt Eingaben und Navigation. Stabile Primitive-Schlüssel. | Beat-Ende und nächster Beat-Anfang einmalig verglichen; drei Wiederholungen der Laufzeitmessung. |
| `balanceDiagram` | Gleichung, zwei symbolische Schalen und Operationsbeschriftungen; erhält einen Zustand des originalen Waagenmodells | Symbolische Terme einschließlich negativer Werte und Brüche, keine physikalische Massensimulation. Gekippter Balken kennzeichnet einen verworfenen einseitigen Schritt. | Anfang, Fehler und Ergebnis von `balance-solve`; Lektionswaage mit geschlossenen x-Karten und Zahlgewichten. |
| `bag-unpack` | Tütenumrisse, getrennte x-/Zahlkarten und Zusammenfassung | Genau das angrenzende Beispiel `3(x + 2) − 2(x − 1)`. Der alte Flächencheckpoint wird als anderes Beispiel ausdrücklich eingeführt. | Referenzlöser liefert Koeffizient 1 und Konstante 8; alter Checkpoint unverändert. |
| `power-stack` | Gleich hohe Verdopplungsstufen, kumulierter Wert, Umkehrfrage | Die Höhe zählt Operationen, keine lineare Mengenskala. Fünf Verdopplungen ab 1. | Referenzlöser und mobile Sichtung von Start, Änderung und Ergebnis. |
| `mix-to-target` | Zwei Summandenpfeile, Zielring und Differenzpfeil aus `simulation` | Gleicher Maßstab auf beiden Achsen; Vorzeichen und Brüche sind algebraische Koeffizienten. Keine nachgebaute Smoothie-Szene. | Falsche Mischung, negative Bruchlösung, alternative abhängige Lösung und unmögliches Ziel bedient. |

Die Kamera bleibt bei allen fünf Szenen ausdrücklich `flat`. Keine Orbit-Bedienung und kein Bodenschatten. Die Task-Formulare stehen im freigegebenen gemeinsamen `stepContent` vor der Navigation; sie sind Teil der normalen Lektüre und bleiben auswählbar.

Die tatsächlichen gerenderten SVG-Schriften wurden gegen die jeweils dahinterliegende Materialfläche gemessen, einschließlich Flächenfüllung und Alpha. Über alle 30 mobilen Zustände in Hell/Dunkel: mindestens 5,10:1 Kontrast, 14,10 px Schrift und 44 px hohe Bedienelemente; kein horizontaler Überlauf. Die tatsächlich schmalste Aufgabenbühne war 267 px, die Lektionsbühne 309 px. Damit besteht die Schriftprüfung auch unterhalb der geforderten 343 px. Diese Werte gelten für die geprüften Beispiele und Themes; andere Daten oder Materialien erneut prüfen.

## Artefakte

- [Übersicht](review/overview.jpg): alle fünf Szenen, einschließlich falscher und richtiger Mischung.
- [Lektionskontaktbogen](review/lessons-contact.jpg): 44 Ansichten bei 375/1440 px, Hell/Dunkel; alle Waagenzustände und ausgewählte weitere Änderungen und Ergebnisse.
- [Aufgabenkontaktbogen](review/tasks-contact.jpg): 24 Ansichten, je Ausgang/Fehler/Ergebnis in beiden Breiten und Themes.
- Einzelbilder im selben Ordner: `balance`, `bag`, `power`, `solve`, `mixer`, jeweils mit Breite, Theme und Zustand im Namen.
- [Messbericht Anzeige und Fortschrittsregeln](review/display-results.json): alle 30 mobilen Lektions-/Aufgabenzustände und tatsächlich bediente Hint-/Offenlegungsregeln.
- [Messbericht Interaktion, Import und Laufzeit](review/probe-results.json): Touch-Scrollen, Formularwege, lokale JSON-Rundreise und drei Laufzeitmessungen pro Lektionsfigur/Breite bei vierfacher CPU-Drosselung.

Die 68 Einzelbilder und beide Kontaktbögen wurden selbst geöffnet und beurteilt. Die Übersicht fasst diese Aufnahmen zusammen. Sie sind Sichtungsartefakte, keine automatischen Snapshot-Baselines.
