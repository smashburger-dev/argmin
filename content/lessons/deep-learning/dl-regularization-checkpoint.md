# Checkpoint: Regularisierung unter Kontrolle

1. Weight-Decay-Update: $w = 2{,}0$, Gradient $g = 0{,}4$, $\mathrm{lr} = 0{,}5$, $\lambda = 0{,}2$. Welchen Wert nimmt $w$ nach einem exakten Update an — und welcher Term fehlt, wenn du nur $w - \mathrm{lr} \cdot g$ rechnest?
2. Eine gezogene Maske der Länge 8 behält bei $p = 0{,}5$ zufällig 5 Aktivierungen. Mit welchem Faktor multiplizieren die erhaltenen Aktivierungen bei invertierter Skalierung, und warum bleibt der Erwartungswert über die Masken hinweg erhalten?
3. Warum liefert ein Ablationsvergleich ohne festen Seed keine Aussage über die Wirkung von $\lambda$?

Kontrolliere: (1) $w \leftarrow 2{,}0 - 0{,}5 \cdot (0{,}4 + 0{,}2 \cdot 2{,}0) = 2{,}0 - 0{,}4 = 1{,}6$ — ohne den Term $\lambda w$ käme $1{,}8$ heraus, die Strafe fehlt; (2) Faktor $1/p = 2$: im Schnitt bleiben 4 von 8 Werten erhalten und werden verdoppelt — erwartungstreu gegenüber den 8 unskalierten Werten; (3) ohne festen Seed variieren Init und Split zwischen den Läufen — die gemessene Differenz misst dann den Zufall, nicht $\lambda$.
