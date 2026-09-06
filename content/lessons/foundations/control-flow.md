# Bedingungen und Schleifen kontrollieren

Kontrollfluss entscheidet, welche Zeile wann ausgeführt wird. Formuliere eine Bedingung zuerst als klare Wahrheitsfrage. Wähle eine Schleife danach, ob du eine bekannte Folge durchläufst oder bis zu einem Zustand wiederholst.

## Bedingung vorhersagen

```python
age = 19
has_ticket = False
allowed = age >= 18 and has_ticket
```

`age >= 18` ist wahr. `has_ticket` ist falsch. Bei `and` müssen beide Teile wahr sein, also ist `allowed` falsch. Zerlege zusammengesetzte Bedingungen, bevor du den ganzen Ausdruck bewertest.

## `for` für eine Folge

```python
total = 0
for value in [4, -1, 3]:
    if value > 0:
        total = total + value
```

Die Schleife verarbeitet jedes Element genau einmal. Negative Werte ändern `total` nicht. Eine Tracetabelle enthält hier die Spalten `value`, `value > 0` und `total`.

## `while` braucht Fortschritt und Ende

```python
remaining = 10
steps = 0
while remaining > 0:
    remaining -= 3
    steps += 1
```

Prüfe bei jeder `while`-Schleife:

- Welcher Zustand macht die Bedingung irgendwann falsch?
- Verändert der Körper diesen Zustand in jedem relevanten Pfad?
- Kann die Schleife einen Wert überspringen oder unter null laufen?

Im Beispiel sinkt `remaining` in jedem Lauf. Nach vier Läufen ist es `-2`, und die Schleife endet.

## Kurzer Abruf

Ordne gedanklich die Schritte für eine Funktion, die nur gerade Werte einer Liste summiert: Akkumulator setzen, Werte durchlaufen, Gerade-Bedingung prüfen, passenden Wert addieren, Ergebnis zurückgeben. Trace danach `[3, 4, 6]` und sage das Ergebnis vor dem Ausführen voraus.
