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

## Wert und Typ

`3`, `3.0` und `"3"` sehen ähnlich aus, sind aber verschiedene **Typen**: `int` für ganze Zahlen, `float` für Dezimalzahlen, `str` für Zeichenketten. Dieselbe Operation bedeutet je nach Typ etwas anderes:

```python
3 + 4        # 7, Addition
"3" + "4"    # "34", Aneinanderhängen
```

Frage bei einer unerwarteten Ausgabe zuerst: Welchen Wert hat der Name? Welchen Typ hat dieser Wert? Welche Operation läuft für diesen Typ?

## Variablentausch

```python
a = 3
b = 8
temp = a
a = b
b = temp
```

`temp` rettet den Wert 3, bevor das Schild `a` umgehängt wird. Ohne diese Zwischenablage geht einer der beiden Ausgangswerte verloren.

## Wo dir das in der KI begegnet

Ein Trainingsschritt ist genau so eine Neuzuweisung: `w = w - lr * grad` wertet die rechte Seite mit dem alten Gewicht aus und hängt das Schild `w` an den neuen Wert. Der Zustand nach jedem Schritt ist das Modell. Wenn du verstehst, dass hier ein Name umgehängt wird und keine [Gleichung](#/glossary/gleichung) gelöst, liest du Update-Regeln in Papers richtig.

## Typische Fehler

- `b = a + 4` als dauerhafte Formel lesen. Es ist eine einmalige Auswertung.
- Die rechte Seite schon mit dem neuen Wert auswerten. Sie sieht immer den alten Zustand.
- Typen übersehen: `"3" + "4"` ergibt `"34"`, nicht 7.
- `x = x + 1` als Widerspruch lesen. Es ist eine Neubindung: rechts alter Wert, links neues Schild.
- In der Tabelle nur die Endwerte notieren und die Zwischenschritte verlieren.

## Kurzer Abruf

Trace ohne Ausführen:

```python
x = 5
y = x - 2
x = y + x
print(x, y)
```

Schreibe nach jeder Zeile den vollständigen Zustand auf. Führe den Code erst danach aus und vergleiche nicht nur die Endausgabe, sondern die erste abweichende Tabellenzeile.

## Begriffe auf einen Blick

- **Zustand** (englisch *state*): Gesamtheit der Namen und der Werte, an die sie gerade gebunden sind.
- **Name** (englisch *variable*): Namensschild, das Python an einen Wert hängt; kein Behälter.
- **Zuweisung** (englisch *assignment*): Anweisung `name = ausdruck`; wertet die rechte Seite aus und bindet das Ergebnis an den Namen.
- **Binden** (englisch *bind*): einen Namen an einen Wert hängen; Umbinden hängt dasselbe Schild an einen neuen Wert.
- **Wert** (englisch *value*): das konkrete Datum, an das ein Name gebunden ist, zum Beispiel 3 oder `"rot"`.
- **Typ** (englisch *type*): Art eines Werts, zum Beispiel `int`, `float` oder `str`; bestimmt, was eine Operation tut.
- **Tracetabelle** (englisch *trace table*): Tabelle mit einer Zeile pro ausgeführter Codezeile und einer Spalte pro beobachtetem Namen.
