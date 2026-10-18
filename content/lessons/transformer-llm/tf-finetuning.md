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
