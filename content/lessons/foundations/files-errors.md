# Dateien lesen und Fehler begrenzen

Dateicode verbindet unzuverlässige Außenwelt mit interner Programmlogik. Halte diese Grenze klein: Eine Funktion liest oder parst. Eine zweite Funktion prüft bereits strukturierte Daten. So lassen sich Regeln ohne echte Datei testen.

## Kontextmanager

```python
from pathlib import Path

with Path("data.txt").open(encoding="utf-8") as handle:
    text = handle.read()
```

Der Kontextmanager schließt die Datei auch dann, wenn beim Lesen ein Fehler entsteht. Die Zeichenkodierung steht explizit im Vertrag.

## Parsing und Validierung trennen

```python
def parse_age(text):
    try:
        value = int(text)
    except ValueError as error:
        raise ValueError("age is not an integer") from error
    if not 0 <= value <= 130:
        raise ValueError("age is outside 0..130")
    return value
```

Der erste Handler übersetzt den technischen `int`-Fehler in „keine ganze Zahl“. Die Bereichsprüfung nennt getrennt den zulässigen Bereich. Der Aufrufer entscheidet, ob eine ungültige Zeile übersprungen, gemeldet oder zum Abbruch führt.

## Fehler an der Entscheidungsgrenze behandeln

```python
try:
    age = parse_age(row["age"])
except ValueError as error:
    issues.append({"row": row_number, "kind": "invalid-age", "detail": str(error)})
```

Fange nicht pauschal jede Exception. Ein Tippfehler wie `row_numer` ist kein erwarteter Datenfehler und soll als Programmfehler sichtbar bleiben.

## Projektstufe

Im CLI-Datenprüfer arbeitet `inspect_rows` auf fertigen Dictionaries. `inspect_csv` übernimmt nur das Einlesen. Dadurch testen die bereitgestellten Fälle Schema, Typen, fehlende Werte und Duplikate ohne Dateisystemabhängigkeit.

## Kurzer Abruf

Erkläre, warum `except Exception: pass` hier schädlich ist. Nenne einen erwarteten Datenfehler und einen Programmfehler, den du nicht verschlucken willst.
