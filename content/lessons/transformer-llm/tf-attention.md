# Attention: Queries, Keys und Values

Attention ist ein gewichteter Zugriff auf Informationen: Jede Position stellt eine Anfrage, vergleicht sie mit allen Angeboten und mischt die Inhalte. Diese Lektion zeigt die Formel dahinter und rechnet sie von Hand.

## Das Bild dahinter: Bibliotheksrecherche

Stell dir eine Recherche in einer Bibliothek vor. Deine Suchfrage ist die **Query**, die Schlagwörter der Bücher sind die **Keys**, die Inhalte die **Values**. Der Score misst, wie gut ein Schlagwort zur Frage passt; das Softmax verteilt deine Lesezeit; die Ausgabe ist die Mischung der Inhalte. Query, Key und Value sind **Rollen**, keine Objekttypen: In **Self-Attention** spielt jeder Token-Vektor alle drei.

Die **kausale Maske** ist Spoilerschutz: Beim Krimi darfst du nicht auf spätere Seiten schauen. **Multi-Head** sind mehrere Leser mit verschiedenen Fragen, die parallel suchen.

Wo der Vergleich hinkt: In Self-Attention ist jedes Token zugleich Fragender und Buch; Query, Key und Value sind gelernte [Projektionen](#/glossary/projektion) desselben Token-Vektors.

## Die Formel

$$A = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V.$$

In drei Schritten:

1. **Scores**: $S = QK^\top$ (sprich: Q mal K transponiert); jedes Skalarprodukt misst, wie gut Query $i$ zu Key $j$ passt. Für $Q \in \mathbb{R}^{n\times d_k}$ (sprich: Q Element der reellen n-mal-d-k-Matrizen) und $K \in \mathbb{R}^{m\times d_k}$ ($m$ Keys) ist die Score-Matrix $n \times m$.
2. **Skalierung**: Teile durch $\sqrt{d_k}$ (Wurzel der Spaltenzahl von $Q$). Skalarprodukte zufälliger Vektoren streuen umso stärker, je mehr Summanden sie haben; ihre Standardabweichung wächst wie $\sqrt{d_k}$. Das Teilen hält die Scores in einem Bereich, in dem Softmax nicht einspitzt und die Gradienten nicht verschwinden.
3. **Gewichte und Mischung**: Zeilenweises Softmax macht aus Scores Gewichte (Summe 1); die Ausgabe ist die gewichtete Summe der Values.

## Stabiles Softmax: Zeile für Zeile

$\mathrm{softmax}(s)_j = \frac{e^{s_j}}{\sum_k e^{s_k}}$ kann bei großen Scores überlaufen: `float64` trägt bis etwa $e^{709{,}8}$. Der Fix ist Stabilität, kein anderes Ergebnis:

$$\mathrm{softmax}(s)_j = \frac{e^{s_j - \max(s)}}{\sum_k e^{s_k - \max(s)}}.$$

Das Maximum wird **pro Zeile** abgezogen, denn jede Zeile wird unabhängig normalisiert.

## Maskierung: −∞ vor dem Softmax

Positionen, die einander nicht sehen dürfen, bekommen ihren Score **vor** dem Softmax auf $-\infty$ (sprich: minus unendlich) gesetzt; danach sind die Gewichte schon verteilt.

- **Kausale Maske** (Decoder): Query $i$ darf nur Keys $j \le i$ sehen. Alles oberhalb der Diagonale wird verdeckt.
- **Padding-Maske** ([Batching](#/glossary/batch)): Füllpositionen kurzer Sequenzen werden verdeckt.

$e^{-\infty} = 0$: Maskierte Zellen bekommen exakt Gewicht 0. Eine komplett verdeckte Zeile ergäbe $0/0$; Implementierungen fangen das ab.

## Form-Verträge

Mit $Q \in \mathbb{R}^{n\times d_k}$, $K \in \mathbb{R}^{m\times d_k}$, $V \in \mathbb{R}^{m\times d_v}$:

| Größe | [Form](#/glossary/form) | Begründung |
|---|---|---|
| $QK^\top$ | $n \times m$ | Zeile je Query, Spalte je Key |
| Gewichte (nach Softmax) | $n \times m$ | Softmax ändert keine Form |
| Ausgabe $AV$ | $n \times d_v$ | erbt Zeilen von $A$, Spalten von $V$ |

Der [Vertrag](#/glossary/vertrag) $Q$-Spalten $= K$-Spalten ist hart; die Value-Dimension $d_v$ darf von $d_k$ abweichen.

## Multi-Head: Aufteilen statt vergrößern

Statt eines breiten Attention-Kopfs werden $h$ Köpfe parallel gerechnet, jeder mit $d_{\text{model}}/h$ Zahlen pro Token: $X$ wird einmal projiziert, dann zu $(h, n, d_{\text{model}}/h)$ **reshaped**, nur eine andere Sicht auf dieselben Zahlen. Jeder Kopf rechnet eigene Scores; die Ausgaben werden konkateniert und linear kombiniert. So speichern Köpfe verschiedene Beziehungstypen.

## Handrechnung: eine komplette 2×2-Attention

Gegeben ($d_k = 4$, also Skalierung $\sqrt{4} = 2$):

$$Q = \begin{pmatrix}1&1&0&0\\0&0&1&1\end{pmatrix},\quad K = \begin{pmatrix}1&1&0&0\\0&0&1&1\end{pmatrix},\quad V = \begin{pmatrix}2&0\\0&2\end{pmatrix}.$$

**Schritt 1, Scores:** $QK^\top = \begin{pmatrix}2&0\\0&2\end{pmatrix}$ (Query 1 trifft Key 1 zweimal).

**Schritt 2, Skalierung:** $S = QK^\top/2 = \begin{pmatrix}1&0\\0&1\end{pmatrix}$.

**Schritt 3, Softmax zeilenweise:** Mit $e^1 \approx 2{,}718$ und $e^0 = 1$:
Zeile 1: $\frac{(2{,}718,\,1)}{3{,}718} \approx (0{,}731,\,0{,}269)$. Zeile 2 ist symmetrisch: $(0{,}269,\,0{,}731)$.

**Schritt 4, Mischen:** Zeile 1: $0{,}731\cdot(2,0) + 0{,}269\cdot(0,2) \approx (1{,}462,\,0{,}538)$. Zeile 2: $\approx(0{,}538,\,1{,}462)$.

**Mit kausaler Maske:** Query 1 darf Key 2 nicht sehen, also $S_{12} = -\infty$: Zeile 1 wird $(1, -\infty) \rightarrow (1, 0)$, Ausgabe exakt $(2, 0)$, Value 1 unvermischt. Zeile 2 darf beide Keys sehen und bleibt unverändert.

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
