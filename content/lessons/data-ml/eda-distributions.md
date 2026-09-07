# Verteilungen, Korrelation und bedingte Anteile

Explorative Datenanalyse (EDA) beginnt mit der Frage, nicht mit dem Diagramm. Erst wenn die Frage steht, wählst du Kennzahl und Darstellung. In dieser Umgebung fasst du Verteilungen numerisch zusammen (Median, Quartile, Bin-Anzahlen, `np.corrcoef`); gezeichnet wird nichts — die Diagrammwahl ist eine Begründungsaufgabe, kein Rendering.

## Histogramm und Bins

Ein **Histogramm** zählt, wie viele Werte in jede Kante fallen. Die Kanten definieren halboffene Intervalle $[e_0, e_1), [e_1, e_2), \dots$ — nur das letzte Intervall schließt die rechte Kante ein: $[e_{k-1}, e_k]$.

Durchgerechnet mit `np.histogram` für die Messwerte

$$x = (2,\ 4,\ 4,\ 4,\ 5,\ 5,\ 7,\ 9)$$

und Kanten $[0, 4, 9]$:

- Bin 1 ist $[0, 4)$: nur der Wert 2 fällt hinein (4 zählt noch nicht) $\Rightarrow$ 1 Wert.
- Bin 2 ist $[4, 9]$: die Werte $4, 4, 4, 5, 5, 7, 9 \Rightarrow$ 7 Werte.

Das Ergebnis ist `[1 7]`. Die Bin-Breite ändert die Form: feinere Bins zeigen Details und Rauschen, grobe Bins glätten Struktur weg. Nie aus einem einzigen Bin-Setup der Verteilung eine Geschichte erzählen, die bei anderen Kanten verschwindet.

## Median, Quartile, Schiefe

Der **Median** ist der Wert in der Mitte der sortierten Liste. Für $x$ oben (sortiert, Länge 8, gerade): das Mittel der mittleren beiden Werte $\frac{4+5}{2} = 4{,}5$. Die **Quartile** teilen entsprechend in Viertel; die **Spannweite** zwischen oberem und unterem Quartil (IQR) beschreibt die Streuung robuster als die Standardabweichung.

Die **Schiefe** erkennst du am Verhältnis von Mittelwert und Median:

- Mittelwert $>$ Median $\Rightarrow$ **rechtssteil** (wenige große Werte ziehen den Mittelwert nach oben).
- Mittelwert $<$ Median $\Rightarrow$ **linkssteil**.
- Mittelwert $\approx$ Median $\Rightarrow$ etwa symmetrisch.

Für $x$: Mittelwert $= \frac{40}{8} = 5 > 4{,}5$ — leicht rechtssteil.

## Diagrammwahl nach Fragestellung

| Frage | Kennzahl / Diagramm |
|---|---|
| Wie ist eine Variable verteilt? | Histogramm oder Boxplot (Median, IQR) |
| Hängen zwei numerische Größen zusammen? | Streudiagramm + Korrelation $r$ |
| Wie groß ist ein Anteil pro Kategorie? | Balkendiagramm mit Anteilen |
| Unterscheiden sich Gruppen? | Mediane/IQR je Gruppe (Balken mit Fehlerbalken) |
| Wie entwickelt sich eine Größe über die Zeit? | Liniendiagramm |

Ein Kuchendiagramm taugt höchstens für zwei bis drei Anteile; für Verteilungen ist es die falsche Wahl.

## Korrelation

Der **Korrelationskoeffizient** $r$ nach Pearson normiert die Kovarianz auf $[-1, 1]$:

$$r = \frac{\sum_i (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_i (x_i - \bar{x})^2}\cdot\sqrt{\sum_i (y_i - \bar{y})^2}}$$

$r = 1$ heißt exakt positive Linearität, $r = -1$ exakt negative, $r \approx 0$ heißt: kein linearer Zusammenhang (ein nichtlinearer kann trotzdem bestehen). In NumPy: `np.corrcoef(x, y)[0, 1]`.

## Korrelation ist nicht Kausalität: Confounder

Eisverkäufe und Badeunfälle korrelieren im Sommer stark positiv. Weder verursacht Eis Unfälle noch umgekehrt — eine gemeinsame **Drittvariable** (der **Confounder** „Sommertemperatur") treibt beide. Bevor du aus $r$ einen kausalen Schluss ziehst, suche nach Drittvariablen, die beide Größen erklären. Ein hohes $r$ rechtfertigt höchstens die Frage nach einem Experiment oder einer begründeten kausalen Annahme.

## Bedingte Wahrscheinlichkeit als Spaltenanteil

$P(B \mid A)$ ist der Anteil der B-Fälle **innerhalb** der A-Fälle — in einer Kontingenztabelle der Spaltenanteil:

| | B ja | B nein | Zeilensumme |
|---|---|---|---|
| A ja | 42 | 14 | 56 |
| A nein | 10 | 30 | 40 |

$$P(B \mid A) = \frac{42}{56} = \frac{3}{4} = 0{,}75, \qquad P(B) = \frac{52}{96} \approx 0{,}54.$$

Der bedingte Anteil und der unbedingte Anteil unterscheiden sich — genau das ist die Aussage „B hängt mit A zusammen". Umgekehrt gilt hier $P(A \mid B) = \frac{42}{52}$, ein anderer Wert: Bedingung und Ereignis dürfen nicht vertauscht werden.

## Typische Fehler

- Bin-Grenzen links und rechts als inklusiv gelesen — nur die letzte Kante schließt den Rand ein.
- Aus einem hohen $r$ einen Kausalschluss abgeleitet und den Confounder übersehen.
- Prozentpunkte mit Prozent verwechselt (Anstieg von 40 % auf 50 % ist 10 Prozentpunkte, aber 25 % relativ).
- Median und Quartile auf unsortierten Werten bestimmt.
- Aus einem einzigen Bin-Setup eine Verteilungsform abgelesen, die bei anderen Kanten verschwindet.

## Direkter Check

Bearbeite [Eisverkäufe und Badeunfälle korrelieren über das Jahr hinweg mit $r \approx …](#/family/classify-confounding/temperature-confounder/0/intro) (Confounder-Konzept), dann die Abrufinstanz dieser Lektion. Sage die Ausgabe des NumPy-Schnipsels in [NumPy-Zusammenfassungen lesen: Was gibt dieses Programm aus? Sage die Ausgabe …](#/family/trace-library-api-output/numpy-median-histogram-corrcoef/0/core) vorher, implementiere `describe` und `bin_counts` in [Implementiere zwei Zusammenfassungs-Funktionen mit NumPy. describe(values) …](#/family/formula-descriptive-stats-numpy/describe-and-bins/0/core) und baue den Bericht als Final Boss in [Final Boss EDA-Bericht: Implementiere hypothesis_report(metric_a, metric_b, …](#/family/aggregate-grouped-metrics-report/hypothesis-report-groups/0/stretch).
