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

Die folgende Landschaft verwendet genau die beiden Punkte und die Lernrate dieses Rechenbeispiels. Der Akzent zeigt den Gradienten bergauf; die Spur entsteht durch Schritte entgegen seiner Richtung. Die Pfeile verwenden denselben Darstellungsfaktor für beide Komponenten. Das feine Kachelraster ist nur eine Render-Unterteilung, keine Aufteilung der Daten.

Die geschützte Übertragungsfrage nutzt dagegen die drei Punkte $(1|2)$, $(2|4)$ und $(3|6)$ mit festem $b=0$. Dort ist $\mathrm{MSE}(w)=\tfrac{14}{3}(w-2)^2$. Die Antwort prüft deren Ableitung, nicht den Funktionswert und nicht die beiden Punkte der räumlichen Ansicht.
