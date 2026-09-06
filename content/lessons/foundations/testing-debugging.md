# Ein Fehler, ein reproduzierbarer Test

Debugging beginnt nicht mit einer Änderung. Es beginnt mit einer zuverlässigen Beobachtung. Ein guter Test hält diese Beobachtung fest und scheitert vor dem Fix aus dem richtigen Grund.

## Arrange, Act, Assert

Im folgenden Projekt zählt die CSV-Kopfzeile als Zeile 1. Das zweite Datenobjekt entspricht deshalb der sichtbaren CSV-Zeile 3.

```python
def test_duplicate_ids_are_reported():
    rows = [
        {"id": "a1", "name": "Ada", "age": "19"},
        {"id": "a1", "name": "Lin", "age": "21"},
    ]

    issues = inspect_rows(["id", "name", "age"], rows)

    assert {"stage": "duplicates", "kind": "duplicate-id", "row": 3, "value": "a1"} in issues
```

Arrange baut den kleinsten relevanten Zustand. Act führt genau die zu prüfende Handlung aus. Assert beschreibt die beobachtbare Erwartung.

## Diagnosefolge

1. Test unverändert ausführen und Fehler reproduzieren.
2. Tatsächlichen und erwarteten Wert vergleichen.
3. Den Codepfad bis zur ersten falschen Zustandsänderung tracen.
4. Eine Ursachenhypothese formulieren.
5. Den kleinsten Fix schreiben.
6. Den einzelnen Test und danach die ganze Suite ausführen.

Wenn du nicht siehst, dass der Test vor dem Fix scheitert, weißt du nicht, ob er die Regression überhaupt erfasst.

## Falsche Abkürzungen

Ändere nicht die Erwartung, nur damit der Test grün wird. Entferne keinen schwierigen Fall. Fange keine breite Exception, um ein Symptom zu verstecken. Ein grüner Test ist nur aussagekräftig, wenn sein Vertrag stimmt.

## Projektstufe

Vervollständige im CLI-Datenprüfer jeweils nur eine Prüfphase. Starte den zugehörigen Test einzeln. Notiere bei einem Fehler zuerst die kleinste abweichende Zeile oder Collection.

## Kurzer Abruf

Ein Test erwartet Zeilennummer `3`, dein Code meldet `2`. Formuliere zwei konkurrierende Ursachenhypothesen und je einen Test, der sie unterscheidet.
