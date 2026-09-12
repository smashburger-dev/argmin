# Training Loops: Loss, Lernrate, Lernkurven

Ein Training ist eine Schleife mit vier Bausteinen: Vorwärts (Loss), rückwärts (Gradienten), Update (Optimizer), Buchhaltung (Lernkurve). Diese Lektion baust du solche Schleifen auf kleinen synthetischen Daten — $n \le 300$, Tabellar-Features, erzeugt mit `np.random.default_rng(seed)`. Kein GPU-Training, kein Modepaket: Toy-Größen, ehrlich benannt, aber die Mechanik ist dieselbe wie im Großen.

## Loss: MSE und BCE

Für Regression misst der mittlere quadratische Fehler

$$L_{\mathrm{MSE}} = \frac{1}{n} \sum_i (\hat{y}_i - y_i)^2,$$

für binäre Klassifikation die Cross-Entropy mit Wahrscheinlichkeiten $p \in (0,1)$:

$$L_{\mathrm{BCE}} = -\frac{1}{n} \sum_i \big(y_i \log p_i + (1 - y_i)\log(1 - p_i)\big).$$

BCE hat eine numerische Falle: $\log(0)$ ist $-\infty$. Deshalb werden Wahrscheinlichkeiten vor dem Logarithmus geclippt, etwa auf $[\varepsilon, 1 - \varepsilon]$ mit $\varepsilon = 10^{-12}$ — eine Stabilitätsmaßnahme, kein Modellbestandteil.

## Batch, Epoche, Schritt

Drei Zähler, oft verwechselt: Ein **Batch** ist die Gruppe von Beispielen pro Update; eine **Epoche** ist ein vollständiger Durchlauf durch die Daten; die Zahl der **Optimizer-Schritte** pro Epoche ist $\lceil n / B \rceil$ — der letzte Batch darf kleiner sein. Über $E$ Epochen sind es $E \cdot \lceil n / B \rceil$ Updates. Full-Batch ($B = n$) macht einen Schritt pro Epoche; das ist für Toy-Größen in Ordnung und deterministisch.

## Updates: SGD und Momentum

Reines SGD mit Lernrate $\mathrm{lr}$:

$$w \leftarrow w - \mathrm{lr} \cdot g.$$

Momentum führt eine Geschwindigkeit $v$ ein, die frühere Gradienten ansammelt:

$$v \leftarrow \mu \, v + g, \qquad w \leftarrow w - \mathrm{lr} \cdot v.$$

Bei konstantem Gradienten wächst $v$ geometrisch gegen $g / (1 - \mu)$ — bei $\mu = 0{,}5$ auf das Doppelte von $g$. Das glättet Zickzack und beschleunigt konsistente Richtungen.

## Lernraten-Schedules

Ein konstantes $\mathrm{lr}$ ist die Ausnahme, nicht die Regel. Ein Schedule legt fest, wie sich die Schrittweite über die Epochen verändert — Loss und Gradienten bleiben unverändert, nur der Faktor im Update $w \leftarrow w - \mathrm{lr}_e \cdot g$ wandert. Drei Standardformen:

- **Step Decay:** $\mathrm{lr}_e = \mathrm{lr}_0 \cdot \gamma^{\lfloor e / S \rfloor}$ — alle $S$ Epochen wird die Lernrate mit $\gamma$ (typisch $0{,}5$ oder $0{,}1$) multipliziert. Grob lernen am Anfang, fein am Ende; die Stufen sind ein festes Kalenderdatum und kennen die Kurve nicht.
- **Cosine:** $\mathrm{lr}_e = \mathrm{lr}_{\min} + \tfrac{1}{2}\,(\mathrm{lr}_0 - \mathrm{lr}_{\min})\bigl(1 + \cos(\pi e / E)\bigr)$ — glatter Abfall von $\mathrm{lr}_0$ auf $\mathrm{lr}_{\min}$ über die geplanten $E$ Epochen, ohne harte Stufe. Braucht die Gesamtepochenzahl im Voraus.
- **Reduce on Plateau:** kein Kalender, sondern ein Signal — sinkt der überwachte Verlust (meist der Validierungs-MSE) für $P$ Epochen nicht mehr, wird $\mathrm{lr}$ halbiert. Reagiert auf die Kurve statt auf die Uhr, hängt aber an einer sauberen Messung: mit verrauschtem oder unpassendem Monitor springt der Schedule zu früh oder nie.

