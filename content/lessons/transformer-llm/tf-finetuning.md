# Fine-Tuning: Strategien, LoRA-Mathematik, ehrliches Experimentdesign

Ein vortrainiertes Modell an eine Aufgabe anpassen, dafür gibt es drei Standardstrategien mit sehr unterschiedlichen Kosten. Diese Lektion rechnet die Mathematik exakt durch und führt aus, was ehrlich ausführbar ist: **Toy-Head-Only-Feinabstimmung und LoRA-Arithmetik an einem Mini-Netz**. Keine Aufgabe dieser Lektion behauptet, ein echtes großes Modell feinabgestimmt zu haben; das bleibt ein protokolliertes lokales Experiment.

## Das Bild dahinter: eine Köchin einarbeiten

Stell dir vor, eine erfahrene Köchin wechselt in ein neues Restaurant. **Prompting** ist, ihr Anweisungen auf einen Zettel zu legen und sonst nichts zu ändern. **Feature Extraction** ist, nur das Anrichten neu zu lernen. **Full Fine-Tuning** ist die komplette Umschulung. **LoRA** heftet kleine Korrekturnotizen an die bestehenden Rezepte, statt das Rezeptbuch neu zu schreiben.

Wo der Vergleich hinkt: Notizen an Rezepten kann jeder lesen. LoRA-Matrizen sind Zahlenblöcke, deren „Notiz“ niemand mehr als Satz interpretieren kann.

## Drei Anpassungsstrategien

**Fine-Tuning** ist das nachträgliche Trainieren eines vortrainierten Modells auf eine Aufgabe, im Gegensatz zur Inferenz, die nur rechnet und nichts lernt. Drei Strategien mit sehr unterschiedlichen Kosten:

1. **Feature Extraction**: Der vortrainierte Rumpf wird **eingefroren** (seine Gewichte bekommen keine Updates mehr); nur ein neuer, kleiner Klassifikationskopf wird trainiert. Am billigsten, manchmal zu steif.
2. **Full Fine-Tuning**: Alle Parameter werden aktualisiert. Maximale Flexibilität, maximale Kosten, und für jede Aufgabenvariante ein eigener Modellkörper (bei der 175-Milliarden-Parameter-Klasse unpraktisch, wie das LoRA-Paper argumentiert).
3. **LoRA** (englisch *low-rank adaptation*): Der Rumpf bleibt eingefroren; in jede Schicht wird eine trainierbare Rang-$r$-Zerlegung injiziert:

$$
W' = W + \Delta W, \qquad \Delta W = \frac{\alpha}{r}\,BA.
$$

