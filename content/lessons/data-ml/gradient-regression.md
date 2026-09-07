# Gradientenabstieg und lineare Regression

## Ableitung als Steigungsrate

Die **Ableitung** $f'(x)$ ist die Steigungsrate von $f$ an der Stelle $x$: Wenn du einen winzigen Schritt $\mathrm{d}x$ nach rechts gehst, ändert sich $f$ um etwa $f'(x)\cdot \mathrm{d}x$. Für $f(x) = x^2$ gilt $f'(x) = 2x$: Bei $x=3$ ist die Steigung $6$ — die Funktion wächst dort sechsmal so schnell wie das Argument.

Bei Funktionen mehrerer Variablen heißt der Vektor der partiellen Ableitungen **Gradient** $\nabla f$. Er zeigt in die Richtung des stärksten Anstiegs; das Minimum liegt in Gegenrichtung.

## MSE und sein Gradient — Schritt für Schritt

Das lineare Modell $\hat{y}_i = w x_i + b$ wird über den mittleren quadrierten Fehler bewertet:

$$\mathrm{MSE}(w, b) = \frac{1}{n}\sum_{i=1}^{n}\left(\hat{y}_i - y_i\right)^2.$$

Schreibe das **Residuum** als $r_i = w x_i + b - y_i$. Ableiten nach der Kettenregel, zuerst nach $w$:

1. Äußere Ableitung von $r_i^2$ nach $r_i$: $2 r_i$.
2. Innere Ableitung von $r_i$ nach $w$: $x_i$ (denn $\frac{\partial}{\partial w}(w x_i + b - y_i) = x_i$; der Summand $b$ fällt weg).
3. Kombiniert und gemittelt:

$$\frac{\partial \mathrm{MSE}}{\partial w} = \frac{2}{n}\sum_{i=1}^{n} x_i\, r_i.$$

Analog nach $b$, wo die innere Ableitung von $r_i$ gleich $1$ ist:

$$\frac{\partial \mathrm{MSE}}{\partial b} = \frac{2}{n}\sum_{i=1}^{n} r_i.$$

Der einzige Unterschied zwischen beiden Formeln ist der Faktor $x_i$ im Summanden.

## Durchgerechnetes Beispiel: zwei Abstiegsschritte

Punkte $(1|3)$ und $(3|7)$ — die wahre Gerade ist $y = 2x + 1$. Start bei $w = 0$, $b = 0$, Lernrate $\mathrm{lr} = 0{,}05$.

Schritt 1: Residuen $r = (0\cdot1 - 3,\ 0\cdot3 - 7) = (-3, -7)$.

$$\frac{\partial \mathrm{MSE}}{\partial w} = \frac{2}{2}\left(1\cdot(-3) + 3\cdot(-7)\right) = -24, \qquad \frac{\partial \mathrm{MSE}}{\partial b} = \frac{2}{2}\left(-3 - 7\right) = -10.$$

Update entgegen dem Gradienten:

$$w \leftarrow 0 - 0{,}05\cdot(-24) = 1{,}2, \qquad b \leftarrow 0 - 0{,}05\cdot(-10) = 0{,}5.$$

Schritt 2: Residuen $r = (1{,}2 + 0{,}5 - 3,\ 3{,}6 + 0{,}5 - 7) = (-1{,}3, -2{,}9)$.

$$\frac{\partial \mathrm{MSE}}{\partial w} = 1\cdot(-1{,}3) + 3\cdot(-2{,}9) = -10, \qquad \frac{\partial \mathrm{MSE}}{\partial b} = -1{,}3 - 2{,}9 = -4{,}2.$$

$$w \leftarrow 1{,}2 + 0{,}5 = 1{,}7, \qquad b \leftarrow 0{,}5 + 0{,}21 = 0{,}71.$$

| Schritt | $w$ | $b$ | $\partial_w$ | $\partial_b$ |
|---|---|---|---|---|
| 0 | 0 | 0 | $-24$ | $-10$ |
| 1 | 1,2 | 0,5 | $-10$ | $-4{,}2$ |
| 2 | 1,7 | 0,71 | kleiner | kleiner |

