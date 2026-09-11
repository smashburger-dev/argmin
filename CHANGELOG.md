# Changelog

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
