# Verteilungen, Korrelation und bedingte Anteile

Bevor ein KI-System trainiert wird, schaut sich jemand die Daten an: Wie sind sie verteilt, was hängt zusammen, was täuscht? Diese Lektion zeigt dir, wie du eine Spalte von Zahlen in wenige Kennzahlen übersetzt und wie du zwei der häufigsten Denkfehler vermeidest: Korrelation für Kausalität halten und bedingte mit unbedingten Anteilen verwechseln.

## Das Bild dahinter: der Notenspiegel

Stell dir den Notenspiegel einer Klassenarbeit vor. Das **Histogramm** sagt, wie viele Schüler welche Note hatten. Der **Median** ist die Note genau in der Mitte der Liste. Die **Quartile** markieren die Grenzen der unteren und oberen Viertel. Für den Confounder ein zweites Bild: Eisverkauf und Sonnenbrand steigen im Sommer gemeinsam, nicht weil Eis Sonnenbrand macht, sondern weil beide von den Sonnenstunden abhängen.

Wo der Vergleich hinkt: Noten sind diskret und auf wenige Werte beschränkt. Messdaten sind stetig, und die Wahl der Bin-Breite kann die Form der Verteilung verändern, ohne dass sich die Daten ändern.

## Histogramm und Bins

Ein **Histogramm** zählt, wie viele Werte in jede Kante fallen. Die Kanten definieren halboffene Intervalle $[e_0, e_1)$, $[e_1, e_2)$ und so weiter; nur das letzte Intervall schließt die rechte Kante ein: $[e_{k-1}, e_k]$. Jeder solche Behälter heißt **Bin**.

Durchgerechnet mit `np.histogram` für die Kanten $[0, 4, 9]$ und die Messwerte:

$$
x = (2,\ 4,\ 4,\ 4,\ 5,\ 5,\ 7,\ 9).
$$

- Bin 1 ist $[0, 4)$: nur der Wert 2 fällt hinein (4 zählt noch nicht), also 1 Wert.
- Bin 2 ist $[4, 9]$: die Werte $4, 4, 4, 5, 5, 7, 9$, also 7 Werte.

Das Ergebnis ist `[1 7]`. Die Bin-Breite ändert die Form: feine Bins zeigen Details und Rauschen, grobe Bins glätten Struktur weg. Erzähle nie aus einem einzigen Bin-Setup eine Geschichte, die bei anderen Kanten verschwindet.

## Median, Quartile, Schiefe

Der **Median** ist der Wert in der Mitte der sortierten Liste. Für $x$ oben (Länge 8, gerade) ist er das Mittel der beiden mittleren Werte:

$$
\frac{4 + 5}{2} = 4{,}5.
$$

Die **Quartile** teilen die sortierte Liste in Viertel; die Spannweite zwischen oberem und unterem Quartil (IQR) beschreibt die Streuung robuster als die Standardabweichung. Die **Schiefe** erkennst du am Verhältnis von Mittelwert und Median: Mittelwert größer als Median heißt rechtsschief (wenige große Werte ziehen den Mittelwert nach rechts), Mittelwert kleiner als Median heißt linksschief. Manche Bücher nennen rechtsschief auch linkssteil; gemeint ist dasselbe. Für $x$ ist der Mittelwert $40/8 = 5 > 4{,}5$, also leicht rechtsschief.

## Diagrammwahl nach Fragestellung

| Frage | Kennzahl oder Diagramm |
|---|---|
| Wie ist eine Variable verteilt? | Histogramm oder Boxplot (Median, IQR) |
| Hängen zwei numerische Größen zusammen? | Streudiagramm plus Korrelation $r$ |
| Wie groß ist ein Anteil pro Kategorie? | Balkendiagramm mit Anteilen |
| Unterscheiden sich Gruppen? | Mediane oder IQR je Gruppe |
| Wie entwickelt sich eine Größe über die Zeit? | Liniendiagramm |

Ein Kuchendiagramm taugt höchstens für zwei bis drei Anteile; für Verteilungen ist es die falsche Wahl.

## Korrelation

Der **Korrelationskoeffizient** $r$ nach Pearson misst die lineare Stärke eines Zusammenhangs und liegt immer zwischen $-1$ und $1$:

$$
r = \frac{\sum_i (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_i (x_i - \bar{x})^2}\cdot\sqrt{\sum_i (y_i - \bar{y})^2}}.
$$

Dabei ist $\sum$ das Summenzeichen (sprich: Summe über i) und $\bar{x}$ der Mittelwert (sprich: x quer). $r = 1$ heißt exakt positiv linear, $r = -1$ exakt negativ, $r \approx 0$ heißt kein linearer Zusammenhang (ein nichtlinearer kann trotzdem bestehen). In NumPy: `np.corrcoef(x, y)[0, 1]`.

