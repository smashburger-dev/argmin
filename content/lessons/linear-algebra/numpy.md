# NumPy-Arrays mit Shape-Verträgen

NumPy speichert numerische Daten in Arrays. Bevor du eine Operation programmierst, formulierst du ihren Shape-Vertrag: Welche Eingabeformen sind erlaubt, und welche Form muss das Ergebnis haben?

```python
import numpy as np

A = np.array([[2, 1],
              [1, 3]])
x = np.array([1, 2])
```

Hier hat `A.shape` den Wert `(2, 2)` und `x.shape` den Wert `(2,)`.

## Matrix-Vektor-Produkt

Der Operator `@` berechnet das Matrixprodukt:

```python
b = A @ x
```

Von Hand gilt

$$
b=
\begin{pmatrix}2&1\\1&3\end{pmatrix}
\begin{pmatrix}1\\2\end{pmatrix}
=
\begin{pmatrix}4\\7\end{pmatrix}.
$$

NumPy liefert entsprechend ein Array der Shape `(2,)`.

## Ein robuster Funktionsvertrag

```python
import numpy as np


def matvec(A, x):
    A = np.asarray(A)
    x = np.asarray(x)
    if A.ndim != 2 or x.ndim != 1:
        raise ValueError("A muss 2D und x muss 1D sein")
    if A.shape[1] != x.shape[0]:
        raise ValueError("innere Dimensionen passen nicht")
    return A @ x
```

Der Vertrag prüft zuerst die Anzahl der Dimensionen und danach die innere Shape. So entsteht bei falschen Eingaben ein erklärbarer Fehler an der richtigen Grenze.

## `*` ist nicht `@`

`A * B` multipliziert Arrays elementweise, sofern Broadcasting die Shapes vereinbar macht. `A @ B` führt ein Matrixprodukt aus. Beide Operationen können dieselbe Ergebnis-Shape haben und trotzdem etwas völlig anderes berechnen.

Deshalb prüfst du nicht nur die Shape, sondern auch mindestens ein kleines Handbeispiel.

## Broadcasting bewusst behandeln

Broadcasting erweitert kompatible Dimensionen implizit. Das ist nützlich, kann aber einen Modellfehler verdecken. Beispiel:

```python
A = np.ones((3, 2))
bias = np.array([10, 20])
A + bias
```

`bias` wird zeilenweise angewendet. Wenn du stattdessen einen Wert pro Zeile meintest, ist die Shape `(2,)` fachlich falsch, obwohl NumPy keinen Fehler meldet.

## Prüfstrategie

1. Notiere erwartete Eingabe- und Ausgabe-Shapes.
2. Nutze ein kleines Beispiel, das du von Hand berechnen kannst.
3. Prüfe einen korrekten Fall und mindestens einen Shape-Fehler.
4. Vergleiche Werte, nicht nur Shapes.
5. Halte Fehlermeldungen so konkret, dass die verletzte Bedingung erkennbar ist.

## Direkter Check

Ordne zuerst die Implementierung in der [Einstiegsaufgabe](#/family/construct-matvec-shape-contract/matvec-contract-order/0/intro). Trace danach die [Einstiegsaufgabe](#/family/trace-assignment-state/column-picture-trace/0/intro) und implementiere schließlich `matvec` im [Browser-Labor](#/lab/w05-e8).