Dabei hat $B$ die Form $d_{\text{out}}\times r$ und $A$ die Form $r\times d_{\text{in}}$, mit [Rang](#/glossary/rang) $r \ll \min(d_{\text{in}}, d_{\text{out}})$ (sprich: r viel kleiner als das Minimum der beiden Dimensionen). $\alpha/r$ ist eine feste Skalierung. Beim Einsatz wird $\Delta W$ einmal in $W$ eingerechnet: **keine zusätzliche Inferenzzeit**, der wesentliche Unterschied zu Adapter-Schichten, die als eigene Schicht im Pfad bleiben.

## Parameter zählen statt behaupten

Für eine Schichtmatrix $W \in \mathbb{R}^{d_{\text{out}}\times d_{\text{in}}}$:

| Strategie | freie Parameter | Beispiel $d_{\text{in}} = d_{\text{out}} = 512$, $r = 4$ |
|---|---|---|
| Full FT | $d_{\text{out}} \cdot d_{\text{in}}$ | $262\,144$ |
| LoRA | $r\,(d_{\text{in}} + d_{\text{out}})$ | $4\,096$ (ca. 1,6 %) |

Nachgerechnet: $512 \cdot 512 = 262\,144$ und $4 \cdot (512 + 512) = 4 \cdot 1\,024 = 4\,096$, das sind etwa $1{,}56\,\%$ der vollen Zahl. Das LoRA-Paper meldet für GPT-3 175B gegenüber Adam-Full-FT **10 000× weniger trainierbare Parameter und 3× weniger GPU-Speicher** bei gleicher oder besserer Qualität (RoBERTa, DeBERTa, GPT-2, GPT-3): Abstract-Fakten, die wir in [Paper in Frage, Methode und Evidenz zerlegen](#/lesson/l-tf-papers) als Evidenzkarten wiederlesen.

## Toy-Head-FT: das Ehrlich-Ausführbare

Wir nehmen ein Mini-MLP: Rumpf $h = \mathrm{relu}(XW_1^\top)$ eingefroren, Kopf $W_2$ trainierbar. Nur der Kopf bekommt den [Gradientenabstieg](#/glossary/gradient) auf den MSE. Zwei Prüfungen machen das Experiment glaubwürdig:

- **Freeze-Checksumme**: Der Rumpf darf sich nicht ändern; der Test hält eine Kopie von $W_1$ und vergleicht nach dem Training.
- **Val-Schwellwert**: Vorab festgelegt („Validierungs-MSE sinkt unter die Hälfte des Anfangswerts“), gemessen nach dem letzten Schritt, nicht beim besten Zwischenschritt.

## Evaluationsdesign: eine Variable, ein Seed, eine Metrik

Ein Fine-Tuning-Vergleich ist nur so gut wie sein Design:

1. **Genau eine Variable ändern** (z. B. LoRA-Rang $r$); alles andere, Daten, Split, Lernrate, Epochen, Seed, bleibt fixiert. Sonst misst du ein Bündel von Unterschieden.
2. **Fester [Seed](#/glossary/seed)**: `np.random.default_rng(seed)` in Initialisierung und Split; derselbe Seed liefert dasselbe Ergebnis.
3. **Metrik vorab festlegen** (inklusive Richtung und Schwellwert), bevor irgendein Ergebnis gesehen wird; nachträglich gewählte Metriken sind Glückssache.
4. **[Baseline](#/glossary/baseline) nicht vergessen**: Gegen die triviale Baseline (letzte Schicht oder Häufigkeitsklasse) gewinnen zu müssen, ist die niedrigste Ehrengrenze.
5. **Nur der Validierungs- oder Testwert zählt**, nie der Trainingswert: Ein Kopf, der den Trainingsfehler null bekommt, kann auf Val schlecht sein.

## Ressourcen-Realität

Full FT eines großen Modells braucht vielfache Speicher- und Rechenzeit pro Aufgabenvariante; LoRA trainiert einen Bruchteil der Parameter und lagert pro Aufgabe nur $A$ und $B$ (Megabytes statt Modellkopien). Diese Arithmetik kannst du an jeder Schicht exakt nachrechnen; sie ist das vertrauenswürdige Gegenstück zu Marketingzahlen.

## Typische Fehler

- $\Delta W = BA$ ohne $\alpha/r$ oder mit falscher Achsenreihenfolge: $BA$ hat Form $d_{\text{out}}\times d_{\text{in}}$, $AB$ hätte sie vertauscht (und einen anderen Rang-Vertrag).
- „Eingefroren“ behauptet, aber der Optimierer bekommt doch alle Parameter (Freeze-Checksumme fehlt).
- Zwei Änderungen gleichzeitig (Rang und Lernrate) und dem Rang den Effekt zugeschrieben.
- Metrik oder Schwellwert nach dem ersten Lauf gewählt.
- Validierung auf Trainingsdaten: das bekannteste [Leakage](#/glossary/leakage) aus [Folds erzeugen und Leakage finden](#/lesson/l-ml-cv).

## Wo dir das in der KI begegnet

Das LoRA-Paper (Hu et al., 2021) berichtet für GPT-3 175B rund 10 000-mal weniger trainierbare Parameter als Full Fine-Tuning. Viele offene Modelle werden heute genau so an Aufgaben angepasst: Der Rumpf bleibt stehen, und pro Aufgabe liegt nur ein kleiner Adapter-Satz vor.

## Direkter Check

Zähle LoRA-Parameter in einer Einstiegsaufgabe. Rechne $\Delta W$ exakt in der [Kernaufgabe: LoRA-Arithmetik](#/family/formula-lora-delta-apply/lora-delta-apply/0/core) (`lora_delta`, `apply_lora`). In der [Vertiefungsaufgabe: Head-Only-Finetuning](#/family/optimize-gradient-update-rule/head-only-finetune/0/stretch) trainierst du nur den Kopf am Toy-MLP mit Freeze-Checksumme und Val-Schwellwert; die [Herausforderung](#/family/optimize-gradient-update-rule/lora-fit-toy/0/challenge) ist der LoRA-Gradienten-Endgegner.

## Begriffe auf einen Blick

- **Fine-Tuning**: nachträgliches Trainieren eines vortrainierten Modells auf eine Aufgabe; im Gegensatz zur Inferenz ändern sich Gewichte.
- **Kopf (Ausgabe)** (englisch *output head*): die letzte, aufgabenspezifische Schicht; nicht zu verwechseln mit dem Attention-Kopf.
- **Eingefroren** (englisch *frozen*): ein Gewicht bekommt keine Updates mehr; wird durch eine Checksumme geprüft.
- **LoRA** (englisch *low-rank adaptation*): Fine-Tuning-Strategie, die den Rumpf einfriert und trainierbare Rang-r-Zerlegungen injiziert.
- **Adapter**: kleine trainierbare Schicht im Pfad des Modells; kostet im Gegensatz zu LoRA Inferenzzeit.
- **Freeze-Checksumme**: Kopie der eingefrorenen Gewichte, mit der nach dem Training verglichen wird.
