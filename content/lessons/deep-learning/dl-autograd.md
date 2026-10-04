# Backpropagation als Kettenregel im Rechengraph

Backpropagation ist kein Zauber, sondern die Kettenregel, organisiert als Durchlauf durch einen **Rechengraphen**. Jede Operation kennt nur ihre eigene Umgebung: ihren lokalen Gradienten. Die globale Frage, wie stark der Verlust $L$ von einem frühen Gewicht abhängt, beantwortet der Graph durch Weiterreichen von Gradienten rückwärts.

## Das Bild dahinter: Wechselkurse

Gilt $1\ \text{€} = 1{,}10\ \text{\$}$ und $1\ \text{\$} = 150\ \text{¥}$, dann ist $1\ \text{€} = 165\ \text{¥}$: Die Kurse multiplizieren sich entlang des Wegs. Genau so arbeitet die **Kettenregel**: Der Anteil eines frühen Gewichts am Verlust ist das Produkt der lokalen Kurse entlang des Pfades.

Gabelt sich der Weg (stell dir zwei Einkommensquellen vor, die beide von deinen Arbeitsstunden abhängen), addieren sich die Beiträge. Der **Upstream-Gradient** ist dabei „was ein Dollar am Ende in Yen wert ist": der [Gradient](#/glossary/gradient), der von der Ausgabe her ankommt.

Wo der Vergleich hinkt: Wechselkurse sind fest; Ableitungen gelten nur am aktuellen Punkt und ändern sich mit den Werten.

## Lokale gegen globale Gradienten

Schreibe jede Operation als Knoten des Rechengraphen. Für $z = x \cdot w$ gilt lokal $\partial z / \partial x = w$ und $\partial z / \partial w = x$. Kommt von oben der Upstream-Gradient $\partial L / \partial z$, dann ist

$$\frac{\partial L}{\partial x} = \frac{\partial L}{\partial z} \cdot \frac{\partial z}{\partial x}.$$

Das ist die ganze Mechanik: **lokal mal upstream**. Über einen Pfad mit Kanten $g_1, g_2, \dots, g_k$ multiplizieren sich die Beiträge zum Produkt $g_1 \cdot g_2 \cdots g_k$. Gabelt sich ein Pfad, etwa geht $x$ in zwei Zweige, die beide in $L$ münden, werden die Beiträge **addiert**.

## Backward-Pass für ein 2-Schicht-MLP

