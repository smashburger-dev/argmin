## Save/Load als NumPy/JSON

Ein Modellzustand ist ein [Dictionary](#/glossary/dictionary) `{'W1': array, 'b1': array, ...}`. JSON speichert keine [Arrays](#/glossary/array); also serialisieren über Listen:

```python
state = {name: arr.tolist() for name, arr in model.items()}   # speicherbar
model = {name: np.asarray(value, dtype=np.float64) for name, value in state.items()}
```

Zurückgeladen ergeben sich gleiche Formen und exakt gleiche Werte (`np.array_equal`), Voraussetzung für Fortsetzen und Vergleichen.

## Wo dir das in der KI begegnet

Der ursprüngliche Transformer nutzte Dropout mit Rate 0,1. Trainingsläufe speichern regelmäßig Checkpoints, um nach Abbrüchen fortzusetzen. Ablationen sind der Standardnachweis in Papers: Eine Änderung, ein Vergleich, ein Ergebnis.

## Typische Fehler

- Zwei Dinge gleichzeitig ändern und die Wirkung nicht mehr zuordnen können.
- Dropout ohne Skalierung oder mit Skalierung zur falschen Zeit (Inferenz).
- Weight Decay auf den Bias anwenden.
- Early Stopping auf dem Trainingsverlust statt auf Validierung.
- Zustände speichern, aber Seeds vergessen, dann ist „geladen“ nicht „reproduziert“.

## Direkter Check

Zähle in einer Einstiegsaufgabe Masken in Ganzzahlen. Lies in der [Kernaufgabe: Dropout-Maske lesen](#/family/trace-assignment-state/fixed-dropout-mask-trace/0/core) eine feste Maske als Ausgabe vorher. In der [Kernaufgabe: Dropout und Weight Decay](#/family/optimize-training-primitive-contract/dropout-weight-decay-primitives/0/core) implementierst du Dropout-Forward und Weight-Decay-Update exakt; die [Vertiefungsaufgabe: Early Stopping und Save/Load](#/family/fit-early-stopping-roundtrip/early-stopping-roundtrip/0/stretch) baut Early Stopping und Save/Load, und die [Herausforderung](#/family/fit-weight-decay-ablation/weight-decay-ablation/0/challenge) fährt eine faire Ablation mit fixem Seed und Split.

## Begriffe auf einen Blick

- **L2-Strafe** (englisch *L2 penalty*): Zusatzterm $\frac{\lambda}{2}\|w\|^2$ im Verlust, der große Gewichte bestraft.
- **Weight Decay**: Update $w \leftarrow w - \mathrm{lr}\,(g + \lambda w)$; zieht Gewichte proportional Richtung null.
- **Dropout**: zufälliges Nullen von Aktivierungen im Training; hier mit Behaltewahrscheinlichkeit $p$.
- **Invertierte Skalierung** (englisch *inverted scaling*): erhaltene Aktivierungen werden mit $1/p$ multipliziert, damit der Erwartungswert stimmt.
- **Ablation**: kontrollierter Vergleich, bei dem genau eine Variable geändert wird.
- **Early Stopping**: Abbruch nach $k$ Epochen ohne Verbesserung des Validierungsverlusts; zurück kommt die beste Epoche.
- **Checkpoint**: gespeicherter Modellzustand, aus dem ein Lauf fortgesetzt werden kann.
