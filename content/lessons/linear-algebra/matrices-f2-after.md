## Zwei Verwechslungen

**Matrixprodukt oder elementweise?** Elementweise Multiplikation nimmt zwei Matrizen gleicher Form und multipliziert Zelle für Zelle, so wie zwei gleich große Tabellen in einer Tabellenkalkulation. Mit $A$ und $B$ von oben:

$$A\odot B=\begin{pmatrix}1\cdot4&2\cdot0\\-1\cdot2&3\cdot5\end{pmatrix}=\begin{pmatrix}4&0\\-2&15\end{pmatrix},\qquad AB=\begin{pmatrix}8&10\\2&15\end{pmatrix}.$$

Gleiche Form, andere Zahlen. In NumPy ist `A * B` elementweise und `A @ B` das Matrixprodukt. Eine passende Ergebnisform beweist also noch nicht, dass du die richtige Operation verwendet hast.

**$AB$ ist meistens nicht $BA$.** Im Café ist $OP$ eine $2\times2$-Tabelle „Person mal Laden“. $PO$ ist auch definiert (innen $2$ und $2$), hat aber die Form $3\times3$ und keine sinnvolle Bedeutung mehr. Selbst bei quadratischen Matrizen stimmt es meist nicht: Mit $A$ und $B$ von oben ist $BA=\begin{pmatrix}4&8\\-3&19\end{pmatrix}$, also etwas anderes als $AB$. Vertausche die Reihenfolge deshalb nie aus Gewohnheit.

## Wo dir das in der KI begegnet

Ein Sprachmodell stellt jedes Token, grob ein Wortstück, als Liste von Zahlen dar. Im Modell GPT-2 small sind das 768 Zahlen pro Token. Ein Satz aus 10 Tokens ist damit eine Matrix der Form $10\times768$: eine Zeile pro Token.

Jede Schicht multipliziert diese Matrix mit gelernten Gewichtsmatrizen. Im sogenannten MLP-Teil von GPT-2 small hat eine davon die Form $768\times3072$. Der Dimensionsvertrag sagt dir sofort, was passiert: $10\times768$ mal $768\times3072$ ergibt $10\times3072$. Innen müssen die 768 Zahlen pro Token passen, außen bleiben die 10 Tokens erhalten. Fast alle der rund 124 Millionen [Parameter](#/glossary/parameter-modell) von GPT-2 small sind Einträge solcher Matrizen. Wenn du später eine Fehlermeldung wie `shapes cannot be multiplied (10x768 and 3072x768)` siehst, ist das genau dieser Vertrag, der verletzt wurde.

## Typische Fehler

- Äußere statt innere Dimensionen vergleichen. Prüfe immer die beiden mittleren Zahlen.
- Zeile mit Zeile multiplizieren. Ein Eintrag ist immer Zeile von $A$ mal Spalte von $B$.
- Nur einen Summanden verwenden. Ein Eintrag summiert über die ganze innere Dimension.
- Aus $AB$ automatisch auf $BA$ schließen.
- `*` statt `@` verwenden und der passenden Ergebnisform vertrauen.
- Ein richtiges Ergebnis mit falscher Form akzeptieren.

## Direkter Check

Berechne zuerst einen Eintrag in der [Einstiegsaufgabe: Eintrag des Matrixprodukts](#/family/formula-scalar-product/matmul-entry-w05-e1/0/intro), prüfe danach die Dimensionsregel in der [Einstiegsaufgabe: Dimensionsregel](#/family/classify-matrix-shape/shape-product-drawn/0/intro) und bestimme zum Schluss die Koeffizienten in der [Kernaufgabe: Spaltenkombination für w](#/family/classify-column-combination/column-coefficients-double/0/core).

## Begriffe auf einen Blick

- **Matrix**: rechteckige Tabelle aus Zahlen, angeordnet in Zeilen und Spalten.
- **Form** (englisch *shape*): wie viele Einträge ein Array entlang jeder Richtung hat; bei einer Matrix Zeilen mal Spalten, zum Beispiel $2\times3$, in NumPy `A.shape == (2, 3)`.
- **Eintrag** (englisch *entry*): eine einzelne Zahl der Matrix; $a_{ij}$ steht in Zeile $i$, Spalte $j$.
- **Innere Dimensionen**: bei $A$ mit Form $m\times n$ und $B$ mit Form $n\times p$ die beiden mittleren Zahlen $n$ und $n$; sie müssen gleich sein.
- **Äußere Dimensionen**: die Randzahlen $m$ und $p$; sie bilden die Form von $AB$.
- **Dimensionsvertrag**: Regel, welche Formen eine Operation annimmt und welche Form ihr Ergebnis hat.
- **Skalarprodukt** (englisch *dot product*): zwei gleich lange Vektoren paarweise multiplizieren und alles addieren.
- **Matrixprodukt** (englisch *matrix product*): jeder Eintrag ist das Skalarprodukt einer Zeile von $A$ mit einer Spalte von $B$; in NumPy `A @ B`.
- **Elementweise Multiplikation** (englisch *element-wise product*): zwei Matrizen gleicher Form Zelle für Zelle multiplizieren; in NumPy `A * B`.
- **Spaltenbild** (englisch *column picture*): $Ax$ als Mischung der Spalten von $A$, gewichtet mit den Einträgen von $x$.
- **Linearkombination** (englisch *linear combination*): Summe von Vielfachen von Vektoren, $c_1v_1 + \dots + c_kv_k$.
