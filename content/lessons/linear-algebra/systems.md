# Gleichungssysteme als Spaltenbild lesen

Ein lineares Gleichungssystem beschreibt mehrere Bedingungen, die gleichzeitig gelten müssen. Die kompakte Schreibweise

$$A x = b$$

ist mehr als eine Abkürzung. Sie verbindet drei Sichtweisen:

- **Gleichungen:** Jede Zeile von $A$ liefert eine Gleichung.
- **Spalten:** Die Einträge von $x$ gewichten die Spalten von $A$.
- **Abbildung:** Die Matrix ordnet dem Eingabevektor $x$ den Ausgabevektor $b$ zu.

## Vom Gleichungssystem zur Matrix

Das System

$$
2x_1+x_2=3,\qquad x_1+3x_2=4
$$

wird zu

$$
\begin{pmatrix}2&1\\1&3\end{pmatrix}
\begin{pmatrix}x_1\\x_2\end{pmatrix}
=
\begin{pmatrix}3\\4\end{pmatrix}.
$$

Die erste Spalte ist $a_1=(2,1)^T$, die zweite $a_2=(1,3)^T$. Damit lautet dieselbe Frage:

$$x_1a_1+x_2a_2=b.$$

Für $x_1=1$ und $x_2=1$ entsteht tatsächlich $a_1+a_2=(3,4)^T$.

## Durchgerechnetes Beispiel

Gesucht sind die Koeffizienten für

$$
A=\begin{pmatrix}2&1\\1&3\end{pmatrix},\qquad b=\begin{pmatrix}3\\-1\end{pmatrix}.
$$

1. Schreibe das Spaltenbild: $x_1(2,1)^T+x_2(1,3)^T=(3,-1)^T$.
2. Lies die Zeilengleichungen ab: $2x_1+x_2=3$ und $x_1+3x_2=-1$.
3. Aus der ersten Gleichung folgt $x_2=3-2x_1$.
4. Einsetzen ergibt $x_1+3(3-2x_1)=-1$, also $-5x_1=-10$ und $x_1=2$.
5. Dann ist $x_2=3-4=-1$.
6. Probe im Spaltenbild: $2a_1-a_2=(4,2)^T-(1,3)^T=(3,-1)^T$.

Die Probe kontrolliert beide Gleichungen zugleich.

## Welche Lösungsfälle gibt es?

- **Genau eine Lösung:** Die Spalten liefern eine eindeutige Kombination für $b$.
- **Keine Lösung:** $b$ liegt nicht im von den Spalten erreichbaren Bereich.
- **Unendlich viele Lösungen:** Verschiedene Koeffizienten erzeugen dasselbe $b$.

Bei einer invertierbaren $2\times2$-Matrix tritt für jedes $b$ genau eine Lösung auf. Die Invertierbarkeit musst du hier noch nicht berechnen; entscheidend ist zuerst die Bedeutung der Koeffizienten.

## Typische Fehler

- Die Zeilen von $A$ mit den Spalten verwechseln.
- $b$ als weitere Spalte der Abbildung behandeln statt als Zielvektor.
- Das gefundene Paar nicht in **beide** Gleichungen einsetzen.
- Die Reihenfolge $(x_1,x_2)$ vertauschen.

## Direkter Check

1. Öffne die [Spaltenbild-Auswahl](#/exercise/f-linalg-column-choice-01).
2. Löse danach die [generierte Koeffizientenaufgabe](#/exercise/f-linalg-column-vector-01).
3. Verändere anschließend $x_1$ und $x_2$ in der [interaktiven Visualisierung](#/visualization/w05-viz1).
