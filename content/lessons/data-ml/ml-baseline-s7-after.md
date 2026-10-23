## Regression oder Klassifikation

Die Art der **Zielvariable** entscheidet über den Problemtyp:

- **Regression**: Das Ziel ist eine stetige Zahl, zum Beispiel Reparaturkosten in Euro oder eine Zeitdauer in Minuten.
- **Klassifikation**: Das Ziel ist eine Kategorie, zum Beispiel „Defekt“, „Verschleiß“ oder „in Ordnung“.

Vorsicht bei Zahlen: Eine Kundenummer ist eine Zahl, aber kein stetiges Ziel. Sie bleibt eine Kategorie; entscheidend ist die Bedeutung, nicht der Datentyp.

Regression und Klassifikation sind **überwachte** Verfahren: Sie lernen aus Beispielen mit gelabeltem Ziel. Verfahren ohne Labels wie **Clustering** zählen zu den unüberwachten; sie gruppieren Daten, ohne dass ein Ziel vorgegeben wäre.

## Baselines als Maßstab

Eine **Baseline** ist die billigste sinnvolle Vorhersage. Sie legt den Boden fest, den jedes echte Modell schlagen muss. Durchgerechnetes Beispiel: Ein Datensatz hat 60 Beispiele „Defekt“, 90 „Verschleiß“ und 30 „in Ordnung“, insgesamt 180. Die häufigste Klasse ist „Verschleiß“ mit 90 Treffern:

$$
\frac{90}{180} = 0{,}5.
$$

Die Majority-Baseline liegt damit bei 50 % Trefferquote und macht 90 Fehler. Jedes Modell, das nicht klar darüber liegt, lernt nichts Nützliches. Die **Metrik** ist die Zahl, an der du den Vergleich misst; sie steht vor dem Experiment fest.

## Deterministischer Train/Test-Split

Der **Train/Test-Split** teilt die Daten in einen Lern- und einen Prüfteil. Die Testdaten dürfen beim Training nicht gesehen werden, und der Split muss reproduzierbar sein: Gleicher **Seed** (Startwert des Zufallsgenerators), gleiches Ergebnis. In NumPy erzeugst du die Permutation mit einem eigenen Generator, nicht mit dem globalen Zufallszustand:

```python
rng = np.random.default_rng(3)
perm = rng.permutation(6)   # [2, 5, 4, 1, 3, 0]
```

Durchgerechnet mit $n = 6$ und Testanteil $\tfrac{1}{3}$: Es werden $n_{\text{test}} = \operatorname{round}(\tfrac{1}{3} \cdot 6) = 2$ Indizes getestet. Die ersten beiden Einträge der Permutation $(2, 5, 4, 1, 3, 0)$ bilden den Testindex $\{2, 5\}$, der Rest $\{4, 1, 3, 0\}$ das Training. Ein erneuter Aufruf mit Seed 3 liefert exakt dieselbe Permutation; deshalb ist der Vergleich zweier Modelle fair.

scikit-learn bietet `train_test_split` mit `random_state` und `shuffle=False` für denselben Zweck. Es läuft nicht im Browser dieser Plattform; du liest und prognostizierst solche Aufrufe, statt sie auszuführen.

## Typische Fehler

- Die Zielvariable unpräzise definieren („irgendwas mit Qualität“). Später passen Metrik und Daten nicht zusammen.
- Eine Zahlenspalte automatisch als Regressionsziel behandeln, obwohl sie Kategorien kodiert.
- Die Baseline überspringen und ein Modell feiern, das unter dem Majority-Niveau bleibt.
- Mit dem globalen `np.random.seed` arbeiten und Reproduzierbarkeit vom Aufrufkontext abhängig machen.
- Testzeilen beim Berechnen von Statistiken wie Füllwerte oder Skalierung mitverwenden.

## Wo dir das in der KI begegnet

Multiple-Choice-Benchmarks für Sprachmodelle wie MMLU stellen vier Antwortoptionen; Raten liegt also bei 25 %. Ein Ergebnis von 30 % klingt solide, liegt aber nur knapp über der Zufallsbaseline. Dieselbe Lektion in groß: Ohne Maßstab ist jede Zahl werbewirksam und nichts weiter.

## Direkter Check

Löse die [Einstiegsaufgabe: Problemeinordnung](#/family/classify-task-type/failure-next-cycle-supervised/0/intro) zur Problemeinordnung, danach eine Einstiegsaufgabe zur Majority-Baseline. Die Umsetzung des deterministischen Splits prüfst du in der [Kernaufgabe: Deterministischer Split](#/family/reproduce-seeded-split/deterministic-split-numpy/0/core); als Abschluss baust du in der [Vertiefungsaufgabe: Mini-Experiment](#/family/fit-predict-metrics/baseline-experiment-report/0/stretch) ein komplettes, reproduzierbares Mini-Experiment.

## Begriffe auf einen Blick

- **Zielvariable** (englisch *target*): die Größe, die das Modell vorhersagen soll; ihre Art entscheidet den Problemtyp.
- **Regression (Aufgabe)** (englisch *regression task*): Vorhersageaufgabe mit stetigem Zahlenziel.
- **Klassifikation** (englisch *classification*): Vorhersageaufgabe mit Kategorieziel.
- **Metrik** (englisch *metric*): die Zahl, an der Modelle verglichen werden; steht vor dem Experiment fest.
- **Baseline**: die billigste sinnvolle Vorhersage; der Maßstab, den jedes Modell schlagen muss.
- **Majority-Baseline**: Vorhersage „immer die häufigste Klasse“; bei Regression heißt das Gegenstück Mean-Baseline.
- **Überwacht** (englisch *supervised*): Verfahren lernt aus Beispielen mit gelabeltem Ziel; Regression und Klassifikation ja, Clustering nein.
- **Clustering**: unüberwachtes Gruppieren ohne Zielvariable.
- **Train/Test-Split**: Aufteilung der Daten in Lernteil und Prüfteil; der Prüfteil bleibt beim Training ungesehen.
- **Seed** (englisch *random seed*): Startwert eines Zufallsgenerators; gleicher Seed, gleiche Zufallsfolge.
