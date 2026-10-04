# Lineare Unabhängigkeit und Rang verstehen

Zwei Angaben sind redundant, wenn die eine aus der anderen folgt. Lineare Unabhängigkeit prüft genau das für Vektoren: Bringt jeder Vektor eine neue Richtung, oder lässt er sich aus den anderen zusammenmischen? Diese Lektion zeigt, wie du das bei zwei Vektoren siehst, mit der Determinante prüfst und über den Rang auf ganze Matrizen überträgst.

## Das Bild dahinter: Wegbeschreibungen

„Einen Schritt nach Norden“ und „einen Schritt nach Osten“ sind zwei wirklich verschiedene Richtungen: Aus ihnen lässt sich jedes Ziel der Ebene mischen. „Nach Norden“ und „doppelt so weit nach Norden“ ist dagegen nur eine Richtung; die zweite Angabe bringt nichts Neues.

Die Zuordnung:

- eine Weganweisung: ein Vektor
- eine Folge aus mehreren Anweisungen: eine **Linearkombination**, also eine Summe von Vielfachen $c_1v_1 + c_2v_2 + \dots$
- „bringt nichts Neues“: der Vektor ist schon als Linearkombination der anderen schreibbar, die Menge ist abhängig

Ein Datenbeispiel: Eine Tabelle mit den Spalten „Preis in Euro“ und „Preis in Cent“ sieht nach zwei Merkmalen aus, ist aber nur eine Richtung, denn Cent = 100 mal Euro.

Wo der Vergleich hinkt: Ab drei Dimensionen kann ein Vektor aus mehreren anderen zusammengesetzt sein, ohne zu einem einzigen davon parallel zu zeigen. „Vielfaches des anderen“ reicht dann nicht mehr als Prüfbild; die formale Definition unten trägt weiter.

## Unabhängigkeit prüfen

Wir arbeiten in $\mathbb{R}^2$, gesprochen „R zwei“, der Ebene aller Zahlenpaare. Vektoren $v_1, \dots, v_k$ heißen **linear unabhängig**, wenn ihre Linearkombination nur auf eine Art den Nullvektor ergibt:

$$c_1v_1 + \dots + c_kv_k = 0.$$

Die **triviale Lösung** ist $c_1 = \dots = c_k = 0$, alle Beiträge auf null gedreht. Gibt es eine zweite Kombination mit einem $c_i \neq 0$, sind die Vektoren abhängig: Du kannst die Gleichung nach diesem $v_i$ auflösen und es durch die anderen ausdrücken.

Gegeben seien zwei Vektoren in der Ebene:

$$v_1 = (2,1)^T,\qquad v_2 = (1,3)^T.$$

Wir prüfen, ob ein Vektor ein Vielfaches des anderen ist. Ein Vielfaches $c\,v_2 = v_1$ müsste $2 = c \cdot 1$ und $1 = c \cdot 3$ gleichzeitig erfüllen, also $c = 2$ und $c = \tfrac{1}{3}$ zugleich. Das geht nicht, also sind beide unabhängig. Dagegen gilt für $w_1 = (2,1)^T$ und $w_2 = (6,3)^T$ die Beziehung $w_2 = 3w_1$; dann ist $-3w_1 + w_2 = 0$ eine nichttriviale Kombination und die beiden sind abhängig.

## Die Determinante als Flächenmaß

