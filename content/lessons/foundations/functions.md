# Eingaben, Wirkung und Vertrag klären

Eine Funktion verbindet Eingaben mit einem Ergebnis. Bevor du sie schreibst, klärst du drei Fragen: Was kommt hinein, was kommt zurück, welche Fälle sind unzulässig? Diese Lektion zeigt dir den Vertrag dahinter an einem Getränkeautomaten.

## Das Bild dahinter: der Getränkeautomat

Eine **Funktion** ist wie ein Getränkeautomat. Die **Parameter** sind Münzen und Auswahl: was du hineinsteckst. Die konkreten [Werte](#/glossary/wert) beim Einwerfen heißen **Argumente**. Das Ausgabefach ist `return`: Dort liegt der **Rückgabewert**. Das Display zeigt nur Text an, das ist `print`; vom Display kannst du nicht trinken, und `print` liefert dir als Wert `None`, also „nichts“.

Der **Vertrag** des Automaten sagt, welche Eingaben er annimmt (Vorbedingung) und was im Fach liegen muss (Nachbedingung). Was im Inneren rechnet, bleibt drin: [Namen](#/glossary/name), die nur in der Funktion existieren, heißen **lokal**; Namen außerhalb jeder Funktion heißen **global**.

Wo der Vergleich hinkt: Ein Automat hat Vorrat und [Zustand](#/glossary/zustand) und kann beim zweiten Knopfdruck leer sein. Eine gute Funktion liefert bei gleicher Eingabe jedes Mal dasselbe Ergebnis.

## Durchgerechnetes Beispiel: aus dem Vertrag ableiten

Vertrag für `clamp(value, lower, upper)`: drei Zahlen hinein, das Ergebnis liegt immer zwischen `lower` und `upper`, und es gilt die Vorbedingung `lower <= upper`.

```python
def clamp(value, lower, upper):
    assert lower <= upper
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value
```

Die **Assertion** `assert lower <= upper` ist eine Zusicherung: Stimmt sie nicht, bricht Python mit `AssertionError` ab, statt still zu rechnen. So bleibt eine Vertragsverletzung sichtbar.

Prüfbeispiele gegen den Vertrag:

```python
clamp(5, 0, 10)   # 5, normaler Fall
clamp(-2, 0, 10)  # 0, untere Grenze
clamp(13, 0, 10)  # 10, obere Grenze
clamp(5, 8, 2)    # AssertionError, Vorbedingung verletzt
```

## `return` ist nicht `print`

```python
def double(number):
    return number * 2

result = double(4)
print(result)
```

`return` legt den Wert ins Ausgabefach: `double(4)` liefert 8, die du in `result` weiterverwenden kannst. Hätte die Funktion nur `print(number * 2)`, stünde der Wert auf dem Display und `result` wäre `None`. Beim Aufruf werden die Argumente in der Schreibreihenfolge an die Parameter gebunden. Bei verschachtelten Aufrufen wie `f(g(2))` läuft zuerst die innere Funktion; ihr Rückgabewert wird zum Argument der äußeren:

```python
def f(x):
    return x + 10

def g(x):
    return x * 3

print(f(g(2)))
```

Ausgabe:

```text
16
```

`g(2)` liefert 6, und `f(6)` rechnet mit dieser 6 weiter.

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
