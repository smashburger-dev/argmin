# Matrizen und Matrixprodukte mit Dimensionsvertrag

Fast alles, was ein Sprachmodell rechnet, ist Matrixmultiplikation. Damit das kein Hexenwerk bleibt, brauchst du eine einzige Regel: Welche Matrizen darf man miteinander multiplizieren, und was kommt dabei heraus? Diese Lektion leitet die Regel aus einer Café-Rechnung her, damit du sie verstehst, statt sie auswendig zu lernen.

## Eine Matrix ist eine Tabelle

Eine **Matrix** ist eine rechteckige Tabelle aus Zahlen. Waagerecht liegen die **Zeilen**, senkrecht die **Spalten**. Zwei Personen bestellen im Café:

| | Kaffee | Croissant | Saft |
|---|---:|---:|---:|
| Ada | 2 | 1 | 0 |
| Ben | 1 | 2 | 1 |

Ohne Beschriftung ist das die Matrix

$$O=\begin{pmatrix}2&1&0\\1&2&1\end{pmatrix}.$$

Ihre **Form** (englisch *shape*) gibt an, wie viele Zeilen und Spalten sie hat, immer in dieser Reihenfolge. $O$ hat 2 Zeilen und 3 Spalten, also die Form $2\times3$, gesprochen „2 mal 3“. In NumPy heißt das Attribut genauso: `O.shape` ist `(2, 3)`.

Ein einzelner **Eintrag** wird mit zwei Indizes adressiert, zuerst die Zeile, dann die Spalte. $o_{12}$ ist Zeile 1, Spalte 2, hier also $o_{12}=1$: Ada bestellt ein Croissant. Merkhilfe: Zeile zuerst, Spalte später.

## Das Bild dahinter: Bestellung mal Preisliste

Zwei Läden verkaufen dieselben drei Produkte zu unterschiedlichen Preisen (in Euro):

| | Nord | Süd |
|---|---:|---:|
| Kaffee | 3 | 4 |
| Croissant | 2 | 2 |
| Saft | 4 | 3 |

Als Matrix ist das $P=\begin{pmatrix}3&4\\2&2\\4&3\end{pmatrix}$ mit der Form $3\times2$.

Was zahlt Ada bei Nord? Du gehst ihre Bestellzeile durch und multiplizierst jede Menge mit dem passenden Preis aus der Spalte Nord: $2\cdot3+1\cdot2+0\cdot4=8$ Euro. Genau diese Rechnung ist ein Eintrag des Matrixprodukts $OP$. Die Zuordnung:

- eine Zeile von $O$: die Bestellung einer Person
- eine Spalte von $P$: die Preisliste eines Ladens
- ein Eintrag von $OP$: was diese Person in diesem Laden zahlt

Wo der Vergleich hinkt: Bestellungen sind nie negativ, Matrixeinträge schon. Und Matrizen können mehr als Tabellen sein, zum Beispiel Drehungen oder Streckungen der Ebene. Für die Rechenregel trägt das Café-Bild trotzdem vollständig.

## Die Regel: innen gleich, außen bleibt

Schreib die beiden Formen nebeneinander: $O$ ist $2\times\mathbf{3}$, $P$ ist $\mathbf{3}\times2$. Die beiden Zahlen in der Mitte heißen **innere Dimensionen**, die beiden am Rand **äußere Dimensionen**.

- Die inneren Dimensionen müssen gleich sein. Im Café sind sie beide 3, weil beide Tabellen von denselben drei Produkten reden. Hätte die Preisliste nur zwei Zeilen, wüsstest du nicht, was der Saft kostet. Das Produkt wäre nicht definiert.
- Die äußeren Dimensionen bilden die Form des Ergebnisses. Übrig bleiben Personen und Läden, also $2\times2$.

Allgemein: Hat $A$ die Form $m\times n$ und $B$ die Form $n\times p$, dann ist $AB$ definiert und hat die Form $m\times p$. Die innere Länge $n$ wird beim Rechnen aufgebraucht: Über sie wird summiert. Diese Regel heißt in argmin **Dimensionsvertrag**: Sie legt fest, welche Formen zusammenpassen und welche Form herauskommen muss.

Vor jeder Rechnung prüfst du deshalb drei Dinge:

1. Welche Form hat jede Matrix?
2. Stimmen die inneren Dimensionen überein?
3. Welche Form muss das Ergebnis haben?

## Ein Eintrag: Zeile mal Spalte