Oft kommt ein vierter Baustein davor: **Warmup** fährt $\mathrm{lr}$ in den ersten Epochen linear von $0$ auf $\mathrm{lr}_0$ hoch — das stabilisiert große Lernraten und ist bei Transformern Standard, auf Toy-SGD optional.

Praktisch: Step und Cosine sind aus der Epochennummer reproduzierbar; Plateau braucht dieselbe Validierungskurve wie das Early Stopping und ein Gedächtnis (wie viele Epochen ohne neue Bestmarke). Faustregel: oszilliert der Validierungsverlust, ist $\mathrm{lr}$ zu groß — ein Schedule ist die systematische Antwort statt Hand-Justage. Auf Toy-Größen reicht oft schon Step Decay mit $\gamma = 0{,}5$ alle $S = 100$ Epochen, um das Zittern am Ende eines konstanten $\mathrm{lr}$ zu glätten.

## Lernkurven und Overfitting

Teile die Daten **vor** dem Training: ein Trainings- und ein Validierungsanteil, erzeugt über eine Seed-Permutation. Notiere pro Epoche beide Verluste als Zahlenliste. Das diagnostische Muster:

- Beide Kurven fallen: gesundes Lernen.
- Trainingsverlust fällt, Validierungsverlust steigt wieder: **Overfitting** — das Modell memoriert Trainingsrauschen. Kandidaten: früher stoppen, regularisieren, weniger Kapazität.
- Beide Werte oszillieren oder explodieren: Lernrate zu groß (oder keine Standardisierung der Features).
- Beide flatten sofort auf einem hohen Plateau: Lernrate zu klein oder tot ReLU-Feld.

Feste Seeds machen all das reproduzierbar: `rng = np.random.default_rng(seed)` für Init und Split, gleicher Seed $\Rightarrow$ gleiche Kurve. Fehlende Seeds sind die häufigste Quelle nicht reproduzierbarer Experimente.

## Typische Fehler

- Lernrate als einzige Ursache lesen, wenn fehlende Standardisierung die eigentliche ist.
- Validierungsverlust auf Trainingsgewichten mitteln, nachdem in den Validierungsdaten skaliert wurde (Leakage aus der Lektion „Cross-Validation und Leakage-Kontrolle“).
- Schritte statt Epochen zählen und Werte nicht vergleichbar machen.
- BCE ohne Clipping auf Wahrscheinlichkeiten $0$ oder $1$ fahren.
- Ohne festen Seed zwei Läufe "vergleichen".

## Direkter Check

Rechne in einer Einstiegsaufgabe Update- und Schrittzahlen in Ganzzahlen. Lies in der [Kernaufgabe](#/family/trace-training-loop-count/training-loop-count/0/core) eine Trainingsschleife als Ausgabe vorher. In der [Kernaufgabe](#/family/optimize-training-primitive-contract/loss-and-batch-primitives/0/core) implementierst du MSE, BCE und Batching; die [Vertiefungsaufgabe](#/family/fit-seeded-split-sgd-linear/seeded-split-sgd-linear/0/stretch) baut Split und eine lineare SGD-Schleife mit Lernkurve, und die [Herausforderung](#/family/fit-mlp-val-curve-argmin/mlp-val-curve-argmin/0/challenge) trainiert ein kleines MLP mit Validierung und bester Epoche.
