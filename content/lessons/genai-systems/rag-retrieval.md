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

## Indexbau und gepinnte Normalisierung

Bevor Dokumente vergleichbar sind, wird Text normalisiert. Für diese Plattform ist die Regel gepinnt: **Kleinbuchstaben, Umlaute bleiben, Satzzeichen entfernt, Whitespace zusammengezogen.** Kein Stemming, kein Stoppwort-Filter; jede Vereinfachung, die du einführst, muss mit der Normalisierung der Anfrage identisch sein, sonst mismatcht der Vokabular-Schnitt.

Daraus entsteht der **Index**: ein Vokabular (sortierte Termmenge) plus eine Matrix $M \in \mathbb{R}^{n \times |V|}$, eine Zeile pro Chunk. **TF-IDF** (englisch *term frequency-inverse document frequency*) gewichtet jeden Term:

$$
\mathrm{tfidf}(t, d) = \frac{\mathrm{tf}(t,d)}{|d|} \cdot \left(\log\frac{n+1}{\mathrm{df}(t)+1} + 1\right).
$$

Dabei ist $\mathrm{df}(t)$ die Anzahl der Dokumente, die den Term $t$ enthalten (sprich: Dokumentfrequenz). Das +1 verhindert Division durch null; überall vorkommende Terme ($\mathrm{df} = n$) fallen nicht auf Gewicht null, sondern werden auf das idf-Floor 1 gesenkt, also deutlich reduziert, aber positiv. Ob TF-IDF-Kosinus oder Bag-of-Words-Kosinus: beides ist eine deterministische Baseline, genau das willst du zuerst, bevor du an Embeddings denkst.

## Ranking, top-k und Tie-Break

Die Anfrage wird mit derselben Normalisierung in einen Vektor überführt; die Ähnlichkeit jedes Chunks ist die **Kosinus-Ähnlichkeit**

$$
\cos(q, d) = \frac{q \cdot d}{\lVert q \rVert \, \lVert d \rVert}.
$$

Sprich: Skalarprodukt von q und d durch das Produkt ihrer Längen; das Ergebnis liegt zwischen −1 und 1 und misst den Winkel, nicht die Länge. Das System gibt die **top-$k$** ähnlichsten Chunks zurück. Bei Gleichheit entscheidet ein deterministischer Tie-Break (kleinster Index zuerst); ohne feste Regel wäre selbst die Baseline nicht reproduzierbar.

## Retrieval messen: Golden Set, Recall@k, MRR

Ein **Golden Set** ist eine feste Liste von Testanfragen mit von Menschen markierten relevanten Dokumenten. Es wird vor der Optimierung eingefroren; wer am Golden Set tüftelt, während er es benutzt, macht das Vorgehen zu einer Form von Leakage. Zwei Standardmetriken bewerten ausschließlich das Ranking:

$$
\mathrm{Recall}@k = \frac{|\,\text{top-}k \cap \text{relevant}\,|}{|\text{relevant}|}.
$$

Sprich: Anteil der relevanten Dokumente, die im top-k-Fenster landen. Und der Mean Reciprocal Rank, für jede Anfrage der Kehrwert der Position des *ersten* relevanten Dokuments:

$$
\mathrm{MRR} = \frac{1}{|Q|}\sum_{q \in Q} \frac{1}{\mathrm{rank}_q}.
$$

Sprich: MRR ist der Mittelwert über die Anfragen von eins durch Rang des ersten Treffers. Ob die daraufhin geformte Antwort gut ist, ist eine zweite, getrennte Evaluation in [Fragenkataloge einfrieren und messen](#/lesson/l-genai-eval).

## Warum die Trennung zählt

Wenn Retrieval und Generierung zusammen gemessen werden, kannst du Fehlerursachen nicht zuordnen: War das richtige Dokument nicht dabei (Retrieval-Fehler) oder wurde es falsch zusammengefasst (Antwort-Fehler)? Erst die getrennte Messung macht die Pipeline debuggbar. Deshalb gilt in dieser Lektion: Retrieval echt und deterministisch, Antwortbildung als Stub. Ein Stub wählt zum Beispiel den ersten Satz des besten Dokuments, der einen Anfrageterm enthält, und meldet „kein treffer“ ehrlich zurück, wenn nichts passt.

## Typische Fehler

- Überlappung größer oder gleich Chunkgröße gewählt ($o \ge s$); die Fenster laufen im Kreis.
- Anfrage anders normalisiert als die Dokumente (Kommas drin, Großbuchstaben); der Schnitt mit dem Vokabular wird leer.
- Am Golden Set optimieren, während es die Metrik definiert.
- Chunkgrenze mitten in einem Fakt, weil kein Overlap gesetzt wurde.
- Gleichstände im Score ohne Tie-Break-Regel: Ranking „atmet“ zwischen Läufen.

## Wo dir das in der KI begegnet

Assistenten mit Websuche oder Firmendokumenten arbeiten exakt so: Sie holen Chunks aus einem Index und formulieren daraus. Schlechtes Retrieval führt zu Antworten ohne Beleg, und eine gute Antwort auf das falsche Dokument sieht von außen aus wie Kompetenz.

## Direkter Check

Berechne in einer Einstiegsaufgabe Recall-Werte aus generierten Rankings. In der [Kernaufgabe: normalize und chunk](#/family/construct-normalize-chunk-contract/normalize-chunk-contract/0/core) implementierst du `chunk` und die gepinnte Normalisierung exakt; die [Vertiefungsaufgabe: Retrieval-Baseline](#/family/aggregate-retrieval-ranking-metric/retrieval-ranking-recall/0/stretch) verlangt TF-IDF-Kosinus-Suche und `recall_at_k` auf einer festen Dokumentmenge; die [Herausforderung](#/family/aggregate-retrieval-ranking-metric/retrieval-evaluate-queries/0/challenge) baut daraus einen bewertbaren Mini-Retrieval-Index mit Recall@k und MRR gegen Referenzwerte.

## Begriffe auf einen Blick

- **RAG** (englisch *retrieval-augmented generation*): Pipeline, die zu einer Anfrage erst Dokumente holt und erst dann antwortet.
- **Chunk**: Textstück fester Größe, das indexiert und abgerufen wird.
- **Überlappung** (englisch *overlap*): gemeinsamer Rand benachbarter Chunks; verhindert zerschnittene Fakten an Fenstergrenzen.
- **Index**: Register aus Vokabular und TF-IDF-Matrix, das Terme auf Chunks abbildet.
- **TF-IDF** (englisch *term frequency-inverse document frequency*): Gewichtung, die häufige lokale Terme hoch und überall vorkommende Terme niedrig stuft.
- **Kosinus-Ähnlichkeit** (englisch *cosine similarity*): Skalarprodukt geteilt durch die Vektorlängen; misst den Winkel zwischen zwei Vektoren.
- **top-k**: die $k$ höchstbewerteten Treffer eines Rankings.
- **Golden Set**: eingefrorene Testanfragen mit markierten relevanten Dokumenten; definiert die Retrieval-Metrik.
- **Recall@k**: Anteil der relevanten Dokumente im top-k-Fenster.
- **MRR** (englisch *mean reciprocal rank*): Mittelwert von eins durch Rang des ersten relevanten Treffers.
