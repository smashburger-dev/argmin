# Regularisierung, faire Ablation, Save/Load

Regularisierung schränkt ein Modell ein, damit es nicht Trainingsrauschen memoriert. Drei Werkzeuge, alle in NumPy exakt machbar: L2-Strafe, Dropout, Early Stopping. Dazu die Methodik, die sie erst auswertbar macht: die **faire Ablation** — und die Fähigkeit, Modellzustände zu speichern und reproduzierbar zurückzuladen.

## L2 und Weight Decay

Die L2-Regularisierung ergänzt den Verlust um $\frac{\lambda}{2} \|w\|^2$. Der Gradient wächst dadurch um $\lambda w$, das Update wird zu

$$w \leftarrow w - \mathrm{lr} \cdot (g + \lambda w).$$

Diese Form — Weight Decay — zieht die Gewichte in jedem Schritt proportional zu ihrem Betrag Richtung null, unabhängig vom Datengradienten. Der Bias wird üblicherweise **nicht** regularisiert: Er verschiebt nur, er skaliert nicht. Wähle $\lambda$ klein (etwa $10^{-4}$ bis $10^{-2}$); zu große Werte fällen das Modell auf die Konstante.

## Dropout mit fester Maske

Dropout nullt zufällig Aktivierungen und trainiert so Redundanz. Kontrolliert und reproduzierbar wird es durch eine **feste Maske**, gezogen vor dem Schritt: $M \in \{0, 1\}^{n}$ mit $P(M_i = 1) = p$. Invertierte Skalierung heißt: Erhaltene Aktivierungen werden mit $1/p$ multipliziert,

$$\tilde{a}_i = M_i \cdot \frac{a_i}{p},$$

sodass der Erwartungswert über die Masken unverändert bleibt — im Inference-Pass braucht es dann **keine** Maske und keine Skalierung mehr. In dieser Plattform ist Dropout ein kontrolliertes Konzept: Maske einmal ziehen (Seed), Weiterrechnen exakt nachvollziehen.

## Faire Ablation

Eine Ablation ändert **genau eine** Variable. Alles andere — Daten, Split, Initialisierung, Lernrate, Epochenzahl — bleibt fix. Das funktioniert nur mit festen Seeds: Erzeuge Daten und Split aus `np.random.default_rng(seed)` und initialisiere die Gewichte aus einem davon getrennten, ebenfalls geseedeten Generator. Dann gilt: $\lambda = 0$ gegen $\lambda = 0{,}05$ bei gleichem Seed misst die Wirkung der Strafe, nicht des Zufalls. Zwei Läufe mit gleichem Seed müssen bitgleich sein — das ist der Reproduzierbarkeits-Nachweis.

## Early Stopping

Notiere den Validierungsverlust pro Epoche. Early Stopping mit Patience $k$: Merke die beste Epoche (kleinster Validierungsverlust) und brich ab, sobald $k$ Epochen ohne Verbesserung vergangen sind; zurück kommt die beste Epoche, nicht die letzte. Das ist Regularisierung durch Modellwahl — und der billigste Hyperparameter, den es gibt.

## Save/Load als NumPy/JSON

Ein Modellzustand ist ein Dictionary `{'W1': array, 'b1': array, ...}`. JSON speichert keine Arrays; also serialisieren über Listen:

```python
state = {name: arr.tolist() for name, arr in model.items()}   # speicherbar
model = {name: np.asarray(value, dtype=np.float64) for name, value in state.items()}
```

Zurückgeladen ergeben sich gleiche Formen und exakt gleiche Werte (`np.array_equal`) — Voraussetzung für Fortsetzen und Vergleichen.

## Typische Fehler

- Zwei Dinge gleichzeitig ändern und die Wirkung nicht mehr zuordnen können.
- dropout ohne Skalierung oder mit Skalierung zur falschen Zeit (Inferenz).
- Weight Decay auf den Bias anwenden.
- Early Stopping auf dem Trainingsverlust statt auf Validierung.
- Zustände speichern, aber Seeds vergessen — dann ist „geladen“ nicht „reproduziert“.

## Direkter Check

Zähle in einer Einstiegsaufgabe Masken in Ganzzahlen. Lies in der [Kernaufgabe](#/family/trace-assignment-state/fixed-dropout-mask-trace/0/core) eine feste Maske als Ausgabe vorher. In der [Kernaufgabe](#/family/optimize-training-primitive-contract/dropout-weight-decay-primitives/0/core) implementierst du Dropout-Forward und Weight-Decay-Update exakt; die [Vertiefungsaufgabe](#/family/fit-early-stopping-roundtrip/early-stopping-roundtrip/0/stretch) baut Early Stopping und Save/Load, und die [Herausforderung](#/family/fit-weight-decay-ablation/weight-decay-ablation/0/challenge) fährt eine faire Ablation mit fixem Seed und Split.
