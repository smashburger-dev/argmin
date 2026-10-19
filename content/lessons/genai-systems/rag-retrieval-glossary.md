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
