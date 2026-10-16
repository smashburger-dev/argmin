## Die erweiterte Matrix

Sobald du mit einem System rechnest, schreibst du es kompakter: Die **erweiterte Matrix** $(A|b)$ hängt die rechte Seite als letzte Spalte hinter einem Strich an $A$ an. Jede Zeile bleibt eine Gleichung, der Strich markiert das Gleichheitszeichen. Das Beispiel von oben mit $b = (3, -1)^T$ sieht so aus:

$$
\left(\begin{array}{rr|r}
2 & 1 & 3\\
1 & 3 & -1
\end{array}\right)
$$

Zeile 1 gelesen heißt $2x_1 + x_2 = 3$, Zeile 2 heißt $x_1 + 3x_2 = -1$. Dieselbe Schreibweise mit `array` und Trennstrich verwenden auch die Aufgaben dieses Moduls, nur oft mit drei Unbekannten.

## Pivot und Rang

Ein System liegt in **Zeilenstufenform**, wenn unter jedem ersten von null verschiedenen Eintrag einer Zeile nur Nullen stehen. Dieser erste Eintrag heißt **Pivot**; die Pivots stehen wie eine Treppe von oben nach unten immer weiter rechts. Hier mit drei Unbekannten und eingerahmten Pivots:

$$
\left(\begin{array}{rrr|r}
\boxed{2} & 1 & 0 & 5\\
0 & \boxed{3} & 1 & 7\\
0 & 0 & \boxed{1} & 2
\end{array}\right)
$$

Der **Rang** der Koeffizientenmatrix ist die Zahl der Pivots, hier 3. Die Zahl der Pivots zählt die unabhängigen Bedingungen: Jedes Pivot bindet seine Zeile an eine Unbekannte und legt damit einen Freiheitsgrad fest.

Trägt die Spalte einer Unbekannten kein Pivot, ist sie eine **freie Variable** und darf jeden Wert annehmen:

$$
\left(\begin{array}{rrr|r}
\boxed{1} & -2 & 0 & 3\\
0 & 0 & \boxed{2} & 4\\
0 & 0 & 0 & 0
\end{array}\right)
$$

Rang 2, und in der Spalte von $x_2$ steht kein Pivot: $x_2$ ist frei. Allgemein gilt, aber nur wenn das System überhaupt lösbar ist:

$$\text{Anzahl freier Variablen} = \text{Anzahl Unbekannte} - \text{Rang}.$$

Hier also $3 - 2 = 1$.

## Drei Lösungsfälle

Wie weit die Mischung frei wählbar ist, liest du an drei Mustern ab. Alle Beispiele zeigen zwei Unbekannte, damit du den Fall auch als Geradenbild sehen kannst.

**Fall 1, genau eine Lösung**:

$$
\left(\begin{array}{rr|r}
\boxed{1} & 0 & 2\\
0 & \boxed{1} & 3
\end{array}\right)
$$

Beide Variablenspalten tragen ein Pivot, keine Zeile widerspricht sich: $x_1 = 2$, $x_2 = 3$. Als Geradenbild schneiden sich zwei Geraden in genau einem Punkt; im Smoothie-Bild aus dem Anfang gibt es genau eine Mischung.

**Fall 2, keine Lösung**:

$$
\left(\begin{array}{rr|r}
\boxed{1} & 1 & 2\\
0 & 0 & 5
\end{array}\right)
$$

Die zweite Zeile liest sich als $0x_1 + 0x_2 = 5$, also $0 = 5$: eine **Widerspruchszeile**. Keine Wahl von $x_1$ und $x_2$ erfüllt sie, das System ist unlösbar. Die Geraden verlaufen parallel, im Smoothie-Bild liegt das Ziel nicht auf der Linie der Zutaten.

**Fall 3, unendlich viele Lösungen**:

$$
\left(\begin{array}{rr|r}
\boxed{1} & 1 & 2\\
0 & 0 & 0
\end{array}\right)
$$

Die zweite Zeile verlangt $0 = 0$ und ist wahr, aber inhaltsleer. Der Rang ist 1, die Spalte von $x_2$ trägt kein Pivot, $x_2$ ist frei. Zu jedem $x_2$ gehört $x_1 = 2 - x_2$; die Geraden liegen aufeinander, das Ziel liegt genau auf der Zutatenlinie.

Zwei Fallen, die die Aufgaben prüfen:

- Eine **Nullzeile ist kein Widerspruch**: $0 = 0$ ist einfach wahr. Erst eine von null verschiedene rechte Seite wie in Fall 2 macht die Zeile zur Widerspruchszeile.
- Eine **Nullzeile macht den Rang nicht zu null**: Der Rang zählt Pivots. Fall 3 hat Rang 1, weil die erste Zeile ein Pivot trägt; die Nullzeile trägt nur keins bei.

| Was du in der Stufenform siehst | Lesart | Lösungsfall |
|---|---|---|
| Pivot in jeder Variablenspalte, keine Widerspruchszeile | alle Unbekannten festgelegt | genau eine Lösung |
| Zeile $0 = c$ mit $c \neq 0$ | Widerspruchszeile | keine Lösung |
| keine Widerspruchszeile, Spalte ohne Pivot | freie Variable | unendlich viele Lösungen |

Eine quadratische Matrix, bei der für jedes $b$ genau eine Lösung existiert, heißt **invertierbar**: Es gibt eine Umkehrmatrix $A^{-1}$ mit $A^{-1}Ax=x$. Die Invertierbarkeit musst du hier noch nicht berechnen; entscheidend ist, welche Rolle die Koeffizienten spielen.
