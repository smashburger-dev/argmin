# Grenze zur Außenwelt klein halten

Dateicode verbindet unzuverlässige Außenwelt mit interner Programmlogik. Diese Lektion zeigt dir, wie du die Grenze wie einen Wareneingang organisierst: prüfen am Tor, drinnen nur geprüfte Ware, und kein Feueralarm in der Reklamationsablage.

## Das Bild dahinter: der Wareneingang

Stell dir den Eingang eines Lagers vor. Pakete werden am Tor geprüft und ausgepackt: Das ist das **Parsen**, die Umwandlung von Textzeilen in Zahlen und Datensätze. Drinnen liegt nur geprüfte Ware; die Programmlogik sieht nie rohen Text. Erwartete Mängel wie ein fehlendes Feld kommen auf die Reklamationsliste, hier die [Liste](#/glossary/liste) `issues`. Ein Feueralarm dagegen gehört nie in die Reklamationsablage: Ein Tippfehler in deinem Code ist kein Datenmangel, und `except Exception: pass` legt ihn genau dorthin ab, unsichtbar.

Wo der Vergleich hinkt: Echte Pakete kommen als Ganzes an; Dateien liest du zeilenweise, und die Prüfung läuft Zeile für Zeile.

## Dateien sauber öffnen

```python
from pathlib import Path

with Path("data.txt").open(encoding="utf-8") as handle:
    text = handle.read()
```

`with` ist eine Tür mit Türschließer: Der **Kontextmanager** schließt die Datei auch dann, wenn beim Lesen ein Fehler auftritt. Die **Zeichenkodierung** steht mit `utf-8` explizit im [Vertrag](#/glossary/vertrag), sonst nimmt Python die Voreinstellung des Betriebssystems, und die ist nicht überall UTF-8.

## Parsen und Validieren trennen

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

Eine **Exception** ist ein Fehlerereignis, das den normalen Ablauf unterbricht. `try` und `except` fangen es ab; `raise` wirft ein eigenes. Der erste Handler übersetzt den technischen `int`-Fehler in „keine ganze Zahl“, und `from error` hält die ursprüngliche Ursache fest. Die **Validierung** prüft danach den Bereich mit einer eigenen, klaren Meldung.

## Fehler an der Entscheidungsgrenze behandeln

```python
try:
    age = parse_age(row["age"])
except ValueError as error:
    issues.append({"row": row_number, "kind": "invalid-age", "detail": str(error)})
```

Der Aufrufer entscheidet, ob eine ungültige Zeile übersprungen, gemeldet oder zum Abbruch führt. Fange nur die Exception, die du erwartest. Drei Fehlernamen helfen beim Einordnen: `ValueError` für unparsebaren Inhalt, `KeyError` für einen fehlenden [Dictionary](#/glossary/dictionary)-[Schlüssel](#/glossary/schluessel) (etwa `row["alter"]`, wenn die Spalte `Alter` heißt), `TypeError` für eine Operation auf dem falschen Typ (etwa `"19" >= 18`, Zeichenkette gegen Zahl). Ein Tippfehler wie `row_numer` wirft einen `NameError`, ist ein Programmfehler und muss sichtbar bleiben, nicht verschluckt.

## Wo dir das in der KI begegnet

Jeder Datenlader für Trainingsdaten ist ein Wareneingang. Ein stilles `except` kann Tausende Zeilen verwerfen, und das Modell trainiert danach ohne Warnung auf dem Rest. Erwartete Datenfehler gehören in eine sichtbare `issues`-Liste, Programmfehler auf den Bildschirm.

## Typische Fehler

- `except Exception: pass` schreiben. Das verschluckt auch `NameError` und andere Programmfehler.
- Parsen und Validieren mischen. Getrennte Meldungen machen Fehler lokalisierbar.
- `with` weglassen und die Datei bei einem Fehler offen lassen.
- Die Kodierung nicht angeben und den Zeichensatz der Plattform raten lassen.
- `from error` streichen. Die Originalursache ist bei der Diagnose Gold wert.

## Projektstufe

Im CLI-Datenprüfer arbeitet `inspect_rows` auf fertigen Dictionaries. `inspect_csv` übernimmt nur das Einlesen. Dadurch testen die bereitgestellten Fälle Schema, Typen, fehlende Werte und Duplikate ohne Dateisystemabhängigkeit.

## Kurzer Abruf

Erkläre, warum `except Exception: pass` hier schädlich ist. Nenne einen erwarteten Datenfehler und einen Programmfehler, den du nicht verschlucken willst.

## Begriffe auf einen Blick

- **Exception**: Fehlerereignis, das den normalen Ablauf unterbricht; `try`/`except` fängt es, `raise` wirft es.
- **Kontextmanager** (englisch *context manager*): `with`-Konstrukt, das eine Ressource wie eine Datei auch im Fehlerfall sauber schließt.
- **Parsen** (englisch *parsing*): Text in strukturierte Werte wie Zahlen oder Datensätze übersetzen.
- **Validierung** (englisch *validation*): geparste Werte gegen Regeln wie einen Wertebereich prüfen.
- **Zeichenkodierung** (englisch *encoding*): Regel, wie Zeichen in Bytes übersetzt werden, zum Beispiel UTF-8.
- **`raise … from`**: wirft eine eigene Exception und hält die ursprüngliche als Ursache sichtbar.
