# Changelog

## 0.6.5 — 2026-09-12

Drei neue Aufgabentypen: **Mehrfachauswahl** (mehrere richtige Antworten, alles-oder-nichts oder Teilpunkte), **Fehlerdiagnose** (du benennst die Fehlerursache im eigenen Text — formativ, fließt nicht in die Meisterschaft) und **Worked-Example-Fading** (Lücken in Musterlösungen, die von „nur Endergebnis" bis „alle Zwischenschritte" wachsen). Dazu schließt jetzt jede Visualisierung mit einer **Vorhersage-Aufgabe** ab: Slider-Werte vorgeben, Größe vorhersagen, deterministisch prüfen — mit deutschem Komma und typischen Fehlvorhersagen als erklärtem Feedback.

Unter der Haube: Alle 139 Aufgabenfamilien liegen als validierte JSON-Inhalte vor, Milestone-Anforderungen werden beim Bauen gegen den Katalog geprüft (der Build schlägt fehl, wenn eine Kompetenz geforderte Artefakte nicht liefert), und ein Audit hat Authoren-Material wiederbelebt, das nie bei Lernenden ankam — Hinweise, Fehlerregeln und typische Fehler werden jetzt angezeigt. Außerdem: ~10.000 Zeilen tote Varianten und überholte Metadaten entfernt, die Distinctness-Prüfung misst jetzt ehrlicher, und der LLM-Benchmark deckt alle neuen Typen ab. Prüfung und Referenzlösungen bleiben wie immer deterministisch.

## 0.5.0 — 2026-09-11

Neu für Lernende: ein Spotlight-Rundgang beim ersten Start, der die wichtigsten Bereiche der App zeigt — in den Einstellungen jederzeit wiederholbar. Unter der Haube weiter aufgeräumt: Die letzte parallele Generator-Schicht ist gefallen, statische Fall-Helfer leben jetzt an einer einzigen Stelle — weiterhin bei byte-identischen Aufgaben. Dazu: schnellere lokale E2E-Läufe.

## 0.4.0 — 2026-09-11

Unter der Haube deutlich schlanker: Die Aufgaben-Generatoren laufen jetzt über geteilte Kits statt über pro Familie kopierten Code, und die Aufgaben-Texte liegen als validierte Inhalts-Dateien unter `content/banks/` statt als Daten im Programmcode — fast 9.000 Zeilen Programmcode weniger bei byte-identischen Aufgaben. Seeds, Prompts, Prüfung und Referenzlösungen bleiben exakt gleich; ein Test-Korpus friert die Outputs aller Familien dauerhaft ein.

## 0.3.0 — 2026-09-11

Aufgaben werden nicht mehr aus einer festen Liste gewählt, sondern aus dem Seed gebaut. Jede Aufgabenfamilie zieht Zahlen, Texte und Reihenfolgen deterministisch neu — aus einer Schablone werden so tausende Varianten statt einem Dutzend. Gleicher Seed, gleiche Aufgabe. Prüfung und Referenzlösung bleiben wie immer deterministisch.

## 0.2.0 — 2026-09-08

Statische Aufgaben haben jetzt Varianten. Konzeptfragen, Coding, Ablauf nachvollziehen, Parsons und Vektor: mindestens zehn Instanzen pro Fall, gewählt über den Seed. Seed 0 bleibt die Basis. Gleicher Seed, gleiche Aufgabe.

## 0.1.0

Erste öffentliche Version: Katalog und Oberfläche im Browser, Fortschritt lokal, Prüfung ohne LLM.
