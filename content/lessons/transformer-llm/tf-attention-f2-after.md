## Wo dir das in der KI begegnet

GPT-2 small hat 12 Köpfe mit je 64 Zahlen pro Token ($12 \cdot 64 = 768$). Decoder-Sprachmodelle nutzen die kausale Maske bei jedem erzeugten Token.

## Typische Fehler

- Softmax über Spalten statt Zeilen gerechnet; dann summieren Zeilen nicht auf 1.
- Maximum nicht abgezogen: Bei Scores ab etwa 700 laufen die Exponentialwerte über.
- Maske nach dem Softmax angewendet oder als 0 statt $-\infty$ eingetragen (0 ist ein legaler Score!).
- Skalierung vergessen oder durch $d_k$ statt $\sqrt{d_k}$ geteilt.
- Formen geraten: $Q$ mit $n$ Zeilen liefert immer $n$ Ausgabezeilen, nie $m$.

## Direkter Check

Prüfe in einer Einstiegsaufgabe Form- und Maskenzählungen. Rechne in der [Kernaufgabe: Stabiles Softmax](#/family/trace-assignment-state/stable-softmax-rows-trace/0/core) ein stabiles Softmax per Hand nach. In der [Kernaufgabe: Scaled-Dot-Product-Attention](#/family/optimize-softmax-attention-mask/scaled-dot-product-attention/0/core) implementierst du `attention(Q, K, V, mask)` mit Maskenfall; die [Vertiefungsaufgabe: Masken-Bausteine](#/family/construct-attention-mask/construct-causal-padding-mask/0/stretch) verlangt die Masken-Bausteine; die [Herausforderung](#/family/optimize-multi-head-attention/multi-head-attention/0/challenge) ist Multi-Head.

## Begriffe auf einen Blick

- **Attention**: gewichteter Zugriff auf Werte; Scores entscheiden, wie viel jeder Wert beiträgt.
- **Query**: die Suchfrage einer Position; eine Zeile von $Q$.
- **Key**: das Schlagwort, mit dem eine Position gefunden wird; eine Zeile von $K$.
- **Value**: der Inhalt, der gemischt wird; eine Zeile von $V$.
- **Score (Attention)**: Skalarprodukt aus Query und Key vor der Skalierung.
- **Softmax**: zeilenweise Funktion, die Scores in Gewichte mit Summe 1 überführt.
- **Maske** (englisch *mask*): Sichtbarkeitsregel; kausal verdeckt die Zukunft, Padding verdeckt Füllpositionen.
- **Kopf** (englisch *head*): ein parallel gerechneter Attention-Teil mit $d_{\text{model}}/h$ Zahlen pro Token.
- **Self-Attention**: Query, Key und Value sind Projektionen derselben Sequenz.
