# Checkpoint: Manifest, Freeze, Abhängigkeitsordnung

Beantworte diese drei Fragen aus dem Kopf, bevor du weitermachst — jede Antwort folgt direkt aus dem Text oben.

1. Warum wird das Manifest eingefroren, BEVOR die Stages gebaut werden — was bricht, wenn man es danach anpasst?
2. Was ist der IO-Vertrag einer Stage — und was passiert mit einer Stage, die ihren Eingang nicht validiert?
3. Du willst einen Seed in `config/experiment.json` ändern, um ein besseres Ergebnis zu bekommen. Warum ist das kein erlaubter Weg?

Kontrolliere: (1) ein nachträglich angepasstes Manifest macht aus der Messung eine Anpassung an die Messung — Versionen und Parameter stehen vor dem Lauf fest; (2) benannte Eingabe-/Ausgabedateien mit Form- und Schemaprüfung; ohne Prüfung pflanzen sich stille Beschädigungen bis zum Report fort; (3) ein Seed-Wechsel ist ein Experimentwechsel — er gehört in eine neue, vorab deklarierte Version, nicht in eine stillschweigende Korrektur am eingefrorenen Stand.
