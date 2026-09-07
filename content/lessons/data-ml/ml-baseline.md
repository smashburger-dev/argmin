# ML-Probleme formulieren und Baselines setzen

Bevor irgendein Modell trainiert wird, stehen drei Entscheidungen: Was soll vorhergesagt werden (**Zielvariable**), von welcher Art ist dieses Ziel, und woran wird Erfolg gemessen (**Metrik**). Ein Modell, das diese Fragen nicht beantwortet, ist nicht überprüfbar.

## Regression oder Klassifikation

Die Art der Zielvariable entscheidet über den Problemtyp:

- **Regression**: Das Ziel ist eine stetige Zahl, zum Beispiel Reparaturkosten in Euro oder eine Zeitdauer in Minuten.
- **Klassifikation**: Das Ziel ist eine Kategorie, zum Beispiel „Defekt", „Verschleiß" oder „in Ordnung".

Vorsicht bei Zahlen: Eine Kundenummer ist eine Zahl, aber kein stetiges Ziel — sie bleibt eine Kategorie. Entscheidend ist die Bedeutung, nicht der Datentyp.

## Baselines als Maßstab

Eine **Baseline** ist die billigste sinnvolle Vorhersage. Sie legt den Boden fest, den jedes echte Modell schlagen muss.

- **Majority-Baseline** (Klassifikation): Sage immer die häufigste Klasse vorher.
- **Mean-Baseline** (Regression): Sage immer den Mittelwert des Trainingsziels vorher.

Durchgerechnetes Beispiel: Ein Datensatz hat 60 Beispiele „Defekt", 90 „Verschleiß" und 30 „in Ordnung", insgesamt 180. Die häufigste Klasse ist „Verschleiß" mit 90 Treffern. Die Majority-Baseline liegt damit bei

$$
\frac{90}{180} = 0{,}5
$$

und macht 90 Fehler. Jedes Modell, das nicht klar über 50 % liegt, lernt nichts Nützliches.

## Deterministischer Train/Test-Split

Die Testdaten dürfen beim Training nicht gesehen werden. Der Split muss **reproduzierbar** sein: Gleicher Seed, gleiches Ergebnis — sonst ist kein Experiment vergleichbar. In NumPy erzeugst du die Permutation mit einem eigenen Generator, nicht mit dem globalen Zufallszustand:

```python
rng = np.random.default_rng(3)
perm = rng.permutation(6)   # [2, 5, 4, 1, 3, 0]
```

Durchgerechnetes Beispiel mit $n=6$ und Testanteil $\tfrac{1}{3}$: Es werden $n_{\text{test}} = \operatorname{round}(\tfrac{1}{3}\cdot 6) = 2$ Indizes getestet. Die Permutation ist

$$
(2,\;5,\;4,\;1,\;3,\;0).
$$

Die ersten beiden Einträge bilden den Testindex $\{2, 5\}$, der Rest $\{4, 1, 3, 0\}$ das Training. Ein erneuter Aufruf mit Seed 3 liefert exakt dieselbe Permutation — deshalb ist der Vergleich zweier Modelle fair.

scikit-learn bietet `train_test_split` mit `random_state` und `shuffle=False` für denselben Zweck. Es läuft nicht im Browser dieser Plattform — du liest und prognostizierst solche Aufrufe, statt sie auszuführen.

## Typische Fehler

- Die Zielvariable unpräzise definieren („irgendwas mit Qualität") und später Metrik und Daten nicht zusammenpassen.
- Eine Zahlenspalte automatisch als Regressionsziel behandeln, obwohl sie Kategorien kodiert.
- Die Baseline überspringen und ein Modell feiern, das unter dem Majority-Niveau bleibt.
- Mit dem globalen `np.random.seed` arbeiten und Reproduzierbarkeit vom Aufrufkontext abhängig machen.
- Testzeilen beim Berechnen von Statistiken (Füllwerte, Skalierung) mitverwenden.

## Direkter Check

Löse die [Einstiegsaufgabe](#/family/classify-task-type/failure-next-cycle-supervised/0/intro) zur Problemeinordnung, danach eine Einstiegsaufgabe zur Majority-Baseline. Die Umsetzung des deterministischen Splits prüfst du in der [Kernaufgabe](#/family/reproduce-seeded-split/deterministic-split-numpy/0/core); als Abschluss baust du in der [Vertiefungsaufgabe](#/family/fit-predict-metrics/baseline-experiment-report/0/stretch) ein komplettes, reproduzierbares Mini-Experiment.
