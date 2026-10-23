# Python-Zustand statt Code-Raten

Ein Python-Programm verändert Schritt für Schritt einen Zustand. Wer den Zustand im Kopf verfolgt, kann die Ausgabe vorhersagen, statt sie zu raten. Diese Lektion zeigt, was eine Zuweisung wirklich tut und wie du sie mit einer Tracetabelle kontrollierst.

## Das Bild dahinter: Namensschilder statt Kisten

Der **Zustand** eines Programms ist die Gesamtheit der Namen und der Werte, an die sie gerade gebunden sind. Ein **Name** (auch Variable genannt) ist dabei kein Behälter, sondern ein Namensschild: Die **Zuweisung** `a = 3` hängt das Schild `a` an den **Wert** `3`. Später kann dasselbe Schild an einem anderen Wert hängen.

Der Kontrast zu einer Tabellenkalkulation macht das klar. Eine Zelle mit `=A1+4` rechnet neu, sobald sich `A1` ändert. Python tut das nicht: Bei `b = a + 4` wertet Python die rechte Seite einmal aus, bindet `b` an den Wert `7` und vergisst die Formel. Ändert sich `a` danach, bleibt `b` bei `7`.

Wo der Vergleich hinkt: Bei Zahlen merkst du den Unterschied zwischen Kiste und Schild kaum. Bei Listen wird er wichtig, weil zwei Namen an derselben Liste hängen können; das zeigt die Lektion [Zugriff und Invarianten entscheiden](#/lesson/l-foundations-collections).

Lies eine Zuweisung immer von rechts nach links: Zuerst wird die rechte Seite mit dem aktuellen Zustand ausgewertet, dann bindet Python das Ergebnis an den Namen links. Man sagt: Der Name wird an den Wert **gebunden**.

## Durchgerechnetes Beispiel

```python
a = 3
b = a + 4
a = b * 2
print(a, b)
```

Die **Tracetabelle** notiert pro ausgeführter Zeile den Zustand danach:

| ausgeführte Zeile | `a` | `b` |
|---|---:|---:|
| `a = 3` | 3 | noch nicht gebunden |
| `b = a + 4` | 3 | 7 |
| `a = b * 2` | 14 | 7 |
| `print(a, b)` | 14 | 7 |

1. **Zeile 1**: `a` wird an 3 gebunden.
2. **Zeile 2**: Die rechte Seite `a + 4` wird mit dem aktuellen `a` zu 7 ausgewertet, `b` wird an 7 gebunden.
3. **Zeile 3**: Die rechte Seite `b * 2` ergibt 14, das Schild `a` wird umgehängt. `b` bleibt 7, weil es den Wert trägt, nicht die Formel.
4. **Ausgabe**: `14 7`.
