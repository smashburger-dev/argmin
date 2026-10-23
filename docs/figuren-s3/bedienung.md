# Workbench: verbindlicher Stand für die Figuren-Integration

Nachtrag zu S3 nach Noas weiteren UI-Reviews am 17.10.2026. Der Nutzer hat Änderungen an der gemeinsamen Figurenhülle und Engine ausdrücklich beauftragt. Diese erweitern den ursprünglichen S3-Dateibesitz. Kein Push, kein Merge und keine Änderungen am S2-Worktree.

**Source of Truth für die Bedienung aller zu integrierenden Figurenarten:** `.devin/skills/workbench/SKILL.md` und die gemeinsame Umsetzung in `src/ui/FigureBlock.tsx`, `src/figures/FigureRuntime.tsx`, `src/figures/figures.css` sowie `src/figures/engine.ts`. Der bisherige Skill werkbank-figuren wurde in Workbench umbenannt. Aktive Dokumentverweise sind angepasst; historische Prüfprotokolle behalten ihre damals ausgeführten Kommandos.

## Verbindliche Darstellung

| Before | After | Why |
|---|---|---|
| Abb. n und generische Bedienungsuntertexte | Nur der Titel und der fachliche Inhalt | Keine wiederkehrende UI-Boilerplate in der Lektüre |
| Obere Statuszeile mit Schrittstand und angekündigtem Frageschritt | Ein kleiner Schrittstand zwischen Zurück und Weiter | Weniger konkurrierende Zeilen; mehr Luft |
| Wiederholen-Icon und Drei-Punkte-Kameramenü | Zwei sichtbare Schrittschaltflächen; am Ende Von vorn | Kamera direkt bedienen; keine unverständlichen Dreh-Icons |
| Frage unter der Navigation als weiterer Block | Frage im passenden Schritt im gemeinsamen Bereich vor der Navigation | Sichtbarer Zusammenhang mit der Figur; keine verschachtelte Unterkarte |
| Drehbare 2D-Figuren mit mindestens 5° Neigung | Ausdrücklicher flacher Modus ohne Orbit und ohne Bodenschatten | Diagrammwinkel und Lesbarkeit erhalten |
| Schattenellipse aus Bildschirm-Bounding-Box | Projektion der wirklichen Grundellipse | Der Außenring wächst beim Drehen nicht mehr |

Bühne und Textbereich sowie Textbereich und Navigation haben etwa 20–24 px Abstand. Sachtext bleibt bei ungefähr 15 px mit 1,5-fachem Zeilenabstand, Berührungsziele mindestens 44 px. Keine sichtbaren Shortcut-, Reset- oder Kamerahinweise. Tastaturinformation bleibt am fokussierbaren Bühnenelement zugänglich. Lektüre, Beschriftung und Eingaben bleiben auswählbar; nur die manipulierte Bühne verhindert Textauswahl.

Die Frage ist außerhalb ihres Schritts verborgen. Beim Zurückgehen bleiben Eingabe und Urteil erhalten. Keine automatische Eingabefokussierung und keine zusätzliche Zeile „Mit Frage in Schritt …“. Die geschützten Checkpoints bleiben unverändert.

## Kamera und Gesten

Die Szenen deklarieren `viewMode = 'flat'` oder `'spatial'` als Modulmetadatum. Zeilen-/Spaltenbild, Spannfläche und beide Eliminationsdarstellungen sind flat. Der Glaswürfel ist spatial. Die Engine ignoriert bei flat sämtliche Orbit-Offsets, lässt die frontale 0°-Ansicht zu und zeichnet keinen Bodenhalo. Der Legacy-Fallback für noch nicht klassifizierte Szenen bleibt kompatibel; bei der Integration jede neue Szene ausdrücklich zuordnen.

Beim Würfel drehen primäre Maustaste und ein waagerechter Fingerzug. Senkrechtes Wischen scrollt die Seite. Tastatursteuerung bleibt ohne eigene Kameraknöpfe erhalten. Von vorn setzt auch die Kamera zurück. Die Textauswahlsperre ist auf die Bühne begrenzt. Ein beim Touch-Capture-Transfer vom SVG-Kind hochblubberndes lostpointercapture beendet die Geste nicht mehr fälschlich nach dem ersten Move.

