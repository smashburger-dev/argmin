# Lineare Regression: Fit, Fehlermaße und Residuenanalyse

Die lineare Regression sagt ein stetiges Ziel durch eine gewichtete Summe der Eingaben vorher:

$$
\hat{y} = w_0 + w_1 x_1 + \dots + w_d x_d.
$$

Die **Koeffizienten** $w$ werden so gewählt, dass die Summe der quadrierten Fehler klein wird — das ist das Kleinste-Quadrate-Kriterium aus der Gradientenwoche, jetzt in geschlossener Form über eine **Design-Matrix** $A$ mit vorangestellter Einsen-Spalte für den Intercept $w_0$.

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

Der **RMSE** ist die Quadratwurzel des MSE — er liegt wieder in der Einheit des Ziels: $\mathit{RMSE} = \sqrt{1} = 1$ Euro, Sekunde, was auch immer das Ziel misst. Für das **Bestimmtheitsmaß** $R^2$ brauchst du den Mittelwert $\bar{y} = 5$:

$$
\mathit{SS}_{\text{tot}} = (2-5)^2 + (4-5)^2 + (6-5)^2 + (8-5)^2 = 9+1+1+9 = 20,
$$

$$
R^2 = 1 - \frac{\mathit{SS}_{\text{res}}}{\mathit{SS}_{\text{tot}}} = 1 - \frac{4}{20} = 0{,}8.
$$

Das Modell erklärt 80 % der Varianz — auf dem Testset, nicht auf den Trainingsdaten.

## Fit mit lstsq

Für Punkte $(1,3), (2,5), (3,7), (4,9)$ liegt die Gerade $y = 1 + 2x$ exakt darauf. Mit NumPy:

```python
A = np.hstack([np.ones((4, 1)), X])      # Design-Matrix mit Intercept-Spalte
w, _, _, _ = np.linalg.lstsq(A, y, rcond=None)
# w = [1., 2.]
```

`lstsq` löst das Kleinste-Quadrate-Problem direkt — vergleiche es mit deinem Gradientenabstieg aus der Vorwoche: Beide müssen auf dasselbe $w$ konvergieren.

## Residuenanalyse

Ein Zahlenwert allein zeigt nicht, *wo* das Modell systematisch scheitert. Trage die Residuen gegen die Vorhersage auf und suche Muster:

- **Trend**: Die Residuen liegen für kleine Vorhersagen systematisch unter null und für große darüber (oder umgekehrt) — das Modell ist zu einfach, ein Term fehlt.
- **Trichterform**: Die Residuen fächern mit wachsender Vorhersage auf — die Fehlerstreuung ist nicht konstant, MSE wird von großen Werten dominiert.
- **Ausreißer**: Einzelne extrem große Residuen ziehen MSE und RMSE stark; prüfe sie einzeln, bevor du das Modell änderst.

## Typische Fehler

- MSE und RMSE verwechseln und die Einheit des Fehlers falsch angeben (MSE ist quadratisch).
- $R^2$ auf den Trainingsdaten berechnen und als Generalisierung ausgeben.
- Den Intercept vergessen und ohne Einsen-Spalte fitten.
- Nur den MSE-Wert betrachten und das Residuen-Diagramm weglassen.
- Ausreißer kommentarlos löschen, obwohl sie Datenfehler oder gerade die interessanten Fälle sein können.

## Direkter Check

Berechne in [w10-e2](#/exercise/w10-e2) einen MSE aus Residuen und in [w10-e3](#/exercise/w10-e3) ein $R^2$ in Prozent. Die volle Kette fit—rmse—r2 implementierst du in [w10-e4](#/exercise/w10-e4), und [w10-e5](#/exercise/w10-e5) verlangt einen Regressionsbericht mit Train/Test-Vergleich und Residuenmittel.
