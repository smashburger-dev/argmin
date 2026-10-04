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

## Bausteine, die du tracest

Drei Ausdrucksformen tauchen in den Aufgaben häufig auf.

Ein Slice `wort[a:b]` schneidet Zeichen von Position `a` bis vor `b`, Start inklusive, Ende exklusive: `"python"[1:4]` ergibt `"yth"`.

Ein `sep.join(teile)` verbindet eine Liste von Zeichenketten mit `sep` dazwischen: `"-".join(["a", "b"])` ergibt `"a-b"`.

Eine List-Comprehension `[n * 2 for n in zahlen if n > 0]` baut eine neue Liste: Sie läuft `zahlen` durch, prüft die Bedingung und sammelt den Ausdruck vor `for`. Für `zahlen = [-1, 2, 3]` kommt `[4, 6]` heraus.

Die Laufzahlen einer `for`-Schleife liefert `range(a, b)`: Start inklusive, Ende exklusive. `range(1, 4)` liefert 1, 2, 3.

## Drei getrennte Fragen

1. Welche Zeile wird als Nächstes ausgeführt?
2. Welche Namen werden in dieser Zeile gelesen?
3. Welcher Name wird danach neu gebunden?

Wenn du diese Fragen beantwortest, bleibt die Tabelle klein. Werte, die sich nicht ändern, musst du nicht in jeder Spalte wiederholen.

## Predict, dann Run

Sage eine Ausgabe zuerst schriftlich vorher. Führe den Code danach aus. Weicht beides ab, suche die erste unterschiedliche [Zustandszeile](#/glossary/zustand). Die letzte Ausgabe allein zeigt nicht, wo dein Denkmodell falsch wurde.

## Wo dir das in der KI begegnet

Ein Trainingslauf dauert Minuten bis Tage. Wer die Ausgabe einer Trainingsschleife vorhersagen kann, findet Fehler vor dem teuren Lauf statt danach.

## Typische Fehler

- Nur den wahren Zweig tracen und den `else`-Lauf auslassen.
- `range(1, 4)` als „1 bis 4“ lesen. Das Ende ist exklusiv; es liefert 1, 2, 3.
- Bei Slice und `range` die Grenzen vertauschen: Start inklusive, Ende exklusive.
- Nur die Endausgabe vergleichen. Diagnostisch ist die erste abweichende Tabellenzeile.
- Variablen zwischen den Läufen gedanklich zurücksetzen, obwohl der Code sie weiterführt.

## Kurzer Abruf

Gehe dieses Programm mit einer Tabellenzeile pro Schleifenlauf durch:

```python
result = 1
for n in range(1, 4):
    result = result * n
print(result)
```

Begründe außerdem, welche Werte `range(1, 4)` tatsächlich liefert. Ändere erst danach die obere Grenze und sage die neue Ausgabe voraus.

## Begriffe auf einen Blick

- **Trace**: schriftliche Simulation eines Programms Zeile für Zeile.
- **Tracetabelle** (englisch *trace table*): Tabelle mit einer Zeile pro ausgeführter Codezeile und einer Spalte pro beobachtetem Namen.
- **Schleifendurchlauf** (englisch *iteration*): eine Ausführung des Schleifenkörpers; pro Durchlauf eine Tabellenzeile.
- **Slice**: Ausschnitt `a[b:c]` von Position `b` inklusive bis `c` exklusive.
- **List-Comprehension**: Ausdruck, der eine neue Liste aus Filterung und Umformung einer bestehenden Folge baut.
