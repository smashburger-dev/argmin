# Checkpoint: Demo, Abschlussdiagnose, Abnahme

Beantworte diese drei Fragen aus dem Kopf, bevor du weitermachst — jede Antwort folgt direkt aus dem Text oben.

1. Woher liest `demo_metrics()` seine Zahlen — und was passiert, wenn eine Neuberechnung davon abweicht?
2. Welche Evidenzregeln prüft `final_diagnosis` — und was disqualifiziert eine Instanz?
3. Warum trägt der Projekt-Runner-Report `integrity: self-reported` statt einer Mastery-Behauptung?

Kontrolliere: (1) ausschließlich aus den eingefrorenen Messwerten (`golden/expected_results.json`) — bei Abweichung wirft die Funktion, statt alte Zahlen vorzuzeigen; (2) zwei unabhängige Treffer, zwei verschiedene Definitionen, mindestens vierzehn Tage Abstand — das Anzeigen einer Lösung disqualifiziert genau diese Instanz; (3) Demo und Berichte dokumentieren Arbeit — Mastery entsteht nur aus den deterministisch geprüften Teiltests, ein lokaler Nachweis ist kein Zertifikat.
