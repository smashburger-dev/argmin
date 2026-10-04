# Cross-Validation und Leakage-Kontrolle

Ein einziger Train/Test-Split kann Glück oder Pech sein, und ein Sprachmodell, das die Prüfungsfragen schon im Trainingstext gesehen hat, misst Auswendiglernen statt Können. Diese Lektion zeigt dir die zwei Werkzeuge dagegen: Kreuzvalidierung für ehrliche Leistungszahlen und die Pipelinegrenze gegen Informationslecks.

## Das Bild dahinter: fünf Übungsblätter

Stell dir fünf Übungsblätter vor. Fünfmal lernst du mit vier Blättern und testest dich mit dem fünften; am Ende hast du fünf Noten. Ihre Streuung sagt, wie verlässlich dein Können ist, besser als eine einzelne Note. **Leakage** ist in diesem Bild: Du hast die Prüfungsfragen vorher gesehen.

Wo der Vergleich hinkt: Übungsblätter sind unabhängig erstellt. Datenpunkte können zusammenhängen, etwa Messungen derselben Person oder desselben Zeitraums; dann müssen die Folds nach Gruppen oder Zeit getrennt werden, sonst sickert die Lösung ins Training.

## Fold-Aufteilung: n mod k verteilen

**K-Fold-Kreuzvalidierung** teilt die Daten in $k$ **Folds** (Teilmengen): Jeder Fold ist einmal der Testfall, die anderen $k - 1$ Folds trainieren das Modell. Aus den $k$ Scores bildest du Mittelwert und Streuung; die Streuung ist die eigentliche Nachricht.

Bei $n = 11$ und $k = 3$ ist $11 = 3 \cdot 3 + 2$ (sprich: elf geteilt durch drei ist drei Rest zwei). Die Folds bekommen die Größen $4, 4, 3$: Die ersten $n \bmod k = 2$ Folds erhalten einen Eintrag mehr (sprich: n modulo k, der Rest der Division), damit keine Beispiele übrig bleiben. Deterministisch wird die Zuordnung über eine Seed-Permutation, dieselbe Konstruktion wie beim Train/Test-Split:

```python
perm = np.random.default_rng(seed).permutation(n)
# Fold-Grenzen nach Groessen 4, 4, 3 schneiden
```

Alle $n$ Indizes erscheinen genau einmal; gleicher [Seed](#/glossary/seed) liefert gleiche Folds.

## Hyperparameter statt Parameter

- **Parameter** (z. B. die Gewichte $w$) werden aus den Trainingsdaten gelernt.
- **Hyperparameter** werden vor dem Training festgelegt und steuern das Lernen selbst, etwa die Fold-Anzahl $k$, ein Schwellenwert oder eine Regularisierungsstärke.

Hyperparameter dürfen nicht auf dem finalen Testset gewählt werden, sonst misst du Anpassung an dieses Testset. Kreuzvalidierung auf den Trainingsdaten ist der Standardweg: Wähle die Einstellung mit dem besten Mittelwert über die Folds.

## Leakage: drei klassische Quellen

**Leakage** heißt: Information aus dem Testfall fließt in das Training. Die Bewertung wird danach wertlos, auch wenn die Zahlen schön aussehen.

1. **Ziel in den Merkmalen**: Eine Spalte, die aus der Zielvariable abgeleitet ist, macht das Modell zum Spiegel. Erkennungszeichen: verdächtig perfekte Scores.
2. **Skalieren oder Füllen vor dem Split**: Mittelwert, Standardabweichung oder Füllwert werden über alle Zeilen berechnet; Testzeilen stecken in diesen Statistiken. Alles, was aus Daten gelernt wird, gehört nur auf Train berechnet und von dort auf Test angewendet.
3. **Zielstatistik im Füllwert**: Fehlende Werte werden mit dem Mittelwert der Zielvariable der jeweiligen Gruppe gefüllt; die Zielinformation sickert in die Merkmale.

## Die Pipelinegrenze

Die Regel, die alle drei Quellen deckt: Die **Pipeline** (die Kette aus Vorverarbeitung und Modell) passt ihre Statistiken nur auf Train-Folds an. Ein Schritt, der Statistiken schätzt (Skalierer, Imputer, Modell), sieht nur die Trainingsdaten; die Anwendung darf auf Test laufen. Kontrolliere jede beschriebene Pipeline Schritt für Schritt an dieser Grenze. Gruppierte oder zeitlich geordnete Daten verlangen zusätzlich getrennte Folds, etwa pro Person oder nach Zeit.

## Typische Fehler

- Nur den Fold-Mittelwert berichten und die Streuung unterschlagen. Eine Spannweite von 30 Prozentpunkten ist kein stabiles Modell.
- $k$ nach Laune wählen: Sehr große $k$ machen das Training teuer und die Folds ähnlich, sehr kleine $k$ machen die Schätzung grob.
- Skalieren oder Imputen über alle Zeilen; die häufigste Leakage-Form in Beispielcode.
- Hyperparameter auf dem finalen Testset optimieren und es trotzdem „Test“ nennen.
- Mehrere Modelle auf demselben Testset vergleichen und das beste als erwartete Leistung ausgeben.

## Wo dir das in der KI begegnet

Benchmark-Kontamination ist Leakage im großen Maßstab: Stehen Testfragen eines Benchmarks in den Trainingsdaten eines Sprachmodells, misst der Benchmark Auswendiglernen statt Können. Seriöse Modellberichte diskutieren deshalb, wie die Testdaten vom Trainingstext getrennt wurden.

## Direkter Check

Berechne in einer Einstiegsaufgabe die Spannweite von Fold-Scores. Diagnostiziere in der [Kernaufgabe: Leakage-Diagnose](#/family/classify-cv-leakage/impute-before-split/0/core) eine beschriebene Pipeline. In der [Kernaufgabe: K-Fold-Indizes](#/family/reproduce-seeded-split/kfold-indices-numpy/0/core) baust du `kfold_indices` und `cv_scores` deterministisch; die [Vertiefungsaufgabe: Leakage-Auditor](#/family/validate-leakage-rule-audit/pipeline-leakage-audit/0/stretch) verlangt einen Leakage-Auditor für beschriebene Pipelines.

## Begriffe auf einen Blick

- **Fold**: eine der $k$ Teilmengen der Kreuzvalidierung; jede ist einmal der Testfall.
- **Kreuzvalidierung** (englisch *cross-validation*): Aufteilen der Trainingsdaten in $k$ Teilmengen, um Hyperparameter zu wählen.
- **Streuung**: Abstand zwischen bestem und schlechtestem Fold-Score; misst die Verlässlichkeit der Schätzung.
- **Hyperparameter**: Parameter, der nicht aus den Daten gelernt wird, sondern vorgegeben ist, etwa $\lambda$.
- **Parameter (Modell)**: trainierbare Zahlen des Modells; eine lineare Schicht hat $d \cdot h + h$.
- **Leakage**: Information aus dem Ziel oder dem Testset sickert in Merkmale oder Statistiken.
- **Pipeline**: die feste Kette aus Vorverarbeitung und Modell; ihre Statistiken werden nur auf Train-Folds angepasst.
