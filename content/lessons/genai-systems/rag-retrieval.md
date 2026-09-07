# RAG: Retrieval messbar machen

Eine RAG-Pipeline (Retrieval-Augmented Generation) holt zu einer Anfrage zuerst Dokumente und formuliert daraus erst dann eine Antwort. Diese Lektion behandelt nur die erste Hälfte — und das ist kein Verzicht, sondern Methodik: **Retrieval und Antwortbildung werden getrennt gemessen.** Retrieval ist deterministisch und im Browser vollständig nachvollziehbar; die Antwortbildung eines echten Sprachmodells läuft hier ausdrücklich nicht im Browser und wird über Fixtures bzw. lokale Projekte mit Stub-Generatoren geprüft.

## Chunking: Fenster mit Überlappung

Dokumente werden vor dem Indexieren in Chunks zerlegt. Die Standardmethode ist ein gleitendes Fenster der Größe $s$ mit Überlappung $o$: Chunk $i$ startet bei $i \cdot (s - o)$ und umfasst `text[start:start+s]`, solange `start < Länge` gilt.

- **Schrittweite** ist $\mathrm{step} = s - o$.
- **Anzahl Chunks**: $\lceil L / \mathrm{step} \rceil$ bei Gesamtlänge $L$.
- **Letzter Start**: $(\lceil L/\mathrm{step} \rceil - 1) \cdot \mathrm{step}$.

Zu kleine Chunks zerschneiden Zusammenhänge, zu große verwässern die Ähnlichkeit. Überlappung verhindert, dass ein Fakt genau an einer Fenstergrenze auseinandergerissen wird — kostet aber Speicher, weil sich Inhalte wiederholen. Typische Startwerte sind $s = 200\ldots500$ Tokens mit $o = 10\ldots 20\%$ von $s$; die Wahl ist empirisch und gehört mit ins Golden Set, nicht in den Bauch.

## Indexbau und gepinnte Normalisierung

Bevor Dokumente vergleichbar sind, wird Text normalisiert. Für diese Plattform ist die Regel gepinnt: **Kleinbuchstaben, Umlaute bleiben, Satzzeichen entfernt, Whitespace zusammengezogen.** Kein Stemming, kein Stoppwort-Filter — jede Vereinfachung, die du einführst, muss mit der Normalisierung der Anfrage identisch sein, sonst mismatcht der Vocabulary-Schnitt.

Daraus entsteht der Index: ein Vokabular (sortierte Termmenge) plus eine Matrix $M \in \mathbb{R}^{n \times |V|}$, eine Zeile pro Chunk. TF-IDF gewichtet jeden Term:

$$\mathrm{tfidf}(t, d) = \frac{\mathrm{tf}(t,d)}{|d|} \cdot \left(\log\frac{n+1}{\mathrm{df}(t)+1} + 1\right)$$

mit $\mathrm{df}(t)$ = Anzahl Dokumente, die $t$ enthalten. Das +1 verhindert Division durch null; überall vorkommende Terme (df = n) fallen dabei nicht auf Gewicht null, sondern werden auf das idf-Floor 1 gesenkt — das Gewicht wird also deutlich reduziert, bleibt aber positiv. Ob TF-IDF-Kosinus oder Bag-of-Words-Kosinus: beides ist eine **deterministische Baseline** — genau das willst du zuerst, bevor du an Embeddings denkst.

## Ranking, top-k und Tie-Break

Die Anfrage wird mit derselben Normalisierung in einen Vektor überführt; die Ähnlichkeit jedes Chunks ist der Kosinus

$$\cos(q, d) = \frac{q \cdot d}{\lVert q \rVert \, \lVert d \rVert}.$$

Das System gibt die **top-$k$** ähnlichsten Chunks zurück. Bei Gleichheit entscheidet ein deterministischer Tie-Break (kleinster Index zuerst) — ohne feste Regel wäre selbst die Baseline nicht reproduzierbar.

## Retrieval messen: Golden Set, Recall@k, MRR

Ein **Golden Set** ist eine feste Liste von Testanfragen mit von Menschen markierten relevanten Dokumenten. Es wird vor der Optimierung eingefroren; wer am Golden Set tüftelt, während er es benutzt, macht das Vorgehen zu einer Form von Leakage. Zwei Standardmetriken:

$$\mathrm{Recall}@k = \frac{|\,\text{top-}k \cap \text{relevant}\,|}{|\text{relevant}|}$$

— wie viel der relevanten Dokumente überhaupt im Rückgabefenster landet. Und der Mean Reciprocal Rank: für jede Anfrage der Kehrwert der Position des *ersten* relevanten Dokuments,

$$\mathrm{MRR} = \frac{1}{|Q|}\sum_{q \in Q} \frac{1}{\mathrm{rank}_q},$$

— wie schnell ein relevantes Dokument oben steht. Beide Metriken bewerten ausschließlich das Ranking. Ob die daraufhin geformte Antwort gut ist, ist eine zweite, getrennte Evaluation (Lektion „Evaluation generativer Antworten“).

## Warum die Trennung zählt

Wenn Retrieval und Generierung zusammen gemessen werden, kannst du Fehlerursachen nicht zuordnen: War das richtige Dokument nicht dabei (Retrieval-Fehler) oder wurde es falsch zusammengefasst (Antwort-Fehler)? Erst die getrennte Messung macht die Pipeline debuggbar. Deshalb gilt in dieser Lektion: Retrieval echt und deterministisch, Antwortbildung als Stub — ein Stub wählt z. B. den ersten Satz des besten Dokuments, der einen Anfrageterm enthält, und meldet "kein treffer" ehrlich zurück, wenn nichts passt.

## Typische Fehler

- Überlappung größer oder gleich Chunkgröße gewählt ($o \ge s$) — die Fenster laufen im Kreis.
- Anfrage anders normalisiert als die Dokumente (Kommas drin, Großbuchstaben) — der Schnitt mit dem Vokabular wird leer.
- Am Golden Set optimieren, während es die Metrik definiert.
- Chunkgrenze mitten in einem Fakt, weil kein Overlap gesetzt wurde.
- Gleichstände im Score ohne Tie-Break-Regel: Ranking "atmet" zwischen Läufen.

## Direkter Check

Berechne in einer Einstiegsaufgabe Recall-Werte aus generierten Rankings. In der [Kernaufgabe](#/family/construct-normalize-chunk-contract/normalize-chunk-contract/0/core) implementierst du `chunk` und die gepinnte Normalisierung exakt; die [Vertiefungsaufgabe](#/family/aggregate-retrieval-ranking-metric/retrieval-ranking-recall/0/stretch) verlangt TF-IDF-Kosinus-Suche und `recall_at_k` auf einer festen Dokumentmenge; die [Herausforderung](#/family/aggregate-retrieval-ranking-metric/retrieval-evaluate-queries/0/challenge) als Boss baut daraus einen bewertbaren Mini-Retrieval-Index mit Recall@k und MRR gegen Referenzwerte.
