# Python-Zustand statt Code-Raten

Ein Python-Programm verändert einen Zustand. Der Zustand besteht hier zunächst aus Namen und den Werten, auf die diese Namen zeigen. Lies eine Zuweisung immer von rechts nach links: Zuerst wird die rechte Seite mit dem aktuellen Zustand ausgewertet. Danach bindet Python das Ergebnis an den Namen links.

## Tracetabelle

```python
a = 3
b = a + 4
a = b * 2
print(a, b)
```

| ausgeführte Zeile | `a` | `b` |
|---|---:|---:|
| `a = 3` | 3 | noch nicht gebunden |
| `b = a + 4` | 3 | 7 |
| `a = b * 2` | 14 | 7 |
| `print(a, b)` | 14 | 7 |

Die dritte Zeile verändert `a`, aber nicht rückwirkend `b`. In `b` wurde zuvor der Wert `7` gespeichert, keine dauerhafte Formel `a + 4`.

## Wert und Typ

`3`, `3.0` und `"3"` sehen ähnlich aus, haben aber verschiedene Typen. Addition bedeutet deshalb Unterschiedliches:

```python
3 + 4        # 7
"3" + "4"    # "34"
```

Frage bei einer unerwarteten Ausgabe zuerst: Welchen Wert hat der Name? Welchen Typ hat dieser Wert? Welche Operation wird für diesen Typ ausgeführt?

## Variablentausch

```python
a = 3
b = 8
temp = a
a = b
b = temp
```

`temp` rettet den alten Wert von `a`, bevor `a` überschrieben wird. Ohne diese Zwischenablage verlierst du einen der beiden Ausgangswerte.

## Kurzer Abruf

Trace ohne Ausführen:

```python
x = 5
y = x - 2
x = y + x
print(x, y)
```

Schreibe nach jeder Zeile den vollständigen Zustand auf. Führe den Code erst danach aus und vergleiche nicht nur die Endausgabe, sondern die erste abweichende Tabellenzeile.
