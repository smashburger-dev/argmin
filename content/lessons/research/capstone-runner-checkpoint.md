# Checkpoint: Stage-Runner, Sentinels, virtuelle Uhr

Beantworte diese drei Fragen aus dem Kopf, bevor du weitermachst — jede Antwort folgt direkt aus dem Text oben.

1. Was ist der IO-Vertrag einer Stage — und was passiert mit einer Stage, die ihren Eingang nicht validiert?
2. Eine Stage schlägt fehl. Warum antwortet sie mit einem Sentinel-Status statt mit `None` oder einem Ersatzwert?
3. Warum misst `call_with_timeout(fn, budget, clock)` die Zeit mit einer injizierten Uhr statt mit `sleep`?

Kontrolliere: (1) benannte Eingabe-/Ausgabedateien mit Form- und Schemaprüfung; ohne Prüfung pflanzen sich stille Beschädigungen bis zum Report fort; (2) der Sentinel (`ok`, `fehler`, `timeout`) zeigt den Fehler — ein Ersatzwert oder stiller Fallback versteckt ihn und verkauft Scheinrobustheit; (3) die Uhr ist ein Parameter — Tests steuern die Zeit von Hand, Zeitverhalten bleibt deterministisch prüfbar, ohne eine einzige reale Wartezeit.
