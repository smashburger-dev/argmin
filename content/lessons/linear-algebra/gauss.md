# Gauß-Elimination als erlaubte Umformung

Gauß-Elimination löst ein lineares Gleichungssystem, indem die erweiterte Matrix schrittweise in eine leichter lesbare Form gebracht wird. Jede Zeile steht für eine Gleichung.

Erlaubt sind drei Zeilenoperationen:

1. Zwei Zeilen vertauschen.
2. Eine Zeile mit einer von null verschiedenen Zahl multiplizieren.
3. Ein Vielfaches einer Zeile zu einer anderen addieren.

Diese Operationen verändern die Schreibweise, aber nicht die Lösungsmenge.

## Ziel: Pivotstruktur

Ein **Pivot** ist der erste von null verschiedene Eintrag einer Zeile. In Zeilenstufenform liegen die Pivots von oben nach unten immer weiter rechts. Nullzeilen stehen unten.

Pivots helfen dir zu erkennen:

- welche Variablen festgelegt werden,
- ob eine widersprüchliche Zeile entsteht,
- ob freie Variablen und damit mehrere Lösungen vorkommen.

## Durchgerechnetes Beispiel

Löse

$$
2x+y=5,\qquad x-3y=-8.
$$

Die erweiterte Matrix ist

$$
\left(\begin{array}{cc|c}
2&1&5\\
1&-3&-8
\end{array}\right).
$$

Vertausche zuerst die Zeilen, damit der erste Pivot 1 ist:

$$
\left(\begin{array}{cc|c}
1&-3&-8\\
2&1&5
\end{array}\right).
$$

Eliminiere den ersten Eintrag der zweiten Zeile mit $Z_2\leftarrow Z_2-2Z_1$:

$$
\left(\begin{array}{cc|c}
1&-3&-8\\
0&7&21
\end{array}\right).
$$

Die zweite Zeile liefert $7y=21$, also $y=3$. Rückwärtseinsetzen in die erste Zeile ergibt $x-9=-8$ und damit $x=1$.

Probe: $2\cdot1+3=5$ und $1-3\cdot3=-8$.

## Widerspruch und freie Variable

Eine Zeile der Form

$$0x+0y=4$$

ist ein Widerspruch: Es gibt keine Lösung. Eine Zeile $0=0$ enthält dagegen keine neue Bedingung. Fehlt dadurch ein Pivot, kann eine Variable frei sein.

## Typische Fehler

- Die Operation nur links, aber nicht auf die rechte Seite anwenden.
- Mit null multiplizieren und dadurch Information vernichten.
- Nach der Vorwärtselimination das Rückwärtseinsetzen vergessen.
- Dezimalwerte zu früh runden.
- Eine Nullzeile mit einem Widerspruch verwechseln.

## Direkter Check

Löse die [Kernaufgabe](#/family/transform-system-2x2-elimination/system-w05-e6/0/core) und danach die [Kernaufgabe](#/family/transform-system-2x2-elimination/system-w05-e11/0/core). Beide werden als exakte ganzzahlige Paare geprüft.
