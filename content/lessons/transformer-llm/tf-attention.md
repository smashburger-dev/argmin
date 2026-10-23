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
2. **Skalierung**: Teile durch $\sqrt{d_k}$ (Wurzel der Spaltenzahl von $Q$). Skalarprodukte zufälliger Vektoren streuen umso stärker, je mehr Summanden sie haben; ihre Standardabweichung wächst wie $\sqrt{d_k}$. Das Teilen hält die Scores klein. Warum das zählt: Die Scores $(1, 0)$ werden durch Softmax zu $(0{,}73;\ 0{,}27)$, beide Keys tragen bei. Die Scores $(10, 0)$ werden zu $(0{,}99995;\ 0{,}00005)$, fast alles Gewicht landet auf einem Key. Dann ändert ein kleiner Schritt an den Gewichten kaum noch etwas, und die Gradienten werden winzig.
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

Statt eines breiten Attention-Kopfs werden $h$ Köpfe parallel gerechnet, jeder mit $d_{\text{model}}/h$ Zahlen pro Token. Bei $d_{\text{model}} = 8$ und $h = 2$ bekommt Kopf 1 die Zahlen 1 bis 4 jedes Tokens und Kopf 2 die Zahlen 5 bis 8. Technisch wird $X$ einmal projiziert und dann zu $(h, n, d_{\text{model}}/h)$ **reshaped**, also nur anders angeordnet, ohne neue Zahlen. Jeder Kopf rechnet eigene Scores und damit eigene Gewichte. Danach werden die Ausgaben aneinandergehängt (konkateniert) und linear kombiniert. Weil jeder Kopf eigene Gewichte hat, kann ein Kopf etwa lernen, auf das vorige Token zu achten, während ein anderer weiter entfernte Bezüge herstellt.

## Handrechnung: eine komplette 2×2-Attention

Gegeben ($d_k = 4$, also Skalierung $\sqrt{4} = 2$):

$$Q = \begin{pmatrix}1&1&0&0\\0&0&1&1\end{pmatrix},\quad K = \begin{pmatrix}1&1&0&0\\0&0&1&1\end{pmatrix},\quad V = \begin{pmatrix}2&0\\0&2\end{pmatrix}.$$

**Schritt 1, Scores:** $QK^\top = \begin{pmatrix}2&0\\0&2\end{pmatrix}$ (Query 1 trifft Key 1 zweimal).

**Schritt 2, Skalierung:** $S = QK^\top/2 = \begin{pmatrix}1&0\\0&1\end{pmatrix}$.

**Schritt 3, Softmax zeilenweise:** Mit $e^1 \approx 2{,}718$ und $e^0 = 1$:
Zeile 1: $\frac{(2{,}718,\,1)}{3{,}718} \approx (0{,}731,\,0{,}269)$. Zeile 2 ist symmetrisch: $(0{,}269,\,0{,}731)$.

**Schritt 4, Mischen:** Zeile 1: $0{,}731\cdot(2,0) + 0{,}269\cdot(0,2) \approx (1{,}462,\,0{,}538)$. Zeile 2: $\approx(0{,}538,\,1{,}462)$.

**Mit kausaler Maske:** Query 1 darf Key 2 nicht sehen, also $S_{12} = -\infty$: Zeile 1 wird $(1, -\infty) \rightarrow (1, 0)$, Ausgabe exakt $(2, 0)$, Value 1 unvermischt. Zeile 2 darf beide Keys sehen und bleibt unverändert.
