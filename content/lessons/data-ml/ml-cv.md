# Cross-Validation und Leakage-Kontrolle

Ein einziger Train/Test-Split kann Glück oder Pech sein. **K-Fold Cross-Validation** teilt die Daten stattdessen in $k$ Teile: Jeder Fold ist einmal der Testfall, die anderen $k-1$ Folds trainieren das Modell. Aus den $k$ Scores bildest du Mittelwert und Streuung — die Streuung ist die eigentliche Nachricht.

## Fold-Aufteilung: n mod k verteilen

Bei $n = 11$ und $k = 3$ ist $11 = 3\cdot 3 + 2$. Die Folds bekommen die Größen $4, 4, 3$: Die ersten $n \bmod k = 2$ Folds erhalten einen Eintrag mehr, damit keine Beispiele übrig bleiben. Deterministisch wird die Zuordnung über eine Seed-Permutation — dieselbe Konstruktion wie beim Train/Test-Split:

```python
perm = np.random.default_rng(seed).permutation(n)
# Fold-Grenzen nach Groessen 4, 4, 3 schneiden
```

Alle $n$ Indizes erscheinen genau einmal; gleicher Seed liefert gleiche Folds.

## Hyperparameter statt Parameter

- **Parameter** (z. B. die Gewichte $w$) werden aus den Trainingsdaten gelernt.
- **Hyperparameter** (z. B. die Fold-Anzahl $k$, ein Schwellenwert oder die Nachbarzahl $k$; die Regularisierungsstärke kommt erst in der Lektion „Ridge und Lasso“) werden *vor* dem Training festgelegt und steuern das Lernen selbst.

Hyperparameter dürfen nicht auf dem finalen Testset gewählt werden — sonst misst du Anpassung an dieses Testset. Cross-Validation auf den Trainingsdaten ist der Standardweg: Wähle die Einstellung mit dem besten Mittelwert über die Folds.

## Leakage: drei klassische Quellen

**Leakage** heißt: Information aus dem Testfall fließt in das Training. Die Bewertung wird danach wertlos, auch wenn die Zahlen schön aussehen.

1. **Ziel in den Features**: Eine Spalte, die aus der Zielvariable abgeleitet ist (oder sie fast reproduziert), macht das „Modell" zum Spiegel. Erkennungszeichen: verdächtig perfekte Scores.
2. **Skalieren oder Füllen vor dem Split**: Mittelwert, Standardabweichung oder Füllwert werden über *alle* Zeilen berechnet — Testzeilen stecken in diesen Statistiken. Alles, was aus Daten *gelernt* wird, gehört nur auf Train berechnet und von dort auf Test angewendet.
3. **Zielstatistik im Fill-Wert**: Fehlende Werte werden mit dem Mittelwert der *Zielvariable* der jeweiligen Gruppe gefüllt — die Zielinformation sickert in die Features.

## Die Pipelinegrenze

Die Regel, die alle drei Quellen deckt: **fit nur auf Train-Folds**. Ein Schritt, der Statistiken schätzt (Skalierer, Imputer, Modell), sieht nur die Trainingsdaten; die Anwendung (transform, predict) darf auf Test laufen. Kontrolliere jede beschriebene Pipeline Schritt für Schritt an dieser Grenze.

## Typische Fehler

- Nur den Fold-Mittelwert berichten und die Streuung unterschlagen — eine Spannweite von 30 Prozentpunkten ist kein stabiles Modell.
- $k$ nach Laune wählen: sehr große $k$ machen das Training teuer und die Folds ähnlich, sehr kleine $k$ machen die Schätzung grob.
- Skalieren oder Imputen über alle Zeilen — die häufigste Leakage-Form in Tutorenbeispielen.
- Hyperparameter auf dem finalen Testset optimieren und es trotzdem „Test" nennen.
- Mehrere Modelle auf demselben Testset vergleichen und das beste als erwartete Leistung ausgeben.

## Direkter Check

Berechne in [w12-e2](#/exercise/w12-e2) die Spannweite von Fold-Scores. Diagnostiziere in [w12-e3](#/exercise/w12-e3) eine beschriebene Pipeline. In [w12-e4](#/exercise/w12-e4) baust du kfold_indices und cv_scores deterministisch; [w12-e5](#/exercise/w12-e5) verlangt einen Leakage-Auditor für beschriebene Pipelines.