Adas Bestellung $u=(2,1,0)$ und die Preise von Nord $v=(3,2,4)$ sind zwei Listen gleicher Länge. Paarweise multiplizieren und alles addieren heißt **Skalarprodukt**:

$$u^\top v=2\cdot3+1\cdot2+0\cdot4=8.$$

Das hochgestellte $\top$ steht für „transponiert“ und macht hier nur klar, dass eine Zeile auf eine Spalte trifft. Jeder Eintrag eines Matrixprodukts ist ein solches Skalarprodukt: Eintrag $c_{ij}$ von $C=AB$ entsteht aus Zeile $i$ von $A$ und Spalte $j$ von $B$. Als Formel:

$$c_{ij}=\sum_{k=1}^{n}a_{ik}\,b_{kj}.$$

Das Zeichen $\sum$ ist ein großes griechisches S (Sigma) und bedeutet Summe. Lies die Formel so: Setze für $k$ nacheinander $1, 2, \dots, n$ ein, multipliziere jeweils $a_{ik}$ mit $b_{kj}$ und addiere alles. Der Index $k$ läuft dabei genau über die innere Dimension, im Café über die Produkte. Für Ada bei Nord ($i=1$, $j=1$, $n=3$) steht ausgeschrieben da: $c_{11}=a_{11}b_{11}+a_{12}b_{21}+a_{13}b_{31}=2\cdot3+1\cdot2+0\cdot4=8$.

## Durchgerechnetes Beispiel

Gegeben seien

$$
A=\begin{pmatrix}1&2\\-1&3\end{pmatrix},\qquad
B=\begin{pmatrix}4&0\\2&5\end{pmatrix}.
$$

1. **Formen notieren**: $A$ ist $2\times2$, $B$ ist $2\times2$.
2. **Vertrag prüfen**: Innen steht $2$ und $2$, das Produkt ist definiert.
3. **Ergebnisform festlegen**: Außen bleibt $2\times2$.
4. **Einen Eintrag rechnen**: Oben rechts ist $c_{12}$, also Zeile 1 von $A$ mal Spalte 2 von $B$: $c_{12}=1\cdot0+2\cdot5=10$.
5. **Alle Einträge rechnen**:

$$
AB=\begin{pmatrix}
1\cdot4+2\cdot2 & 1\cdot0+2\cdot5\\
-1\cdot4+3\cdot2 & -1\cdot0+3\cdot5
\end{pmatrix}
=
\begin{pmatrix}8&10\\2&15\end{pmatrix}.
$$

6. **Kontrolle**: Das Ergebnis hat vier Einträge in zwei Zeilen und zwei Spalten, passend zu Schritt 3.

## Spaltenbild: Matrix mal Vektor mischt Spalten

Ein Vektor ist eine Matrix mit nur einer Spalte. Multiplizierst du die Bestellmatrix $O$ mit den Nord-Preisen $(3,2,4)$, kannst du das auch spaltenweise lesen: 3 Euro mal die Kaffee-Spalte plus 2 Euro mal die Croissant-Spalte plus 4 Euro mal die Saft-Spalte.

$$3\begin{pmatrix}2\\1\end{pmatrix}+2\begin{pmatrix}1\\2\end{pmatrix}+4\begin{pmatrix}0\\1\end{pmatrix}=\begin{pmatrix}8\\11\end{pmatrix}.$$

Das sind genau Adas und Bens Rechnungen bei Nord. Allgemein gilt für $A=\begin{pmatrix}2&1\\1&3\end{pmatrix}$ und $x=(3,-1)$:

$$Ax=3\begin{pmatrix}2\\1\end{pmatrix}+(-1)\begin{pmatrix}1\\3\end{pmatrix}=\begin{pmatrix}5\\0\end{pmatrix}.$$

Die Einträge von $x$ sagen, wie viel von jeder Spalte in die Mischung kommt. Dieses **Spaltenbild** trägt durch die nächsten Lektionen zu Gleichungssystemen und Unabhängigkeit. In der Visualisierung unten kannst du die Mischung mit zwei Reglern selbst einstellen.

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

Berechne zuerst einen Eintrag in der [Einstiegsaufgabe: Eintrag des Matrixprodukts](#/family/formula-scalar-product/matmul-entry-w05-e1/0/intro), prüfe danach die Dimensionsregel in der [Einstiegsaufgabe: Dimensionsregel](#/family/classify-matrix-shape/shape-product-drawn/0/intro) und trace zum Schluss das Spaltenbild in der [Einstiegsaufgabe: Spaltenbild-Trace](#/family/trace-assignment-state/column-picture-trace/0/intro).

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
