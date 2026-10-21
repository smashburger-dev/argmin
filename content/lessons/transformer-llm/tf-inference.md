# Toy-Inferenz: Eine komplette Pipeline im Kleinen

Jede Chat-Antwort entsteht Token für Token in derselben Schleife: **Tokenisieren → Forward-Pass → Logits → Dekodieren**. In dieser Lektion baust du diese Pipeline nach, aber mit einem ehrlichen Etikett.

> **Dies ist eine Toy-Pipeline mit gestellten Gewichten: Sie demonstriert Mechanik, keine Sprachfähigkeit; echte LLM-Inferenz bleibt lokales Projekt.**

Wir laden keine Modellgewichte, rufen keine API, nutzen kein Netzwerk. Die Gewichte sind kleine **Fixtur-Literale** im Testcode, Zahlen, die wir selbst hinschreiben. Damit ist jeder Ausgangswert bekannt und jede Ausgabe erklärbar.

## Das Bild dahinter: Fließband und Navi

Stell dir ein Fließband mit vier Stationen vor: Der Text kommt als Rohmaterial an, jede Station übergibt ihr Ergebnis an die nächste. Für Greedy Decoding ein zweites Bild: ein Navi, das an jeder Kreuzung die im Moment kürzeste Straße nimmt, ohne zu prüfen, ob der Gesamtweg der kürzeste ist.

Wo der Vergleich hinkt: Ein echtes Fließband kehrt nicht zurück. Die Dekodierschleife füttert jedes neue Token wieder vorne ein, bis das Ende-Token kommt oder die Längengrenze greift.
