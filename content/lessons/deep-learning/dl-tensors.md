# Tensoren, Schichten und Dimensionsverträge

Ein neuronales Netz ist zuerst einmal Buchhaltung über Formen. Ein **Tensor** ist ein numerisches Array mit einer festen **Form**; ein **Batch** von $n$ Beispielen mit $d$ Merkmalen ist eine Matrix der Form $(n, d)$. Diese Lektion baut den Forward-Pass eines kleinen Netzes mit NumPy, als reine Array-Arithmetik, ohne Framework.

## Das Bild dahinter: Die Adresse einer Zahl

Wie viele Koordinaten brauchst du, um eine Zahl zu finden? Ein einzelner Wert hat 0 Achsen. Eine Zeile braucht eine Position, 1 Achse. Eine Tabelle braucht Zeile und Spalte, 2 Achsen. Ein Stapel Tabellen, wie die Seiten eines Buchs, braucht Seite, Zeile und Spalte, 3 Achsen. Die [**Anzahl der Achsen**](#/glossary/anzahl-der-achsen) ist die Zahl der Koordinaten, die eine Zahl eindeutig macht.

Wo der Vergleich hinkt: Ab 4 Achsen gibt es kein Alltagsbild mehr. Die Regel bleibt trotzdem: Jede Achse ist eine Zählrichtung, und die Form listet ihre Längen.

## Der Dimensionsvertrag der Matrizenmultiplikation

Eine **lineare Schicht** hat zwei Bausteine:

- eine **Gewichtsmatrix** $W \in \mathbb{R}^{d \times h}$ (sprich: W Element der reellen d-mal-h-Matrizen; $\in$ heißt „Element von“), also eine Tabelle mit $d$ Zeilen und $h$ Spalten,
- einen **Bias** $b \in \mathbb{R}^{h}$, eine Liste aus $h$ Zahlen. Bias heißt hier der Verschiebungsvektor der Schicht, nicht die statistische Verzerrung.

Mit der Eingabematrix $X \in \mathbb{R}^{n \times d}$ rechnet die Schicht:

$$H = XW + b.$$

Ein Beispiel mit einem Beispiel ($n = 1$), zwei Merkmalen ($d = 2$) und drei Ausgängen ($h = 3$): Für $X = (1, 2)$, $W = \begin{pmatrix}1&0&1\\0&1&1\end{pmatrix}$ und $b = (0, 0, 1)$ ist $XW = (1, 2, 3)$ und $H = (1, 2, 4)$. Aus zwei Zahlen pro Beispiel werden drei. Der [Vertrag](#/glossary/vertrag): Die Spaltenzahl von $X$ muss gleich der Zeilenzahl von $W$ sein, $d$ trifft $d$. Das Ergebnis $H$ hat die Form $(n, h)$: Die Batch-Dimension $n$ bleibt außen erhalten, die Merkmalsdimension wird von $d$ auf $h$ umprojiziert. In NumPy:

```python
H = X @ W + b   # (n, d) @ (d, h) -> (n, h); b (h,) broadcastet zeilenweise
```

## Broadcasting: die stillen Regeln

$b$ hat die Form $(h,)$ und wird auf jede der $n$ Zeilen von $XW$ addiert. NumPy richtet Formen **von rechts** aus: $(n, h)$ und $(h,)$ passen, weil die letzte Dimension übereinstimmt und der Bias keine Batch-Dimension hat. Zwei Regeln reichen für den Alltag:

1. Fehlende führende Dimensionen werden als $1$ gelesen: $(h,)$ wird zu $(1, h)$.
2. Eine Dimension mit Größe $1$ wird auf die Partnergröße gestreckt; zwei verschiedene Größen größer $1$ sind ein Fehler.

Der tückische Fall ist ein Bias der Form $(h, 1)$ statt $(h,)$: Zu $(n, h)$ addiert scheitert das meist mit einem Fehler, passt aber still, wenn zufällig $n = h$ ist, und addiert dann pro Zeile statt pro Spalte. Immer explizit prüfen: `assert b.ndim == 1` und `assert b.shape[0] == W.shape[1]`.

## Parameter zählen inklusive Bias

Die Gewichtsmatrix $W$ trägt $d \cdot h$ **Parameter** (die trainierbaren Zahlen des Modells), der Bias-Vektor $h$. Eine Schicht hat also $d \cdot h + h$ trainierbare Parameter. Für ein 2-Schicht-MLP $d \rightarrow h_1 \rightarrow h_2$ mit **ReLU** dazwischen ($\max(0, x)$, elementweise):

$$P = \underbrace{d \cdot h_1 + h_1}_{\text{Schicht 1}} + \underbrace{h_1 \cdot h_2 + h_2}_{\text{Schicht 2}}.$$

ReLU selbst hat **keine** Parameter; es ist eine feste [Funktion](#/glossary/funktion). Diese Rechnung ist der schnellste Test, ob du die Architektur verstanden hast: erst die Formen, dann die Zahlen.

## Forward-Pass eines 2-Schicht-MLP

```python
import numpy as np

def mlp_forward(X, W1, b1, W2, b2):
    # Contracts: X (n, d), W1 (d, h1), b1 (h1,), W2 (h1, h2), b2 (h2,)
    if X.shape[1] != W1.shape[0]:
        raise ValueError("X und W1 passen nicht zusammen")
    hidden = np.maximum(0.0, X @ W1 + b1)   # (n, h1), ReLU
    return hidden @ W2 + b2                 # (n, h2), linearer Ausgang
```

Zwei Details, die in Produktionscode zählen: `np.maximum(0.0, ...)` arbeitet elementweise (nicht verwechseln mit `np.max`, das reduziert), und die versteckte Schicht wird **nach** dem Bias aktiviert. Form-Tests dokumentieren den Vertrag:

```python
X = np.random.default_rng(0).normal(size=(32, 8))
W1 = np.random.default_rng(1).normal(size=(8, 16))
assert mlp_forward(X, W1, np.zeros(16), np.zeros((16, 3)), np.zeros(3)).shape == (32, 3)
```
