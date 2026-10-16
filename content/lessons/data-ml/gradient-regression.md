# Gradientenabstieg und lineare Regression

Jedes Sprachmodell wird mit einer Variante des Verfahrens aus dieser Lektion trainiert. Hier lernst du es an der kleinsten Bühne, die alles zeigt: eine Gerade an zwei Punkte anpassen, von Hand, mit kontrollierbarem Ergebnis.

## Das Bild dahinter: Wanderer im Nebel

Stell dir einen Wanderer im Nebel auf einem Hang vor. Er sieht das Tal nicht, spürt aber unter den Füßen, in welcher Richtung es bergauf geht: Das ist der Gradient. Er geht ein Stück bergab und misst neu. Wie groß seine Schritte sind, bestimmt die Lernrate. Für die lineare Regression mit dem mittleren quadrierten Fehler ist die Landschaft eine Schüssel: Es gibt genau ein Tal, und jeder bergab gerichtete Weg führt dorthin.

Wo der Vergleich hinkt: Bei neuronalen Netzen ist die Landschaft keine Schüssel, es gibt viele Täler, und statt zwei Richtungen gibt es Millionen. Der Wanderer findet ein Tal, nicht unbedingt das beste.

## Ableitung als Steigungsrate

Die Steigung zwischen zwei Punkten einer Kurve heißt **Sekantensteigung**. Für $f(x) = x^2$ zwischen $x_0$ und $x_0 + h$ beträgt sie

$$\frac{f(x_0 + h) - f(x_0)}{h} = \frac{(x_0 + h)^2 - x_0^2}{h} = 2x_0 + h.$$

Schiebst du $h$ gegen 0, läuft die Sekante auf die Tangente zu und ihre Steigung nähert sich der **Ableitung** $f'(x_0)$ (sprich: f Strich von x null), der Steigung von $f$ genau an der Stelle $x_0$:

| $x_0$ | $h$ | Sekantensteigung $2x_0 + h$ |
|---|---|---|
| 1 | 1 | 3 |
| 1 | 0,5 | 2,5 |
| 1 | 0,1 | 2,1 |
| 1 | → 0 | → 2 |

Der Grenzwert ist die Tangentensteigung: Für $f(x) = x^2$ gilt $\frac{\mathrm{d}}{\mathrm{d}x} x^2 = 2x$, bei $x_0 = 1$ also $f'(1) = 2$. Ist $f(t)$ der zurückgelegte Weg nach der Zeit $t$, dann ist $f'(t)$ die Geschwindigkeit, die der Tacho genau in diesem Moment anzeigt. Gehst du einen winzigen Schritt $\mathrm{d}x$ (sprich: d x, ein sehr kleiner Zuwachs) nach rechts, ändert sich $f$ um etwa $f'(x)\cdot \mathrm{d}x$.

Hat die [Funktion](#/glossary/funktion) mehrere [Variablen](#/glossary/variable), misst die **partielle Ableitung** $\frac{\partial f}{\partial w}$ (sprich: partielle Ableitung von f nach w) die Steigung, wenn nur $w$ sich bewegt und alle anderen Variablen festgehalten werden. An der MSE-Schüssel unten ist das ein vertikaler Schnitt parallel zur $w$-Achse: Aus der Schüssel wird eine gewöhnliche Parabel, deren Steigung du abliest. Der Vektor aller partiellen Ableitungen heißt **Gradient** $\nabla f$ (sprich: Nabla f) und zeigt in die Richtung des stärksten Anstiegs; bergab geht es entgegengesetzt.
