# Checkpoint: Attention

Bevor du weitergehst, beantworte die Fragen für dich selbst:

1. Warum werden die Scores durch $\sqrt{d_k}$ geteilt, und was passiert mit der Form von $QK^\top$, wenn $Q$ plötzlich 7 Zeilen hat?
2. Ein Batch hat Sequenzlängen 5, 5 und 2 (auf 5 mit Padding aufgefüllt). Wie viele Zellen der $3\times5\times5$-Score-Matrizen müssen maskiert werden, damit Padding-Positionen als Keys unsichtbar bleiben (Ganzzahl)?
3. Bei welcher Zeile der Rechnung muss die kausale Maske eingreifen, vor oder nach dem Softmax, und warum ist $0$ als Maskenwert falsch?

Kontrolliere: (1) Skalarprodukte streuen stärker, je mehr Summanden sie haben; das Teilen hält die Scores klein, und $QK^\top$ bekommt 7 Zeilen statt $n$; (2) $15$: die drei Padding-Keys der dritten Sequenz werden für alle fünf Queries verdeckt, $3 \cdot 5$; (3) vor dem Softmax, denn $e^{-\infty} = 0$ gibt exakt Gewicht 0, während $0$ ein legaler Score ist.
