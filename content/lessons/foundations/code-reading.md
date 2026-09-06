# Code Zeile für Zeile tracen

Code lesen ist eine eigene Fertigkeit. Du musst dabei nichts erfinden. Du simulierst die Regeln der Sprache und hältst nur die Werte fest, die sich ändern.

## Schleife tracen

```python
total = 0
for number in [2, 5, 1]:
    if number > 2:
        total = total + number
    else:
        total = total - 1
print(total)
```

| Lauf | `number` | Bedingung `number > 2` | `total` danach |
|---:|---:|---|---:|
| Start | noch keiner | – | 0 |
| 1 | 2 | falsch | -1 |
| 2 | 5 | wahr | 4 |
| 3 | 1 | falsch | 3 |

Die Ausgabe ist `3`. Der häufigste Lesefehler ist, nur die Zeilen im wahren Zweig zu beachten oder `total` in jedem Lauf gedanklich auf null zu setzen.

## Drei getrennte Fragen

1. Welche Zeile wird als Nächstes ausgeführt?
2. Welche Namen werden in dieser Zeile gelesen?
3. Welcher Name wird danach neu gebunden?

Wenn du diese Fragen beantwortest, bleibt die Tracetabelle klein. Werte, die sich nicht ändern, musst du nicht in jeder Spalte wiederholen.

## Predict, dann Run

Sage eine Ausgabe zuerst schriftlich vorher. Führe den Code danach aus. Wenn beides abweicht, suche die erste unterschiedliche Zustandszeile. Die letzte Ausgabe allein zeigt nicht, wo dein Modell falsch wurde.

## Kurzer Abruf

Gehe dieses Programm mit einer Tabellenzeile pro Schleifenlauf durch:

```python
result = 1
for n in range(1, 4):
    result = result * n
print(result)
```

Begründe außerdem, welche Werte `range(1, 4)` tatsächlich liefert. Ändere erst danach die obere Grenze und sage die neue Ausgabe voraus.
