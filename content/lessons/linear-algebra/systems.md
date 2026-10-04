# Gleichungssysteme als Spaltenbild lesen

Ein lineares Gleichungssystem stellt mehrere Bedingungen, die gleichzeitig gelten sollen. Dahinter steckt eine Frage, die du aus der Lektion [Matrizen und Matrixprodukte mit Dimensionsvertrag](#/lesson/l-linalg-matrices) kennst: Wie viel brauchst du von jeder Spalte, um genau den Zielvektor zu mischen? Diese Lektion liest dasselbe System einmal als Zeilen und einmal als Spalten und zeigt die drei möglichen Lösungsfälle.

## Das Bild dahinter: Smoothie mischen

Du mixst einen Smoothie aus zwei Zutaten und willst Zielwerte für Eiweiß und Zucker treffen. Jede Zutat liefert pro Portion einen festen Nährwertvektor: Hafer liefert (2 Eiweiß, 1 Zucker), der Beerenmix liefert (1, 2). Du suchst die Portionen $x_1$ und $x_2$ für das Ziel (4, 5).

Die Zuordnung:

- eine Zutat: eine **Spalte** der [Matrix](#/glossary/matrix), also ihr Nährwertvektor
- eine Portionszahl $x_i$: ein [Eintrag](#/glossary/eintrag) des Lösungsvektors $x$
- der Nährwert-Zielwert: eine Komponente des **Zielvektors** $b$

Eine Portion Hafer und zwei Portionen Beerenmix ergeben $1 \cdot (2,1) + 2 \cdot (1,2) = (4, 5)$. Treffer.

Das macht auch die Lösungsfälle anschaulich. Liefern die Zutaten dasselbe Verhältnis, etwa (2, 1) und (4, 2), ist die zweite nur eine doppelte Portion der ersten. Dann entscheidet das Ziel: Liegt es nicht auf dieser Linie, etwa (4, 5), gibt es **keine Lösung**. Liegt es darauf, etwa (4, 2), gibt es **unendlich viele** Mischungen: zwei Portionen Hafer, eine Portion der zweiten Zutat oder jede Kombination mit $x_1 + 2x_2 = 2$.

Wo der Vergleich hinkt: Portionszahlen im Mixer sind nie negativ. Mathematisch darf $x_i$ negativ sein, und ein „negativer Löffel Hafer“ hat keine Küchenbedeutung, löst aber trotzdem das System.

## Vom Gleichungssystem zur Matrix

Ein **lineares Gleichungssystem** ist eine Sammlung von Gleichungen, in denen die Unbekannten nur einzeln und mit Zahlen multipliziert vorkommen. Die Zahlen vor den Unbekannten heißen **Koeffizienten**, sie sind dieselben wie bei Termen: die Zahl, die vor einer [Variablen](#/glossary/variable) steht und sie multipliziert.

Betrachte dieses System:

$$
2x_1+x_2=3,\qquad x_1+3x_2=4.
$$

Kompakt schreibst du es als Matrix mal Vektor:

$$
\underbrace{\begin{pmatrix}2&1\\1&3\end{pmatrix}}_{A}
\underbrace{\begin{pmatrix}x_1\\x_2\end{pmatrix}}_{x}
=
\underbrace{\begin{pmatrix}3\\4\end{pmatrix}}_{b}.
$$

Die Schreibweise $Ax=b$ verbindet drei Sichtweisen. Als **Zeilen** gelesen liefert jede Zeile von $A$ eine Gleichung. Als **Spalten** gelesen gewichten die Einträge von $x$ die Spalten von $A$; das ist das Spaltenbild aus der Lektion [Matrizen und Matrixprodukte mit Dimensionsvertrag](#/lesson/l-linalg-matrices). Als **Abbildung** gelesen ordnet die Matrix dem Eingabevektor $x$ den Ausgabevektor $b$ zu.

Die erste Spalte ist $a_1=(2,1)^T$, die zweite $a_2=(1,3)^T$. Das hochgestellte $T$ steht für „transponiert“ und kippt eine Zeile in eine Spalte: $(2,1)^T$ ist das Zahlenpaar $2$ über $1$, als Spalte geschrieben. Als Spaltenfrage lautet dasselbe System:

$$x_1a_1+x_2a_2=b.$$

## Durchgerechnetes Beispiel

Gesucht sind die Koeffizienten für

$$
A=\begin{pmatrix}2&1\\1&3\end{pmatrix},\qquad b=\begin{pmatrix}3\\-1\end{pmatrix}.
$$

1. **Spaltenbild aufschreiben**: $x_1(2,1)^T+x_2(1,3)^T=(3,-1)^T$.
2. **Zeilengleichungen ablesen**: $2x_1+x_2=3$ und $x_1+3x_2=-1$.
3. **Erste Gleichung auflösen**: $x_2=3-2x_1$.
4. **Einsetzen**: $x_1+3(3-2x_1)=-1$ ergibt $-5x_1=-10$, also $x_1=2$.
5. **Zweite Unbekannte bestimmen**: $x_2=3-4=-1$.
6. **Probe im Spaltenbild**: $2a_1-a_2=(4,2)^T-(1,3)^T=(3,-1)^T$. Sie kontrolliert beide Gleichungen zugleich.

## Lösungsfälle in Stufenform ablesen

Wie weit ist die Mischung frei wählbar? Das liest du ab, sobald ein System in **Zeilenstufenform** vorliegt: Unter jedem ersten von null verschiedenen Eintrag einer Zeile stehen nur noch Nullen. Dieser erste Eintrag heißt **Pivot**. Die Zahl der Pivots ist der **Rang** der Koeffizientenmatrix.

- **Genau eine Lösung**: Keine Widerspruchszeile, und jede Unbekannte hat ein Pivot. Die Spalten liefern eine eindeutige Mischung für $b$.
- **Keine Lösung**: Eine Zeile verlangt $0$ auf der linken und einen von null verschiedenen Wert auf der rechten Seite. Das Ziel liegt nicht im Mischbaren.
- **Unendlich viele Lösungen**: Eine Unbekannte hat keinen Pivot und heißt **freie Variable**; sie darf jeden Wert annehmen.

Eine quadratische Matrix, bei der für jedes $b$ genau eine Lösung existiert, heißt **invertierbar**: Es gibt eine Umkehrmatrix $A^{-1}$ mit $A^{-1}Ax=x$. Die Invertierbarkeit musst du hier noch nicht berechnen; entscheidend ist, welche Rolle die Koeffizienten spielen.

## Wo dir das in der KI begegnet

Lineare Regression ist ein Gleichungssystem mit viel mehr Gleichungen als Unbekannten: Jeder Datenpunkt liefert eine Zeile, gesucht sind nur wenige Gewichte. Ein solches System hat fast nie eine exakte Lösung; stattdessen wählt die Methode der kleinsten Quadrate das $x$, das $Ax$ möglichst nah an $b$ bringt. Das rechnest du in einer späteren Lektion.

## Typische Fehler

- Die Zeilen von $A$ mit den Spalten verwechseln. Zeilen sind Gleichungen, Spalten sind Zutaten.
- $b$ als weitere Spalte von $A$ behandeln statt als Zielvektor.
- Das gefundene Paar nur in eine statt in beide Gleichungen einsetzen.
- Die Reihenfolge $(x_1,x_2)$ vertauschen.
- Aus „unendlich viele Lösungen“ schließen, dass jedes $b$ lösbar ist.

## Direkter Check

1. Wähle die richtige Mischung in der [Spaltenbild-Auswahl](#/family/classify-column-combination/column-choice-authored/0/intro).
2. Bestimme die Koeffizienten in der [Koeffizientenaufgabe](#/family/formula-scalar-product/column-vector-authored/0/core).
3. Verändere anschließend $x_1$ und $x_2$ in der [interaktiven Visualisierung](#/visualization/column-picture).

## Begriffe auf einen Blick

- **Lineares Gleichungssystem** (englisch *system of linear equations*): Sammlung von Gleichungen, in denen Unbekannte nur einzeln und mit Zahlen multipliziert vorkommen.
- **Koeffizient** (englisch *coefficient*): die Zahl, die vor einer Variablen steht und sie multipliziert.
- **Zielvektor** (englisch *target vector*): der Vektor $b$ in $Ax=b$; die Mischung, die erreicht werden soll.
- **Spaltenbild** (englisch *column picture*): $Ax$ als Mischung der Spalten von $A$, gewichtet mit den Einträgen von $x$.
- **Pivot**: erster von null verschiedener Eintrag einer Zeile in Zeilenstufenform; die Pivots stehen von oben nach unten immer weiter rechts.
- **Zeilenstufenform** (englisch *row echelon form*): Form einer Matrix, in der unter jedem Pivot nur Nullen stehen.
- **Freie Variable** (englisch *free variable*): Unbekannte ohne Pivot; sie darf jeden Wert annehmen und erzeugt unendlich viele Lösungen.
- **Rang** (englisch *rank*): Anzahl der Pivotpositionen einer Matrix; zugleich die Zahl linear unabhängiger Zeilen und Spalten.
- **Invertierbar** (englisch *invertible*): Eigenschaft einer quadratischen Matrix, für die zu jedem $b$ genau eine Lösung $x=A^{-1}b$ existiert.
