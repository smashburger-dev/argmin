# Entscheidungsbäume und Ensembles

Ein **Entscheidungsbaum** zerlegt die Eingaben durch Wenn-Dann-Fragen in Regionen. Ein **Ensemble** kombiniert viele Modelle — Bäume sind der Standardbaustein, weil sie flexibel, aber instabil sind.

## Gini-Unreinheit

Ein Knoten mit Klassenanteilen $p_k$ hat die **Gini-Unreinheit**

$$G = 1 - \sum_k p_k^2$$

Rechnungen für kleine Knoten:

- $[0,0,1,1]$: $G = 1 - (0{,}5^2 + 0{,}5^2) = 0{,}5$
- $[0,0,0,1]$: $G = 1 - ((3/4)^2 + (1/4)^2) = 1 - 10/16 = 0{,}375$
- reiner Knoten $[1,1,1]$: $G = 0$

Je kleiner $G$, desto sortierter der Knoten.

## Split-Suche bis Tiefe 2

Gesucht ist der Schwellenwert mit dem kleinsten **gewichteten Gini**: Anteil der Punkte links mal $G_{\text{links}}$ plus Anteil rechts mal $G_{\text{rechts}}$. Kandidaten sind die Mitten zwischen aufeinanderfolgenden, verschiedenen x-Werten.

Beispiel: $x = (1,2,3,4)$, $y = (0,0,1,1)$.

| Schwelle | links | rechts | gewichteter Gini |
|---|---|---|---|
| 1,5 | $[0]$ | $[0,1,1]$ | $\tfrac14\cdot0 + \tfrac34\cdot\tfrac49 = \tfrac13 \approx 0{,}333$ |
| 2,5 | $[0,0]$ | $[1,1]$ | $0$ |
| 3,5 | $[0,0,1]$ | $[1]$ | $\tfrac13 \approx 0{,}333$ |

Schwelle 2,5 gewinnt. Für **Tiefe 2** wird jedes Kind erneut gesplittet, aber nur, wenn der gewichtete Gini noch fällt — ansonsten stoppt der Ast. Unbegrenzte Tiefe führt auf Trainingsdaten zu Gini 0 und memoriert das Rauschen.

## Bias und Varianz

Ein tiefer Baum hat **niedrigen Bias** (er kann alles darstellen) aber **hohe Varianz** (kleine Datenänderung → ganz andere Struktur). **Bagging** trainiert viele Bäume auf Bootstrap-Stichproben und kombiniert sie:

- **Majority-Voting** (Klassifikation): die Klassenstimmen werden gezählt, die Mehrheit gewinnt.
- Mittelung (Regression): die Vorhersagen werden gemittelt.

Die Fehler der einzelnen Bäume sind nur teilweise korreliert — beim Kombinieren heben sie sich gegenseitig auf. Die Varianz sinkt, der Bias bleibt etwa gleich.

Mini-Rechnung Voting: drei Modelle bewerten drei Beispiele; jedes Beispiel erhält einen Stimmenvektor mit einer Stimme je Modell. Beispiel 1 erhält $(1,0,0)$ — eine Eins-Stimme, Mehrheit ist 0. Beispiel 2 erhält $(1,0,1)$ — zwei Eins-Stimmen, Mehrheit ist 1. Beispiel 3 erhält $(0,1,1)$ — zwei Eins-Stimmen, Mehrheit ist 1. Ensemble-Ausgabe: $(0,1,1)$. Kein einzelnes Modell muss diese Ausgabe vollständig treffen — genau das ist der Ensemble-Effekt.

## Warum Ensembles Baselines schlagen — und wann nicht

Ensembles schlagen eine einfache Baseline (Mittelwert, Mehrheitsklasse, lineares Modell) zuverlässig, wenn:

- die Einzelmodelle besser als Zufall sind,
- ihre Fehler möglichst **unkorreliert** sind (verschiedene Bootstrap-Stichproben, Merkmals-Untermengen).

Sie schlagen sie **nicht** automatisch, wenn:

- alle Modelle denselben systematischen Fehler machen (starke Korrelation),
- der Datensatz klein ist und die Bäume alle dasselbe lernen,
- die einfache Baseline das Problem schon knapp löst.

## Vergleichen unter identischen Splits

Wie in der Lektion „Cross-Validation und Leakage-Kontrolle“: Der Vergleich Baum vs. Ensemble vs. lineare Baseline läuft auf **denselben Splits** mit demselben Seed. Verschiedene Splits pro Modell machen den Vergleich zufällig. Und: Ein einzelner Lauf ist ein Stichprobenwert — die Streuung über Wiederholungen gehört in den Bericht (Vorgriff auf die Lektion „Reproduzierbarkeit: Seeds, Splits und Manifeste“).

## Typische Fehler

- Gini mit Anzahlen statt Anteilen gewichten (vergessen, durch $n$ zu teilen).
- Bei Gleichstand von Schwellenwerten den ersten gefundenen nehmen statt deterministisch (kleinster Schwellenwert) zu entscheiden.
- Tiefe unbegrenzt lassen und die Überanpassung wundern.
- Ensembles auf dem Testset tunen statt per Cross-Validation.
- Modelle mit unterschiedlichen zufälligen Splits vergleichen.

## Direkter Check

Trace einen handgeschriebenen Baum in der [Kernaufgabe](#/family/trace-assignment-state/tree-majority-vote-trace/0/core), rechne das Stimm-Ensemble in einer Einstiegsaufgabe und implementiere Gini plus Split-Suche in der [Kernaufgabe](#/family/optimize-tree-best-split/gini-best-binary-split/0/core). Transfer: Die [Vertiefungsaufgabe](#/family/construct-ensemble-predictor-comparison/voting-tree-linear-rmse/0/stretch) vergleicht Baum, Voting und lineare Baseline auf identischen Daten.
