# Gradientenabstieg und lineare Regression

Jedes Sprachmodell wird mit einer Variante des Verfahrens aus dieser Lektion trainiert. Hier lernst du es an der kleinsten Bühne, die alles zeigt: eine Gerade an zwei Punkte anpassen, von Hand, mit kontrollierbarem Ergebnis.

## Das Bild dahinter: Wanderer im Nebel

Stell dir einen Wanderer im Nebel auf einem Hang vor. Er sieht das Tal nicht, spürt aber unter den Füßen, in welcher Richtung es bergauf geht: Das ist der Gradient. Er geht ein Stück bergab und misst neu. Wie groß seine Schritte sind, bestimmt die Lernrate. Für die lineare Regression mit dem mittleren quadrierten Fehler ist die Landschaft eine Schüssel: Es gibt genau ein Tal, und jeder bergab gerichtete Weg führt dorthin.

Wo der Vergleich hinkt: Bei neuronalen Netzen ist die Landschaft keine Schüssel, es gibt viele Täler, und statt zwei Richtungen gibt es Millionen. Der Wanderer findet ein Tal, nicht unbedingt das beste.

## Ableitung als Steigungsrate

Die **Ableitung** $f'(x)$ (sprich: f Strich von x) ist die Steigung von $f$ an der Stelle $x$. Ist $f(t)$ der zurückgelegte Weg nach der Zeit $t$, dann ist $f'(t)$ die Geschwindigkeit, die der Tacho genau in diesem Moment anzeigt. Gehst du einen winzigen Schritt $\mathrm{d}x$ (sprich: d x, ein sehr kleiner Zuwachs) nach rechts, ändert sich $f$ um etwa $f'(x)\cdot \mathrm{d}x$. Für $f(x) = x^2$ gilt $f'(x) = 2x$: Bei $x=3$ ist die Steigung $6$.