Der alte Halo verwendete Breite und Höhe der achsenparallelen Bounding-Box eines gedrehten Rechtecks. Die neue Berechnung projiziert Mittelpunkt und Basisvektoren der Grundellipse und bestimmt ihre tatsächlichen Radien und Orientierung. Bei der runden Grundfläche bleiben diese unter reiner Azimutdrehung konstant. Kein zusätzlicher künstlicher Plattformring.

## Konkrete Übernahme aus S2

Der S2-Worktree unter `/Users/no8/Desktop/life/Lifemaxxing/argmin-figuren-s2` wurde nur gelesen. Dort bestehen aktuell IconDots/viewOpen und ein zusätzlicher figure-drag-hint. Bei der Integrationssession:

- Die hier festgelegte Hülle auch für Hinweisfiguren übernehmen: Drei-Punkte-/Kameramenü, sichtbaren Zieh-Hinweis, Abbildungspräfix und generische spec.hint-Ausgabe entfernen.
- S2s `figureOptions`, `mode`, `hintBeatIds`, `runtimeScene`, statische Darstellung, Speicherung und direkte Auswahlfunktionen erhalten. Insbesondere Hinweis-Lecksperren und sichere Nachbarbeispiele nicht durch den S3-Lesson-Pfad ersetzen.
- Modelle, Posen und Beschreibungen weiterhin mit S2s richtigem Modus ausführen. Die gemeinsame UI-Regel setzt keinen Hinweis-Modus zurück auf lesson.
- Die Kameraeigenschaft viewMode mit dem Hint-Adapter durchreichen. Hinweisfiguren mit ebenen Matrizen/Zahlenbildern sind flat; notwendige räumliche Objekte ausdrücklich spatial.
- Änderungen funktional zusammenführen; nicht die komplette S2-Runtime durch die S3-Datei überschreiben. Bestehende Tests, die entfernte Menüs oder alte Titel voraussetzen, sind keine Produktspezifikation. Keine neue Test-/Snapshot-Sammlung dafür anlegen.

## Sichtung und Prüfung

Einmalige direkte Browser-Bedienung, keine neuen Testdateien:

- Alle vier ebenen Szenen bleiben bei Mausziehen und Dreh-Tastenkürzeln auf 0°; SVG-Text wird dabei nicht ausgewählt. Beschriftung außerhalb der Bühne bleibt normal auswählbar.
- Der Würfel bewegt sich mit der Maus und mit einem vollständigen Fingerzug. Ein 90-px-Touch-Zug änderte den Azimut von 20° auf 60,5°; die nachfolgende vertikale Geste scrollte die Seite von 9564 auf 9668 px.
- Der Schatten hat bei 20°, 65° und 110° dieselben Radien: 111,8 / 52,5 px in der geprüften mobilen Bühne. Die Bilder wurden selbst angesehen.
- Die Frage ist anfangs verborgen und im richtigen Schritt sichtbar. Antwort 3 und Rückmeldung „Richtig.“ bleiben beim Vor- und Zurückgehen erhalten.
- Mobile Einzelbilder vor/nach der Hüllenänderung, aktueller Frageschritt, Desktopansicht, Dunkelmodus und Würfelwinkel liegen in `docs/figuren-s3/ui-review/`. Das sind Sichtungsartefakte ohne Snapshot-Assertions. Ältere S3-Kontaktbögen dokumentieren den Stand vor diesem Bedienungsnachtrag.

Typecheck, Inhaltscompiler/-validierung, Release-Build, Skill-Validator und Shrink Complexity bestehen. Eine optionale breite Axe-Abfrage wurde nach Hängenbleiben abgebrochen; dafür wird kein erfolgreiches Ergebnis behauptet. Es wurde kein neues Gesamt-Gate und keine neue dauerhafte Testsuite erzeugt. Die bekannten fremden Gate-Befunde der ursprünglichen S3-Abnahme stehen weiterhin im Hauptdigest.
