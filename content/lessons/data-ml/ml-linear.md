# Lineare Regression: Fit, Fehlermaße und Residuenanalyse

Wie schätzt du den Preis einer Wohnung, ohne sie zu kennen? Diese Lektion zeigt, wie ein lineares Modell einen Grundpreis plus Preis pro Quadratmeter lernt, wie du den Schätzfehler misst und wie ein Bild der Fehler verrät, was dem Modell fehlt.

## Das Bild dahinter: Wohnungspreis und Dartscheibe

Das lineare Modell rechnet wie ein Makler im Kopf: Grundpreis plus Preis pro Quadratmeter mal Fläche. Der Grundpreis ist der **Achsenabschnitt** (englisch *intercept*) $w_0$, der Preis pro Quadratmeter der **Koeffizient** $w_1$. Für ein Apartment mit 60 m² und $w_0 = 200\,\text{€}$, $w_1 = 10\,\text{€}$ schätzt das Modell $200 + 10 \cdot 60 = 800$ €.

Allgemein heißt die Vorhersage:

$$
\hat{y} = w_0 + w_1 x_1 + \dots + w_d x_d.
$$

Das **Residuum** (englisch *residual*) ist der Schätzfehler einer einzelnen Wohnung: $r_i = y_i - \hat{y}_i$ (wahrer Preis minus Schätzung). Der **Residuenplot**, Residuen gegen die Vorhersage aufgetragen, liest du wie Dartwürfe an einer Scheibe: Zufällige Streuung um die Mitte ist gut; ein systematischer Zug nach links oder rechts heißt, dem Modell fehlt ein Merkmal.

Wo der Vergleich hinkt: Echte Preise wachsen nicht linear, eine Wohnung im Zentrum kostet pro m² mehr als eine am Rand, und einzelne Ausreißer können das Bild verzerren.

## Design-Matrix und geschlossene Lösung

