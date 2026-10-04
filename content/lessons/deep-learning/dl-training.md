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

## Updates: SGD und Momentum

Reines SGD mit [Lernrate](#/glossary/lernrate) $\mathrm{lr}$ (in anderen Texten oft $\eta$ geschrieben):

$$w \leftarrow w - \mathrm{lr} \cdot g.$$

Momentum führt eine Geschwindigkeit $v$ ein, die frühere [Gradienten](#/glossary/gradient) ansammelt, wie eine rollende Kugel, die ihren Schwung behält, statt bei jeder Unebenheit neu anzufahren:

$$v \leftarrow \mu \, v + g, \qquad w \leftarrow w - \mathrm{lr} \cdot v.$$

$\mu$ (sprich: mü) ist der Schwungfaktor. Bei konstantem Gradienten wächst $v$ geometrisch gegen $g / (1 - \mu)$, bei $\mu = 0{,}5$ auf das Doppelte von $g$. Das glättet Zickzack und beschleunigt konsistente Richtungen.

## Lernraten-Schedules

Ein konstantes $\mathrm{lr}$ ist die Ausnahme, nicht die Regel. Ein Schedule legt fest, wie sich die Schrittweite über die Epochen verändert; Loss und Gradienten bleiben unverändert, nur der Faktor im Update $w \leftarrow w - \mathrm{lr}_e \cdot g$ wandert. Drei Standardformen:

- **Step Decay:** $\mathrm{lr}_e = \mathrm{lr}_0 \cdot \gamma^{\lfloor e / S \rfloor}$ ($\lfloor\cdot\rfloor$ sprich: abgerundet, $\gamma$ sprich: gamma), alle $S$ Epochen wird die Lernrate mit $\gamma$ multipliziert, typisch $0{,}5$ oder $0{,}1$; das heißt: am Anfang grob lernen, am Ende fein. Die Stufen sind feste Kalenderdaten und kennen die Kurve nicht.
- **Cosine:** $\mathrm{lr}_e = \mathrm{lr}_{\min} + \tfrac{1}{2}\,(\mathrm{lr}_0 - \mathrm{lr}_{\min})\bigl(1 + \cos(\pi e / E)\bigr)$ ($\cos$ sprich: Kosinus), glatter Abfall von $\mathrm{lr}_0$ auf $\mathrm{lr}_{\min}$ über die geplanten $E$ Epochen, ohne harte Stufe. Braucht die Gesamtepochenzahl im Voraus.
- **Reduce on Plateau:** kein Kalender, sondern ein Signal, sinkt der überwachte Verlust (meist der Validierungs-[MSE](#/glossary/mse)) für $P$ Epochen nicht mehr, wird $\mathrm{lr}$ halbiert. Reagiert auf die Kurve statt auf die Uhr, hängt aber an einer sauberen Messung: Mit verrauschtem oder unpassendem Monitor springt der Schedule zu früh oder nie.

Oft kommt ein vierter Baustein davor: **Warmup** fährt $\mathrm{lr}$ in den ersten Epochen linear von $0$ auf $\mathrm{lr}_0$ hoch. Das stabilisiert große Lernraten und ist bei Transformern Standard; auf Spielzeug-SGD ist es optional.

Praktisch: Step und Cosine sind aus der Epochennummer reproduzierbar; Plateau braucht dieselbe Validierungskurve wie das [Early Stopping](#/glossary/early-stopping) und ein Gedächtnis (wie viele Epochen ohne neue Bestmarke). Faustregel: Oszilliert der Validierungsverlust, ist $\mathrm{lr}$ zu groß; ein Schedule ist die systematische Antwort statt Hand-Justage. Auf Spielzeuggrößen reicht oft Step Decay mit $\gamma = 0{,}5$ alle $S = 100$ Epochen, um das Zittern am Ende eines konstanten $\mathrm{lr}$ zu glätten.

## Lernkurven und Overfitting

Teile die Daten **vor** dem Training: ein Trainings- und ein Validierungsanteil, erzeugt über eine Seed-Permutation. Notiere pro Epoche beide Verluste als Zahlenliste. Das diagnostische Muster:

- Beide Kurven fallen: gesundes Lernen.
- Trainingsverlust fällt, Validierungsverlust steigt wieder: **Overfitting**, das Modell memoriert Trainingsrauschen. Kandidaten: früher stoppen, regularisieren, weniger Kapazität.
- Beide Werte oszillieren oder explodieren: Lernrate zu groß (oder keine [Standardisierung](#/glossary/standardisierung) der Merkmale).
- Beide flatten sofort auf einem hohen Plateau: Lernrate zu klein oder tote [ReLU](#/glossary/relu)-Einheiten, die dauerhaft $0$ ausgeben.

Feste Seeds machen all das reproduzierbar: `rng = np.random.default_rng(seed)` für Init und Split, gleicher Seed $\Rightarrow$ gleiche Kurve. Fehlende Seeds sind die häufigste Quelle nicht reproduzierbarer Experimente.

## Wo dir das in der KI begegnet

Viele große Sprachmodelle wurden mit Warmup und anschließendem Cosine-Abfall der Lernrate trainiert, zum Beispiel GPT-3. Die Kurven dieser Lektion sind die Miniatur davon.

## Typische Fehler

- Lernrate als einzige Ursache lesen, wenn fehlende Standardisierung die eigentliche ist.
- Skalierungsstatistiken aus Trainings- und Validierungsdaten gemeinsam berechnen, [Leakage](#/glossary/leakage), wie in der Lektion [Folds erzeugen und Leakage finden](#/lesson/l-ml-cv) gezeigt.
- Schritte statt Epochen zählen und Werte nicht vergleichbar machen.
- BCE ohne Clipping auf Wahrscheinlichkeiten $0$ oder $1$ fahren.
- Ohne festen Seed zwei Läufe „vergleichen".

## Direkter Check

Rechne in einer Einstiegsaufgabe Update- und Schrittzahlen in Ganzzahlen. Lies in der [Kernaufgabe: Trainingsschleife lesen](#/family/trace-training-loop-count/training-loop-count/0/core) eine Trainingsschleife als Ausgabe vorher. In der [Kernaufgabe: MSE, BCE und Batching](#/family/optimize-training-primitive-contract/loss-and-batch-primitives/0/core) implementierst du MSE, BCE und Batching; die [Vertiefungsaufgabe: Lineare SGD-Schleife](#/family/fit-seeded-split-sgd-linear/seeded-split-sgd-linear/0/stretch) baut Split und eine lineare SGD-Schleife mit Lernkurve, und die [Herausforderung](#/family/fit-mlp-val-curve-argmin/mlp-val-curve-argmin/0/challenge) trainiert ein kleines MLP mit Validierung und bester Epoche.

## Begriffe auf einen Blick

- **Batch**: Gruppe von Beispielen, die gemeinsam durch das Netz laufen; erste Achse der Eingabe.
- **Epoche** (englisch *epoch*): ein vollständiger Durchlauf durch die Trainingsdaten.
- **Optimizer-Schritt** (englisch *optimizer step*): ein Update der Gewichte; pro Epoche $\lceil n/B \rceil$ Stück.
- **Momentum**: Update mit angesammelter Geschwindigkeit $v \leftarrow \mu v + g$.
- **Lernraten-Schedule** (englisch *learning rate schedule*): Regel, wie sich die Lernrate über die Epochen ändert.
- **Warmup**: linearer Anstieg der Lernrate von $0$ auf $\mathrm{lr}_0$ in den ersten Epochen.
- **Lernkurve** (englisch *learning curve*): Verlust pro Epoche für Training und Validierung; die Buchhaltung des Trainings.
- **Overfitting**: Trainingsverlust fällt, Validierungsverlust steigt; das Modell memoriert Rauschen.
