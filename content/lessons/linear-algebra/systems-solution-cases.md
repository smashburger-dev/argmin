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

Zuerst die Lesehilfe. Links vom Strich gehört jede Spalte zu genau einer Unbekannten: Spalte 1 sammelt die Koeffizienten von $x_1$, Spalte 2 die von $x_2$, Spalte 3 die von $x_3$. Die Zahl der Unbekannten zählst du deshalb an den Spalten links vom Strich ab, nicht an den Nullen. Eine 0 bedeutet nur, dass die Unbekannte dieser Spalte in dieser Gleichung nicht vorkommt.

Die Lektion [Gauß-Elimination](#/lesson/l-linalg-gauss) zeigt später, wie du ein System so umformst, dass du es von unten nach oben lösen kannst. Diese Zielform heißt **Zeilenstufenform**. Du prüfst sie in drei Schritten:

1. Suche in jeder Zeile von links den ersten Eintrag, der nicht 0 ist. Dieser Eintrag heißt **Pivot**.
2. Jedes Pivot steht weiter rechts als das Pivot der Zeile darüber.
3. Zeilen, die links vom Strich nur Nullen haben, stehen ganz unten.

So entsteht eine Treppe, und unter jedem Pivot stehen nur Nullen. Ein Beispiel mit drei Unbekannten und eingerahmten Pivots:

$$
\left(\begin{array}{rrr|r}
\boxed{1} & 1 & 0 & 3\\
0 & \boxed{2} & 1 & 5\\
0 & 0 & \boxed{1} & 1
\end{array}\right)
$$

Zeile für Zeile gelesen heißt das $x_1 + x_2 = 3$, $2x_2 + x_3 = 5$ und $x_3 = 1$. Die Treppe zahlt sich jetzt aus. Die unterste Gleichung enthält nur noch $x_3$, also ist $x_3 = 1$. In die mittlere eingesetzt ergibt sich $2x_2 + 1 = 5$, also $x_2 = 2$. Die oberste liefert dann $x_1 = 3 - 2 = 1$.

Der **Rang** der Koeffizientenmatrix ist die Zahl der Pivots, hier 3. Jede Zeile hat höchstens ein Pivot, weil es nur einen ersten Eintrag gibt, und eine Nullzeile hat keins. Deshalb ist der Rang nie größer als die Zahl der Zeilen und nie größer als die Zahl der Spalten. Jedes Pivot steht für eine Gleichung, die eine weitere Unbekannte festlegt.

Trägt die Spalte einer Unbekannten kein Pivot, ist sie eine **freie Variable** und darf jeden Wert annehmen:

$$
\left(\begin{array}{rrr|r}
\boxed{1} & -2 & 0 & 3\\
0 & 0 & \boxed{2} & 4\\
0 & 0 & 0 & 0
\end{array}\right)
$$

Auch hier stehen drei Spalten links vom Strich, also gibt es drei Unbekannte. Die Zeilen lauten $x_1 - 2x_2 = 3$, dann $2x_3 = 4$ und zuletzt $0 = 0$. In Zeile 2 haben $x_1$ und $x_2$ den Koeffizienten 0 und fallen weg, also ist $x_3 = 2$. Zeile 3 verlangt nichts.

Pivots stehen in Spalte 1 und Spalte 3, der Rang ist 2. Spalte 2 hat keins: Keine Zeile beginnt mit $x_2$, also legt keine Gleichung $x_2$ fest. Du wählst $x_2$ selbst und stellst Zeile 1 nach $x_1$ um: $x_1 = 3 + 2x_2$. Mit $x_2 = 0$ ergibt sich die Lösung $(3, 0, 2)$, mit $x_2 = 1$ die Lösung $(5, 1, 2)$. Beide erfüllen alle drei Zeilen, denn $3 - 0 = 3$ und $5 - 2 = 3$. Jeder weitere Wert für $x_2$ liefert eine weitere Lösung.

Allgemein gilt, aber nur wenn das System überhaupt lösbar ist:

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

Zeile 1 heißt $x_1 + x_2 = 2$. Zeile 2 heißt $0x_1 + 0x_2 = 0$, also $0 = 0$. Das stimmt für jede Wahl von $x_1$ und $x_2$ und schränkt deshalb nichts ein. Übrig bleibt eine Gleichung für zwei Unbekannte.

Der Rang ist 1, die Spalte von $x_2$ trägt kein Pivot, also ist $x_2$ frei. Stelle Zeile 1 nach $x_1$ um: $x_1 = 2 - x_2$. Für $x_2 = 0$ ist $x_1 = 2$, für $x_2 = 1$ ist $x_1 = 1$, für $x_2 = 5$ ist $x_1 = -3$. Jedes dieser Paare erfüllt $x_1 + x_2 = 2$, und jeder weitere Wert für $x_2$ liefert ein weiteres Paar.

Woher kommt die Nullzeile? Im ursprünglichen System beschrieben beide Gleichungen dieselbe Gerade, die zweite war nur ein Vielfaches der ersten. Die Elimination hat die doppelte Gleichung zu $0 = 0$ gemacht. Als Geradenbild liegen die Geraden aufeinander, im Smoothie-Bild liegt das Ziel genau auf der Zutatenlinie.

Zwei Fallen, die die Aufgaben prüfen:

- Eine **Nullzeile ist kein Widerspruch**: $0 = 0$ ist einfach wahr. Erst eine von null verschiedene rechte Seite wie in Fall 2 macht die Zeile zur Widerspruchszeile.
- Eine **Nullzeile macht den Rang nicht zu null**: Der Rang zählt Pivots. Fall 3 hat Rang 1, weil die erste Zeile ein Pivot trägt; die Nullzeile trägt nur keins bei.

| Was du in der Stufenform siehst | Lesart | Lösungsfall |
|---|---|---|
| Pivot in jeder Variablenspalte, keine Widerspruchszeile | alle Unbekannten festgelegt | genau eine Lösung |
| Zeile $0 = c$ mit $c \neq 0$ | Widerspruchszeile | keine Lösung |
| keine Widerspruchszeile, Spalte ohne Pivot | freie Variable | unendlich viele Lösungen |

Eine quadratische Matrix, bei der für jedes $b$ genau eine Lösung existiert, heißt **invertierbar**: Es gibt eine Umkehrmatrix $A^{-1}$ mit $A^{-1}Ax=x$. Die Invertierbarkeit musst du hier noch nicht berechnen; entscheidend ist, welche Rolle die Koeffizienten spielen.
