# Zugriff und Invarianten entscheiden

Eine Datenstruktur ist eine Entscheidung darüber, welche Fragen sie schnell beantwortet und welche Versprechen sie hält. Diese Lektion ordnet Liste, Dictionary und Set über drei Aufbewahrungsorte und zeigt die zwei Muster, die du in fast jedem Datenprogramm triffst: zählen und Duplikate erkennen.

## Das Bild dahinter: Aufbewahrungsorte

- Eine **Liste** ist eine Playlist: Reihenfolge zählt, und dasselbe Lied darf mehrfach vorkommen.
- Ein **Dictionary** ist eine Garderobe mit Marken: Jede Marke kommt einmal vor, und an der Marke hängt genau ein Mantel. Die Marke ist der **Schlüssel**, der Mantel der zugeordnete **Wert**.
- Ein **Set** ist die Gästeliste am Eingang: Es beantwortet nur „steht drauf: ja oder nein“, und niemand steht zweimal drauf.

Wo der Vergleich hinkt: Seit Python 3.7 merkt sich auch ein Dictionary die Einfügereihenfolge, die Garderobe ist also weniger chaotisch als gedacht.

## Durchgerechnetes Beispiel: Häufigkeiten zählen

```python
words = ["rot", "blau", "rot"]
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
```

[Trace](#/glossary/trace):

| `word` | `counts` danach |
|---|---|
| `rot` | `{"rot": 1}` |
| `blau` | `{"rot": 1, "blau": 1}` |
| `rot` | `{"rot": 2, "blau": 1}` |

`dict.get(key, default)` liefert den `default`, wenn der Schlüssel noch fehlt; hier startet jede Marke bei 0. Am Ende steht `{"rot": 2, "blau": 1}`.

## Durchgerechnetes Beispiel: Duplikate erkennen

```python
seen = set()
duplicates = []
for item in ["a1", "a2", "a1"]:
    if item in seen:
        duplicates.append(item)
    else:
        seen.add(item)
```

Das Set beantwortet die Mitgliedschaftsfrage „schon gesehen?“; `item in seen` ist dafür der schnelle Weg. Die Liste `duplicates` bewahrt, in welcher Reihenfolge die Meldungen kamen. Ergebnis: `duplicates` ist `["a1"]`. Sets entfernen zudem Doppelte beim Bauen: `{"ki", "lern", "ki"}` hat Länge 2. Zwei Sets schneidest du mit `a & b`: `{"ki", "lern"} & {"lern", "plattform"}` ergibt `{"lern"}`.

## Mutation und Aliase sichtbar halten

Methoden wie `append`, `add` und eine Dictionary-[Zuweisung](#/glossary/zuweisung) verändern ein bestehendes Objekt; das ist **Mutation**. Beim Tracen notierst du deshalb nicht nur neue [Namen](#/glossary/name), sondern den neuen Inhalt der Collection.

Vorsicht bei `y = x`: Das kopiert keine Liste; es hängt ein zweites Namensschild an dieselbe Liste. Ein `x.append(9)` ist danach auch über `y` sichtbar. Für eine echte Kopie nutzt du `y = x.copy()` oder `y = list(x)`.

## Wo dir das in der KI begegnet

Das Vokabular eines Tokenizers ist ein Dictionary von Token auf ID; bei GPT-2 hat es 50 257 Einträge. Und beim BPE-Training wird immer wieder gezählt, wie oft Zeichenpaare vorkommen: genau das Zählmuster `counts[paar] = counts.get(paar, 0) + 1` aus dieser Lektion.

## Typische Fehler

- `y = x` als Kopie lesen. Beide Namen hängen an derselben Liste, Mutationen wirken doppelt.
- Ein Set für Reihenfolgefragen benutzen. Es beantwortet nur Mitgliedschaft.
- Ein Dictionary für „kann mehrfach vorkommen“ wählen. Schlüssel sind eindeutig.
- `counts[word]` lesen, bevor der Schlüssel existiert; dafür ist `get` mit Startwert da.
- Nach dem Zählen die Liste statt des Dictionaries ausgeben.

## Kurzer Abruf

Entwirf ohne Code die Strukturen für eine CSV-Prüfung. Gehe in drei Schritten vor:

1. Wähle eine Struktur, die Zeilen in ihrer Eingabereihenfolge bewahrt.
2. Wähle eine Struktur für die Frage „Ist diese ID schon vorgekommen?“.
3. Wähle eine Struktur, die jeder Fehlerart eine Anzahl zuordnet.

Begründe jede Wahl mit dem benötigten Zugriff.

## Begriffe auf einen Blick

- **Liste** (englisch *list*): geordnete Sammlung, die Werte mehrfach enthalten darf; die Playlist.
- **Dictionary**: ordnet eindeutigen Schlüsseln Werte zu, wie eine Garderobe jeder Marke einen Mantel.
- **Schlüssel** (englisch *key*): die Marke, unter der ein Wert im Dictionary liegt; kommt einmal vor.
- **Set**: Sammlung eindeutiger Werte ohne Duplikate; beantwortet Mitgliedschaft schnell.
- **Mitgliedschaft** (englisch *membership*): die Frage `wert in sammlung`, ob ein Wert enthalten ist.
- **Mutation**: Veränderung eines bestehenden Objekts, zum Beispiel durch `append` oder eine Schlüsselzuweisung.