## Korrelation ist nicht Kausalität: der Confounder

Ein **Confounder** (Störvariable) ist eine gemeinsame Ursache, die beide Größen treibt. Eisverkäufe und Badeunfälle korrelieren stark positiv, weil die Sommertemperatur beide treibt. Bevor du aus $r$ einen kausalen Schluss ziehst, suche nach Drittvariablen, die beide Größen erklären. Ein hohes $r$ rechtfertigt höchstens die Frage nach einem Experiment oder einer begründeten kausalen Annahme.

## Bedingte Wahrscheinlichkeit als Spaltenanteil

$P(B \mid A)$ (sprich: Wahrscheinlichkeit von B gegeben A) ist der Anteil der B-Fälle **innerhalb** der A-Fälle, in dieser Kontingenztabelle der Spaltenanteil:

| | A ja | A nein | Zeilensumme |
|---|---|---|---|
| B ja | 42 | 10 | 52 |
| B nein | 14 | 30 | 44 |
| Spaltensumme | 56 | 40 | 96 |

$$
P(B \mid A) = \frac{42}{56} = \frac{3}{4} = 0{,}75, \qquad P(B) = \frac{52}{96} \approx 0{,}54.
$$

Der bedingte Anteil und der unbedingte Anteil unterscheiden sich: Genau das ist die Aussage „B hängt mit A zusammen“. Umgekehrt gilt hier $P(A \mid B) = 42/52$, ein anderer Wert. Bedingung und Ereignis dürfen nicht vertauscht werden.

## Typische Fehler

- Bin-Grenzen links und rechts als inklusiv gelesen. Nur die letzte Kante schließt den Rand ein.
- Aus einem hohen $r$ einen Kausalschluss ableiten und den Confounder übersehen.
- Prozentpunkte mit Prozent verwechseln: Ein Anstieg von 40 % auf 50 % ist 10 Prozentpunkte, aber 25 % relativ.
- Median und Quartile auf unsortierten Werten bestimmen.
- Aus einem einzigen Bin-Setup eine Verteilungsform ablesen, die bei anderen Kanten verschwindet.

## Wo dir das in der KI begegnet

Vor dem Training schaut man sich Verteilungen an, zum Beispiel wie lang die Texte in [Tokens](#/glossary/token) sind, bevor eine Kontextlänge gewählt wird. Verschiebt sich die Verteilung zwischen Training und Einsatz, sinkt die Leistung; das Phänomen heißt Verteilungsverschiebung (englisch *distribution shift*) und ist der Alltagsfeind jedes produktiven Modells.

## Direkter Check

Bearbeite die [Einstiegsaufgabe: Confounder-Konzept](#/family/classify-confounding/temperature-confounder/0/intro), dann die Abrufinstanz dieser Lektion. Sage die Ausgabe des NumPy-Schnipsels in der [Kernaufgabe: NumPy-Zusammenfassungen lesen](#/family/trace-library-api-output/numpy-median-histogram-corrcoef/0/core) vorher, implementiere `describe` und `bin_counts` in der [Kernaufgabe: describe und bin_counts](#/family/formula-descriptive-stats-numpy/describe-and-bins/0/core) und baue den Bericht als Final Boss in der [Vertiefungsaufgabe: EDA-Bericht](#/family/aggregate-grouped-metrics-report/hypothesis-report-groups/0/stretch).

## Begriffe auf einen Blick

- **Histogramm**: Zählung, wie viele Werte in jedes Intervall fallen; die Kanten definieren die Intervalle.
- **Bin**: ein Intervall des Histogramms; die Bin-Breite entscheidet, wie fein die Verteilung aufgelöst wird.
- **Median**: der Wert in der Mitte der sortierten Liste; bei gerader Anzahl das Mittel der beiden mittleren Werte.
- **Quartil**: Grenze, die die sortierte Liste in Viertel teilt; der Abstand der Quartile heißt IQR.
- **Schiefe** (englisch *skew*): Asymmetrie der Verteilung; Mittelwert größer als Median heißt rechtsschief (langer Ausläufer nach rechts), sonst linksschief.
- **Korrelation** (englisch *correlation*): linearer Zusammenhang zweier Größen, gemessen als Pearson-$r$ zwischen $-1$ und $1$.
- **Confounder**: Störvariable, die zwei Größen gemeinsam treibt und so eine Scheinkorrelation erzeugt.
- **Bedingte Wahrscheinlichkeit** (englisch *conditional probability*): Anteil $P(A \mid B)$ der A-Fälle innerhalb der B-Fälle.
