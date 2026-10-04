# Gauß-Elimination als erlaubte Umformung

Ein Gleichungssystem per Einsetzen zu lösen funktioniert, ist aber schnell unübersichtlich. Gauß-Elimination macht daraus ein Verfahren: Du vereinfachst die Gleichungen Schritt für Schritt, bis du die Lösung direkt ablesen kannst. Hier lernst du, welche Schritte erlaubt sind und woran du die drei Lösungsfälle erkennst.

## Das Bild dahinter: Kassenzettel abziehen

Zwei Kassenzettel aus demselben Café: „2 Kaffee + 1 Croissant = 7 €“ und „1 Kaffee + 1 Croissant = 4,50 €“. Ziehst du den zweiten Zettel vom ersten ab, fällt das Croissant weg: 1 Kaffee kostet 2,50 €. Dann kostet das Croissant $4{,}50 - 2{,}50 = 2$ €.

Genau das ist eine Zeilenoperation. Die Zuordnung:

- ein Kassenzettel: eine Zeile, also eine Gleichung
- ein Posten auf dem Zettel: ein [Koeffizient](#/glossary/koeffizient)
- Zettel voneinander abziehen: ein Vielfaches einer Zeile von einer anderen subtrahieren

Wo der Vergleich hinkt: Auf echten Kassenzetteln stehen positive Preise. In echten Systemen tauchen negative und gebrochene Koeffizienten auf, und manchmal musst du erst multiplizieren, damit sich etwas weghebt.

## Erlaubte Zeilenoperationen

Jede Zeile der **erweiterten Matrix** steht für eine Gleichung; der Strich trennt die Koeffizienten von der rechten Seite:

$$
\left(\begin{array}{cc|c}
3&1&7\\
1&2&9
\end{array}\right)
$$

Gelesen heißt das $3x + y = 7$ und $x + 2y = 9$. Erlaubt sind drei **Zeilenoperationen**:

1. Zwei Zeilen vertauschen.
2. Eine Zeile mit einer von null verschiedenen Zahl multiplizieren.
3. Ein Vielfaches einer Zeile zu einer anderen addieren.

Jede dieser Operationen verändert die Schreibweise, aber nicht die Lösungsmenge, genau wie das Abziehen der Kassenzettel den Preis nicht ändert.

## Ziel: Zeilenstufenform und Pivot

Ein **Pivot** ist der erste von null verschiedene [Eintrag](#/glossary/eintrag) einer Zeile in Zeilenstufenform; die Pivots stehen von oben nach unten immer weiter rechts. In **Zeilenstufenform** stehen unter jedem Pivot nur Nullen, wie eine Treppe, deren Stufenkante das Pivot bildet. Die Zahl der Pivots ist der **Rang** der Koeffizientenmatrix.

Pivots zeigen dir, welche [Variablen](#/glossary/variable) festgelegt werden, ob ein Widerspruch entsteht und ob **freie Variablen** vorkommen, also Unbekannte ohne Pivot.

## Durchgerechnetes Beispiel

Löse $3x + y = 7$ und $x + 2y = 9$.

1. **Erweiterte Matrix aufstellen**: die [Matrix](#/glossary/matrix) oben.
2. **Zeilen tauschen, damit der Pivot 1 ist**:

$$
\left(\begin{array}{cc|c}
1&2&9\\
3&1&7
\end{array}\right).
$$

3. **Unter dem Pivot nullen**: Ersetze Zeile 2 durch Zeile 2 minus dreimal Zeile 1, geschrieben $Z_2 \leftarrow Z_2 - 3Z_1$. Das ergibt $3 - 3 \cdot 1 = 0$, $1 - 3 \cdot 2 = -5$ und $7 - 3 \cdot 9 = -20$:

$$
\left(\begin{array}{cc|c}
1&2&9\\
0&-5&-20
\end{array}\right).
$$

4. **Letzte Zeile lesen**: $-5y = -20$, also $y = 4$.
5. **Rückwärtseinsetzen**: Erste Zeile $x + 2 \cdot 4 = 9$ ergibt $x = 1$. Dieses Zurückrechnen von unten nach oben heißt **Rückwärtseinsetzen**.
6. **Probe**: $3 \cdot 1 + 4 = 7$ und $1 + 2 \cdot 4 = 9$.

## Widerspruch und freie Variable

Entsteht beim Eliminieren diese Zeile:

$$0x + 0y = 4.$$

Sie verlangt das Unmögliche und ist ein Widerspruch: Das System hat keine Lösung, im Smoothie-Bild aus der Lektion [Gleichungssysteme als Spaltenbild lesen](#/lesson/l-linalg-systems) ist das Ziel nicht mischbar. Eine Zeile $0 = 0$ enthält dagegen keine neue Bedingung. Fehlt dadurch ein Pivot, bleibt eine Variable frei, und es gibt unendlich viele Lösungen.

## Wo dir das in der KI begegnet

Wenn du `np.linalg.solve(A, b)` aufrufst, rechnet NumPy nicht mit Einsetzen, sondern über eine LU-Zerlegung aus der LAPACK-Bibliothek: organisierte Gauß-Elimination, bei der die Zeilenoperationen in zwei Dreiecksmatrizen festgehalten werden. Für den Rang nimmt NumPy dagegen ein anderes Verfahren (`np.linalg.matrix_rank` nutzt die Singulärwertzerlegung), weil Rundungsfehler bei der Elimination echte Nullen verwischen können.

## Typische Fehler

- Die Operation nur links anwenden und die rechte Seite vergessen. Jede Zeilenoperation gilt für die ganze Zeile, auch rechts vom Strich.
- Eine Zeile mit null multiplizieren und damit eine Gleichung vernichten.
- Nach der Vorwärtselimination das Rückwärtseinsetzen vergessen.
- Dezimalwerte zu früh runden; rechne mit Brüchen, bis die Lösung steht.
- Eine Nullzeile $0 = 0$ mit einem Widerspruch verwechseln.
- Den Rang aus den ursprünglichen Zeilen raten statt die Stufenform zu zählen.

## Direkter Check

Löse die [Kernaufgabe: System $2x+y=5$, $x-3y=-8$](#/family/transform-system-2x2-elimination/system-w05-e6/0/core) und danach die [Kernaufgabe: System $-x-3y=-20$, $2x+3y=28$](#/family/transform-system-2x2-elimination/system-w05-e11/0/core). Beide werden als exakte ganzzahlige Paare geprüft.

## Begriffe auf einen Blick

- **Erweiterte Matrix** (englisch *augmented matrix*): Koeffizientenmatrix mit angehängter rechter Seite; der Strich trennt beide Teile.
- **Zeilenoperation** (englisch *row operation*): erlaubte Umformung einer Matrix: Zeilen tauschen, Zeile mit Zahl ungleich null multiplizieren, Vielfaches einer Zeile zu einer anderen addieren.
- **Pivot**: erster von null verschiedener Eintrag einer Zeile in Zeilenstufenform; die Pivots stehen von oben nach unten immer weiter rechts.
- **Zeilenstufenform** (englisch *row echelon form*): Form einer Matrix, in der unter jedem Pivot nur Nullen stehen.
- **Freie Variable** (englisch *free variable*): Unbekannte ohne Pivot; sie darf jeden Wert annehmen und erzeugt unendlich viele Lösungen.
- **Rückwärtseinsetzen** (englisch *back substitution*): nach der Stufenform von der letzten Zeile nach oben rechnen und die Unbekannten nacheinander bestimmen.
- **Rang** (englisch *rank*): Anzahl der Pivotpositionen einer Matrix; zugleich die Zahl linear unabhängiger Zeilen und Spalten.
