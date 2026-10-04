# Bedingungen als Wahrheitsfragen lesen

Kontrollfluss entscheidet, welche Zeile wann ausgeführt wird. Diese Lektion zeigt dir drei Alltagsbilder dafür: einen Türsteher für `if`, eine Einkaufsliste für `for` und einen Topf Nudeln für `while`. Danach kannst du Bedingungen zerlegen und Schleifen sicher beenden.

## Das Bild dahinter: Türsteher, Einkaufsliste, Nudeltopf

Eine **Bedingung** ist eine Frage mit der Antwort **Wahrheitswert** `True` oder `False`. Ein `if` ist ein Türsteher, der zwei Dinge prüft: `age >= 18 and has_ticket` lässt nur hinein, wer alt genug ist *und* ein Ticket hat. Bei `and` müssen beide Teile wahr sein, bei `or` reicht eines, `not` dreht die Antwort um.

Eine `for`-Schleife geht eine **Einkaufsliste** Posten für Posten durch: jedes Element genau einmal, in der Reihenfolge der [Liste](#/glossary/liste).

Eine `while`-Schleife ist Nudeln kochen: Du wiederholst, bis die Probe „weich?“ wahr wird. Ohne Probieren und ohne Fortschritt kochst du ewig. Die **Abbruchbedingung** ist die Probe, der Fortschritt ist, dass die Nudeln weicher werden. Fehlt beides, hast du eine **Endlosschleife**.

Wo die Vergleiche hinken: Ein Türsteher prüft beide Papiere; Python wertet bei `and` manchmal den zweiten Teil gar nicht aus, wenn der erste schon falsch ist. Und echte Nudeln werden von selbst weich: In der Schleife muss der **Schleifenkörper** den [Zustand](#/glossary/zustand) aktiv verändern.

## Bedingung vorhersagen

```python
age = 19
has_ticket = False
allowed = age >= 18 and has_ticket
```

`age >= 18` ist wahr. `has_ticket` ist falsch. Bei `and` müssen beide Teile wahr sein, also ist `allowed` falsch. Zerlege zusammengesetzte Bedingungen immer erst in ihre Teile.

## `for` für eine Folge

```python
total = 0
for value in [4, -1, 3]:
    if value > 0:
        total = total + value
```

Die Schleife verarbeitet jedes Element genau einmal; die Zeilen darunter bilden den Schleifenkörper. Negative Werte ändern `total` nicht. Eine [Tracetabelle](#/glossary/tracetabelle) enthält hier die Spalten `value`, `value > 0` und `total`; das Ergebnis ist `7`.

Durchläuft die Schleife eine Zeichenkette, liefert sie Buchstaben einzeln. Zeichenketten sind in Python unveränderlich: `"a"[0] = "b"` scheitert mit `TypeError`. Suche und baue stattdessen einen neuen String, etwa mit `neu += w[0]`.

## `while` braucht Fortschritt und Ende

```python
remaining = 10
steps = 0
while remaining > 0:
    remaining -= 3
    steps += 1
```

Prüfe bei jeder `while`-Schleife drei Dinge:

- Welcher Zustand macht die Bedingung irgendwann falsch?
- Verändert der Körper diesen Zustand in jedem relevanten Pfad?
- Kann die Schleife einen Wert überspringen oder unter null laufen?

Im Beispiel sinkt `remaining` in jedem Lauf um 3: 10, 7, 4, 1, -2. Nach vier Läufen ist die Bedingung falsch, die Schleife endet mit `steps = 4`.

Ein Körper wie `remaining += 1` liefe dagegen ewig, weil er vom Abbruch wegzeigt.

## Wo dir das in der KI begegnet

`for epoch in range(E)` ist die äußere Trainingsschleife eines Modells: eine bekannte Folge, `E` mal. [Early Stopping](#/glossary/early-stopping) ist eine Abbruchbedingung im `while`-Sinn: Wiederhole, bis sich die Bewertung nicht mehr verbessert. Beides sind Schleifen mit bewusst gewähltem Ende.

## Typische Fehler

- `and` und `or` verwechseln: `and` verlangt beide Teile, `or` reicht eins.
- Einrückung vertauschen: Eine Zeile, die nicht zum Schleifenkörper gehört, läuft nur einmal statt pro Durchlauf.
- Eine `while`-Schleife ohne Fortschritt im Körper. Dann wird die Bedingung nie falsch.
- `for` nehmen, wenn die Anzahl der Wiederholungen nicht vorher feststeht; das ist der `while`-Fall.

## Kurzer Abruf

Ordne gedanklich die Schritte für eine [Funktion](#/glossary/funktion), die nur gerade Werte einer Liste summiert: Akkumulator setzen, Werte durchlaufen, Gerade-Bedingung prüfen, passenden Wert addieren, Ergebnis zurückgeben. Trace danach `[3, 4, 6]` und sage das Ergebnis vor dem Ausführen voraus.

## Begriffe auf einen Blick

- **Bedingung** (englisch *condition*): Ausdruck, der zu `True` oder `False` ausgewertet wird und steuert, ob ein Zweig läuft.
- **Wahrheitswert** (englisch *boolean*): einer der beiden Werte `True` oder `False`.
- **Schleife** (englisch *loop*): wiederholte Ausführung eines Codeblocks; `for` läuft eine Folge ab, `while` läuft, bis die Bedingung falsch wird.
- **Schleifenkörper** (englisch *loop body*): die eingerückten Zeilen, die pro Durchlauf ausgeführt werden.
- **Abbruchbedingung** (englisch *termination condition*): Bedingung, die eine `while`-Schleife beendet; ohne sie läuft die Schleife endlos.
- **Endlosschleife** (englisch *infinite loop*): Schleife, deren Bedingung nie falsch wird; läuft ohne Fortschritt ewig weiter.