Hat die [Funktion](#/glossary/funktion) mehrere [Variablen](#/glossary/variable), misst die **partielle Ableitung** $\frac{\partial f}{\partial w}$ (sprich: partielle Ableitung von f nach w) die Steigung in Richtung $w$ bei festgehaltenen anderen Variablen. Der Vektor aller partiellen Ableitungen heißt **Gradient** $\nabla f$ (sprich: Nabla f) und zeigt in die Richtung des stärksten Anstiegs; bergab geht es entgegengesetzt.

## MSE und sein Gradient, Schritt für Schritt

Das lineare Modell lautet $\hat{y}_i = w x_i + b$ (sprich: y-Dach, die Vorhersage). Der mittlere quadratische Fehler, kurz **MSE**, ist:

$$\mathrm{MSE}(w, b) = \frac{1}{n}\sum_{i=1}^{n}\left(\hat{y}_i - y_i\right)^2.$$

Dabei ist $\sum$ (sprich: Summe) das Summenzeichen und $\frac{1}{n}$ der Mittelwert über die $n$ Punkte. Das Quadrat sorgt dafür, dass positive und negative Fehler sich nicht aufheben und vergleichbar werden, ein Fehler von $-2$ zählt so viel wie $+2$.

Nenne den einzelnen Fehler $e_i = \hat{y}_i - y_i = w x_i + b - y_i$. Zur Vorzeichenfrage: In der Lektion [Fit und Fehlermaße berechnen](#/lesson/l-ml-linear) heißt die umgekehrte Differenz $y_i - \hat{y}_i$ **Residuum**; dort misst sie, wie weit der wahre Wert über der Vorhersage liegt. Für den Gradienten hier ist $e_i$ bequemer, weil die innere Ableitung dann positiv ist, im Quadrat macht das Vorzeichen ohnehin keinen Unterschied.

Ableiten nach der Kettenregel (äußere Ableitung mal innere Ableitung), zuerst nach $w$:

1. Äußere Ableitung von $e_i^2$ nach $e_i$: $2\, e_i$.
2. Innere Ableitung von $e_i$ nach $w$: $x_i$, denn in $w x_i + b - y_i$ ist $w$ mit $x_i$ multipliziert; die Summanden $b$ und $y_i$ fallen weg.
3. Kombiniert und gemittelt:

$$\frac{\partial \mathrm{MSE}}{\partial w} = \frac{2}{n}\sum_{i=1}^{n} x_i\, e_i.$$

Analog nach $b$, wo die innere Ableitung von $e_i$ gleich $1$ ist:

$$\frac{\partial \mathrm{MSE}}{\partial b} = \frac{2}{n}\sum_{i=1}^{n} e_i.$$

Der einzige Unterschied zwischen beiden Formeln ist der Faktor $x_i$ im Summanden. Das Update lautet $w \leftarrow w - \eta\,\frac{\partial \mathrm{MSE}}{\partial w}$ (sprich: w wird neu gesetzt auf w minus eta mal Gradient) und ebenso für $b$; $\eta$ (sprich: eta) ist die **Lernrate**.

## Durchgerechnetes Beispiel: zwei Abstiegsschritte

Punkte $(1|3)$ und $(3|7)$, die wahre Gerade ist $y = 2x + 1$. Start bei $w = 0$, $b = 0$, Lernrate $\eta = 0{,}05$.

Schritt 1: Fehler $e = (0\cdot1 - 3,\ 0\cdot3 - 7) = (-3, -7)$.

$$\frac{\partial \mathrm{MSE}}{\partial w} = \frac{2}{2}\left(1\cdot(-3) + 3\cdot(-7)\right) = -24, \qquad \frac{\partial \mathrm{MSE}}{\partial b} = \frac{2}{2}\left(-3 - 7\right) = -10.$$

Update entgegen dem Gradienten:

$$w \leftarrow 0 - 0{,}05\cdot(-24) = 1{,}2, \qquad b \leftarrow 0 - 0{,}05\cdot(-10) = 0{,}5.$$

Schritt 2: Fehler $e = (1{,}2 + 0{,}5 - 3,\ 3{,}6 + 0{,}5 - 7) = (-1{,}3, -2{,}9)$.

$$\frac{\partial \mathrm{MSE}}{\partial w} = 1\cdot(-1{,}3) + 3\cdot(-2{,}9) = -10, \qquad \frac{\partial \mathrm{MSE}}{\partial b} = -1{,}3 - 2{,}9 = -4{,}2.$$

$$w \leftarrow 1{,}2 + 0{,}5 = 1{,}7, \qquad b \leftarrow 0{,}5 + 0{,}21 = 0{,}71.$$

| Schritt | $w$ | $b$ | $\partial_w$ | $\partial_b$ |
|---|---|---|---|---|
| 0 | 0 | 0 | $-24$ | $-10$ |
| 1 | 1,2 | 0,5 | $-10$ | $-4{,}2$ |
| 2 | 1,7 | 0,71 | kleiner | kleiner |

Die Gradienten schrumpfen, weil sich $w$ und $b$ dem Optimum $(2, 1)$ nähern; dort sind beide null.

## Numerischer Gradientencheck

Ob eine implementierte Ableitung stimmt, prüfst du ohne Algebra mit der zentralen Differenz:

$$f'(x) \approx \frac{f(x+h) - f(x-h)}{2h}.$$

Beispiel $f(x) = x^2$ bei $x = 3$ mit $h = 0{,}01$:

$$\frac{3{,}01^2 - 2{,}99^2}{0{,}02} = \frac{9{,}0601 - 8{,}9401}{0{,}02} = \frac{0{,}12}{0{,}02} = 6 = f'(3).$$

Halbierst du $h$, viertelt sich der Fehler der Näherung. Ein $h$ um $10^{-5}$ ist ein guter Kompromiss: Zu große $h$ verfälschen die Steigung, zu kleine löschen den Zähler durch Rundung aus.

## Referenz: Kleinste-Quadrate über lstsq

Für kleine Datenmengen hat die lineare Regression eine **geschlossene Lösung**: eine Formel, die das beste $(w, b)$ direkt liefert, ohne Schritte. Geometrisch ist das die Projektion der $y$-Werte auf den Raum, den die Spalte $x$ und der Einsvektor aufspannen. In NumPy liefert `np.linalg.lstsq` diese Referenz:

```python
A = np.vstack([x, np.ones_like(x)]).T
coef, _, _, _ = np.linalg.lstsq(A, y, rcond=None)
```

Weil der MSE eine konvexe quadratische Funktion ist, konvergiert sorgfältiger Gradientenabstieg gegen genau diese Lösung; der Abgleich mit `lstsq` ist dein Korrektheitscheck, nicht die Definition des Lernens.

## Wo dir das in der KI begegnet

Große Sprachmodelle werden mit Varianten des Gradientenabstiegs trainiert, etwa Adam: Die Idee „gegen den Gradienten, Schritt mal Lernrate“ ist dieselbe, nur über Milliarden Parameter statt zwei. Die Gradienten selbst liefert die Backpropagation, die du in der Lektion [Rechengraphen lesen und Gradienten trennen](#/lesson/l-dl-autograd) kennenlernst.

## Typische Fehler

- Update mit $+$ statt $-$: $w \leftarrow w + \eta\cdot\nabla$ wandert den Berg hinauf, weg vom Minimum.
- In $\partial_b$ den Faktor $x_i$ übernommen oder in $\partial_w$ vergessen, beide Formeln unterscheiden sich genau darin.
- Lernrate zu groß gewählt: Die Schritte springen über das Minimum hinaus und divergieren.
- Im Gradientencheck $h$ zu groß (Verzerrung) oder zu klein (Auslöschung), oder die einseitige Differenz $[f(x+h)-f(x)]/h$ mit der zentralen verwechselt.
- Die Konvention $\frac{1}{n}$ mit $\frac{1}{2n}$ vermischt, der Gradient unterscheidet sich dann um den Faktor 2, der Abstieg bleibt richtig gerichtet, Vergleichswerte stimmen aber nicht.

## Direkter Check

Bearbeite die [Einstiegsaufgabe: Update-Regel](#/family/optimize-gradient-update-rule/sign-and-scale-of-update/0/intro) (Update-Regel), dann die Abrufinstanz dieser Lektion. Sage die Ausgabe der Abstiegsschleife in der [Kernaufgabe: Abstiegsschleife lesen](#/family/trace-assignment-state/gradient-loop-two-updates/0/core) vorher, implementiere `grad_mse` und `num_grad` mit Übereinstimmung unter $10^{-6}$ in der [Kernaufgabe: grad_mse und num_grad](#/family/optimize-mse-gradient-closed-form/grad-mse-numpy-reference/0/core) und schließe mit dem Abgleich gegen `lstsq` in der [Vertiefungsaufgabe: Regression aus Grundoperationen](#/family/optimize-gradient-update-rule/fit-linear-gradient-loop/0/stretch) ab.

## Begriffe auf einen Blick

- **Ableitung** (englisch *derivative*): Steigung einer Funktion an einer Stelle; misst, wie stark sich der Funktionswert bei einem kleinen Schritt ändert.
- **Partielle Ableitung** (englisch *partial derivative*): Ableitung nach einer Variablen, während alle anderen festgehalten werden; Zeichen $\partial$.
- **Gradient**: Vektor aller partiellen Ableitungen; zeigt in die Richtung des stärksten Anstiegs.
- **MSE** (englisch *mean squared error*): mittlerer quadratischer Fehler, $\frac{1}{n}\sum_i (\hat y_i - y_i)^2$.
- **Lernrate** (englisch *learning rate*): Schrittgröße des Gradientenabstiegs, Symbol $\eta$.
- **Residuum** (englisch *residual*): Abstand $y_i - \hat{y}_i$ eines Punkts von der Vorhersage.
- **Geschlossene Lösung** (englisch *closed-form solution*): Formel, die das Optimum direkt liefert, ohne iterative Schritte.
- **Zentrale Differenz** (englisch *central difference*): Näherung $f'(x) \approx \frac{f(x+h)-f(x-h)}{2h}$ zum Prüfen implementierter Ableitungen.
