# Logistische Regression und Klassifikationsmetriken

Ob Spam im Postfach, Betrug an der Kasse oder ein positiver Test: KI-Systeme treffen ständig Ja/Nein-Entscheidungen. Diese Lektion zeigt dir, wie aus einer Wahrscheinlichkeit eine Entscheidung wird und wie du ihre Güte misst. Im Detail geht es darum, wie aus einem Zahlenwert eine Ja/Nein-Entscheidung wird, wie die Zahlen TP, FP, FN und TN zusammenwirken und warum es eine Frage der Kosten ist, wie wählerisch ein Modell sein soll.

## Das Bild dahinter: Fischernetz

Stell dir ein Netz vor, das Fische aus dem Wasser holt. Der **Recall** (Trefferquote) fragt: Welcher Anteil der Fische im See landet im Netz? Die **Präzision** fragt: Welcher Anteil des Netzinhalts ist wirklich Fisch, und nicht Stiefel oder Wasser? Der **Schwellenwert** entscheidet, wie wählerisch du beim Behalten bist: Ein hohes $t$ lässt nur sichere Kandidaten hängen, ein niedriges fängt fast alles.

Wo der Vergleich hinkt: Fische zählen sich nicht selbst. Ohne Labels weißt du nicht, wie viele Fische der See enthält, und die falsch negativen Fälle bleiben dir unsichtbar.

## Vom Score zur Wahrscheinlichkeit

