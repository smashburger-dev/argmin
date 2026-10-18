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
- **Listenindex**: Position eines Eintrags in einer Liste, gezählt ab 0; `liste[i]` liest den Eintrag an Stelle i.
- **Dictionary**: ordnet eindeutigen Schlüsseln Werte zu, wie eine Garderobe jeder Marke einen Mantel.
- **Schlüssel** (englisch *key*): die Marke, unter der ein Wert im Dictionary liegt; kommt einmal vor.
- **Set**: Sammlung eindeutiger Werte ohne Duplikate; beantwortet Mitgliedschaft schnell.
- **Mitgliedschaft** (englisch *membership*): die Frage `wert in sammlung`, ob ein Wert enthalten ist.
- **Mutation**: Veränderung eines bestehenden Objekts, zum Beispiel durch `append` oder eine Schlüsselzuweisung.
