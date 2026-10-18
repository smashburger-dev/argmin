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
