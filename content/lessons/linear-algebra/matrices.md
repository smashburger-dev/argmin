# Matrizen und Matrixprodukte mit Dimensionsvertrag

Eine Matrix ist eine rechteckige Anordnung von Zahlen. Ihre Form wird als

$$\text{Zeilen}\times\text{Spalten}$$

angegeben. Eine Matrix mit zwei Zeilen und drei Spalten hat also die Shape $2\times3$.

## Vektor, Matrix und Eintrag

Für

$$A=\begin{pmatrix}2&-1\\3&4\end{pmatrix}$$

bezeichnet $a_{21}$ den Eintrag in Zeile 2, Spalte 1. Hier ist $a_{21}=3$.

Die Position ist Teil der Bedeutung. Beim Rechnen solltest du deshalb immer zuerst notieren:

1. Welche Shape hat jedes Objekt?
2. Welche Dimension wird beim Produkt zusammengeführt?
3. Welche Shape muss das Ergebnis haben?

## Wann ist ein Matrixprodukt definiert?

Sind $A$ von Shape $m\times n$ und $B$ von Shape $n\times p$, dann ist

$$AB$$

definiert und hat Shape $m\times p$. Die **inneren** Dimensionen müssen übereinstimmen; die **äußeren** Dimensionen bleiben im Ergebnis.

Ein Merksatz ohne Bedeutung reicht nicht. Der Eintrag $c_{ij}$ des Produkts entsteht aus Zeile $i$ von $A$ und Spalte $j$ von $B$:

$$c_{ij}=\sum_{k=1}^{n}a_{ik}b_{kj}.$$

## Durchgerechnetes Beispiel

Gegeben seien

$$
A=\begin{pmatrix}1&2\\-1&3\end{pmatrix},\qquad
B=\begin{pmatrix}4&0\\2&5\end{pmatrix}.
$$

Beide Matrizen sind $2\times2$, also ist $AB$ definiert und ebenfalls $2\times2$.

Für den Eintrag oben rechts verwenden wir Zeile 1 von $A$ und Spalte 2 von $B$:

$$c_{12}=1\cdot0+2\cdot5=10.$$

Das vollständige Produkt ist

$$
AB=\begin{pmatrix}
1\cdot4+2\cdot2 & 1\cdot0+2\cdot5\\
-1\cdot4+3\cdot2 & -1\cdot0+3\cdot5
\end{pmatrix}
=
\begin{pmatrix}8&10\\2&15\end{pmatrix}.
$$

## Warum $AB$ meistens nicht $BA$ ist

Beim Vertauschen wechseln die verwendeten Zeilen und Spalten. Selbst wenn beide Produkte definiert sind, berechnen sie im Allgemeinen verschiedene Abbildungen. Prüfe daher nie Kommutativität aus Gewohnheit.

## Typische Fehler

- Äußere statt innere Dimensionen vergleichen.
- Zeile mit Zeile multiplizieren.
- Nur einen Summanden für einen Eintrag verwenden.
- Aus $AB$ automatisch $BA$ ableiten.
- Ein korrektes Ergebnis mit falscher Shape akzeptieren.

## Direkter Check

Berechne zuerst einen Eintrag in der [Einstiegsaufgabe](#/family/formula-scalar-product/matmul-entry-w05-e1/0/intro), prüfe danach die Dimensionsregel in der [Einstiegsaufgabe](#/family/classify-matrix-shape/shape-product-drawn/0/intro) und trace zum Schluss das Spaltenbild in der [Einstiegsaufgabe](#/family/trace-assignment-state/column-picture-trace/0/intro).
