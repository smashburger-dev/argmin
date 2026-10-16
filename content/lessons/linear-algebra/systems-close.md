## Wo dir das in der KI begegnet

Lineare Regression ist ein Gleichungssystem mit viel mehr Gleichungen als Unbekannten: Jeder Datenpunkt liefert eine Zeile, gesucht sind nur wenige Gewichte. Ein solches System hat fast nie eine exakte Lösung; stattdessen wählt die Methode der kleinsten Quadrate das $x$, das $Ax$ möglichst nah an $b$ bringt. Das rechnest du in einer späteren Lektion.

Der umgekehrte Fall tritt im Training auf: Hat ein Modell mehr Gewichte als unabhängige Gleichungen aus den Daten, passen unendlich viele Gewichtsvektoren exakt zu den Trainingsdaten, genau wie in Fall 3. Regularisierung wählt dann einen davon aus; das kommt in einer späteren Lektion.

## Typische Fehler

- Die Zeilen von $A$ mit den Spalten verwechseln. Zeilen sind Gleichungen, Spalten sind Zutaten.
- $b$ als weitere Spalte von $A$ behandeln statt als Zielvektor.
- Das gefundene Paar nur in eine statt in beide Gleichungen einsetzen.
- Die Reihenfolge $(x_1,x_2)$ vertauschen.
- Aus „unendlich viele Lösungen“ schließen, dass jedes $b$ lösbar ist.
- Eine Nullzeile als Widerspruch lesen: $0 = 0$ ist wahr, nur $0 = c$ mit $c \neq 0$ widerspricht.
- Den Rang auf null setzen, weil eine Nullzeile existiert: Der Rang zählt Pivots, nicht Nullzeilen.

## Direkter Check

1. Wähle die richtige Mischung in der [Spaltenbild-Auswahl](#/family/classify-column-combination/column-choice-authored/0/intro).
2. Bestimme die Koeffizienten in der [Koeffizientenaufgabe](#/family/formula-scalar-product/column-vector-authored/0/core).
3. Verändere anschließend $x_1$ und $x_2$ in der [interaktiven Visualisierung](#/visualization/column-picture).

## Begriffe auf einen Blick

- **Lineares Gleichungssystem** (englisch *system of linear equations*): Sammlung von Gleichungen, in denen Unbekannte nur einzeln und mit Zahlen multipliziert vorkommen.
- **Koeffizient** (englisch *coefficient*): die Zahl, die vor einer Variablen steht und sie multipliziert.
- **Zielvektor** (englisch *target vector*): der Vektor $b$ in $Ax=b$; die Mischung, die erreicht werden soll.
- **Spaltenbild** (englisch *column picture*): $Ax$ als Mischung der Spalten von $A$, gewichtet mit den Einträgen von $x$.
- **Erweiterte Matrix** (englisch *augmented matrix*): Koeffizientenmatrix mit angehängter rechter Seite; der Strich trennt beide Teile.
- **Widerspruchszeile**: Zeile der erweiterten Matrix mit lauter Nullen links und einem von null verschiedenen Wert rechts; sie verlangt $0 = c$ für ein $c \neq 0$ und macht das System unlösbar.
- **Pivot**: erster von null verschiedener Eintrag einer Zeile in Zeilenstufenform; die Pivots stehen von oben nach unten immer weiter rechts.
- **Zeilenstufenform** (englisch *row echelon form*): Form einer Matrix, in der unter jedem Pivot nur Nullen stehen.
- **Freie Variable** (englisch *free variable*): Unbekannte ohne Pivot; sie darf jeden Wert annehmen und erzeugt unendlich viele Lösungen.
- **Rang** (englisch *rank*): Anzahl der Pivotpositionen einer Matrix; zugleich die Zahl linear unabhängiger Zeilen und Spalten.
- **Invertierbar** (englisch *invertible*): Eigenschaft einer quadratischen Matrix, für die zu jedem $b$ genau eine Lösung $x=A^{-1}b$ existiert.