Die logistische Regression berechnet zuerst einen **Score** $z = w^\top x$ (sprich: w transponiert mal x, ein [Skalarprodukt](#/glossary/skalarprodukt) aus Gewichten und Merkmalen). Die **Sigmoid-Funktion** $\sigma(z)$ (sprich: Sigma von z) drückt ihn in den Bereich zwischen 0 und 1:

$$
\sigma(z) = \frac{1}{1 + e^{-z}}.
$$

Dabei ist $e \approx 2{,}718$ die eulersche Zahl ist. Ausgewertet: $\sigma(0) = 0{,}5$, $\sigma(2) \approx 0{,}881$, $\sigma(-2) \approx 0{,}119$. Die [Funktion](#/glossary/funktion) ist symmetrisch: $\sigma(-z) = 1 - \sigma(z)$. Ein $z$ von $0$ bedeutet „unentschieden“: Die Sigmoid gibt $0{,}5$ aus, und erst der Schwellenwert entscheidet. Die Ausgabe wird als Wahrscheinlichkeit für Klasse 1 gelesen, ob sie stimmt, also kalibriert ist, musst du separat prüfen.

## Verlust ohne geschlossene Form

Die logistische Regression minimiert den **Log-Loss** (Kreuzentropie):

$$
L = -\sum_i \left[ y_i \log p_i + (1 - y_i)\log(1 - p_i) \right].
$$

Dabei ist $\log$ der natürliche [Logarithmus](#/glossary/logarithmus) und $p_i = \sigma(w^\top x_i)$ die vorhergesagte Wahrscheinlichkeit für Klasse 1. Wer sich stark irrt, wird überproportional bestraft: Sagt ein Wetterbericht „99 % Sonne“ und es regnet, kostet das $-\log(0{,}01) \approx 4{,}6$; bei „60 % Sonne“ sind es nur $-\log(0{,}4) \approx 0{,}9$. Anders als die lineare Regression hat die logistische **keine geschlossene Lösung**, die Gewichte werden mit [Gradientenabstieg](#/glossary/gradient) gelernt, wie in der Lektion [Gradienten von Hand herleiten](#/lesson/l-grad-regression) geübt.

scikit-learns `LogisticRegression` und `predict_proba` liest du als API-Kompetenz; im Browser dieser Plattform läuft sklearn nicht.

## Konfusionsmatrix und Metriken

Mit einem **Schwellenwert** $t$ werden Wahrscheinlichkeiten zu Labels: vorhergesagte Klasse 1 genau dann, wenn $p \geq t$. Daraus entsteht die Konfusionsmatrix mit den vier Zählern:

- **TP** (true positive, richtig positiv): Fisch gemeldet und es war einer.
- **FP** (false positive, falsch positiv): Fisch gemeldet, aber es war ein Stiefel.
- **FN** (false negative, falsch negativ): Fisch übersehen.
- **TN** (true negative, richtig negativ): kein Fisch und kein Alarm.

Durchgerechnetes Beispiel: TP $= 40$, FP $= 10$, FN $= 20$, TN $= 30$.

$$
\text{Präzision} = \frac{TP}{TP + FP} = \frac{40}{50} = 0{,}8
\qquad
\text{Recall} = \frac{TP}{TP + FN} = \frac{40}{60} = \tfrac{2}{3}.
$$

Das **harmonische Mittel** beider Größen ist der **F1-Score**. Es betont den kleineren der beiden Werte stärker:

$$
F_1 = \frac{2 \cdot \text{Präzision} \cdot \text{Recall}}{\text{Präzision} + \text{Recall}} = \frac{2 \cdot 0{,}8 \cdot \tfrac{2}{3}}{0{,}8 + \tfrac{2}{3}} = \frac{8}{11} \approx 0{,}727.
$$

Die **Accuracy** (Treffergenauigkeit) ist der Anteil korrekter Vorhersagen: $(TP + TN) / (TP + TN + FP + FN) = 70/100 = 0{,}7$. Sind 90 % der Fälle negativ, erreicht ein Modell, das immer „negativ“ sagt, 90 % Accuracy und findet keinen einzigen positiven Fall.

## Schwellenwert und Fehlerkosten

$t = 0{,}5$ ist keine Naturkonstante. Höheres $t$: weniger FP, mehr FN. Tieferes $t$: umgekehrt. Sind die Kosten ungleich, verschiebt sich das Optimum. Mit Kosten $K_{FP}$ pro False Positive und $K_{FN}$ pro False Negative gilt

$$
\text{Kosten} = FP \cdot K_{FP} + FN \cdot K_{FN}.
$$

Beispiel Spamfilter: Eine gelöschte wichtige E-Mail (FP) schadet 50 €, zugestellter Spam (FN) 0,50 €. Bei $FP = 4$, $FN = 2$ kosten die Fehler $4 \cdot 50\,\text{€} = 200\,\text{€}$ und $2 \cdot 0{,}50\,\text{€} = 1\,\text{€}$, zusammen 201 €, der hohe FP-Anteil dominiert, also lohnt sich ein höherer Schwellenwert, auch wenn der Recall sinkt.

## Wo dir das in der KI begegnet

Sprachmodelle lernen das nächste Token mit Kreuzentropie, der Mehrklassen-Version des Log-Loss. Für das richtige nächste Token zahlt das Modell $-\log p$, und [Softmax](#/glossary/softmax) verallgemeinert die Sigmoid auf viele Klassen.

## Typische Fehler

- Accuracy als alleinige Metrik bei unbalancierten Klassen feiern: Bei 90 % negativen Fällen findet „immer negativ“ nichts und erreicht trotzdem 90 %.
- Präzision und Recall vertauschen, der Nenner verwechselt.
- Den Schwellenwert 0,5 als kostenoptimal behandeln, ohne FP/FN-Kosten zu prüfen.
- Die Ausgabe der Sigmoid als „Anteil“ oder „Score“ missdeuten, sie ist als Wahrscheinlichkeit für Klasse 1 gemeint, und ihre Kalibrierung muss geprüft werden.
- F1 für Nicht-Binärfälle ungeprüft übernehmen, obwohl macro/micro-Verfahren unterschiedliche Aussagen machen.

## Direkter Check

Zähle in einer Einstiegsaufgabe Konfusionsmatrix-Summen nach. Die [Kernaufgabe: Schwellenwert-Entscheidung](#/family/aggregate-confusion-metric/threshold-under-asymmetric-cost/0/core) prüft die Schwellenwert-Entscheidung bei ungleichen Kosten. In der [Kernaufgabe: Sigmoid und Konfusionsmetriken](#/family/aggregate-confusion-metric/sigmoid-predict-numpy/0/core) implementierst du sigmoid, confusion und precision/recall/F1 exakt; die [Vertiefungsaufgabe: Kostengetriebene Schwellensuche](#/family/aggregate-confusion-metric/confusion-cost-report/0/stretch) verlangt die komplette Kosten-Suche über Schwellenwerte.

## Begriffe auf einen Blick

- **Sigmoid**: Funktion $\sigma(z) = 1/(1 + e^{-z})$, die jeden Score in den Bereich zwischen 0 und 1 drückt.
- **Score** (englisch *logit*): Zahlenwert $z = w^\top x$ vor der Sigmoid; $z = 0$ heißt unentschieden.
- **Log-Loss**: Verlust $-\log p$ für die richtige Klasse; bei zwei Klassen auch Kreuzentropie genannt.
- **Schwellenwert** (englisch *threshold*): Grenze $t$, ab der eine Wahrscheinlichkeit als Klasse 1 zählt.
- **Konfusionsmatrix** (englisch *confusion matrix*): die vier Zähler TP, FP, FN, TN einer Klassifikation.
- **Präzision** (englisch *precision*): Anteil der als positiv gemeldeten Fälle, die stimmen.
- **Recall**: Anteil der tatsächlich positiven Fälle, die gefunden werden.
- **F1-Score**: harmonisches Mittel aus Präzision und Recall.
- **Accuracy**: Anteil aller korrekten Vorhersagen; bei unbalancierten Klassen täuschend.
