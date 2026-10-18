# Training Loops: Loss, Lernrate, Lernkurven

Ein Training ist eine Schleife mit vier Bausteinen: Vorwärts (Loss), rückwärts (Gradienten), Update (Optimizer), Buchhaltung (Lernkurve). Diese Lektion baut solche Schleifen auf kleinen synthetischen Daten, $n \le 300$ Zahlenpaare aus `np.random.default_rng(seed)`. Die Größen sind Spielzeug, die Mechanik ist dieselbe wie im Großen.

## Das Bild dahinter: Das Übungsbuch

Stell dir ein Übungsbuch vor: Eine **Epoche** ist einmal das ganze Buch durchrechnen, ein **Batch** ist eine Seite, und der Optimizer-Schritt ist die Korrektur nach jeder Seite. Die Lernkurven sind dann Übungsaufgabe gegen Probeklausur: Fallen beide, lernst du. Fällt nur die Übungsaufgabe, während die Klausur schlechter wird, hast du auswendig gelernt, Überanpassung.

Wo der Vergleich hinkt: Ein Übungsbuch hat feste Aufgaben; Trainingsdaten sind verrauscht, und das Modell verändert sich mit jeder Korrektur.

## Loss: MSE und BCE

Für Regression misst der mittlere quadratische Fehler:

$$L_{\mathrm{MSE}} = \frac{1}{n} \sum_i (\hat{y}_i - y_i)^2.$$

Für binäre Klassifikation ist das Gegenstück die Kreuzentropie, mit Wahrscheinlichkeiten $p \in (0,1)$:

$$L_{\mathrm{BCE}} = -\frac{1}{n} \sum_i \big(y_i \log p_i + (1 - y_i)\log(1 - p_i)\big).$$

BCE hat eine numerische Falle: $\log(0)$ ist $-\infty$. Deshalb werden Wahrscheinlichkeiten vor dem [Logarithmus](#/glossary/logarithmus) geclippt, etwa auf $[\varepsilon, 1 - \varepsilon]$ mit $\varepsilon = 10^{-12}$ (sprich: epsilon); das ist eine Stabilitätsmaßnahme, kein Modellbestandteil.

## Batch, Epoche, Schritt

Drei Zähler, oft verwechselt: Ein **Batch** ist die Gruppe von Beispielen pro Update; eine **Epoche** ist ein vollständiger Durchlauf durch die Daten; die Zahl der **Optimizer-Schritte** pro Epoche ist $\lceil n / B \rceil$ ($\lceil\cdot\rceil$ sprich: aufgerundet auf die nächste ganze Zahl), denn der letzte Batch darf kleiner sein. Über $E$ Epochen sind es $E \cdot \lceil n / B \rceil$ Updates. Full-Batch ($B = n$) macht einen Schritt pro Epoche; das ist für Spielzeuggrößen in Ordnung und deterministisch.

Das kleine Buch unten hat vier Seiten. Jeder Batch verwendet zur Übersicht denselben Verlust $L(w)=w^2$ bei festem Bias null. Start ist $w=2$ und die Lernrate $\eta=0{,}4$. Nach jeder Seite gilt $w\leftarrow w-\eta\cdot2w$. Reale Batches besitzen unterschiedliche Gradienten; die Figur isoliert zunächst die Zählweise.
