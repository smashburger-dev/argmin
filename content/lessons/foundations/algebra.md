# Algebra als überprüfbare Umformung

Fast jede Formel, die dir in KI-Texten begegnet, ist eine Gleichung: Verlust gleich Summe der Fehler, neues Gewicht gleich altes Gewicht minus Schritt. Wer Gleichungen sicher umformt, kann solche Formeln lesen statt nur anzustarren. Hier lernst du die eine Regel, die alles trägt, und den Logarithmus, der hinter Log-Loss und Bit-Rechnungen steckt.

## Das Bild dahinter: die Balkenwaage

Eine **Gleichung** behauptet, dass zwei Ausdrücke denselben Wert haben. Stell dir eine Balkenwaage vor: links und rechts liegt gleich viel Gewicht; die Waage ist im Gleichgewicht. Was du auf einer Seite tust, musst du auf der anderen Seite genauso tun. Nimmst du links 3 weg und rechts 3 weg, bleibt die Waage im Gleichgewicht. Verdoppelst du beide Seiten, ebenfalls.

Die Zuordnung:

- die zwei Waagschalen: die beiden Seiten der Gleichung
- das Gewicht in einer Schale: der Wert des Ausdrucks
- eine erlaubte Umformung: dieselbe Operation auf beiden Seiten

Die Menge aller Werte, die die Waage im Gleichgewicht halten, heißt **Lösungsmenge**. Jede erlaubte Operation lässt die Lösungsmenge unverändert, darum heißt sie Äquivalenzumformung.

Wo der Vergleich hinkt: Auf einer Waage gibt es keine negativen Gewichte, in einer Gleichung schon. Und Teilen durch einen Ausdruck ist nur erlaubt, wenn dieser Ausdruck nicht null sein kann; die Waage hilft dir bei dieser Bedingung nicht weiter.
