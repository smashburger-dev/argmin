# Beobachtungen in Tests festhalten

Debugging beginnt nicht mit einer Änderung, sondern mit einer zuverlässigen Beobachtung. Ein guter Test hält diese Beobachtung fest und scheitert vor dem Fix aus dem richtigen Grund. Diese Lektion zeigt dir den Aufbau und die Diagnosefolge.

## Das Bild dahinter: der Rauchmelder

Ein **Test** ist wie ein Rauchmelder: Er soll bei einem bestimmten Problem anschlagen. Aber ein Melder, den du nie mit Rauch ausgelöst hast, beweist nichts. Ein Test, den du nie rot gesehen hast, ebenso. Darum gehört zum Schreiben immer das einmalige Fehlschlagen vor dem Fix.

Wo der Vergleich hinkt: Ein Rauchmelder prüft genau eine Sache. Ein Test prüft genau das, was du hineinschreibst, und nichts daneben. Er deckt keine Lücke ab, die du nicht als Assertion formuliert hast.

## Arrange, Act, Assert

Jeder Test hat drei Phasen: **Arrange** baut den kleinsten relevanten [Zustand](#/glossary/zustand), **Act** führt genau die zu prüfende Handlung aus, **Assert** beschreibt die beobachtbare Erwartung. Eine **Assertion** ist die Zusicherung am Ende: Stimmt sie nicht, scheitert der Test.

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

Arrange ist die Liste `rows`, Act der Aufruf von `inspect_rows`, Assert die eine Erwartung an das Ergebnis. Setze nie das aktuelle, falsche Ergebnis als Erwartung ein; dann prüft der Test den Fehler statt des [Vertrags](#/glossary/vertrag).

## Diagnosefolge

Eine **Reproduktion** ist eine Eingabe, die den Fehler zuverlässig auslöst; die kleinste davon ist die **kleinste Reproduktion**. Danach folgst du einer festen Kette:

1. Test unverändert ausführen und Fehler reproduzieren.
2. Tatsächlichen und erwarteten Wert vergleichen.
3. Den Codepfad bis zur ersten falschen Zustandsänderung tracen.
4. Eine **Ursachenhypothese** formulieren: Welche Regel im Code erklärt die Beobachtung?
5. Den kleinsten Fix schreiben.
6. Den einzelnen Test und danach die ganze Suite ausführen.

Meldet eine Duplikatsuche etwa nichts, obwohl `["a", "a"]` offensichtlich ein Duplikat enthält, sind zwei Hypothesen plausibel: Der Vergleich startet erst am zweiten Element, oder das `return` steht eine Einrückung zu tief und bricht beim ersten Paar ab. Ein Fall wie `["x", "y", "y"]` unterscheidet beide. Die Testfunktionen eines Projekts laufen gemeinsam und heißen **Testsuite**; ein Test, der einen alten Fehler festhält, heißt **Regressionstest**.

## Falsche Abkürzungen

Ändere nicht die Erwartung, nur damit der Test grün wird. Entferne keinen schwierigen Fall. Fange keine breite [Exception](#/glossary/exception), um ein Symptom zu verstecken. Ein grüner Test ist nur aussagekräftig, wenn sein Vertrag stimmt.

## Wo dir das in der KI begegnet

ML-Fehler sind oft still: Das Modell trainiert, nur schlechter. Ein gängiger Test ist der Overfit-one-batch-Check: Ein Modell muss eine einzige winzige Datenportion, einen einzigen [Batch](#/glossary/batch), fast perfekt auswendig lernen können. Schafft es das nicht, steckt ein Fehler im Code, nicht in den Daten.

## Projektstufe

Vervollständige im CLI-Datenprüfer jeweils nur eine Prüfphase. Starte den zugehörigen Test einzeln. Notiere bei einem Fehler zuerst die kleinste abweichende Zeile oder Collection.

## Kurzer Abruf

Ein Test erwartet Zeilennummer `3`, dein Code meldet `2`. Formuliere zwei konkurrierende Ursachenhypothesen und je einen Test, der sie unterscheidet.

## Begriffe auf einen Blick

- **Test**: prüfbare Beobachtung, die vor dem Fix einmal rot sein muss.
- **Assertion**: Zusicherung, die bei Verletzung das Programm mit `AssertionError` abbricht.
- **Arrange, Act, Assert**: die drei Phasen eines Tests: Zustand aufbauen, Handlung ausführen, Erwartung prüfen.
- **Regression**: ein alter Fehler, der wieder auftaucht; der Regressionstest hält ihn fest.
- **Reproduktion** (englisch *reproduction*): Eingabe, die einen Fehler zuverlässig auslöst.
- **Kleinste Reproduktion** (englisch *minimal reproduction*): die kleinste Eingabe, die einen Fehler noch zuverlässig auslöst.
- **Ursachenhypothese** (englisch *root cause hypothesis*): prüfbare Vermutung, welche Regel im Code die Beobachtung erklärt.
- **Testsuite**: die Testfunktionen eines Projekts, die zusammen laufen.