Die Gradienten schrumpfen, weil sich $w$ und $b$ dem Optimum $(2, 1)$ nähern — dort sind beide null.

## Numerischer Gradientencheck

Ob eine implementierte Ableitung stimmt, prüfst du ohne Algebra mit der zentralen Differenz:

$$f'(x) \approx \frac{f(x+h) - f(x-h)}{2h}.$$

Beispiel $f(x) = x^2$ bei $x = 3$ mit $h = 0{,}01$:

$$\frac{3{,}01^2 - 2{,}99^2}{0{,}02} = \frac{9{,}0601 - 8{,}9401}{0{,}02} = \frac{0{,}12}{0{,}02} = 6 = f'(3).$$

Die zentrale Differenz hat Fehler $\mathcal{O}(h^2)$: halbiere $h$, viertelt sich der Fehler. Ein $h$ um $10^{-6}$ ist ein guter Kompromiss — zu große $h$ verfälschen die Steigung, zu kleine führen zu Auslöschung im Zähler.

## Referenz: Kleinste-Quadrate über lstsq

Die lineare Regression hat für kleine Datenmengen eine geschlossene Form: Die beste Gerade ist die **Projektion** der $y$-Werte auf den von $x$ und dem Einsvektor aufgespannten Raum (MIT 18.06, Lecture 16). In NumPy liefert `np.linalg.lstsq` diese Referenzlösung direkt:

```python
A = np.vstack([x, np.ones_like(x)]).T
coef, _, _, _ = np.linalg.lstsq(A, y, rcond=None)
```

Weil der MSE eine konvexe quadratische Funktion ist, konvergiert sorgfältiger Gradientenabstieg gegen genau diese Lösung — der Abgleich mit `lstsq` ist dein Korrektheitscheck, nicht die Definition des Lernens.

## Typische Fehler

- Update mit $+$ statt $-$: $w \leftarrow w + \mathrm{lr}\cdot\mathrm{grad}$ wandert den Berg hinauf, weg vom Minimum.
- In $\partial_b$ den Faktor $x_i$ übernommen oder in $\partial_w$ vergessen — beide Formeln unterscheiden sich genau darin.
- Lernrate zu groß gewählt: die Schritte springen über das Minimum hinaus und divergieren.
- Im Gradientencheck $h$ zu groß (Verzerrung) oder zu klein (Auslöschung), oder die einseitige Differenz $[f(x+h)-f(x)]/h$ mit der zentralen verwechselt.
- Die Konvention $\frac{1}{n}$ mit $\frac{1}{2n}$ vermischt — der Gradient unterscheidet sich dann um den Faktor 2, der Abstieg bleibt zwar richtig gerichtet, Vergleichswerte stimmen aber nicht.

## Direkter Check

Bearbeite [Beim Gradientenabstieg auf den MSE ist der Gradient bzgl. $w$ aktuell $+4$ und …](#/family/optimize-gradient-update-rule/sign-and-scale-of-update/0/intro) (Update-Regel), dann die Abrufinstanz dieser Lektion. Sage die Ausgabe der Abstiegsschleife in [Abstiegsschleife lesen: Was gibt dieses Programm aus? Sage die Ausgabe von …](#/family/trace-assignment-state/gradient-loop-two-updates/0/core) vorher, implementiere `grad_mse` und `num_grad` mit Übereinstimmung unter $10^{-6}$ in [Implementiere zwei Funktionen. grad_mse(w, b, x, y) bekommt Modellparameter …](#/family/optimize-mse-gradient-closed-form/grad-mse-numpy-reference/0/core) und schließe mit dem Abgleich gegen `lstsq` in [Final Boss Regression aus Grundoperationen: Implementiere fit_linear(x, y, lr, …](#/family/optimize-gradient-update-rule/fit-linear-gradient-loop/0/stretch) ab.
