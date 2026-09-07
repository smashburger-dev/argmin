# Tensoren, Layer und Dimensionsverträge

Ein neuronales Netz ist zuerst einmal Buchhaltung über Formen. Ein **Tensor** ist ein numerisches Array mit einer festen Form (Shape); ein Batch von $n$ Beispielen mit $d$ Features ist eine Matrix der Form $(n, d)$. Diese Lektion baut den Forward-Pass eines kleinen Netzes **mit NumPy** — ehrlich gesagt: ohne Framework. Kein torch, kein TensorFlow; alles, was du hier lernst, läuft als reine Array-Arithmetik. Frameworks sind später Lektüre, nicht Ausführungsumgebung.

## Der Dimensionsvertrag der Matrizenmultiplikation

Ein lineares Layer mit Gewichtsmatrix $W \in \mathbb{R}^{d \times h}$ und Bias $b \in \mathbb{R}^{h}$ rechnet

$$H = XW + b$$

mit $X \in \mathbb{R}^{n \times d}$. Der Vertrag: Die Spaltenzahl von $X$ muss gleich der Zeilenzahl von $W$ sein — $d$ trifft $d$. Das Ergebnis $H$ hat die Form $(n, h)$: die Batch-Dimension $n$ bleibt immer außen erhalten, die Feature-Dimension wird von $d$ auf $h$ umprojiziert. In NumPy:

```python
H = X @ W + b   # (n, d) @ (d, h) -> (n, h); b (h,) broadcastet zeilenweise
```

## Broadcasting: die Stillen-Regeln

$b$ hat die Form $(h,)$ und wird auf jede der $n$ Zeilen von $XW$ addiert. NumPy richtet Formen **von rechts** aus: $(n, h)$ und $(h,)$ passen, weil die letzte Dimension übereinstimmt und der Bias keine Batch-Dimension hat. Zwei Regeln reichen für den Alltag:

1. Fehlende führende Dimensionen werden als $1$ gelesen: $(h,)$ wird zu $(1, h)$.
2. Eine Dimension mit Größe $1$ wird auf die Partnergröße gestreckt; zwei verschiedene Größen größer $1$ sind ein Fehler.

Der häufigste Bug ist ein Bias der Form $(1, h)$ gegen einen Zielterm $(h, 1)$ — beides broadcastet, aber in verschiedene Richtungen. Immer explizit prüfen: `assert b.ndim == 1` und `assert b.shape[0] == W.shape[1]`.

## Parameter zählen inklusive Bias

Die Gewichtsmatrix $W$ trägt $d \cdot h$ Parameter, der Bias-Vektor $h$. Ein Layer hat also $d \cdot h + h$ trainierbare Parameter. Für ein 2-Layer-MLP mit Schichten $d \rightarrow h_1 \rightarrow h_2$ (ReLU dazwischen):

$$P = \underbrace{d \cdot h_1 + h_1}_{\text{Layer 1}} + \underbrace{h_1 \cdot h_2 + h_2}_{\text{Layer 2}}$$

ReLU selbst hat **keine** Parameter — es ist eine feste Funktion $\max(0, x)$. Diese Rechnung ist der schnellste Test, ob du die Architektur wirklich verstanden hast: erst die Formen, dann die Zahlen.

## Forward-Pass eines 2-Layer-MLP

```python
import numpy as np

def mlp_forward(X, W1, b1, W2, b2):
    # Contracts: X (n, d), W1 (d, h1), b1 (h1,), W2 (h1, h2), b2 (h2,)
    if X.shape[1] != W1.shape[0]:
        raise ValueError("X und W1 passen nicht zusammen")
    hidden = np.maximum(0.0, X @ W1 + b1)   # (n, h1), ReLU
    return hidden @ W2 + b2                 # (n, h2), linearer Ausgang
```

Zwei Details, die in Produktionscode zählen: `np.maximum(0.0, ...)` arbeitet elementweise (nicht verwechseln mit `np.max`, das reduziert), und die versteckte Schicht wird **nach** dem Bias aktiviert. Shape-Tests dokumentieren den Vertrag:

```python
X = np.random.default_rng(0).normal(size=(32, 8))
W1 = np.random.default_rng(1).normal(size=(8, 16))
assert mlp_forward(X, W1, np.zeros(16), np.zeros((16, 3)), np.zeros(3)).shape == (32, 3)
```

## Typische Fehler

- Formen $(n, d)$ und $(d, n)$ verwechseln — der Fehler zeigt sich oft erst drei Zeilen später als Broadcast-Überraschung.
- Bias als Zeilen- statt Spaltenvektor deklarieren und still verbrauchen.
- Parameterzahl ohne Bias rechnen ($d \cdot h$ statt $d \cdot h + h$).
- Bei `reshape` still eine Dimension der Größe $1$ einziehen und später über falsche Achsen mitteln.

## Direkter Check

Zähle in [w18-e2](#/exercise/w18-e2) Parameter eines Layers und eines kleinen MLP. Lies in [w18-e3](#/exercise/w18-e3) Formen und Broadcasting ab. In [w18-e4](#/exercise/w18-e4) implementierst du ein lineares Layer mit Dimensionskontrolle; [w18-e5](#/exercise/w18-e5) baut den MLP-Forward mit ReLU, und [w18-e6](#/exercise/w18-e6) verallgemeinert auf beliebig tiefe Netze mit strikten Verträgen.
