# Funktionen als kleine Verträge

Eine Funktion verbindet Eingaben mit einem Ergebnis oder einer klar benannten Wirkung. Ein guter erster Entwurf beantwortet vor dem Code drei Fragen: Was kommt hinein? Was kommt zurück? Welche Fälle sind unzulässig?

## Beispiel aus einem Vertrag ableiten

Vertrag für `clamp(value, lower, upper)`:

- Eingaben sind drei Zahlen.
- Das Ergebnis liegt immer zwischen `lower` und `upper`.
- Werte unterhalb werden auf `lower` gesetzt.
- Werte oberhalb werden auf `upper` gesetzt.
- Es gilt `lower <= upper`.

```python
def clamp(value, lower, upper):
    assert lower <= upper
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value
```

Prüfbeispiele:

```python
clamp(5, 0, 10)   # 5, normaler Fall
clamp(-2, 0, 10)  # 0, untere Grenze
clamp(13, 0, 10)  # 10, obere Grenze
clamp(5, 8, 2)    # AssertionError, ungültiger Vertrag
```

## `return` ist nicht `print`

`return` gibt einen Wert an den Aufrufer zurück. `print` zeigt Text an und gibt `None` zurück. Eine Funktion, die später getestet oder weiterverwendet werden soll, braucht meist einen Rückgabewert.

```python
def double(number):
    return number * 2

result = double(4)
print(result)
```

## Lokal denken

Parameter und lokale Namen gehören zum aktuellen Funktionsaufruf. Trenne beim Tracen den globalen Zustand vom lokalen Zustand. So erkennst du, ob ein Fehler in der Eingabe, im Funktionskörper oder bei der Verwendung des Rückgabewerts liegt.

## Kurzer Abruf

Formuliere zuerst den Vertrag für `is_valid_age(text)`. Die Funktion soll nur dann `True` liefern, wenn `text` eine ganze Zahl von 0 bis 130 beschreibt. Notiere mindestens vier Beispiele, bevor du implementierst.