Netz wie in der Lektion [Tensorformen als Vertrag lesen](#/lesson/l-dl-tensors): $H = \mathrm{ReLU}(XW_1 + b_1)$, $\hat{y} = HW_2 + b_2$, Verlust $L = \frac{1}{n}\sum_i (\hat{y}_i - y_i)^2$ ([MSE](#/glossary/mse), Regression mit einer Ausgabe). Rückwärts, Schritt für Schritt:

```python
delta2 = (2.0 / n) * (y_hat - y)          # dL/d(y_hat), Form (n, 1)
dW2 = H.T @ delta2                        # (h1, 1)
db2 = delta2.sum(axis=0)                  # (1,)
delta1 = (delta2 @ W2.T) * (H > 0)        # ReLU-Maske: 1 wo H > 0, sonst 0
dW1 = X.T @ delta1                        # (d, h1)
db1 = delta1.sum(axis=0)                  # (h1,)
```

Drei Muster, die du wiedererkennen solltest:

1. **Jedes `dW = Input.T @ delta`** folgt aus den Formen. Für $H = XW$ gilt $dW_{ij} = \sum_n X_{ni}\,\delta_{nj}$: Jeder [Eintrag](#/glossary/eintrag) verbindet **Spalte** $i$ von $X$ (Merkmal $i$ über alle Beispiele) mit Spalte $j$ von $\delta$, summiert über die Batch-Achse. Die Formen bestätigen es: $(d, n) \cdot (n, h) = (d, h)$, genau die Form von $W$. `.T` transponiert die Matrix (Zeilen werden Spalten).
2. **Der Bias sammelt die Deltas über die Batch-Achse**: `delta.sum(axis=0)` addiert über die Zeilen, weil derselbe Bias auf alle $n$ Beispiele wirkt.
3. **ReLU leitet den Gradienten nur dort weiter, wo die Aktivierung positiv war**, als Multiplikation mit der [Maske](#/glossary/maske) $(H > 0)$.

## Der numerische Gegencheck

Analytische Gradienten kann jeder falsch hinschreiben. Die unabhängige Instanz ist die **zentrale Differenz** in float64:

$$f'(x) \approx \frac{f(x + h) - f(x - h)}{2h}, \qquad h = 10^{-5}.$$

Baue den Check als [Funktion](#/glossary/funktion) des Gewichts: $f(W_1) = L(\mathrm{forward}(X, W_1, b_1, W_2, b_2), y)$, variiere einen einzigen Eintrag und vergleiche mit dem analytischen Wert. Toleranzen: `np.allclose(..., atol=1e-6, rtol=1e-4)`. Zwei Fallen: Liegt eine Vor-Aktivierung näher als $h$ an $0$, kippt die [ReLU](#/glossary/relu)-Maske zwischen $x + h$ und $x - h$, und der numerische Check misst einen Knick statt der Steigung. Und einseitige Differenzen sind zu ungenau, immer zentral differenzieren. Dieser Check lebt im Testcode, nicht im Modellcode.

## Wo dir das in der KI begegnet

`loss.backward()` in PyTorch macht genau diesen Rückwärtsdurchlauf für alle [Parameter](#/glossary/parameter-modell); er kostet grob so viel wie zwei Vorwärtsdurchläufe. Hier implementierst du die Gradienten selbst in NumPy; der numerische Check im Test ist die Kontrollinstanz.

## Typische Fehler

- Upstream-Gradient vergessen: Der lokale Gradient allein ist nicht $\partial L / \partial x$.
- An Gabelungen nur einen Zweig beitragen lassen statt zu summieren.
- Die ReLU-Ableitung als $H$ statt als Maske $(H > 0)$ schreiben.
- Faktor $2/n$ des MSE verlieren oder das $1/n$ doppelt nehmen.
- Numerischen Check an einem Knick fahren (Vor-Aktivierung nahe $0$) und einen intakten Gradienten fälschlich verwerfen.

## Direkter Check

Rechne in einer Einstiegsaufgabe Kettenregelprodukte und Gabelungen in Ganzzahlen. Trace in der [Kernaufgabe: Backward-Schritt-Trace](#/family/trace-assignment-state/manual-backward-step-trace/0/core) einen manuellen Backward-Schritt. In der [Kernaufgabe: Gradienten linearer Schichten](#/family/optimize-backprop-gradient-check/linear-mse-gradients/0/core) leitest du die Gradienten einer linearen Schicht her und prüfst sie numerisch; die [Vertiefungsaufgabe: Volles MLP-Backprop](#/family/optimize-backprop-gradient-check/mlp-backprop-relu-mse/0/stretch) verlangt das volle MLP-Backprop, und die [Herausforderung](#/family/optimize-sgd-step-pure-update/pure-train-step/0/challenge) kombiniert Forward, Backward und SGD-Schritt zu einem Trainings-Teilschritt.

## Begriffe auf einen Blick

- **Rechengraph** (englisch *computation graph*): das Netz der Operationen; jeder Knoten kennt seine lokalen Ableitungen.
- **Lokaler Gradient** (englisch *local gradient*): Ableitung einer Operation nach ihren direkten Eingaben.
- **Upstream-Gradient**: der Gradient, der von der Ausgabe her an einen Knoten ankommt.
- **Kettenregel** (englisch *chain rule*): Ableitung einer verketteten Funktion ist das Produkt der äußeren und inneren Ableitung.
- **Backpropagation**: der organisierte Rückwärtsdurchlauf, der die Kettenregel über den ganzen Graphen anwendet.
- **ReLU-Maske** (englisch *ReLU mask*): $(H > 0)$ als Faktor; lässt den Gradienten nur an positiven Vor-Aktivierungen durch.
- **Forward-Pass**: der Vorwärtsdurchlauf von Eingabe zu Verlust.
- **Backward-Pass**: der Rückwärtsdurchlauf vom Verlust zu allen Parametern.
