# Bedingungen als Wahrheitsfragen lesen

Kontrollfluss entscheidet, welche Zeile wann ausgeführt wird. Diese Lektion zeigt dir drei Alltagsbilder dafür: einen Türsteher für `if`, eine Einkaufsliste für `for` und einen Topf Nudeln für `while`. Danach kannst du Bedingungen zerlegen und Schleifen sicher beenden.

## Das Bild dahinter: Türsteher, Einkaufsliste, Nudeltopf

Eine **Bedingung** ist eine Frage mit der Antwort **Wahrheitswert** `True` oder `False`. Ein `if` ist ein Türsteher, der zwei Dinge prüft: `age >= 18 and has_ticket` lässt nur hinein, wer alt genug ist *und* ein Ticket hat. Bei `and` müssen beide Teile wahr sein, bei `or` reicht eines, `not` dreht die Antwort um.

Eine `for`-Schleife geht eine **Einkaufsliste** Posten für Posten durch: jedes Element genau einmal, in der Reihenfolge der [Liste](#/glossary/liste).

Eine `while`-Schleife ist Nudeln kochen: Du wiederholst, bis die Probe „weich?“ wahr wird. Ohne Probieren und ohne Fortschritt kochst du ewig. Die **Abbruchbedingung** ist die Probe, der Fortschritt ist, dass die Nudeln weicher werden. Fehlt beides, hast du eine **Endlosschleife**.

Wo die Vergleiche hinken: Ein Türsteher prüft beide Papiere; Python wertet bei `and` manchmal den zweiten Teil gar nicht aus, wenn der erste schon falsch ist. Und echte Nudeln werden von selbst weich: In der Schleife muss der **Schleifenkörper** den [Zustand](#/glossary/zustand) aktiv verändern.
