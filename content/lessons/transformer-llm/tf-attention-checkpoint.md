# Checkpoint: Attention

Bevor du weitergehst, beantworte die Fragen für dich selbst:

1. Warum werden die Scores durch $\sqrt{d_k}$ geteilt — und was passiert mit der Form von $QK^\top$, wenn $Q$ plötzlich 7 Zeilen hat?
2. Ein Batch hat Sequenzlängen 5, 5 und 2 (auf 5 mit Padding aufgefüllt). Wie viele Zellen der $3\times5\times5$-Score-Matrizen müssen maskiert werden, damit Padding-Positionen als Keys unsichtbar bleiben (Ganzzahl)?
3. Bei welcher Zeile der Rechnung muss die kausale Maske eingreifen — vor oder nach dem Softmax, und warum ist $0$ als Maskenwert falsch?

Kontrolliere deine Antworten an der Handrechnung in der Lektion und an den Aufgaben [w22-e2](#/exercise/w22-e2) bis [w22-e6](#/exercise/w22-e6).
