# Checkpoint: Training-Buchhaltung

1. $n = 250$ Beispiele, Batchgröße $B = 32$, $E = 4$ Epochen. Wie viele Optimizer-Updates enthält das Training — und warum ist es nicht $250 / 32 \cdot 4$ mit glattem Ergebnis?
2. SGD mit Momentum $\mu = 0{,}5$, $v_0 = 0$, konstanter Gradient $g = 8$. Auf welchen Wert konvergiert die Geschwindigkeit, und welche drei Werte nimmt $v$ nach den ersten drei Schritten an?
3. Trainingsverlust fällt von Epoche zu Epoche, der Validierungsverlust steigt ab Epoche 7. Wie heißt das Muster und welche zwei Gegenmaßnahmen stehen diese Lektion bereit?

Kontrolliere: (1) $\lceil 250/32 \rceil = 8$ Batches pro Epoche, also $4 \cdot 8 = 32$ Updates — der letzte Batch hat nur $250 - 7 \cdot 32 = 26$ Beispiele; (2) $g/(1 - \mu) = 16$, die Folge ist $8, 12, 14$ — jede Runde halbiert der Abstand zum Grenzwert; (3) Overfitting — früher stoppen oder regularisieren (L2/Dropout, Lektion „Regularisierung und faire Ablation“).
