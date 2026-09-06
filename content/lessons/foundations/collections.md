# Datenstrukturen nach Aufgabe wählen

Eine Datenstruktur ist eine Entscheidung über Zugriff und Invarianten. Wähle sie nicht nach Gewohnheit.

- Eine **Liste** bewahrt Reihenfolge und kann Werte mehrfach enthalten.
- Ein **Dictionary** ordnet eindeutigen Schlüsseln Werte zu.
- Ein **Set** speichert eindeutige Werte und beantwortet schnelle Mitgliedschaftsfragen.

## Häufigkeiten zählen

```python
words = ["rot", "blau", "rot"]
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
```

Trace:

| `word` | `counts` danach |
|---|---|
| `rot` | `{"rot": 1}` |
| `blau` | `{"rot": 1, "blau": 1}` |
| `rot` | `{"rot": 2, "blau": 1}` |

`get(word, 0)` liefert `0` als Startwert, wenn der Schlüssel noch fehlt.

## Duplikate erkennen

```python
seen = set()
duplicates = []
for item in ["a1", "a2", "a1"]:
    if item in seen:
        duplicates.append(item)
    else:
        seen.add(item)
```

Das Set beantwortet die Frage „schon gesehen?“. Die Liste bewahrt, in welcher Reihenfolge Duplikate gemeldet wurden. Beide Strukturen haben verschiedene Aufgaben.

## Mutation sichtbar halten

Methoden wie `append`, `add` und eine Dictionary-Zuweisung verändern ein bestehendes Objekt. Beim Tracen notierst du deshalb nicht nur neue Variablennamen, sondern auch den neuen Inhalt der Collection.

## Kurzer Abruf

Entwirf ohne Code die Strukturen für eine CSV-Prüfung. Gehe in drei Schritten vor:

1. Wähle eine Struktur, die Zeilen in ihrer Eingabereihenfolge bewahrt.
2. Wähle eine Struktur für die Frage „Ist diese ID schon vorgekommen?“.
3. Wähle eine Struktur, die jeder Fehlerart eine Anzahl zuordnet.

Begründe jede Wahl mit dem benötigten Zugriff.
