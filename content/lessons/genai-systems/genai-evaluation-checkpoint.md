# Checkpoint: Deterministische Antwort-Evaluation

Beantworte diese drei Fragen aus dem Kopf, bevor du weitermachst — jede Antwort folgt direkt aus dem Text oben.

1. Eine Antwort enthält eine korrekte Zahl, nennt aber keine Quelle. Welches Label vergibt das Regelwerk — und warum nicht erst „falsch-faktisch“ geprüft wird?
2. Warum ist ein LLM-Judge als Ground Truth ausgeschlossen, obwohl große Modelle gut formulieren können?
3. Wie trennst du Retrievalfehler von Antwortfehlern, wenn eine Antwort komplett danebenliegt?

Kontrolliere: (1) quellos — die Regeln laufen in fester Reihenfolge und quellos (Regel 2) greift vor inhaltslichen Labels; (2) ein LLM ist selbst ein System unter Bewertung — sein Urteil ist nicht deterministisch, nicht reproduzierbar und damit kein autoritativer Grader; (3) erst prüfen, ob die Gold-Passage im Retrieval war (Retrievalfehler), dann ob die Antwort aus abgerufenen Passagen entstanden ist (Antwortfehler) — nur so zeigt die Metrik, welche Stufe schief läuft.
