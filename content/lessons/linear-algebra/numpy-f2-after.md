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
- **Singulär** (englisch *singular*): quadratische Matrix mit abhängigen Zeilen oder Spalten; Determinante 0, Rang kleiner als die Zeilenzahl, `solve` wirft `LinAlgError`.
