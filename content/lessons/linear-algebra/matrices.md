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

Die Einträge von $x$ sagen, wie viel von jeder Spalte in die Mischung kommt. Eine solche gewichtete Summe der Spalten heißt **Linearkombination**. Dieses **Spaltenbild** trägt durch die nächsten Lektionen zu Gleichungssystemen und Unabhängigkeit. Die Figur zeigt zuerst die Café-Rechnung und danach eine feste Spaltenkombination mit anderen Koeffizienten.
