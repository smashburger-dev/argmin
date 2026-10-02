# Checkpoint: Feste Evaluation, Subgruppen, Red-Team-Verdict

Beantworte diese drei Fragen aus dem Kopf, bevor du weitermachst — jede Antwort folgt direkt aus dem Text oben.

1. Du willst nach der Evaluation die Schwellenwerte „kurz nachjustieren“. Warum verbietet das die feste Evaluation — und was ist der erlaubte Weg?
2. Dein Gesamt-Recall ist gut, aber eine Subgruppe liegt bei 0,0. Warum gehört genau diese Query in die Regressionstabelle statt unter den Teppich?
3. Warum dürfen Benign-Fälle ohne Regelphrase vom Red-Team-Detektor nicht blockiert werden?

Kontrolliere: (1) Nachjustieren am Ergebnis ist Überanpassung an einen Lauf — erlaubt ist eine neue, vorab deklarierte Variante mit eigenem Lauf, nicht das Umbiegen der bestehenden; (2) Subgruppen können bei gutem Mittel kollabieren — ein kollabierter Subgruppen-Recall ist ein berichtspflichtiger Befund, kein Rundungsfehler; (3) sonst misst der Detektor seine Scheingenauigkeit — geblockte Benign-Fälle zeigen einen Detektor, der nicht die Angriffsroute prüft, sondern einfach alles ablehnt.
