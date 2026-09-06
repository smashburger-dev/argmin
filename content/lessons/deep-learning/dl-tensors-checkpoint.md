# Checkpoint: Dimensionsverträge

Beantworte diese drei Fragen aus dem Kopf, bevor du weitermachst — jede Antwort folgt direkt aus dem Text oben.

1. Ein Batch $X$ hat die Form $(64, 10)$, die Gewichtsmatrix $W$ die Form $(3, 10)$. Welcher Vertrag verletzt ist — und welche zwei Formen müsste $W$ stattdessen haben, damit $XW$ funktioniert?
2. Warum darf ein Bias $b \in \mathbb{R}^{h}$ zeilenweise zu einer $(n, h)$-Matrix addiert werden, obwohl die Formen unterschiedlich lang sind?
3. Wie viele trainierbare Parameter hat ein Layer $12 \rightarrow 8$ mit Bias — und wie viele ein 2-Layer-MLP $12 \rightarrow 8 \rightarrow 2$ insgesamt?

Kontrolliere: (1) $W$ muss $(10, k)$ sein — transponieren oder die richtige Seite wählen; (2) Broadcasting richtet von rechts, $(h,)$ wird zu $(1, h)$ gestreckt; (3) $12 \cdot 8 + 8 = 104$ und $104 + 8 \cdot 2 + 2 = 122$.
