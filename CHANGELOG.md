# Changelog

## 0.4.0 — 2026-09-11

Unter der Haube deutlich schlanker: Die Aufgaben-Generatoren laufen jetzt über geteilte Kits statt über pro Familie kopierten Code — über 6.000 Zeilen weniger bei byte-identischen Aufgaben. Seeds, Prompts, Prüfung und Referenzlösungen bleiben exakt gleich; ein Test-Korpus friert die Outputs aller Familien dauerhaft ein.

## 0.3.0 — 2026-09-11

Aufgaben werden nicht mehr aus einer festen Liste gewählt, sondern aus dem Seed gebaut. Jede Aufgabenfamilie zieht Zahlen, Texte und Reihenfolgen deterministisch neu — aus einer Schablone werden so tausende Varianten statt einem Dutzend. Gleicher Seed, gleiche Aufgabe. Prüfung und Referenzlösung bleiben wie immer deterministisch.

## 0.2.0 — 2026-09-08

Statische Aufgaben haben jetzt Varianten. Konzeptfragen, Coding, Ablauf nachvollziehen, Parsons und Vektor: mindestens zehn Instanzen pro Fall, gewählt über den Seed. Seed 0 bleibt die Basis. Gleicher Seed, gleiche Aufgabe.

## 0.1.0

Erste öffentliche Version: Katalog und Oberfläche im Browser, Fortschritt lokal, Prüfung ohne LLM.
