# Logistische Regression und Klassifikationsmetriken

Für binäre Klassifikation brauchst du eine Ausgabe zwischen 0 und 1. Die **Sigmoid-Funktion** liefert sie:

$$
\sigma(z) = \frac{1}{1 + e^{-z}}.
$$

Ausgewertet: $\sigma(0) = 0{,}5$, $\sigma(2) \approx 0{,}881$, $\sigma(-2) \approx 0{,}119$. Die Funktion ist symmetrisch: $\sigma(-z) = 1 - \sigma(z)$.

## Verlust ohne geschlossene Form

Die logistische Regression minimiert den **Log-Loss** (Kreuzentropie)

$$
L = -\sum_i \left[ y_i \log p_i + (1 - y_i)\log(1 - p_i) \right],
$$

wobei $p_i = \sigma(w^\top x_i)$ die vorhergesagte Wahrscheinlichkeit für Klasse 1 ist. Ein stark falsches Selbstvertrauen wird überproportional bestraft: Für $y_i = 1$ und $p_i = 0{,}1$ wächst der Beitrag $-\log(0{,}1) \approx 2{,}3$ stark an. Anders als bei der linearen Regression gibt es **keine geschlossene Lösung** — die Koeffizienten werden mit Gradientenabstieg gelernt, genau wie in der Lektion „Gradientenabstieg und lineare Regression“ von Hand geübt.

scikit-learns `LogisticRegression` und `predict_proba` liest du als API-Kompetenz — im Browser dieser Plattform läuft sklearn nicht.

## Konfusionsmatrix und Metriken

Mit einem **Schwellenwert** $t$ werden Wahrscheinlichkeiten zu Labels: vorhergesagte Klasse 1 genau dann, wenn $p \geq t$. Daraus entsteht die Konfusionsmatrix mit **True Positive** (TP), **False Positive** (FP), **False Negative** (FN) und **True Negative** (TN).

Durchgerechnetes Beispiel: TP $= 40$, FP $= 10$, FN $= 20$, TN $= 30$.

$$
\text{Precision} = \frac{TP}{TP + FP} = \frac{40}{50} = 0{,}8
\qquad
\text{Recall} = \frac{TP}{TP + FN} = \frac{40}{60} = \tfrac{2}{3}.
$$

Das harmonische Mittel beider ist der **F1-Score**:

$$
F_1 = \frac{2 \cdot \text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}} = \frac{2 \cdot 0{,}8 \cdot \tfrac{2}{3}}{0{,}8 + \tfrac{2}{3}} = \frac{8}{11} \approx 0{,}727.
$$

Precision fragt „Wie viele der als positiv gemeldeten Fälle stimmen?", Recall fragt „Wie viele der tatsächlichen positiven Fälle wurden gefunden?". Beide zusammen zu verbessern ist der Punkt — eins allein zu maximieren ist billig.

## Schwellenwert und Fehlerkosten

$t = 0{,}5$ ist keine Naturkonstante. Höheres $t$: weniger FP, mehr FN. Tieferes $t$: umgekehrt. Sind die Kosten ungleich, verschiebt sich das Optimum. Mit Kosten $K_{FP}$ pro False Positive und $K_{FN}$ pro False Negative gilt

$$
\text{Kosten} = FP \cdot K_{FP} + FN \cdot K_{FN}.
$$

Beispiel Spamfilter: Eine gelöschte wichtige E-Mail (FP) schadet 50 €, zugestellter Spam (FN) 0,50 €. Bei $FP = 4$, $FN = 2$ kosten die Fehler $4 \cdot 50\,\text{€} = 200\,\text{€}$ und $2 \cdot 0{,}50\,\text{€} = 1\,\text{€}$, zusammen 201 € — der hohe FP-Anteil dominiert, also lohnt sich ein höherer Schwellenwert, auch wenn der Recall sinkt.

## Typische Fehler

- Accuracy als alleinige Metrik bei unbalancierten Klassen feiern (90 % „immer negativ" kann 90 % Accuracy bedeuten).
- Precision und Recall vertauschen — Nenner verwechselt.
- Den Schwellenwert 0,5 als kostenoptimal behandeln, ohne FP/FN-Kosten zu prüfen.
- Die Ausgabe der Sigmoid als „Anteil" oder „Score" missdeuten — es ist eine Wahrscheinlichkeit für Klasse 1.
- F1 für Nicht-Binärfälle ungeprüft übernehmen, obwohl macro/micro-Verfahren unterschiedliche Aussagen machen.

## Direkter Check

Zähle in einer Einstiegsaufgabe Konfusionsmatrix-Summen nach. [Ein Spamfilter gibt Wahrscheinlichkeiten aus. Ein False Positive (legitime Mail …](#/family/aggregate-confusion-metric/threshold-under-asymmetric-cost/0/core) prüft die Schwellenwert-Entscheidung bei ungleichen Kosten. In [Implementiere die Klassifikationswerkzeuge. `sigmoid(z)` = 1/(1 + e^(−z)) …](#/family/aggregate-confusion-metric/sigmoid-predict-numpy/0/core) implementierst du sigmoid, confusion und precision/recall/F1 exakt; [Final Boss: Kostengetriebene Schwellenwertsuche. `total_cost(cm, fp_cost, …](#/family/aggregate-confusion-metric/confusion-cost-report/0/stretch) verlangt die komplette Kosten-Suche über Schwellenwerte.
