# Evaluation generativer Antworten

Ob ein GenAI-System gute Antworten gibt, entscheidet sich nicht an der Antwort, sondern am Fragenkatalog, der vorher eingefroren wurde. Diese Lektion zeigt dir, wie du Gold-Antworten, Fehlerlabels und Metriken so festlegst, dass zwei Läufe vergleichbar bleiben.

## Das Bild dahinter: Klausur mit Erwartungshorizont

Stell dir eine Klausur vor: Der Erwartungshorizont steht vor der Korrektur fest; Fragenkatalog, Gold-Antworten und die zulässigen Belege sind fixiert, bevor irgendjemand punktet. Für den LLM-Judge ein zweites Bild: Ein Schüler darf seine eigene Arbeit nicht benoten; genau das tut ein System, das sich selbst bewertet.

Wo der Vergleich hinkt: Ein Erwartungshorizont kann Teilpunkte vergeben. Deterministische Metriken wie Exact Match sind strenger: Alles oder nichts.