Für eine $2\times2$-[Matrix](#/glossary/matrix) mit Spalten $(a, c)^T$ und $(b, d)^T$ ist die **Determinante** definiert als

$$\det\begin{pmatrix}a&b\\c&d\end{pmatrix} = ad - bc.$$

Ihr Betrag ist die Fläche des Parallelogramms, das die beiden Spalten aufspannen. Ist die Determinante null, ist die Fläche flach zusammengefallen: Die Spalten zeigen in dieselbe Richtung und sind abhängig. Für das Beispiel oben:

$$\det\begin{pmatrix}2&1\\1&3\end{pmatrix} = 2 \cdot 3 - 1 \cdot 1 = 5 \neq 0.$$

Wichtig: Eine Determinante gibt es nur für quadratische Matrizen. Bei einer $3\times4$-Matrix brauchst du ein anderes Werkzeug.

## Rang als Zahl echter Richtungen

Der **Rang** einer Matrix ist die Zahl ihrer Pivotpositionen, also die Anzahl wirklich verschiedener Richtungen im Wegbeschreibungsbild. Er zählt zugleich die linear unabhängigen Zeilen und die linear unabhängigen Spalten.

Betrachte diese Matrix:

$$
A=\begin{pmatrix}
1&2&0\\
0&1&1\\
2&5&1
\end{pmatrix}.
$$

Ihre dritte Zeile ist zweimal die erste plus die zweite: $2 \cdot (1,2,0) + (0,1,1) = (2,5,1)$. Sie bringt keine neue [Bedingung](#/glossary/bedingung). Nach Gauß-Elimination bleiben zwei Pivotzeilen, der Rang ist 2.

Zwei Faustregeln helfen beim Einordnen: Mehr als $n$ Vektoren in $\mathbb{R}^n$ sind immer abhängig, weil du nicht mehr verschiedene Richtungen finden kannst, als der Raum Koordinaten hat. Hier meint „Dimension“ die Anzahl der Koordinaten pro Vektor. Und die **Nullität**, die Zahl der freien [Variablen](#/glossary/variable) von $Ax=0$, ergänzt den Rang zur Spaltenzahl: Rang plus Nullität gleich Anzahl der Spalten.

## Durchgerechnete Prüfstrategie

1. **Vielfache sichten**: Bei zwei Vektoren zuerst auf offensichtliche Vielfache prüfen, wie Euro und Cent.
2. **Determinante nutzen**: Bei kleinen quadratischen Matrizen ist $ad - bc$ der schnelle Vollrangtest.
3. **Eliminieren**: Zeigt sich die Struktur nicht sofort, bringt Gauß-Elimination die Stufenform und damit den Rang.
4. **Beziehung benennen**: Abhängigkeit begründest du mit einer konkreten Linearkombination, Unabhängigkeit über Pivots oder Determinante.

## Wo dir das in der KI begegnet

LoRA-Fine-Tuning nutzt Rang direkt: Statt eine riesige Gewichtsmatrix komplett zu ändern, schreibt LoRA die Änderung als Produkt zweier schmaler Matrizen mit kleinem Rang, zum Beispiel 8. Gelernt werden also nur wenige neue Richtungen. Umgekehrt schadet Redundanz: Enthält eine Datentabelle zwei Spalten wie „Preis in Euro“ und „Preis in Cent“, wird $X^\top X$ bei der linearen Regression nicht invertierbar, weil $X$ nicht vollen Rang hat.

## Typische Fehler

- Rang als Summe der Einträge lesen. Er zählt Pivotpositionen, nicht Zahlen.
- Glauben, eine $3\times3$-Matrix habe automatisch Rang 3. Abhängige Zeilen senken den Rang.
- Aus vielen Einträgen ungleich null auf Unabhängigkeit schließen. $(1,2)$ und $(2,4)$ sind voller Zahlen und trotzdem abhängig.
- Die Determinante auf nichtquadratische Matrizen anwenden. Sie existiert nur bei quadratischer Form.
- Eine Abhängigkeit nur vermuten, ohne die konkrete Linearkombination anzugeben.

## Direkter Check

Starte mit [Sind $b_1=(1,2)$, $b_2=(2,4)$ linear unabhängig?](#/family/classify-independence-multiple/dependent-pair-double/0/intro), berechne danach ein [Skalarprodukt](#/family/formula-scalar-product/dot-product-w05-e3/0/intro) und bestimme schließlich den Rang in der [Kernaufgabe: Rang der $3\times3$-Matrix](#/family/transform-rank-dependence-rowops/rank-3x3-staircase/0/core).

## Begriffe auf einen Blick

- **Linearkombination** (englisch *linear combination*): Summe von Vielfachen von Vektoren, $c_1v_1 + \dots + c_kv_k$.
- **Linear unabhängig** (englisch *linearly independent*): Eigenschaft von Vektoren, bei der nur die triviale Lösung den Nullvektor ergibt; kein Vektor ist aus den anderen mischbar.
- **Triviale Lösung** (englisch *trivial solution*): die Lösung $c_1 = \dots = c_k = 0$, bei der alle Beiträge null sind.
- **Determinante** (englisch *determinant*): Zahl einer quadratischen Matrix, bei $2\times2$ der Wert $ad - bc$; ihr Betrag ist die Fläche des von den Spalten aufgespannten Parallelogramms, null bedeutet abhängig.
- **Rang** (englisch *rank*): Anzahl der Pivotpositionen einer Matrix; zugleich die Zahl linear unabhängiger Zeilen und Spalten.
- **Pivot**: erster von null verschiedener Eintrag einer Zeile in Zeilenstufenform; die Pivots stehen von oben nach unten immer weiter rechts.
- **Nullität** (englisch *nullity*): Zahl der freien Variablen von $Ax = 0$; Rang plus Nullität ergibt die Spaltenzahl.
