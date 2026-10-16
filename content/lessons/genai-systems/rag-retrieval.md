# RAG: Retrieval messbar machen

Jeder Assistent mit Websuche oder Firmendokumenten arbeitet nach demselben Muster: erst holen, dann antworten. Diese Lektion behandelt nur die erste Hälfte einer RAG-Pipeline, und das ist kein Verzicht, sondern Methodik: **Retrieval und Antwortbildung werden getrennt gemessen.** Retrieval ist deterministisch und im Browser vollständig nachvollziehbar; die Antwortbildung eines echten Sprachmodells läuft hier ausdrücklich nicht im Browser und wird über Fixtures bzw. lokale Projekte mit Stub-Generatoren geprüft.

## Das Bild dahinter: Open-Book-Prüfung mit Karteikarten

Stell dir eine Open-Book-Prüfung mit Karteikarten vor. Das Buch wird in überlappende Karten geschnitten (Chunking). Ein Register sagt, welche Karte welche Wörter enthält (Index). Vor der Antwort holst du die $k$ passendsten Karten (top-k) und antwortest nur aus ihnen.

Wo der Vergleich hinkt: Ein Mensch versteht Synonyme. TF-IDF zählt nur Wörter; wer nach „Reparatur“ fragt und im Text „Instandhaltung“ steht, findet die Karte nicht, obwohl sie gemeint wäre.

## Chunking: Fenster mit Überlappung

Dokumente werden vor dem Indexieren in **Chunks** (Textstücke) zerlegt. Die Standardmethode ist ein gleitendes Fenster der Größe $s$ mit **Überlappung** $o$: Chunk $i$ startet bei $i \cdot (s - o)$ und umfasst `text[start:start+s]`, solange `start < Länge` gilt.

- **Schrittweite** ist $\mathrm{step} = s - o$.
- **Anzahl Chunks**: $\lceil L / \mathrm{step} \rceil$ bei Gesamtlänge $L$ (sprich: aufgerundet L durch Schrittweite).
- **Letzter Start**: $(\lceil L/\mathrm{step} \rceil - 1) \cdot \mathrm{step}$.

Durchgerechnet mit $s = 120$ und $o = 20$: $\mathrm{step} = 120 - 20 = 100$. Für $L = 1000$ Zeichen sind das $\lceil 1000/100\rceil = 10$ Chunks, letzter Start $900$.

Zu kleine Chunks zerschneiden Zusammenhänge, zu große verwässern die Ähnlichkeit. Überlappung verhindert, dass ein Fakt genau an einer Fenstergrenze auseinandergerissen wird, kostet aber Speicher, weil sich Inhalte wiederholen. Typische Startwerte sind $s = 200\ldots500$ Tokens mit $o = 10\ldots 20\%$ von $s$; die Wahl ist empirisch und gehört ins Golden Set, nicht in den Bauch.
