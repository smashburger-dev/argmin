# NumPy-Arrays mit Dimensionsverträgen

In NumPy steckt jede Zahlentabelle in einem Array, und die häufigsten Fehler sind keine Rechenfehler, sondern Formfehler: Du übergibst eine Tabelle, die der Code anders interpretiert als du meinst. Diese Lektion macht dich mit dem Dimensionsvertrag vertraut, der solche Fehler abfängt, bevor sie still falsche Ergebnisse liefern.

## Das Bild dahinter: Stecker und Steckdose

Ein Funktionsvertrag für Formen ist wie Stecker und Steckdose: Nur was zusammenpasst, darf verbunden werden. Erwartet die Funktion eine [Matrix](#/glossary/matrix) mit drei Spalten, ist ein Vektor der Länge zwei der falsche Stecker; die Verbindung muss abgelehnt werden, statt mit Gewalt zu passen.

Broadcasting ist dabei ein Stempel: NumPy legt ein kleineres Array gedanklich auf jede Zeile oder Spalte des größeren, wenn die Formen verträglich sind. Wo der Vergleich hinkt: Der Stempel passt auch, wenn du es gar nicht wolltest. Broadcasting meldet sich nicht, wenn es dein Konzept verändert; es macht den Fehler still.

## Arrays, Form und Achsen

Ein **Array** ist NumPys rechteckige Zahlenstruktur. Eine **Achse** (englisch *axis*) ist eine Richtung, entlang der das Array zählt: Zeilen sind Achse 0, Spalten Achse 1. `ndim` gibt die **Anzahl der Achsen** zurück, `shape` die **Form** (englisch *shape*), also die Länge jeder Achse. „Dimension“ ist doppeldeutig: In „2D“ meint es die Anzahl der Achsen, in „innere Dimension“ die Länge einer Achse.

```python
import numpy as np

A = np.array([[2, 1],
              [1, 3]])
x = np.array([1, 2])
```

Hier hat `A.ndim` den Wert 2 und `A.shape` den Wert `(2, 2)`: zwei Achsen mit je zwei Einträgen. `x.ndim` ist 1 und `x.shape` ist `(2,)`: ein Tupel mit einer einzigen Achse der Länge 2; das Komma macht das Tupel. Ein Vektor ist in NumPy also keine $2\times1$-Matrix, sondern eine einzelne Liste.

## Ein robuster Funktionsvertrag

Der Operator `@` berechnet das [Matrixprodukt](#/glossary/matrixprodukt). Von Hand gilt

$$
b=
\begin{pmatrix}2&1\\1&3\end{pmatrix}
\begin{pmatrix}1\\2\end{pmatrix}
=
\begin{pmatrix}4\\7\end{pmatrix}.
$$

NumPy liefert entsprechend ein Array der Form `(2,)`. Wer eine Funktion schreibt, legt den [Vertrag](#/glossary/vertrag) vor der Rechnung fest:

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

Der Vertrag prüft zuerst die Anzahl der Achsen und danach die innere Länge. Ein `ValueError` ist die rote Karte der Programmiersprache: Er bricht mit einer erklärbaren Meldung ab, statt ein falsches Ergebnis weiterzureichen. Derselbe Aufbau trägt Verträge für andere Funktionen: Bei `solve(A, b)` prüfst du quadratische Form und passende Seitenlänge, bei `matmul(A, B)` die inneren Dimensionen.

## `*` ist nicht `@`

`A * B` multipliziert zwei Arrays elementweise, Zelle für Zelle. `A @ B` führt das Matrixprodukt aus. Beide können dieselbe Ergebnisform liefern und trotzdem völlig verschiedene Werte berechnen. Deshalb reicht der Formcheck allein nicht: Prüfe immer auch ein kleines Handbeispiel auf die Werte.

## Broadcasting bewusst behandeln

**Broadcasting** erweitert kompatible Achsen automatisch. Beispiel:

```python
A = np.ones((3, 2))
bias = np.array([10, 20])
A + bias
```

NumPy stempelt `bias` mit Form `(2,)` auf jede der drei Zeilen von `A`. Wolltest du dagegen einen Wert pro Zeile addieren, bräuchte `bias` die Form `(3, 1)`, eine Spalte mit drei Einträgen. Ein [Bias](#/glossary/bias-schicht) der Form `(3,)` lehnt NumPy ab, weil 3 nicht zur letzten Achse der Länge 2 passt. Tückisch ist die Form `(2,)`: Sie passt, egal ob du sie so gemeint hast.

## Wo dir das in der KI begegnet

In PyTorch sieht ein verletzter Vertrag so aus: `RuntimeError: mat1 and mat2 shapes cannot be multiplied (64x10 and 3x10)`. Solch ein Fehler entsteht zum Beispiel bei `nn.Linear(3, 10)`: Die Schicht erwartet 3 Eingangswerte pro Beispiel, der [Batch](#/glossary/batch) liefert aber 10; innen treffen 10 und 3 aufeinander und passen nicht zusammen. Genau der Dimensionsvertrag ist verletzt.

Gefährlicher ist der stille Fall. Ein Klassiker beim mittleren quadratischen Fehler:

```python
y_pred = np.array([[1.0], [2.0], [3.0]])   # Form (3, 1)
y = np.array([1.0, 2.5, 2.0])              # Form (3,)
mse = np.mean((y_pred - y) ** 2)           # still falsch!
```

NumPy broadcastet `(3, 1)` minus `(3,)` zu einer `(3, 3)`-Matrix aller Paardifferenzen und mittelt über neun statt drei Werte. Kein Fehler, trotzdem falsch. Die Reparatur ist `y_pred.ravel()` oder `y_pred[:, 0]`, damit beide Seiten die Form `(3,)` haben.

## Prüfstrategie

1. Notiere erwartete Eingabe- und Ausgabeformen vor dem Code.
2. Nutze ein kleines Beispiel, das du von Hand berechnen kannst.
3. Prüfe einen korrekten Fall und mindestens einen Formfehler.
4. Vergleiche Werte, nicht nur Formen.
5. Halte Fehlermeldungen so konkret, dass die verletzte Bedingung erkennbar ist.

## Typische Fehler

- `*` statt `@` verwenden und der passenden Ergebnisform vertrauen.
- `x.shape` als `(2, 1)` erwarten, obwohl ein eindimensionales Array `(2,)` liefert.
- Broadcasting als Absicht lesen; es ist nur eine Verträglichkeitsregel und kennt dein Ziel nicht.
- Einen `ValueError` umgehen, statt die Eingabe zu reparieren.
- Bei `matvec` die Achsen vertauschen: `A.shape[1]` muss zu `x.shape[0]` passen.

## Direkter Check

Ordne zuerst die Implementierung in der [Einstiegsaufgabe: matvec-Reihenfolge](#/family/construct-matvec-shape-contract/matvec-contract-order/0/intro). Trace danach die [Einstiegsaufgabe: Spaltenbild-Trace](#/family/trace-assignment-state/column-picture-trace/0/intro) und implementiere schließlich `matvec` selbst in der [Programmieraufgabe: matvec-Implementierung](#/family/construct-matvec-shape-contract/matvec-code-reference/0/core).

## Begriffe auf einen Blick

- **Array**: NumPys rechteckige Zahlenstruktur mit fester Form.
- **Achse** (englisch *axis*): eine Zählrichtung des Arrays; Zeilen sind Achse 0, Spalten Achse 1.
- **Anzahl der Achsen** (englisch *number of dimensions*): wie viele Achsen das Array hat; in NumPy das Attribut `ndim`, ein Vektor hat 1, eine Matrix 2.
- **Form** (englisch *shape*): wie viele Einträge ein Array entlang jeder Richtung hat; bei einer Matrix Zeilen mal Spalten, zum Beispiel $2\times3$, in NumPy `A.shape == (2, 3)`.
- **Dimensionsvertrag**: Regel, welche Formen eine Operation annimmt und welche Form ihr Ergebnis hat.
- **Broadcasting**: automatisches Ausdehnen kompatibler Achsen, sodass ein kleineres Array auf jede Zeile oder Spalte des größeren wirkt.
- **ValueError**: Python-Fehler, der eine Funktion bei unpassender Eingabe auslöst; der vereinbarte Abbruch des Vertrags.
