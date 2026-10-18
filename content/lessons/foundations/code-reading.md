# Programme simulieren statt raten

Code lesen ist eine eigene Fertigkeit: Du musst nichts erfinden, du simulierst die Regeln der Sprache Zeile für Zeile. Diese Lektion zeigt dir das Handwerkszeug dafür und warum sich das im maschinellen Lernen direkt auszahlt.

## Das Bild dahinter: das Kassenbuch

Ein **Trace** ist die schriftliche Simulation eines Programms. Stell dir ein Kassenbuch vor: Jede ausgeführte Zeile ist eine Buchung, jede Spalte ein Konto, also ein [Variablenname](#/glossary/variable). Du spielst den Computer und trägst Wert für Wert ein.

Wo der Vergleich hinkt: Ein Kassenbuch läuft Zeile für Zeile nach unten. Code springt: Bei einer [Bedingung](#/glossary/bedingung) werden Zeilen übersprungen, bei einer [Schleife](#/glossary/schleife) kehrt dieselbe Zeile mehrfach zurück. Die Tabelle trägt deshalb pro **Schleifendurchlauf** eine eigene Zeile.

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
| Start | noch keiner | noch nicht geprüft | 0 |
| 1 | 2 | falsch | -1 |
| 2 | 5 | wahr | 4 |
| 3 | 1 | falsch | 3 |

Die Ausgabe ist `3`. Der häufigste Lesefehler ist, nur die Zeilen im wahren Zweig zu beachten oder `total` in jedem Lauf gedanklich auf null zu setzen.
