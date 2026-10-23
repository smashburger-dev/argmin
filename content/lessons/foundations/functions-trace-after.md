## Lokal denken

Parameter und lokale Namen gehören zum aktuellen Aufruf. Trenne beim [Tracen](#/glossary/trace) den globalen Zustand vom lokalen: So erkennst du, ob ein Fehler in der Eingabe, im Funktionskörper oder bei der Verwendung des Rückgabewerts liegt. Ein `NameError` wie `name 'messwerte' is not defined` bedeutet, dass ein Name gelesen wird, an den nie etwas gebunden wurde.

## Wo dir das in der KI begegnet

Ein Modell ist eine Funktion $f(x)$ mit gelernten Gewichten. Und eine Verlustfunktion muss ihren Wert zurückgeben, damit die Trainingsschleife damit weiterrechnen kann; würde sie den Verlust nur ausgeben, wäre er für das Training verloren.

## Typische Fehler

- `print` statt `return`: Der Aufrufer erhält `None`, die Ausgabe ist nur Dekoration.
- Parameter und Argumente verwechseln: Parameter stehen in der Definition, Argumente beim Aufruf.
- Lokale Namen von außen lesen wollen; sie leben nur im Aufruf.
- Die Vorbedingung nicht prüfen und für ungültige Eingaben still falsch rechnen.
- Bei zwei verschachtelten Aufrufen die Reihenfolge der Bindung vertauschen.

## Kurzer Abruf

Formuliere zuerst den Vertrag für `is_valid_age(text)`. Die Funktion soll nur dann `True` liefern, wenn `text` eine ganze Zahl von 0 bis 130 beschreibt. Notiere mindestens vier Beispiele, bevor du implementierst.

## Begriffe auf einen Blick

- **Funktion** (englisch *function*): benanntes Codestück, das Eingaben auf ein Ergebnis oder eine Wirkung abbildet.
- **Parameter**: Name in der Funktionsdefinition, der beim Aufruf an ein Argument gebunden wird.
- **Argument**: der konkrete Wert, den du beim Aufruf hineingibst.
- **Rückgabewert** (englisch *return value*): das Ergebnis, das `return` an den Aufrufer liefert.
- **None**: Pythons Wert für „nichts zurückgegeben“; Ergebnis einer Funktion ohne `return`.
- **Vertrag** (englisch *contract*): Vorbedingung für die Eingaben plus Nachbedingung für das Ergebnis.
- **Assertion**: Zusicherung, die bei Verletzung das Programm mit `AssertionError` abbricht.
- **Lokal** (englisch *local*): nur innerhalb des aktuellen Aufrufs sichtbar; das Gegenteil ist global.
