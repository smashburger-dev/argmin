# Checkpoint: Baseline, Golden Set, Doppel-Lauf

Beantworte diese drei Fragen aus dem Kopf, bevor du weitermachst — jede Antwort folgt direkt aus dem Text oben.

1. Warum wird der Hash über die ROH-dateien des Golden Sets gepinnt, nicht über die normalisierten?
2. Deine Fehlerliste hat 12 Antwortfehler und 2 Retrievalfehler. Welche Stufe reparierst du zuerst — und warum ändert das die Priorisierung gegenüber „einfach alles“?
3. Was genau assertet der Doppel-Lauf — und was wäre ein Lauf ohne Asserts noch wert?

Kontrolliere: (1) Normalisierung ist selbst Code, der sich ändern kann — der Rohhash beweist, dass die Daten unverändert sind; Änderungen an der Normalisierung werden sichtbar, statt still unterzugehen; (2) zuerst das Retrieval — jede nicht abgerufene Gold-Passage erzeugt zwangsläufig Antwortfehler, die nicht durch bessere Extraktion verschwinden; (3) dasselbe Skript zweimal denselben Report (Digest) erzeugt — ohne Assert ist „läuft nochmal“ kein Reproduzierbarkeitsnachweis, nur ein weiterer Lauf.
