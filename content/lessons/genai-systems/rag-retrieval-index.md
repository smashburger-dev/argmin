## Indexbau und gepinnte Normalisierung

Bevor Dokumente vergleichbar sind, wird Text normalisiert. Für diese Plattform ist die Regel gepinnt: **Kleinbuchstaben, Umlaute bleiben, Satzzeichen entfernt, Whitespace zusammengezogen.** Kein Stemming, kein Stoppwort-Filter; jede Vereinfachung, die du einführst, muss mit der Normalisierung der Anfrage identisch sein, sonst mismatcht der Vokabular-Schnitt.

Daraus entsteht der **Index**: ein Vokabular (sortierte Termmenge) plus eine Matrix $M \in \mathbb{R}^{n \times |V|}$, eine Zeile pro Chunk. **TF-IDF** (englisch *term frequency-inverse document frequency*) gewichtet jeden Term:

$$
\mathrm{tfidf}(t, d) = \frac{\mathrm{tf}(t,d)}{|d|} \cdot \left(\log\frac{n+1}{\mathrm{df}(t)+1} + 1\right).
$$

Dabei ist $\mathrm{df}(t)$ die Anzahl der Dokumente, die den Term $t$ enthalten (sprich: Dokumentfrequenz), und $\log$ der natürliche Logarithmus. Das +1 im Nenner verhindert Division durch null. Ein Beispiel mit $n = 3$ Chunks: Das Wort „kündigung“ steht in einem Chunk, also $\log\frac{4}{2} + 1 \approx 1{,}69$. Das Wort „der“ steht in allen drei, also $\log\frac{4}{4} + 1 = 1$. Seltene Wörter zählen damit stärker als Allerweltswörter, und kein Wort fällt ganz auf Gewicht null. Ob TF-IDF-Kosinus oder Bag-of-Words-Kosinus: beides ist eine deterministische Baseline, genau das willst du zuerst, bevor du an Embeddings denkst.

## Ranking, top-k und Tie-Break

Die Anfrage wird mit derselben Normalisierung in einen Vektor überführt; die Ähnlichkeit jedes Chunks ist die **Kosinus-Ähnlichkeit**

$$
\cos(q, d) = \frac{q \cdot d}{\lVert q \rVert \, \lVert d \rVert}.
$$

Sprich: Skalarprodukt von q und d durch das Produkt ihrer Längen. Dabei ist $\lVert v \rVert$ die **Norm**, die Länge des Vektors; in NumPy rechnet `np.linalg.norm(v)` sie. Das Ergebnis liegt zwischen −1 und 1 und misst den Winkel, nicht die Länge. Ein Beispiel: Für $q = (1, 1, 0)$ und $d = (1, 0, 0)$ ist $q \cdot d = 1$, $\lVert q \rVert = \sqrt{2}$ und $\lVert d \rVert = 1$, also $\cos = 1/\sqrt{2} \approx 0{,}71$. Ein doppelt so langes $d = (2, 0, 0)$ ergibt denselben Wert, weil nur die Richtung zählt. Das System gibt die **top-$k$** ähnlichsten Chunks zurück. Bei Gleichheit entscheidet ein deterministischer Tie-Break (kleinster Index zuerst); ohne feste Regel wäre selbst die Baseline nicht reproduzierbar.

## Retrieval messen: Golden Set, Recall@k, MRR

Ein **Golden Set** ist eine feste Liste von Testanfragen mit von Menschen markierten relevanten Dokumenten. Es wird vor der Optimierung eingefroren; wer am Golden Set tüftelt, während er es benutzt, macht das Vorgehen zu einer Form von Leakage. Zwei Standardmetriken bewerten ausschließlich das Ranking:

$$
\mathrm{Recall}@k = \frac{|\,\text{top-}k \cap \text{relevant}\,|}{|\text{relevant}|}.
$$

Sprich: Anteil der relevanten Dokumente, die im top-k-Fenster landen. Und der Mean Reciprocal Rank, für jede Anfrage der Kehrwert der Position des *ersten* relevanten Dokuments:

$$
\mathrm{MRR} = \frac{1}{|Q|}\sum_{q \in Q} \frac{1}{\mathrm{rank}_q}.
$$

Sprich: MRR ist der Mittelwert über die Anfragen von eins durch Rang des ersten Treffers.

Beide Metriken an einem Beispiel: Für Anfrage 1 sind die Chunks $\{2, 5\}$ relevant, das System liefert die top-3 $(1, 2, 7)$. Ein relevanter von zwei ist dabei, also $\mathrm{Recall}@3 = 1/2$. Der erste Treffer steht auf Rang 2, der Kehrwert ist $1/2$. Bei Anfrage 2 steht der erste Treffer auf Rang 1, Kehrwert $1$. Der MRR über beide Anfragen ist $(0{,}5 + 1)/2 = 0{,}75$. Ob die daraufhin geformte Antwort gut ist, ist eine zweite, getrennte Evaluation in [Fragenkataloge einfrieren und messen](#/lesson/l-genai-eval).

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
- **Norm**: Länge eines Vektors, geschrieben $\lVert v \rVert$; in NumPy `np.linalg.norm(v)`.
- **top-k**: die $k$ höchstbewerteten Treffer eines Rankings.
- **Golden Set**: eingefrorene Testanfragen mit markierten relevanten Dokumenten; definiert die Retrieval-Metrik.
- **Recall@k**: Anteil der relevanten Dokumente im top-k-Fenster.
- **MRR** (englisch *mean reciprocal rank*): Mittelwert von eins durch Rang des ersten relevanten Treffers.
