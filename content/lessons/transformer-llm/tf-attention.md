# Attention: Queries, Keys und Values

Attention ist ein gewichteter Zugriff auf Informationen: Jede Position stellt eine Anfrage (Query), vergleicht sie mit allen Angeboten (Keys) und mischt die zugehörigen Inhalte (Values). Queries, Keys und Values sind **Rollen**, keine Objekttypen — derselbe Vektor kann gleichzeitig als Query für sich selbst und als Key für andere dienen.

## Die Formel

$$A = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V$$

In drei Schritten:

1. **Scores**: $S = QK^\top$ — jedes Skalarprodukt misst, wie gut Query $i$ zu Key $j$ passt.
2. **Skalierung**: Teile durch $\sqrt{d_k}$ (Spaltenzahl von $Q$). Ohne Skalierung wachsen Skalarprodukte mit der Dimension, das Softmax wird einspitzig und die Gradienten klein.
3. **Gewichte und Mischung**: Zeilenweises Softmax macht aus Scores Gewichte (jede Zeile summiert auf 1); die Ausgabe ist die gewichtete Summe der Values: $A$ hat pro Query eine Zeile.

## Stabiles Softmax: Zeile für Zeile

$\mathrm{softmax}(s)_j = \frac{e^{s_j}}{\sum_k e^{s_k}}$ kann bei großen Scores numerisch überlaufen ($e^{300}$ ist als `float64` nicht mehr darstellbar). Der Fix ist Stabilität, kein anderes Ergebnis:

$$\mathrm{softmax}(s)_j = \frac{e^{s_j - \max(s)}}{\sum_k e^{s_k - \max(s)}}$$

Das Maximum wird **pro Zeile** abgezogen, denn jede Zeile der Gewichtsmatrix wird unabhängig normalisiert. Eine Zeile aus lauter gleichen Scores ergibt gleiche Gewichte.

## Maskierung: −∞ vor dem Softmax

Positionen, die einander nicht sehen dürfen, bekommen ihren Score **vor** dem Softmax auf $-\infty$ gesetzt — nach dem Softmax wäre es zu spät, denn dann sind die Gewichte schon verteilt.

- **Kausale Maske** (Decoder): Query $i$ darf nur Keys $j \le i$ sehen. Alles oberhalb der Diagonale wird verdeckt; so kann Token 3 nicht in die Zukunft schauen.
- **Padding-Maske** (Batching): Leere Füllpositionen kurzer Sequenzen werden verdeckt, damit sie keine Aufmerksamkeit erhalten.

$e^{-\infty} = 0$: Maskierte Zellen bekommen exakt Gewicht 0. Achtung: Eine komplett verdeckte Zeile ergibt $0/0$ — in echten Implementierungen wird das durch Normalisierungskonstanten oder Asserts abgefangen.

## Shape-Verträge

Mit $Q \in \mathbb{R}^{n\times d_k}$, $K \in \mathbb{R}^{m\times d_k}$, $V \in \mathbb{R}^{m\times d_v}$:

| Größe | Shape | Begründung |
|---|---|---|
| $QK^\top$ | $n \times m$ | Zeile je Query, Spalte je Key |
| Gewichte (nach Softmax) | $n \times m$ | Softmax ändert keine Form |
| Ausgabe $AV$ | $n \times d_v$ | erbt Zeilen von $A$, Spalten von $V$ |

Der Vertrag $Q$-Spalten $= K$-Spalten ist hart: Skalarprodukte verschiedener Dimension sind undefiniert. Die Value-Dimension $d_v$ darf anders sein als $d_k$.

## Multi-Head: Aufteilen statt vergrößern

Statt eines breiten Attention-Kopfs werden $h$ Köpfe je der Modellgröße $d_{\text{model}}/h$ parallel gerechnet: $X$ wird einmal projiziert, dann zu $(h, n, d_{\text{model}}/h)$ **reshaped** — keine neuen Matrizen, nur eine andere Sicht auf dieselben Zahlen. Jeder Kopf rechnet eigene Scores und Gewichte; die Ausgaben werden konkateniert (zurück zu $n \times d_{\text{model}}$) und linear kombiniert. So können verschiedene Köpfe verschiedene Beziehungstypen speichern.

## Handrechnung: eine komplette 2×2-Attention

Gegeben ($d_k = 4$, also Skalierung $\sqrt{4} = 2$):

$$Q = \begin{pmatrix}1&1&0&0\\0&0&1&1\end{pmatrix},\quad K = \begin{pmatrix}1&1&0&0\\0&0&1&1\end{pmatrix},\quad V = \begin{pmatrix}2&0\\0&2\end{pmatrix}$$

**Schritt 1 — Scores:** $QK^\top = \begin{pmatrix}2&0\\0&2\end{pmatrix}$ (Query 1 trifft Key 1 in zwei Einsen).

**Schritt 2 — Skalierung:** $S = QK^\top/2 = \begin{pmatrix}1&0\\0&1\end{pmatrix}$.

**Schritt 3 — Softmax zeilenweise:** Mit $e^1 \approx 2{,}718$ und $e^0 = 1$:
Zeile 1: $\frac{(2{,}718,\,1)}{3{,}718} \approx (0{,}731,\,0{,}269)$. Zeile 2 ist symmetrisch: $(0{,}269,\,0{,}731)$.

**Schritt 4 — Mischen:** Zeile 1: $0{,}731\cdot(2,0) + 0{,}269\cdot(0,2) \approx (1{,}462,\,0{,}538)$. Zeile 2: $\approx(0{,}538,\,1{,}462)$.

**Mit kausaler Maske:** Query 1 darf Key 2 nicht sehen (Query $i$ sieht nur Keys $j \le i$), also $S_{12} = -\infty$: Zeile 1 wird $(2, -\infty) \rightarrow (1, 0)$, Ausgabe exakt $(2, 0)$ — Value 1 unvermischt. Zeile 2 darf beide Keys sehen und bleibt unverändert. Genau das leistet Maskierung vor dem Softmax.

## Typische Fehler

- Softmax über Spalten statt Zeilen gerechnet (dann summieren Zeilen nicht auf 1).
- Maximum nicht abgezogen: bei Scores ab etwa 700 läufen die Exponentialwerte über.
- Maske nach dem Softmax angewendet oder als 0 statt $-\infty$ eingetragen (0 ist ein legaler Score!).
- Skalierung vergessen oder durch $d_k$ statt $\sqrt{d_k}$ geteilt.
- Shapes geraten: $Q$ mit $n$ Zeilen liefert immer $n$ Ausgabezeilen — nie $m$.

## Direkter Check

Prüfe in [w22-e2](#/exercise/w22-e2) Shape- und Maskenzählungen. Rechne in [w22-e3](#/exercise/w22-e3) ein stabiles Softmax per Hand nach. In [w22-e4](#/exercise/w22-e4) implementierst du `attention(Q, K, V, mask)` mit Maskenfall; [w22-e5](#/exercise/w22-e5) verlangt Masken-Bausteine mit Fehlerbehandlung; [w22-e6](#/exercise/w22-e6) ist der Multi-Head-Endgegner.
