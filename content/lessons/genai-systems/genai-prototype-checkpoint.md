# Checkpoint: Minimaler abgesicherter Prototyp

Beantworte diese drei Fragen aus dem Kopf, bevor du weitermachst — jede Antwort folgt direkt aus dem Text oben.

1. Dein Prototyp läuft mit wenigen Rechten, einem Fixture-Datensatz und einem API-Schlüssel. Was gehört in die Ablation „Kontrolle an gegen Kontrolle aus“ — und welcher Messwert darf dabei erwartungsgemäß sinken?
2. Warum reicht es nicht, dem Assistenten alle Werkzeuge zu geben und sie per Prompt zu „verbieten“? Welches Least-Privilege-Prinzip greift stattdessen?
3. Ein Fehlerfall tritt nur mit fremden Daten auf. Welche drei Eigenschaften muss die Fehlerbehandlung haben, damit der Prototyp nachvollziehbar bleibt?

Kontrolliere: (1) dieselben Fixture-Queries einmal mit, einmal ohne Kontrollen — der Recall@k sinkt mit Kontrolle (blockierte Queries zählen 0), genau dieser Unterschied ist die Messgröße; (2) Prompt-Verbote sind untrusted Daten ausgesetzt — Rechte werden strukturell entzogen (kein Werkzeug, getrennte Schlüssel, bewusste Übergänge), nicht höflich erbeten; (3) bestimmbar (Terminalzustand statt Stillstand), protokolliert (Fehlerklasse + Kontext) und reproduzierbar (Fixture-Fall, der den Pfad auslöst).