Um den Achsenabschnitt $w_0$ mitzurechnen, wird aus der Datentabelle die **Design-Matrix**: Eine [Matrix](#/glossary/matrix) $A$, deren erste Spalte nur Einsen enthält und deren übrige Spalten die Merkmale sind. Die beste Gerade im Sinne der kleinsten Quadrate liefert `np.linalg.lstsq` direkt, ohne Iteration.

## Fehlermaße von Hand

Gegeben vier Testpunkte mit Ziel $y$ und Vorhersage $\hat{y}$:

| $i$ | $y_i$ | $\hat{y}_i$ | Residuum $r_i = y_i - \hat{y}_i$ |
|---|---|---|---|
| 1 | 2 | 3 | $-1$ |
| 2 | 4 | 3 | $1$ |
| 3 | 6 | 7 | $-1$ |
| 4 | 8 | 7 | $1$ |

Der **MSE** ist der Mittelwert der quadrierten Residuen:

$$
\mathit{MSE} = \tfrac{1}{4}\left((-1)^2 + 1^2 + (-1)^2 + 1^2\right) = 1.
$$

Der **RMSE** ist die Quadratwurzel des MSE und liegt damit wieder in der Einheit des Ziels: $\mathit{RMSE} = \sqrt{1} = 1$ Euro, Sekunde, was auch immer das Ziel misst. Für das **Bestimmtheitsmaß** $R^2$ brauchst du den Mittelwert $\bar{y} = 5$ (sprich: y quer):

$$
\mathit{SS}_{\text{tot}} = (2-5)^2 + (4-5)^2 + (6-5)^2 + (8-5)^2 = 9+1+1+9 = 20,
$$

Dabei ist $\mathit{SS}_{\text{tot}}$ die Streuung der wahren Werte um ihren Mittelwert und $\mathit{SS}_{\text{res}}$ die Summe der quadrierten Residuen:

$$
\mathit{SS}_{\text{res}} = (-1)^2 + 1^2 + (-1)^2 + 1^2 = 4.
$$

Damit gilt:

$$
R^2 = 1 - \frac{\mathit{SS}_{\text{res}}}{\mathit{SS}_{\text{tot}}} = 1 - \frac{4}{20} = 0{,}8.
$$ $R^2 = 0{,}8$ heißt: Von der Streuung, die ein Modell lässt, das immer den Mittelwert rät, erklärt dieses Modell 80 %. Gerechnet wird das auf dem Testset, nicht auf den Trainingsdaten.

## Fit mit lstsq

Für Punkte $(1,3), (2,5), (3,7), (4,9)$ liegt die Gerade $y = 1 + 2x$ exakt auf allen Punkten. Mit NumPy:

```python
A = np.hstack([np.ones((4, 1)), X])      # Design-Matrix mit Einsen-Spalte
w, _, _, _ = np.linalg.lstsq(A, y, rcond=None)
# w = [1., 2.]
```

`lstsq` löst das Kleinste-Quadrate-Problem direkt. Vergleiche das Ergebnis mit deinem [Gradientenabstieg](#/glossary/gradient) aus der Lektion [Gradienten von Hand herleiten](#/lesson/l-grad-regression): Beide müssen auf dasselbe $w$ konvergieren.

## Residuenanalyse

Ein Zahlenwert allein zeigt nicht, *wo* das Modell systematisch scheitert. Trage die Residuen gegen die Vorhersage auf und suche Muster:

- **Trend**: Die Residuen liegen für kleine Vorhersagen systematisch unter null und für große darüber (oder umgekehrt), das Modell ist zu einfach, ein Term fehlt.
- **Trichterform**: Die Residuen fächern mit wachsender Vorhersage auf, die Fehlerstreuung ist nicht konstant, und der MSE wird von großen Werten dominiert.
- **Ausreißer**: Einzelne extrem große Residuen ziehen MSE und RMSE stark; prüfe sie einzeln, bevor du das Modell änderst.

## Wo dir das in der KI begegnet

Eine [lineare Schicht](#/glossary/lineare-schicht) ist lineare Regression mit vielen Ausgängen. Die letzte Schicht von GPT-2 bildet die 768 Zahlen eines Tokens auf 50 257 Werte ab, einen pro möglichem nächsten Token.

## Typische Fehler

- MSE und RMSE verwechseln und die Einheit des Fehlers falsch angeben: Der MSE ist quadriert, der RMSE nicht.
- $R^2$ auf den Trainingsdaten berechnen und als Generalisierung ausgeben.
- Den Achsenabschnitt vergessen und ohne Einsen-Spalte fitten.
- Nur den MSE-Wert betrachten und das Residuen-Diagramm weglassen.
- Ausreißer kommentarlos löschen, obwohl sie Datenfehler oder gerade die interessanten Fälle sein können.

## Direkter Check

Berechne in einer Einstiegsaufgabe einen MSE aus Residuen und in einer weiteren Einstiegsaufgabe ein $R^2$ in Prozent. Die volle Kette Fit, RMSE und $R^2$ implementierst du in der [Kernaufgabe: fit-rmse-r2-Kette](#/family/fit-predict-metrics/linear-fit-lstsq/0/core), und die [Vertiefungsaufgabe: Regressionsbericht](#/family/fit-predict-metrics/regression-report/0/stretch) verlangt einen Regressionsbericht mit Train/Test-Vergleich und Residuenmittel.

## Begriffe auf einen Blick

- **Achsenabschnitt** (englisch *intercept*): Grundpreis des Modells $w_0$, der Wert bei allen Merkmalen gleich null.
- **Koeffizient** (englisch *coefficient*): die Zahl, die vor einer Variablen steht und sie multipliziert.
- **Design-Matrix**: Datentabelle plus Einsen-Spalte, damit der Achsenabschnitt mitgerechnet wird.
- **Residuum** (englisch *residual*): Abstand $y_i - \hat{y}_i$ eines Punkts von der Vorhersage.
- **MSE** (englisch *mean squared error*): mittlerer quadratischer Fehler, $\frac{1}{n}\sum_i (\hat y_i - y_i)^2$.
- **RMSE** (englisch *root mean squared error*): Quadratwurzel des MSE; liegt wieder in der Einheit des Ziels.
- **Bestimmtheitsmaß $R^2$**: Anteil der Streuung, den das Modell gegenüber dem Mittelwert erklärt; $1 - \mathit{SS}_{\text{res}}/\mathit{SS}_{\text{tot}}$.
