# Backpropagation als Kettenregel im Rechengraph

Backpropagation ist kein Zauber, sondern die Kettenregel, organisiert als Durchlauf durch einen **Rechengraphen**. Jede Operation kennt nur ihre eigene Umgebung: ihren lokalen Gradienten. Die globale Frage — wie stark hängt der Verlust $L$ von einem frühen Gewicht ab? — beantwortet der Graph durch Weiterreichen von Gradienten rückwärts.

## Lokale gegen globale Gradienten

Schreibe jede Operation als Knoten. Für $z = x \cdot w$ gilt lokal $\partial z / \partial x = w$ und $\partial z / \partial w = x$. Kommt von oben der **Upstream-Gradient** $\partial L / \partial z$, dann ist

$$\frac{\partial L}{\partial x} = \frac{\partial L}{\partial z} \cdot \frac{\partial z}{\partial x}.$$

Das ist die ganze Mechanik: **lokal mal upstream**. Über einen Pfad mit Kanten $g_1, g_2, \dots, g_k$ multiplizieren sich die Beiträge zum Produkt $g_1 \cdot g_2 \cdots g_k$. Gabelt sich ein Pfad — etwa geht $x$ in zwei Zweige, die beide in $L$ münden — werden die Beiträge **addiert**: die Gesamtänderung ist die Summe aller Wege, auf denen $x$ wirkt.

## Backward-Pass für ein 2-Layer-MLP

Netz wie in Woche 18: $H = \mathrm{ReLU}(XW_1 + b_1)$, $\hat{y} = HW_2 + b_2$, Verlust $L = \frac{1}{n}\sum_i (\hat{y}_i - y_i)^2$ (MSE, Regression mit einer Ausgabe). Rückwärts, Schritt für Schritt:

```python
delta2 = (2.0 / n) * (y_hat - y)          # dL/d(y_hat), Form (n, 1)
dW2 = H.T @ delta2                        # (h1, 1)
db2 = delta2.sum(axis=0)                  # (1,)
delta1 = (delta2 @ W2.T) * (H > 0)        # ReLU-Maske: 1 wo H > 0, sonst 0
dW1 = X.T @ delta1                        # (d, h1)
db1 = delta1.sum(axis=0)                  # (h1,)
```

Drei Muster, die du wiedererkennen solltest: Jedes `dW = Input.T @ delta` ist die Transponierte des Forward-Pakts; der Bias sammelt die Deltas über die Batch-Achse; ReLU leitet seinen Gradienten nur dort weiter, wo die Aktivierung positiv war — als Multiplikation mit der Maske $(H > 0)$.

## Der numerische Gegencheck

Analytische Gradienten kann jeder falsch hinschreiben. Die unabhängige Instanz ist die **zentrale Differenz** in float64:

$$f'(x) \approx \frac{f(x + h) - f(x - h)}{2h}, \qquad h = 10^{-5}.$$

Baue den Check als Funktion des Gewichts: $f(W_1) = L(\mathrm{forward}(X, W_1, b_1, W_2, b_2), y)$, variieren eines einzigen Eintrags, Vergleich mit dem analytischen Wert. Toleranzen: `np.allclose(..., atol=1e-6, rtol=1e-4)`. Zwei Fallen: Eingaben knicken nicht bei $h$-Verschiebung (Vor-Aktivierungen weit genug weg von $0$, damit die ReLU-Maske stabil bleibt), und einseitige Differenzen sind zu ungenau — immer zentral differenzieren. Dieser Check lebt im Testcode, nicht im Modellcode.

## Ehrliche Einordnung: Framework-Autograd

`torch.autograd` baut genau diesen Graphen automatisch auf und ruft `.backward()` für dich. Das zu **lesen** und seine Ausgaben vorherzusagen ist eine eigene Kompetenz — aber kein Framework läuft in dieser Plattform im Browser. Hier gilt wie in ADR-0013: Du implementierst analytische Gradienten selbst in NumPy, und der numerische Check im Test ist die Kontrollinstanz. Ein `Value`-Objekt-Graph im micrograd-Stil ist zusätzlich Lektüre-Material, keine Laufzeitumgebung.

## Typische Fehler

- Upstream-Gradient vergessen: lokaler Gradient allein ist nicht $\partial L / \partial x$.
- An Gabelungen nur einen Zweig beitragen lassen statt zu summieren.
- Die ReLU-Ableitung als $H$ statt als Maske $(H > 0)$ schreiben.
- Faktor $2/n$ des MSE verlieren oder das $1/n$ doppelt nehmen.
- Numerischen Check an einem Knick (Vor-Aktivierung nahe $0$) fahren und einen intakten Gradienten fälschlich verwerfen.

## Direkter Check

Rechne in [w19-e2](#/exercise/w19-e2) Kettenregelprodukte und Gabelungen in Ganzzahlen. Trace in [w19-e3](#/exercise/w19-e3) einen manuellen Backward-Schritt. In [w19-e4](#/exercise/w19-e4) leitest du die Gradienten eines linearen Layers her und prüfst sie numerisch; [w19-e5](#/exercise/w19-e5) verlangt das volle MLP-Backprop, und [w19-e6](#/exercise/w19-e6) kombiniert Forward, Backward und SGD-Schritt zu einem Trainings-Teilschritt.
