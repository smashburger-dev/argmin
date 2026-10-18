# Eingaben, Wirkung und Vertrag klären

Eine Funktion verbindet Eingaben mit einem Ergebnis. Bevor du sie schreibst, klärst du drei Fragen: Was kommt hinein, was kommt zurück, welche Fälle sind unzulässig? Diese Lektion zeigt dir den Vertrag dahinter an einem Getränkeautomaten.

## Das Bild dahinter: der Getränkeautomat

Eine **Funktion** ist wie ein Getränkeautomat. Die **Parameter** sind Münzen und Auswahl: was du hineinsteckst. Die konkreten [Werte](#/glossary/wert) beim Einwerfen heißen **Argumente**. Das Ausgabefach ist `return`: Dort liegt der **Rückgabewert**. Das Display zeigt nur Text an, das ist `print`; vom Display kannst du nicht trinken, und `print` liefert dir als Wert `None`, also „nichts“.

Der **Vertrag** des Automaten sagt, welche Eingaben er annimmt (Vorbedingung) und was im Fach liegen muss (Nachbedingung). Was im Inneren rechnet, bleibt drin: [Namen](#/glossary/name), die nur in der Funktion existieren, heißen **lokal**; Namen außerhalb jeder Funktion heißen **global**.

Wo der Vergleich hinkt: Ein Automat hat Vorrat und [Zustand](#/glossary/zustand) und kann beim zweiten Knopfdruck leer sein. Eine gute Funktion liefert bei gleicher Eingabe jedes Mal dasselbe Ergebnis.

## Durchgerechnetes Beispiel: aus dem Vertrag ableiten

Vertrag für `clamp(value, lower, upper)`: drei Zahlen hinein, das Ergebnis liegt immer zwischen `lower` und `upper`, und es gilt die Vorbedingung `lower <= upper`.

```python
def clamp(value, lower, upper):
    assert lower <= upper
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value
```

Die **Assertion** `assert lower <= upper` ist eine Zusicherung: Stimmt sie nicht, bricht Python mit `AssertionError` ab, statt still zu rechnen. So bleibt eine Vertragsverletzung sichtbar.

Prüfbeispiele gegen den Vertrag:

```python
clamp(5, 0, 10)   # 5, normaler Fall
clamp(-2, 0, 10)  # 0, untere Grenze
clamp(13, 0, 10)  # 10, obere Grenze
clamp(5, 8, 2)    # AssertionError, Vorbedingung verletzt
```

## `return` ist nicht `print`

```python
def double(number):
    return number * 2

result = double(4)
print(result)
```

`return` legt den Wert ins Ausgabefach: `double(4)` liefert 8, die du in `result` weiterverwenden kannst. Hätte die Funktion nur `print(number * 2)`, stünde der Wert auf dem Display und `result` wäre `None`. Beim Aufruf werden die Argumente in der Schreibreihenfolge an die Parameter gebunden. Bei verschachtelten Aufrufen wie `f(g(2))` läuft zuerst die innere Funktion; ihr Rückgabewert wird zum Argument der äußeren:

```python
def f(x):
    return x + 10

def g(x):
    return x * 3

print(f(g(2)))
```

Ausgabe:

```text
16
```

`g(2)` liefert 6, und `f(6)` rechnet mit dieser 6 weiter.
